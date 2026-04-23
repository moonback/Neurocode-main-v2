import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import type { ModelMessage } from "ai";

export const AI_MESSAGES_SDK_VERSION = "ai@v6" as const;

export type AiMessagesJsonV6 = {
  messages: ModelMessage[];
  sdkVersion: typeof AI_MESSAGES_SDK_VERSION;
};

export const prompts = sqliteTable(
  "prompts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    slug: text("slug"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("prompts_slug_unique").on(table.slug)],
);

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  githubOrg: text("github_org"),
  githubRepo: text("github_repo"),
  githubBranch: text("github_branch"),
  supabaseProjectId: text("supabase_project_id"),
  // If supabaseProjectId is a branch, then the parent project id set.
  // This is because there's no way to retrieve ALL the branches for ALL projects
  // in a single API call
  // This is only used for display purposes but is NOT used for any actual
  // supabase management logic.
  supabaseParentProjectId: text("supabase_parent_project_id"),
  // Supabase organization slug for credential lookup
  supabaseOrganizationSlug: text("supabase_organization_slug"),
  neonProjectId: text("neon_project_id"),
  neonDevelopmentBranchId: text("neon_development_branch_id"),
  neonPreviewBranchId: text("neon_preview_branch_id"),
  neonActiveBranchId: text("neon_active_branch_id"),
  vercelProjectId: text("vercel_project_id"),
  vercelProjectName: text("vercel_project_name"),
  vercelTeamId: text("vercel_team_id"),
  vercelDeploymentUrl: text("vercel_deployment_url"),
  installCommand: text("install_command"),
  startCommand: text("start_command"),
  chatContext: text("chat_context", { mode: "json" }),
  isFavorite: integer("is_favorite", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  // Theme ID for design system theming (null means "no theme")
  themeId: text("theme_id"),
});

export const chats = sqliteTable("chats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  title: text("title"),
  initialCommitHash: text("initial_commit_hash"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  // Context compaction fields
  compactedAt: integer("compacted_at", { mode: "timestamp" }),
  compactionBackupPath: text("compaction_backup_path"),
  pendingCompaction: integer("pending_compaction", { mode: "boolean" }),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  approvalState: text("approval_state", {
    enum: ["approved", "rejected"],
  }),
  // The commit hash of the codebase at the time the message was created
  sourceCommitHash: text("source_commit_hash"),
  // The commit hash of the codebase at the time the message was sent
  commitHash: text("commit_hash"),
  requestId: text("request_id"),
  // Max tokens used for this message (only for assistant messages)
  maxTokensUsed: integer("max_tokens_used"),
  // Model name used for this message (only for assistant messages)
  model: text("model"),
  // AI SDK messages (v5 envelope) for preserving tool calls/results in agent mode
  aiMessagesJson: text("ai_messages_json", {
    mode: "json",
  }).$type<AiMessagesJsonV6 | null>(),
  // Track if this message used the free agent quota (for non-Pro users)
  usingFreeAgentModeQuota: integer("using_free_agent_mode_quota", {
    mode: "boolean",
  }),
  // Indicates this message is a compaction summary
  isCompactionSummary: integer("is_compaction_summary", { mode: "boolean" }),
  // Token optimization fields
  isPinned: integer("is_pinned", { mode: "boolean" }),
  lastPriorityScore: real("last_priority_score"),
  referenceCount: integer("reference_count"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const versions = sqliteTable(
  "versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    commitHash: text("commit_hash").notNull(),
    neonDbTimestamp: text("neon_db_timestamp"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    // Unique constraint to prevent duplicate versions
    unique("versions_app_commit_unique").on(table.appId, table.commitHash),
  ],
);

// Define relations
export const appsRelations = relations(apps, ({ many }) => ({
  chats: many(chats),
  versions: many(versions),
  tokenOptimizationConfigs: many(tokenOptimizationConfig),
  costRecords: many(costRecords),
}));

export const chatsRelations = relations(chats, ({ many, one }) => ({
  messages: many(messages),
  app: one(apps, {
    fields: [chats.appId],
    references: [apps.id],
  }),
  costRecords: many(costRecords),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
  costRecords: many(costRecords),
  priorities: many(messagePriorities),
}));

export const language_model_providers = sqliteTable(
  "language_model_providers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    api_base_url: text("api_base_url").notNull(),
    env_var_name: text("env_var_name"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

export const language_models = sqliteTable("language_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull(),
  apiName: text("api_name").notNull(),
  builtinProviderId: text("builtin_provider_id"),
  customProviderId: text("custom_provider_id").references(
    () => language_model_providers.id,
    {
      onDelete: "cascade",
    },
  ),
  description: text("description"),
  max_output_tokens: integer("max_output_tokens"),
  context_window: integer("context_window"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Define relations for new tables
export const languageModelProvidersRelations = relations(
  language_model_providers,
  ({ many }) => ({
    languageModels: many(language_models),
  }),
);

export const languageModelsRelations = relations(
  language_models,
  ({ one }) => ({
    provider: one(language_model_providers, {
      fields: [language_models.customProviderId],
      references: [language_model_providers.id],
    }),
  }),
);

export const versionsRelations = relations(versions, ({ one }) => ({
  app: one(apps, {
    fields: [versions.appId],
    references: [apps.id],
  }),
}));

// --- MCP (Model Context Protocol) tables ---
export const mcpServers = sqliteTable("mcp_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  transport: text("transport").notNull(),
  command: text("command"),
  // Store typed JSON for args and environment variables
  args: text("args", { mode: "json" }).$type<string[] | null>(),
  envJson: text("env_json", { mode: "json" }).$type<Record<
    string,
    string
  > | null>(),
  headersJson: text("headers_json", { mode: "json" }).$type<Record<
    string,
    string
  > | null>(),
  url: text("url"),
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const mcpToolConsents = sqliteTable(
  "mcp_tool_consents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serverId: integer("server_id")
      .notNull()
      .references(() => mcpServers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    consent: text("consent").notNull().default("ask"), // ask | always | denied
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [unique("uniq_mcp_consent").on(table.serverId, table.toolName)],
);

// --- Custom Themes table ---
export const customThemes = sqliteTable("custom_themes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- Token Optimization tables ---

// Token optimization configuration (per-app or global)
export const tokenOptimizationConfig = sqliteTable(
  "token_optimization_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id").references(() => apps.id, {
      onDelete: "cascade",
    }), // null for global config
    config: text("config", { mode: "json" }).$type<{
      pruningStrategy: "conservative" | "balanced" | "aggressive";
      enableAutoPruning: boolean;
      pruningThreshold: number;
      tokenAllocation: {
        inputContextRatio: number;
        systemInstructionsRatio: number;
        outputGenerationRatio: number;
      };
      enableCostTracking: boolean;
      costBudget?: {
        amount: number;
        period: "daily" | "weekly" | "monthly";
        warningThreshold: number;
      };
      enableMessagePinning: boolean;
      slidingWindowSize?: number;
      coordinateWithCompaction: boolean;
      coordinateWithSmartContext: boolean;
    }>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// Cost records for token usage tracking
export const costRecords = sqliteTable("cost_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  provider: text("provider").notNull(),
  appId: integer("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  chatId: integer("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  messageId: integer("message_id").references(() => messages.id, {
    onDelete: "cascade",
  }),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  toolTokens: integer("tool_tokens").notNull().default(0),
  inputCost: real("input_cost").notNull(), // USD
  outputCost: real("output_cost").notNull(), // USD
  totalCost: real("total_cost").notNull(), // USD
  model: text("model").notNull(),
});

// Message priority scores for intelligent history management
export const messagePriorities = sqliteTable("message_priorities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  messageId: integer("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  score: real("score").notNull(), // 0-100
  recencyFactor: real("recency_factor").notNull(),
  interactionFactor: real("interaction_factor").notNull(),
  relevanceFactor: real("relevance_factor").notNull(),
  referenceCount: integer("reference_count").notNull().default(0),
  isPinned: integer("is_pinned", { mode: "boolean" })
    .notNull()
    .default(sql`0`),
  calculatedAt: integer("calculated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Provider pricing information
export const providerPricing = sqliteTable("provider_pricing", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: text("provider_id").notNull().unique(),
  inputTokensPerMillion: real("input_tokens_per_million").notNull(),
  outputTokensPerMillion: real("output_tokens_per_million").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Token optimization relations
export const tokenOptimizationConfigRelations = relations(
  tokenOptimizationConfig,
  ({ one }) => ({
    app: one(apps, {
      fields: [tokenOptimizationConfig.appId],
      references: [apps.id],
    }),
  }),
);

export const costRecordsRelations = relations(costRecords, ({ one }) => ({
  app: one(apps, {
    fields: [costRecords.appId],
    references: [apps.id],
  }),
  chat: one(chats, {
    fields: [costRecords.chatId],
    references: [chats.id],
  }),
  message: one(messages, {
    fields: [costRecords.messageId],
    references: [messages.id],
  }),
}));

export const messagePrioritiesRelations = relations(
  messagePriorities,
  ({ one }) => ({
    message: one(messages, {
      fields: [messagePriorities.messageId],
      references: [messages.id],
    }),
  }),
);
