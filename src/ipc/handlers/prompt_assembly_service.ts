import { getDyadAppPath } from "../../paths/paths";
import { DYAD_MEDIA_DIR_NAME } from "../utils/media_path_utils";
import { ensureDyadGitignored } from "./gitignoreUtils";
import { escapeXmlAttr } from "../../../shared/xmlEscape";
import { constructSystemPrompt, readAiRules } from "../../prompts/system_prompt";
import { getThemePromptById } from "../utils/theme_utils";
import { isBasicAgentMode, isTurboEditsV2Enabled } from "@/lib/schemas";
import { SECURITY_REVIEW_SYSTEM_PROMPT } from "../../prompts/security_review_prompt";
import log from "electron-log";
import * as path from "path";
import * as crypto from "crypto";
import * as fs from "fs";
import { readFile, writeFile } from "fs/promises";
import { extractMentionedAppsCodebases } from "../utils/mention_apps";

const logger = log.scope("prompt_assembly_service");

const TEXT_FILE_EXTENSIONS = [
  ".md",
  ".txt",
  ".json",
  ".csv",
  ".js",
  ".ts",
  ".html",
  ".css",
];

export async function isTextFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

export async function processAttachments(attachments: any[], appPath: string, attachmentPaths: string[]) {
  let attachmentInfo = "";
  let displayAttachmentInfo = "";

  if (attachments && attachments.length > 0) {
    attachmentInfo = "\n\nAttachments:\n";

    const dyadAppPath = getDyadAppPath(appPath);
    const mediaDir = path.join(dyadAppPath, DYAD_MEDIA_DIR_NAME);
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    await ensureDyadGitignored(dyadAppPath);

    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      const hash = crypto
        .createHash("md5")
        .update(attachment.name + Date.now() + i)
        .digest("hex");
      const fileExtension = path.extname(attachment.name);
      const filename = `${hash}${fileExtension}`;

      const base64Data = attachment.data.split(";base64,").pop() || "";
      const fileBuffer = Buffer.from(base64Data, "base64");

      const persistentPath = path.join(mediaDir, filename);
      await writeFile(persistentPath, fileBuffer);
      attachmentPaths.push(persistentPath);

      const mediaUrl = `dyad-media://media/${encodeURIComponent(appPath)}/.dyad/media/${encodeURIComponent(filename)}`;

      displayAttachmentInfo += `\n<dyad-attachment name="${escapeXmlAttr(attachment.name)}" type="${escapeXmlAttr(attachment.type)}" url="${escapeXmlAttr(mediaUrl)}" path="${escapeXmlAttr(persistentPath)}" attachment-type="${escapeXmlAttr(attachment.attachmentType)}"></dyad-attachment>\n`;

      if (attachment.attachmentType === "upload-to-codebase") {
        attachmentInfo += `\n\nFile to upload to codebase: "${attachment.name}" (path: ${persistentPath})\nUse the copy_file tool (or <dyad-copy> tag) to copy this file into the codebase at the appropriate location.\n`;
      } else {
        attachmentInfo += `- ${attachment.name} (${attachment.type})\n`;
        if (await isTextFile(persistentPath)) {
          try {
            attachmentInfo += `<dyad-text-attachment filename="${escapeXmlAttr(attachment.name)}" type="${escapeXmlAttr(attachment.type)}" path="${escapeXmlAttr(persistentPath)}">
            </dyad-text-attachment>
            \n\n`;
          } catch (err) {
            logger.error(`Error reading file content: ${err}`);
          }
        }
      }
    }
  }

  return { attachmentInfo, displayAttachmentInfo };
}

export async function processSelectedComponents(selectedComponents: any[], appPath: string) {
  let componentsInfo = "";
  if (selectedComponents && selectedComponents.length > 0) {
    componentsInfo += "\n\nSelected components:\n";

    for (const component of selectedComponents) {
      let componentSnippet = "[component snippet not available]";
      try {
        const componentFileContent = await readFile(
          path.join(getDyadAppPath(appPath), component.relativePath),
          "utf8",
        );
        const lines = componentFileContent.split(/\r?\n/);
        const selectedIndex = component.lineNumber - 1;

        const startIndex = Math.max(0, selectedIndex - 1);
        const endIndex = Math.min(lines.length, selectedIndex + 4);

        const snippetLines = lines.slice(startIndex, endIndex);
        const selectedLineInSnippetIndex = selectedIndex - startIndex;

        if (snippetLines[selectedLineInSnippetIndex]) {
          snippetLines[selectedLineInSnippetIndex] =
            `${snippetLines[selectedLineInSnippetIndex]} // <-- EDIT HERE`;
        }

        componentSnippet = snippetLines.join("\n");
      } catch (err) {
        logger.error(
          `Error reading selected component file content: ${err}`,
        );
      }

      componentsInfo += `\n${selectedComponents.length > 1 ? `${selectedComponents.indexOf(component) + 1}. ` : ""}Component: ${component.name} (file: ${component.relativePath})

Snippet:
\`\`\`
${componentSnippet}
\`\`\`
`;
    }
  }
  return componentsInfo;
}

export async function buildSystemPrompt(
  prompt: string,
  app: any,
  settings: any,
  mentionedAppsCodebases: any[],
) {
  const aiRules = await readAiRules(getDyadAppPath(app.path));
  const themePrompt = await getThemePromptById(app.themeId);
  
  let systemPrompt = constructSystemPrompt({
    aiRules,
    chatMode: settings.selectedChatMode,
    enableTurboEditsV2: isTurboEditsV2Enabled(settings),
    themePrompt,
    basicAgentMode: isBasicAgentMode(settings),
  });

  if (mentionedAppsCodebases.length > 0) {
    const mentionedAppsList = mentionedAppsCodebases
      .map(({ appName }) => appName)
      .join(", ");

    systemPrompt += `\n\n# Referenced Apps\nThe user has mentioned the following apps in their prompt: ${mentionedAppsList}. Their codebases have been included in the context for your reference. When referring to these apps, you can understand their structure and code to provide better assistance, however you should NOT edit the files in these referenced apps. The referenced apps are NOT part of the current app and are READ-ONLY.`;
  }

  const isSecurityReviewIntent = prompt.startsWith("/security-review");
  if (isSecurityReviewIntent) {
    systemPrompt = SECURITY_REVIEW_SYSTEM_PROMPT;
  }

  return systemPrompt;
}
