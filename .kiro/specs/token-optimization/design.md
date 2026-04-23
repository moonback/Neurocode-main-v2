# Design Document: Token Optimization

## Overview

The Token Optimization system is a comprehensive solution for managing token consumption and costs across multiple LLM providers in the Dyad application. This feature builds upon the existing context compaction system to provide more granular control, intelligent pruning strategies, provider-specific optimizations, and detailed cost tracking.

### Goals

1. **Reduce Token Consumption**: Implement aggressive context pruning strategies that maintain conversation quality while significantly reducing token usage
2. **Provider Optimization**: Dynamically adjust token allocation based on each provider's context window and pricing model
3. **Cost Visibility**: Provide real-time cost tracking and budgeting capabilities to help users control AI-related expenses
4. **Intelligent History Management**: Preserve critical context while removing redundant or low-priority information
5. **Seamless Integration**: Work harmoniously with existing systems (context compaction, Smart Context, MCP tools) without conflicts

### Non-Goals

- Replacing the existing context compaction system (we extend and enhance it)
- Implementing custom tokenization algorithms (we use provider-specific token counting)
- Modifying LLM provider APIs or pricing structures
- Providing real-time token streaming during generation (we track post-generation)

### Key Design Decisions

1. **Layered Architecture**: Token optimization operates as a layer above the existing compaction system, coordinating multiple subsystems (pruning, allocation, tracking) through a central orchestrator
2. **Provider-Agnostic Core**: The core optimization logic is provider-agnostic, with provider-specific configurations injected through a registry pattern
3. **Message Priority Scoring**: We use a multi-factor scoring system (recency, user interaction, semantic relevance, reference count) to determine message retention priority
4. **Non-Destructive Pruning**: Original messages are always preserved in the database; pruning only affects what's sent to the LLM
5. **Incremental Adoption**: All optimization features can be enabled/disabled independently, allowing gradual rollout and user customization

## Architecture

### System Components

The token optimization system consists of five primary subsystems coordinated by a central orchestrator:

```
┌─────────────────────────────────────────────────────────────┐
│                   Token Optimizer (Orchestrator)             │
│  - Coordinates all subsystems                                │
│  - Manages configuration and settings                        │
│  - Provides unified API for IPC handlers                     │
└────────────┬────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────┬──────────┬──────────┐
    │                 │          │          │          │
┌───▼────┐  ┌────────▼───┐  ┌───▼────┐  ┌──▼─────┐  ┌▼────────┐
│Context │  │  Message   │  │ Token  │  │  Cost  │  │Analytics│
│Pruner  │  │  History   │  │Allocat │  │Tracker │  │ Engine  │
│        │  │  Manager   │  │  or    │  │        │  │         │
└────────┘  └────────────┘  └────────┘  └────────┘  └─────────┘
```

### Component Responsibilities

#### Token Optimizer (Orchestrator)

- **Location**: `src/ipc/handlers/token_optimization/token_optimizer.ts`
- **Responsibilities**:
  - Coordinate pruning, allocation, and tracking operations
  - Load and manage user configuration
  - Provide unified API for local agent handler and chat stream handlers
  - Ensure subsystems don't conflict with existing compaction system
  - Emit analytics events for monitoring

#### Context Pruner

- **Location**: `src/ipc/handlers/token_optimization/context_pruner.ts`
- **Responsibilities**:
  - Implement three pruning strategies: conservative, balanced, aggressive
  - Remove or compress low-priority messages based on token budget
  - Preserve critical messages (system, recent user/assistant)
  - Detect and compress repetitive patterns
  - Coordinate with existing compaction to avoid duplicate work

#### Message History Manager

- **Location**: `src/ipc/handlers/token_optimization/message_history_manager.ts`
- **Responsibilities**:
  - Calculate message priority scores using multi-factor algorithm
  - Track message references and dependencies
  - Support manual message pinning
  - Generate summaries of removed message sequences
  - Implement sliding window algorithm for high-priority retention

#### Token Allocator

- **Location**: `src/ipc/handlers/token_optimization/token_allocator.ts`
- **Responsibilities**:
  - Maintain provider configuration registry (context windows, pricing, optimal ratios)
  - Calculate token budgets based on selected provider
  - Allocate tokens across input context, system instructions, and output generation
  - Handle provider switches mid-conversation
  - Reserve minimum tokens for output to prevent truncation
  - Provide real-time token usage feedback

#### Cost Tracker

- **Location**: `src/ipc/handlers/token_optimization/cost_tracker.ts`
- **Responsibilities**:
  - Maintain up-to-date pricing information for all providers
  - Calculate costs for input and output tokens separately
  - Aggregate costs by provider, application, conversation, and time period
  - Enforce cost budgets with warnings and hard limits
  - Generate cost reports and export data
  - Provide cost comparison visualizations

#### Analytics Engine

- **Location**: `src/ipc/handlers/token_optimization/analytics_engine.ts`
- **Responsibilities**:
  - Collect metrics on token usage, pruning effectiveness, and costs
  - Calculate optimization statistics (tokens saved, cost reduction)
  - Identify high-consumption conversations and applications
  - Generate trend visualizations
  - Export analytics data for external tools

### Integration Points

#### With Existing Context Compaction

- Token optimization runs **before** compaction triggers
- If optimization reduces tokens below compaction threshold, compaction is skipped
- If compaction has already occurred, optimization works with post-compaction messages
- Both systems respect the `enableContextCompaction` setting

#### With Smart Context

- Token allocator coordinates with Smart Context to avoid duplicate file selection
- Smart Context strategy (balanced/deep) influences token budget allocation
- File inclusion tokens are accounted for in total budget calculations

#### With Local Agent Handler

- Token optimizer is invoked before building message array for LLM
- Pruned message array is passed to model client
- Token usage from response is reported back to cost tracker
- Compaction trigger logic is updated to check optimization first

#### With IPC Layer

- New IPC channels for configuration, cost queries, and analytics
- Follows existing Electron security patterns (validation, app-scoped operations)
- Uses TanStack Query for frontend data fetching
- Emits events for real-time cost updates

## Components and Interfaces

### Core Interfaces

```typescript
// Token Optimization Configuration
interface TokenOptimizationConfig {
  // Pruning settings
  pruningStrategy: "conservative" | "balanced" | "aggressive";
  enableAutoPruning: boolean;
  pruningThreshold: number; // Percentage of context window (default: 80)

  // Token allocation settings
  tokenAllocation: {
    inputContextRatio: number; // 0-1, default: 0.7
    systemInstructionsRatio: number; // 0-1, default: 0.1
    outputGenerationRatio: number; // 0-1, default: 0.2
  };

  // Cost tracking settings
  enableCostTracking: boolean;
  costBudget?: {
    amount: number; // USD
    period: "daily" | "weekly" | "monthly";
    warningThreshold: number; // Percentage (default: 80)
  };

  // Message history settings
  enableMessagePinning: boolean;
  slidingWindowSize?: number; // Number of high-priority messages to retain

  // Integration settings
  coordinateWithCompaction: boolean; // Default: true
  coordinateWithSmartContext: boolean; // Default: true
}

// Message Priority Score
interface MessagePriority {
  messageId: number;
  score: number; // 0-100
  factors: {
    recency: number; // 0-100
    userInteraction: number; // 0-100 (edits, approvals)
    semanticRelevance: number; // 0-100
    referenceCount: number; // Number of times referenced by later messages
  };
  isPinned: boolean;
  isProtected: boolean; // System messages, recent user/assistant
}

// Provider Configuration
interface ProviderConfig {
  providerId: string;
  contextWindow: number;
  maxOutputTokens?: number;
  pricing: {
    inputTokensPerMillion: number; // USD per 1M input tokens
    outputTokensPerMillion: number; // USD per 1M output tokens
    lastUpdated: Date;
  };
  optimalAllocation: {
    inputContextRatio: number;
    systemInstructionsRatio: number;
    outputGenerationRatio: number;
  };
  supportsExtendedContext: boolean;
  extendedContextWindow?: number;
}

// Token Budget
interface TokenBudget {
  total: number;
  allocated: {
    inputContext: number;
    systemInstructions: number;
    outputGeneration: number;
  };
  used: {
    inputContext: number;
    systemInstructions: number;
    outputGeneration: number;
  };
  remaining: number;
  provider: string;
}

// Cost Record
interface CostRecord {
  id: number;
  timestamp: Date;
  provider: string;
  appId: number;
  chatId: number;
  messageId: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number; // USD
  outputCost: number; // USD
  totalCost: number; // USD
  model: string;
}

// Pruning Result
interface PruningResult {
  originalMessageCount: number;
  prunedMessageCount: number;
  tokensRemoved: number;
  strategy: "conservative" | "balanced" | "aggressive";
  preservedMessages: number[];
  removedMessages: number[];
  compressionSummaries: Array<{
    messageRange: [number, number];
    summary: string;
  }>;
}

// Analytics Metrics
interface OptimizationMetrics {
  period: {
    start: Date;
    end: Date;
  };
  tokenUsage: {
    total: number;
    byProvider: Record<string, number>;
    byApp: Record<number, number>;
    saved: number; // Tokens saved through optimization
  };
  costs: {
    total: number;
    byProvider: Record<string, number>;
    byApp: Record<number, number>;
    saved: number; // Cost saved through optimization
  };
  pruningEffectiveness: {
    averageReduction: number; // Percentage
    strategyBreakdown: Record<string, number>;
  };
  highConsumptionConversations: Array<{
    chatId: number;
    appId: number;
    totalTokens: number;
    totalCost: number;
  }>;
}
```

### IPC Channels

```typescript
// Configuration
'token-optimization:get-config': () => Promise<TokenOptimizationConfig>
'token-optimization:update-config': (config: Partial<TokenOptimizationConfig>) => Promise<void>
'token-optimization:reset-config': () => Promise<void>

// Cost Tracking
'token-optimization:get-costs': (params: {
  startDate?: Date;
  endDate?: Date;
  appId?: number;
  chatId?: number;
  provider?: string;
}) => Promise<CostRecord[]>

'token-optimization:get-cost-summary': (params: {
  period: 'daily' | 'weekly' | 'monthly';
  appId?: number;
}) => Promise<{
  total: number;
  byProvider: Record<string, number>;
  budget?: { amount: number; remaining: number };
}>

'token-optimization:export-costs': (params: {
  format: 'csv' | 'json';
  startDate?: Date;
  endDate?: Date;
}) => Promise<string> // File path

// Message Management
'token-optimization:pin-message': (messageId: number) => Promise<void>
'token-optimization:unpin-message': (messageId: number) => Promise<void>
'token-optimization:get-message-priority': (messageId: number) => Promise<MessagePriority>

// Analytics
'token-optimization:get-metrics': (params: {
  startDate?: Date;
  endDate?: Date;
  appId?: number;
}) => Promise<OptimizationMetrics>

'token-optimization:export-analytics': (params: {
  format: 'json';
  startDate?: Date;
  endDate?: Date;
}) => Promise<string> // File path

// Real-time Events
'token-optimization:cost-update': (data: {
  chatId: number;
  incrementalCost: number;
  totalCost: number;
}) => void

'token-optimization:budget-warning': (data: {
  currentSpend: number;
  budget: number;
  percentage: number;
}) => void

'token-optimization:budget-exceeded': (data: {
  currentSpend: number;
  budget: number;
}) => void
```

### Database Schema Extensions

```typescript
// New table: token_optimization_config
// Stores per-app or global optimization configuration
export const tokenOptimizationConfig = sqliteTable(
  "token_optimization_config",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appId: integer("app_id").references(() => apps.id, { onDelete: "cascade" }), // null for global
    config: text("config", { mode: "json" }).$type<TokenOptimizationConfig>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// New table: cost_records
// Stores token usage and cost information
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
  inputCost: real("input_cost").notNull(), // USD
  outputCost: real("output_cost").notNull(), // USD
  totalCost: real("total_cost").notNull(), // USD
  model: text("model").notNull(),
});

// New table: message_priorities
// Stores calculated priority scores for messages
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
  isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
  calculatedAt: integer("calculated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// New table: provider_pricing
// Stores current pricing information for providers
export const providerPricing = sqliteTable("provider_pricing", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  providerId: text("provider_id").notNull().unique(),
  inputTokensPerMillion: real("input_tokens_per_million").notNull(),
  outputTokensPerMillion: real("output_tokens_per_million").notNull(),
  lastUpdated: integer("last_updated", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Extend messages table with optimization metadata
// (Add columns via migration)
// - isPinned: boolean (user-pinned messages)
// - lastPriorityScore: real (cached priority score)
// - referenceCount: integer (number of references from later messages)
```

## Data Models

### Message Priority Calculation

The message priority score is calculated using a weighted combination of four factors:

```typescript
function calculateMessagePriority(
  message: Message,
  allMessages: Message[],
  userInteractions: UserInteraction[],
): MessagePriority {
  // Factor 1: Recency (40% weight)
  // More recent messages get higher scores
  const recencyScore = calculateRecencyScore(message, allMessages);

  // Factor 2: User Interaction (30% weight)
  // Messages that were edited, approved, or explicitly referenced get higher scores
  const interactionScore = calculateInteractionScore(message, userInteractions);

  // Factor 3: Semantic Relevance (20% weight)
  // Messages semantically similar to recent context get higher scores
  const relevanceScore = calculateSemanticRelevance(message, allMessages);

  // Factor 4: Reference Count (10% weight)
  // Messages referenced by later messages get higher scores
  const referenceScore = calculateReferenceScore(message, allMessages);

  const totalScore =
    recencyScore * 0.4 +
    interactionScore * 0.3 +
    relevanceScore * 0.2 +
    referenceScore * 0.1;

  return {
    messageId: message.id,
    score: totalScore,
    factors: {
      recency: recencyScore,
      userInteraction: interactionScore,
      semanticRelevance: relevanceScore,
      referenceCount: message.referenceCount || 0,
    },
    isPinned: message.isPinned || false,
    isProtected: isProtectedMessage(message, allMessages),
  };
}

function isProtectedMessage(message: Message, allMessages: Message[]): boolean {
  // System messages are always protected
  if (message.role === "system") return true;

  // Most recent user message is protected
  const latestUserMessage = [...allMessages]
    .reverse()
    .find((m) => m.role === "user");
  if (message.id === latestUserMessage?.id) return true;

  // Most recent assistant message is protected
  const latestAssistantMessage = [...allMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (message.id === latestAssistantMessage?.id) return true;

  // Compaction summaries are protected
  if (message.isCompactionSummary) return true;

  return false;
}
```

### Pruning Strategies

Three pruning strategies with different aggressiveness levels:

#### Conservative Strategy

- **Threshold**: 85% of context window
- **Retention**: Top 70% of messages by priority
- **Compression**: Minimal (only exact duplicates)
- **Use Case**: Users who prioritize conversation quality over cost

#### Balanced Strategy (Default)

- **Threshold**: 80% of context window
- **Retention**: Top 50% of messages by priority
- **Compression**: Moderate (duplicates + repetitive patterns)
- **Use Case**: Most users seeking good balance

#### Aggressive Strategy

- **Threshold**: 70% of context window
- **Retention**: Top 30% of messages by priority
- **Compression**: Maximum (duplicates + patterns + semantic clustering)
- **Use Case**: Users prioritizing cost savings, long conversations

```typescript
interface PruningStrategy {
  name: "conservative" | "balanced" | "aggressive";
  threshold: number; // Percentage of context window
  retentionPercentage: number; // Percentage of messages to retain
  compressionLevel: "minimal" | "moderate" | "maximum";

  shouldPrune(currentTokens: number, contextWindow: number): boolean;
  selectMessagesToRemove(
    messages: Message[],
    priorities: MessagePriority[],
    targetTokens: number,
  ): number[]; // Message IDs to remove
  compressMessages(messages: Message[]): string; // Summary
}
```

### Provider Configuration Registry

Provider-specific configurations are stored in a registry:

```typescript
const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  "openai/gpt-4": {
    providerId: "openai/gpt-4",
    contextWindow: 128_000,
    maxOutputTokens: 4_096,
    pricing: {
      inputTokensPerMillion: 30.0,
      outputTokensPerMillion: 60.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.7,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.2,
    },
    supportsExtendedContext: false,
  },
  "anthropic/claude-3.5-sonnet": {
    providerId: "anthropic/claude-3.5-sonnet",
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    pricing: {
      inputTokensPerMillion: 3.0,
      outputTokensPerMillion: 15.0,
      lastUpdated: new Date("2024-01-01"),
    },
    optimalAllocation: {
      inputContextRatio: 0.75,
      systemInstructionsRatio: 0.1,
      outputGenerationRatio: 0.15,
    },
    supportsExtendedContext: false,
  },
  // ... configurations for all supported providers
};
```

### Token Budget Calculation

Token budgets are calculated dynamically based on provider and user settings:

```typescript
function calculateTokenBudget(
  provider: string,
  userConfig: TokenOptimizationConfig,
): TokenBudget {
  const providerConfig = PROVIDER_CONFIGS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const totalTokens = providerConfig.contextWindow;

  // Use user-configured ratios if available, otherwise use provider optimal
  const allocation =
    userConfig.tokenAllocation || providerConfig.optimalAllocation;

  return {
    total: totalTokens,
    allocated: {
      inputContext: Math.floor(totalTokens * allocation.inputContextRatio),
      systemInstructions: Math.floor(
        totalTokens * allocation.systemInstructionsRatio,
      ),
      outputGeneration: Math.floor(
        totalTokens * allocation.outputGenerationRatio,
      ),
    },
    used: {
      inputContext: 0,
      systemInstructions: 0,
      outputGeneration: 0,
    },
    remaining: totalTokens,
    provider,
  };
}
```

## Error Handling

### Error Classification

All token optimization errors are classified using `DyadError` with appropriate `DyadErrorKind`:

```typescript
// Configuration errors (user-fixable)
throw new DyadError(
  DyadErrorKind.ValidationError,
  "Invalid pruning strategy: must be conservative, balanced, or aggressive",
);

// Budget exceeded (expected condition)
throw new DyadError(
  DyadErrorKind.UserRefusal,
  "Cost budget exceeded. Please increase budget or wait for next period.",
);

// Provider configuration missing (system issue)
throw new DyadError(
  DyadErrorKind.InternalError,
  `Provider configuration not found: ${provider}`,
);

// Database errors (system issue)
throw new DyadError(DyadErrorKind.DatabaseError, "Failed to store cost record");
```

### Error Recovery Strategies

1. **Configuration Errors**: Validate configuration on load, fall back to defaults if invalid
2. **Budget Exceeded**: Warn at 80%, block at 100%, allow user override
3. **Provider Pricing Missing**: Use fallback pricing, log warning, continue operation
4. **Pruning Failures**: Fall back to existing compaction system
5. **Database Errors**: Log error, continue without persistence (in-memory only)

### Graceful Degradation

If token optimization fails, the system gracefully degrades:

1. **Pruning Failure**: Use existing compaction system
2. **Cost Tracking Failure**: Continue without cost tracking, log warning
3. **Analytics Failure**: Continue without analytics, log warning
4. **Configuration Load Failure**: Use default configuration

## Testing Strategy

### Unit Tests

Unit tests focus on individual components and pure functions:

1. **Message Priority Calculation**
   - Test each factor calculation independently
   - Test weighted combination
   - Test protected message detection
   - Test edge cases (empty messages, single message)

2. **Pruning Strategies**
   - Test threshold detection
   - Test message selection for each strategy
   - Test compression algorithms
   - Test preservation of protected messages

3. **Token Budget Calculation**
   - Test allocation ratios
   - Test provider-specific calculations
   - Test user override handling
   - Test edge cases (zero tokens, negative values)

4. **Cost Calculation**
   - Test input/output token pricing
   - Test provider-specific pricing
   - Test aggregation by period/app/provider
   - Test budget enforcement

5. **Configuration Parsing/Serialization**
   - Test valid configuration parsing
   - Test invalid configuration handling
   - Test round-trip serialization
   - Test default value handling

### Integration Tests

Integration tests verify component interactions:

1. **Optimization Pipeline**
   - Test full optimization flow (pruning → allocation → tracking)
   - Test coordination with existing compaction
   - Test coordination with Smart Context
   - Test provider switching mid-conversation

2. **IPC Communication**
   - Test all IPC channels
   - Test error propagation
   - Test event emission
   - Test concurrent requests

3. **Database Operations**
   - Test cost record storage and retrieval
   - Test priority score persistence
   - Test configuration storage
   - Test migration from existing schema

4. **Settings Integration**
   - Test configuration persistence
   - Test preset profiles
   - Test per-app vs global settings
   - Test settings migration

### E2E Tests

E2E tests verify end-to-end user workflows:

1. **Cost Tracking Workflow**
   - User enables cost tracking
   - User sets budget
   - User has conversation
   - User views cost report
   - User receives budget warning

2. **Pruning Workflow**
   - User enables aggressive pruning
   - User has long conversation
   - System prunes messages
   - User verifies conversation quality maintained

3. **Message Pinning Workflow**
   - User pins important message
   - System prunes other messages
   - Pinned message is retained
   - User verifies pinned message in context

4. **Provider Switching Workflow**
   - User starts conversation with Provider A
   - User switches to Provider B
   - System recalculates token budget
   - System adjusts pruning if needed

### Property-Based Tests

Property-based tests verify universal properties across many inputs:

**Note**: Property-based testing is appropriate for this feature because it involves pure functions with clear input/output behavior (priority calculation, token allocation, cost calculation) and universal properties that should hold across a wide range of inputs.

Property-based tests will be implemented using `fast-check` (the existing PBT library in the project) with a minimum of 100 iterations per test. Each test will be tagged with a comment referencing the design property it validates.

Properties will be defined in the Correctness Properties section below after completing the prework analysis.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Pruning Threshold Trigger

_For any_ context window size and token count, pruning SHALL trigger if and only if the token count is greater than or equal to 80% of the context window size.

**Validates: Requirements 1.2**

### Property 2: Message Retention Guarantees

_For any_ message array and pruning operation, the following messages SHALL always be retained: system messages, the most recent user message, the most recent assistant message, compaction summary messages, and any user-pinned messages.

**Validates: Requirements 1.3, 2.5**

### Property 3: Priority-Based Retention Ordering

_For any_ message array with priority scores, when pruning removes messages to meet a token budget, all retained messages SHALL have priority scores greater than or equal to all removed messages (excluding protected messages).

**Validates: Requirements 1.4, 2.6**

### Property 4: Compression Before Removal

_For any_ message array containing repetitive content, the pruning algorithm SHALL attempt compression before removing messages entirely, and the number of compressed messages SHALL be greater than or equal to zero.

**Validates: Requirements 1.5**

### Property 5: Reference Preservation

_For any_ message array where message B references message A, if message B is retained after pruning, then message A SHALL also be retained, and message A's priority score SHALL be increased by the reference.

**Validates: Requirements 1.7, 2.4**

### Property 6: Priority Calculation Completeness

_For any_ message, the calculated priority score SHALL be in the range [0, 100], and SHALL incorporate all four factors: recency (40% weight), user interaction (30% weight), semantic relevance (20% weight), and reference count (10% weight).

**Validates: Requirements 2.1, 2.2**

### Property 7: Sliding Window High-Priority Retention

_For any_ message array with a sliding window size N, if a message has a priority score in the top N messages, it SHALL be retained even if it falls outside the standard retention window.

**Validates: Requirements 2.3**

### Property 8: Token Budget Allocation

_For any_ provider configuration and user-specified allocation ratios, the calculated token budget SHALL have total tokens equal to the provider's context window, and the sum of allocated tokens (input context + system instructions + output generation) SHALL equal the total tokens.

**Validates: Requirements 3.2, 3.3**

### Property 9: Minimum Output Allocation

_For any_ token budget calculation, the allocated tokens for output generation SHALL be greater than or equal to a minimum threshold (e.g., 1024 tokens) to prevent truncated responses.

**Validates: Requirements 3.5**

### Property 10: Token Usage Percentage Accuracy

_For any_ token budget with used and total tokens, the calculated usage percentage SHALL equal (used / total) × 100, with a precision of at least 2 decimal places.

**Validates: Requirements 3.7**

### Property 11: Cost Calculation Accuracy

_For any_ provider pricing model, input token count, and output token count, the calculated cost SHALL equal (inputTokens × inputPricePerMillion + outputTokens × outputPricePerMillion) / 1,000,000, with precision to at least 6 decimal places.

**Validates: Requirements 4.2, 4.4**

### Property 12: Cost Aggregation Correctness

_For any_ set of cost records, aggregating by any dimension (provider, application, conversation, time period) SHALL produce a sum that equals the sum of all individual cost records in that dimension.

**Validates: Requirements 4.3**

### Property 13: Budget Threshold Warnings

_For any_ cost budget and current spending, warning events SHALL be emitted when spending reaches exactly 80% and 95% of the budget, and SHALL NOT be emitted at any other percentage.

**Validates: Requirements 4.5**

### Property 14: Cost Comparison Data Integrity

_For any_ set of cost records across multiple providers and time periods, the comparison data structure SHALL contain entries for all unique provider-period combinations, and the sum of all comparison values SHALL equal the total cost across all records.

**Validates: Requirements 4.8**

### Property 15: Custom Ratio Application

_For any_ valid custom allocation ratios (where each ratio is in [0, 1] and the sum equals 1.0), applying these ratios to a token budget SHALL produce allocated amounts that match the specified ratios within a tolerance of 1 token (due to integer rounding).

**Validates: Requirements 5.5**

### Property 16: Time-Series Aggregation Correctness

_For any_ set of usage records with timestamps, aggregating by time period (daily, weekly, monthly) SHALL produce non-overlapping periods where the sum of all period aggregates equals the total usage across all records.

**Validates: Requirements 6.2**

### Property 17: Outlier Detection Consistency

_For any_ set of usage data with statistical outliers (values more than 2 standard deviations from the mean), the outlier detection algorithm SHALL identify all and only those outliers.

**Validates: Requirements 6.3**

### Property 18: Pruning Effectiveness Calculation

_For any_ pruning operation, the effectiveness percentage SHALL equal (tokensRemoved / originalTokens) × 100, and SHALL be in the range [0, 100].

**Validates: Requirements 6.4**

### Property 19: Token Distribution Completeness

_For any_ message array, the sum of token distributions across all categories (system instructions, user messages, assistant responses, context) SHALL equal the total token count for the entire message array.

**Validates: Requirements 6.5**

### Property 20: Prediction Accuracy Tracking

_For any_ estimated token count and actual token count, the prediction accuracy SHALL equal 1 - (|estimated - actual| / actual), and SHALL be in the range [0, 1] where 1 represents perfect accuracy.

**Validates: Requirements 6.7**

### Property 21: Tool Call Token Accounting

_For any_ message array containing tool calls, the total token count SHALL include tokens from tool call definitions, tool call arguments, and tool call results, in addition to regular message content tokens.

**Validates: Requirements 7.6**

### Property 22: Configuration Round-Trip Preservation

_For any_ valid TokenOptimizationConfig object, serializing it to JSON, then parsing the JSON back to an object, SHALL produce an equivalent configuration object (all fields have equal values).

**Validates: Requirements 8.1, 8.3, 8.4**

### Property 23: Strategy Enum Validation

_For any_ configuration object, the parser SHALL accept pruning strategy values of "conservative", "balanced", or "aggressive", and SHALL reject any other string value with a descriptive validation error.

**Validates: Requirements 8.5**

### Property 24: Positive Number Validation

_For any_ configuration object, the parser SHALL accept Token_Budget and Cost_Budget values that are positive numbers (> 0), and SHALL reject zero, negative, or non-numeric values with a descriptive validation error.

**Validates: Requirements 8.6**

### Property 25: Serialization Format Consistency

_For any_ TokenOptimizationConfig object, serializing it multiple times SHALL produce identical JSON output with consistent indentation (2 spaces) and field ordering (alphabetical by key).

**Validates: Requirements 8.7**
