import { db } from "../../db";
import { chats, costRecords } from "../../db/schema";
import { eq, sql, desc, gte, and } from "drizzle-orm";
import {
  constructSystemPrompt,
  readAiRules,
} from "../../prompts/system_prompt";
import { getThemePromptById } from "../utils/theme_utils";
import {
  getSupabaseAvailableSystemPrompt,
  SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT,
} from "../../prompts/supabase_prompt";
import { buildNeonPromptForApp } from "../../neon_admin/neon_prompt_context";
import { getDyadAppPath } from "../../paths/paths";
import log from "electron-log";
import { extractCodebase } from "../../utils/codebase";
import {
  getSupabaseContext,
  getSupabaseClientCode,
} from "../../supabase_admin/supabase_context";

import { TokenCountParams, TokenCountResult } from "@/ipc/types";
import { estimateTokens, getContextWindow } from "../utils/token_utils";
import { createLoggedHandler } from "./safe_handle";
import { validateChatContext } from "../utils/context_paths_utils";
import { readSettings } from "@/main/settings";
import { extractMentionedAppsCodebases } from "../utils/mention_apps";
import { parseAppMentions } from "@/shared/parse_mention_apps";
import { isTurboEditsV2Enabled } from "@/lib/schemas";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("token_count_handlers");

const handle = createLoggedHandler(logger);

export async function calculateTokenBreakdown(chatId: number, input: string) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
      app: true,
    },
  });

  if (!chat) {
    throw new DyadError(`Chat not found: ${chatId}`, DyadErrorKind.NotFound);
  }

  // Prepare message history for token counting
  const messageHistory = chat.messages
    .map((message) => {
      if (message.aiMessagesJson?.messages) {
        // If we have AI SDK messages, they include tool calls and results
        return message.aiMessagesJson.messages
          .map((m) => {
            let content = "";
            if (typeof m.content === "string") {
              content = m.content;
            } else if (Array.isArray(m.content)) {
              content = m.content
                .map((part) =>
                  part.type === "text"
                    ? part.text
                    : part.type === "tool-call"
                      ? JSON.stringify(part.args)
                      : "",
                )
                .join("");
            }

            // Add tool invocations if any (older SDK versions)
            const toolInvocations = (m as any).toolInvocations;
            if (Array.isArray(toolInvocations)) {
              content += toolInvocations
                .map((ti) => JSON.stringify(ti.args) + JSON.stringify(ti.result))
                .join("");
            }

            return content;
          })
          .join("");
      }
      return message.content;
    })
    .join("");
  const messageHistoryTokens = estimateTokens(messageHistory);

  // Count input tokens
  const inputTokens = estimateTokens(input);

  const settings = readSettings();

  // Parse app mentions from the input
  const mentionedAppNames = parseAppMentions(input);

  // Count system prompt tokens
  const themePrompt = await getThemePromptById(chat.app?.themeId ?? null);
  let systemPrompt = constructSystemPrompt({
    aiRules: await readAiRules(getDyadAppPath(chat.app.path)),
    chatMode:
      settings.selectedChatMode === "local-agent"
        ? "build"
        : settings.selectedChatMode,
    enableTurboEditsV2: isTurboEditsV2Enabled(settings),
    themePrompt,
  });
  let supabaseContext = "";

  if (chat.app?.supabaseProjectId) {
    const supabaseClientCode = await getSupabaseClientCode({
      projectId: chat.app.supabaseProjectId,
      organizationSlug: chat.app.supabaseOrganizationSlug ?? null,
    });
    systemPrompt +=
      "\n\n" + getSupabaseAvailableSystemPrompt(supabaseClientCode);
    supabaseContext = await getSupabaseContext({
      supabaseProjectId: chat.app.supabaseProjectId,
      organizationSlug: chat.app.supabaseOrganizationSlug ?? null,
    });
  } else if (chat.app?.neonProjectId) {
    systemPrompt +=
      "\n\n" +
      (await buildNeonPromptForApp({
        appPath: chat.app.path,
        neonProjectId: chat.app.neonProjectId!,
        neonActiveBranchId: chat.app.neonActiveBranchId,
        neonDevelopmentBranchId: chat.app.neonDevelopmentBranchId,
        selectedChatMode: settings.selectedChatMode ?? "",
      }));
  } else {
    systemPrompt += "\n\n" + SUPABASE_NOT_AVAILABLE_SYSTEM_PROMPT;
  }

  const systemPromptTokens = estimateTokens(systemPrompt + supabaseContext);

  // Extract codebase information if app is associated with the chat
  let codebaseInfo = "";
  let codebaseTokens = 0;

  if (chat.app) {
    const appPath = getDyadAppPath(chat.app.path);
    const { formattedOutput, files } = await extractCodebase({
      appPath,
      chatContext: validateChatContext(chat.app.chatContext),
    });
    codebaseInfo = formattedOutput;
    if (settings.enableDyadPro && settings.enableProSmartFilesContextMode) {
      codebaseTokens = estimateTokens(
        files
          .map((file) => `<dyad-file=${file.path}>${file.content}</dyad-file>`)
          .join("\n\n"),
      );
    } else {
      codebaseTokens = estimateTokens(codebaseInfo);
    }
  }

  // Extract codebases for mentioned apps
  const mentionedAppsCodebases = await extractMentionedAppsCodebases(
    mentionedAppNames,
    chat.app?.id,
  );

  // Calculate tokens for mentioned apps
  let mentionedAppsTokens = 0;
  if (mentionedAppsCodebases.length > 0) {
    const mentionedAppsContent = mentionedAppsCodebases
      .map(
        ({ appName, codebaseInfo }) =>
          `\n\n=== Referenced App: ${appName} ===\n${codebaseInfo}`,
      )
      .join("");

    mentionedAppsTokens = estimateTokens(mentionedAppsContent);
  }

  // Calculate total tokens
  const totalTokens =
    messageHistoryTokens +
    inputTokens +
    systemPromptTokens +
    codebaseTokens +
    mentionedAppsTokens;

  // Find the last assistant message
  const lastAssistantMessage = [...chat.messages]
    .reverse()
    .find((m) => m.role === "assistant");
  const actualMaxTokens = lastAssistantMessage?.maxTokensUsed ?? null;

  return {
    estimatedTotalTokens: totalTokens,
    actualMaxTokens,
    messageHistoryTokens,
    codebaseTokens,
    mentionedAppsTokens,
    inputTokens,
    systemPromptTokens,
    contextWindow: await getContextWindow(),
  };
}

export function registerTokenCountHandlers() {
  handle(
    "chat:count-tokens",
    async (event, req: TokenCountParams): Promise<TokenCountResult> => {
      return calculateTokenBreakdown(req.chatId, req.input);
    },
  );

  handle(
    "chat:get-token-usage",
    async (event, req: { chatId?: number; days?: number }) => {
      const conditions = [];
      if (req.chatId) {
        conditions.push(eq(costRecords.chatId, req.chatId));
      }
      if (req.days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - req.days);
        conditions.push(gte(costRecords.timestamp, startDate));
      }

      let query = db.select().from(costRecords);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const results = await query.orderBy(desc(costRecords.timestamp));
      return results.map((r) => ({
        ...r,
        cost: r.totalCost,
      }));
    },
  );

  handle(
    "chat:get-token-usage-dashboard",
    async (event, req: { days?: number }) => {
      const days = req.days || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await db
        .select()
        .from(costRecords)
        .where(gte(costRecords.timestamp, startDate))
        .orderBy(costRecords.timestamp);

      const usageByDay: Record<string, any> = {};
      const usageByModel: Record<string, any> = {};
      let totalTokens = 0;
      let totalCost = 0;

      records.forEach((r) => {
        const date = r.timestamp.toISOString().split("T")[0];
        if (!usageByDay[date]) {
          usageByDay[date] = {
            date,
            inputTokens: 0,
            outputTokens: 0,
            toolTokens: 0,
            cost: 0,
          };
        }
        usageByDay[date].inputTokens += r.inputTokens;
        usageByDay[date].outputTokens += r.outputTokens;
        usageByDay[date].toolTokens += r.toolTokens;
        usageByDay[date].cost += r.totalCost;

        if (!usageByModel[r.model]) {
          usageByModel[r.model] = { model: r.model, tokens: 0, cost: 0 };
        }
        const recordTokens = r.inputTokens + r.outputTokens + r.toolTokens;
        usageByModel[r.model].tokens += recordTokens;
        usageByModel[r.model].cost += r.totalCost;

        totalTokens += recordTokens;
        totalCost += r.totalCost;
      });

      return {
        totalTokens,
        totalCost,
        usageByDay: Object.values(usageByDay),
        usageByModel: Object.values(usageByModel),
      };
    },
  );
}
