import { db } from "../../db";
import { prompts as promptsTable } from "../../db/schema";
import { inArray } from "drizzle-orm";
import log from "electron-log";
import * as path from "path";
import * as fs from "fs";
import { replacePromptReference } from "../utils/replacePromptReference";
import { replaceSlashSkillReference } from "../utils/replaceSlashSkillReference";
import { parseMediaMentions, stripResolvedMediaMentions } from "@/shared/parse_media_mentions";
import { resolveMediaMentions } from "../utils/resolve_media_mentions";
import { buildDyadMediaUrl } from "../../lib/dyadMediaUrl";
import { escapeXmlAttr } from "../../../shared/xmlEscape";
import { parsePlanFile, validatePlanId } from "./planUtils";
import { getDyadAppPath } from "../../paths/paths";
import { parseAppMentions } from "@/shared/parse_mention_apps";

const logger = log.scope("tag_parser_service");

// Safely parse an MCP tool key that combines server and tool names.
// We split on the LAST occurrence of "__" to avoid ambiguity if either
// side contains "__" as part of its sanitized name.
export function parseMcpToolKey(toolKey: string): {
  serverName: string;
  toolName: string;
} {
  const separator = "__";
  const lastIndex = toolKey.lastIndexOf(separator);
  if (lastIndex === -1) {
    return { serverName: "", toolName: toolKey };
  }
  const serverName = toolKey.slice(0, lastIndex);
  const toolName = toolKey.slice(lastIndex + separator.length);
  return { serverName, toolName };
}

export async function expandPromptReferences(userPrompt: string): Promise<string> {
  try {
    const matches = Array.from(userPrompt.matchAll(/@prompt:(\d+)/g));
    if (matches.length > 0) {
      const ids = Array.from(new Set(matches.map((m) => Number(m[1]))));
      const referenced = await db
        .select()
        .from(promptsTable)
        .where(inArray(promptsTable.id, ids));
      if (referenced.length > 0) {
        const promptsMap: Record<number, string> = {};
        for (const p of referenced) {
          promptsMap[p.id] = p.content;
        }
        return replacePromptReference(userPrompt, promptsMap);
      }
    }
  } catch (e) {
    logger.error("Failed to inline referenced prompts:", e);
  }
  return userPrompt;
}

export async function expandSlashSkillReferences(userPrompt: string): Promise<string> {
  try {
    const slashSkillPattern = /(?:^|\s)\/([a-zA-Z0-9-]+)(?=\s|$)/;
    if (slashSkillPattern.test(userPrompt)) {
      const allPrompts = db.select().from(promptsTable).all();
      const promptsBySlug: Record<string, string> = {};
      for (const p of allPrompts) {
        if (p.slug && !promptsBySlug[p.slug]) {
          promptsBySlug[p.slug] = p.content;
        }
      }
      return replaceSlashSkillReference(userPrompt, promptsBySlug);
    }
  } catch (e) {
    logger.error("Failed to expand slash skill references:", e);
  }
  return userPrompt;
}

export async function processMediaMentions(userPrompt: string, displayUserPrompt: string, appPath: string, appName: string, attachmentPaths: string[]) {
  const mediaRefs = parseMediaMentions(userPrompt);
  if (mediaRefs.length > 0) {
    try {
      const resolvedMedia = await resolveMediaMentions(
        mediaRefs,
        appPath,
        appName,
      );
      const resolvedMediaRefs = resolvedMedia.map((media) =>
        encodeURIComponent(media.fileName),
      );
      let mediaDisplayInfo = "";
      for (const media of resolvedMedia) {
        attachmentPaths.push(media.filePath);
        const mediaUrl = buildDyadMediaUrl(appPath, media.fileName);
        mediaDisplayInfo += `\n<dyad-attachment name="${escapeXmlAttr(media.fileName)}" type="${escapeXmlAttr(media.mimeType)}" url="${escapeXmlAttr(mediaUrl)}" path="${escapeXmlAttr(media.filePath)}" attachment-type="chat-context"></dyad-attachment>\n`;
      }
      
      userPrompt = stripResolvedMediaMentions(
        userPrompt,
        resolvedMediaRefs,
      );
      
      if (mediaDisplayInfo) {
        const strippedPrompt = stripResolvedMediaMentions(
          displayUserPrompt,
          resolvedMediaRefs,
        );
        displayUserPrompt = strippedPrompt + mediaDisplayInfo;
      }
    } catch (e) {
      logger.error("Failed to resolve media mentions:", e);
    }
  }
  return { userPrompt, displayUserPrompt };
}

export async function expandImplementPlan(userPrompt: string, appPath: string) {
  let implementPlanDisplayPrompt: string | undefined;
  const implementPlanMatch = userPrompt.match(/^\/implement-plan=(.+)$/);
  if (implementPlanMatch) {
    try {
      implementPlanDisplayPrompt = userPrompt;
      const planSlug = implementPlanMatch[1];
      validatePlanId(planSlug);
      const dyadAppPath = getDyadAppPath(appPath);
      const planFilePath = path.join(
        dyadAppPath,
        ".dyad",
        "plans",
        `${planSlug}.md`,
      );
      const raw = await fs.promises.readFile(planFilePath, "utf-8");
      const { meta, content } = parsePlanFile(raw);

      const planPath = `.dyad/plans/${planSlug}.md`;

      userPrompt = `Please implement the following plan:

## ${meta.title || "Implementation Plan"}

${content}

Start implementing this plan now. Follow the steps outlined and create/modify the necessary files.
You may update the plan at \`${planPath}\` to mark your progress.`;
    } catch (e) {
      implementPlanDisplayPrompt = undefined;
      logger.error("Failed to expand /implement-plan= prompt:", e);
    }
  }
  return { userPrompt, implementPlanDisplayPrompt };
}
