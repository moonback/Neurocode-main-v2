# Token Optimization Module

This module provides token budget management, context optimization, and skill performance enhancements for the Dyad/Kiro application.

## Overview

The Token Optimization module helps manage and optimize token usage when interacting with LLM APIs. It provides:

- **Budget Allocation**: Automatically allocates token budgets based on task complexity
- **Budget Validation**: Validates budgets against model context window limits
- **Token Tracking**: Tracks token consumption across requests with database persistence
- **Context Optimization**: Prunes, compresses, and selectively includes context to fit token budgets
- **Skill Loading**: Lazy loading of skills with metadata-only discovery
- **Skill Caching**: LRU cache for loaded skills with time-based eviction
- **Result Caching**: Caches deterministic skill execution results
- **Skill Execution**: Optimized execution with context reuse, parallel execution, and concurrency limiting
- **Analytics**: Provides insights into token usage patterns

## Components

### Phase 1: Core Token Manager and Context Optimizer ✅

#### TokenManager

The main class responsible for token budget management and usage tracking.

**Key Methods:**
- `allocateBudget(request: AgentRequest): Promise<TokenBudget>` - Allocates budget based on task complexity
- `validateBudget(budget: number, model: LargeLanguageModel): Promise<ValidationResult>` - Validates budget against model limits
- `trackUsage(usage: TokenUsage): Promise<void>` - Tracks token usage with database persistence
- `getStatistics(filters?: StatisticsFilters): Promise<Statistics>` - Retrieves usage statistics

#### ContextOptimizer

Coordinates context optimization through pruning, compression, and adaptive selection.

**Key Methods:**
- `optimize(context: Context, budget: TokenBudget): Promise<OptimizedContext>` - Optimizes context to fit budget
- `shouldOptimize(currentTokens: number, budget: TokenBudget): boolean` - Checks if optimization is needed

#### PruningEngine

Removes redundant and non-essential content from context.

**Key Methods:**
- `removeDuplicates(files: FileContext[]): FileContext[]` - Removes duplicate code blocks
- `removeLogging(content: string): string` - Removes logging statements
- `removeComments(content: string, language: string): string` - Removes non-semantic comments
- `prioritizeRecent(turns: ConversationTurn[], maxTurns: number): ConversationTurn[]` - Keeps recent conversation turns

#### CompressionEngine

Compresses context by extracting signatures and summarizing verbose content.

**Key Methods:**
- `extractSignatures(content: string, language: string): string` - Extracts function/class signatures
- `summarizeDocumentation(content: string): string` - Summarizes verbose documentation
- `deduplicatePatterns(content: string): string` - Removes repeated patterns
- `measureCompression(original: string, compressed: string): CompressionMetrics` - Calculates compression ratio

#### AdaptiveSelector

Selects most relevant context based on semantic similarity.

**Key Methods:**
- `rankFiles(files: FileContext[], query: string): FileContext[]` - Ranks files by relevance
- `selectConversationTurns(turns: ConversationTurn[], query: string, maxTokens: number): ConversationTurn[]` - Selects relevant turns

### Phase 2: Skill Engine Enhancements ✅

#### SkillLoader

Handles lazy loading of skills with metadata-only discovery.

**Key Methods:**
- `loadMetadata(skillName: string, scope: SkillScope): Promise<LoadResult<SkillMetadata>>` - Loads only metadata
- `loadSkill(skillName: string, scope: SkillScope): Promise<LoadResult<Skill>>` - Loads full skill content
- `listSkills(scope: SkillScope): Promise<SkillMetadata[]>` - Lists all available skills

#### SkillCache

LRU cache for loaded skills with time-based eviction (10-minute idle timeout).

**Key Methods:**
- `get(key: string): T | undefined` - Retrieves cached value
- `put(key: string, value: T, size?: number): void` - Caches value with LRU eviction
- `has(key: string): boolean` - Checks if key exists
- `evict(key: string): boolean` - Evicts specific key
- `clear(): void` - Clears all entries
- `getStats(): CacheStats` - Returns cache statistics

#### ResultCache

Caches deterministic skill execution results using content-based hashing.

**Key Methods:**
- `get(skillName: string, inputs: SkillInput): CachedResult<T> | undefined` - Retrieves cached result
- `put(skillName: string, inputs: SkillInput, result: T, executionTime: number): void` - Caches result
- `invalidateSkill(skillName: string): number` - Invalidates all results for a skill

#### SkillEngine

Optimized skill execution engine with context reuse, parallel execution, and concurrency limiting.

**Key Methods:**
- `executeSkill<T>(skillName: string, inputs: SkillInput, isDeterministic?: boolean): Promise<ExecutionResult<T>>` - Executes a skill
- `executeParallel<T>(executions: Array<{...}>): Promise<Array<ExecutionResult<T>>>` - Executes multiple skills in parallel
- `unloadSkill(skillName: string): boolean` - Unloads skill from memory
- `unloadAllSkills(): void` - Unloads all skills
- `getCacheStats()` - Returns result cache statistics
- `clearCache(): void` - Clears result cache
- `invalidateSkillCache(skillName: string): number` - Invalidates cached results for a skill

## Usage Examples

### Token Budget Management

```typescript
import { TokenManager } from "@/token-optimization";

const tokenManager = new TokenManager();

// Allocate budget for a medium complexity task
const request = {
  requestId: "req-123",
  taskComplexity: "medium",
  model: { name: "claude-3-5-sonnet-20241022", provider: "anthropic" },
  estimatedContextTokens: 5000,
};

const budget = await tokenManager.allocateBudget(request);
console.log(`Total budget: ${budget.total} tokens`);

// Track usage
await tokenManager.trackUsage({
  conversationId: "conv-123",
  requestId: "req-123",
  promptTokens: 5000,
  completionTokens: 1000,
  totalTokens: 6000,
  model: "claude-3-5-sonnet-20241022",
  timestamp: Date.now(),
});

// Get statistics
const stats = await tokenManager.getStatistics({
  conversationId: "conv-123",
});
console.log(`Total tokens used: ${stats.totalTokens}`);
```

### Context Optimization

```typescript
import { ContextOptimizer, TokenManager } from "@/token-optimization";

const optimizer = new ContextOptimizer();
const tokenManager = new TokenManager();

const context = {
  files: [/* file contexts */],
  conversationTurns: [/* conversation turns */],
  skills: [/* skill contexts */],
};

const budget = await tokenManager.allocateBudget(request);

if (optimizer.shouldOptimize(estimatedTokens, budget)) {
  const optimized = await optimizer.optimize(context, budget);
  console.log(`Reduced from ${optimized.metadata.originalTokens} to ${optimized.metadata.finalTokens} tokens`);
}
```

### Skill Loading and Execution

```typescript
import { SkillLoader, SkillEngine } from "@/token-optimization";

const loader = new SkillLoader();
const engine = new SkillEngine(loader, {
  maxConcurrency: 5,
  enableResultCache: true,
});

// Load skill metadata only
const metadataResult = await loader.loadMetadata("my-skill", "user");
if (metadataResult.success) {
  console.log(`Skill: ${metadataResult.data.name}`);
  console.log(`Estimated tokens: ${metadataResult.data.estimatedTokens}`);
}

// Execute skill with caching
const result = await engine.executeSkill(
  "my-skill",
  { param: "value" },
  true // deterministic, enable result caching
);

if (result.success) {
  console.log(`Result: ${result.result}`);
  console.log(`From cache: ${result.fromCache}`);
  console.log(`Execution time: ${result.executionTime}ms`);
}

// Execute multiple skills in parallel
const results = await engine.executeParallel([
  { skillName: "skill1", inputs: { param: "a" } },
  { skillName: "skill2", inputs: { param: "b" } },
  { skillName: "skill3", inputs: { param: "c" } },
]);

// Get cache statistics
const cacheStats = engine.getCacheStats();
console.log(`Cache hit rate: ${cacheStats.hitRate * 100}%`);
```

## Task Complexity Ratios

- **Simple**: 30% of context window - For straightforward queries
- **Medium**: 60% of context window - For moderate complexity tasks (default)
- **Complex**: 85% of context window - For complex, multi-step tasks

## Thresholds

- **Warning Threshold**: 80% of allocated budget
- **Critical Threshold**: 90% of allocated budget

## Implementation Status

### ✅ Phase 1: Core Token Manager and Context Optimizer (Complete)

- TokenManager with budget allocation, validation, and usage tracking
- ContextOptimizer with optimization pipeline
- PruningEngine with duplicate/logging/comment removal
- CompressionEngine with signature extraction and summarization
- AdaptiveSelector with semantic similarity ranking
- Database schema for token analytics
- 110 unit tests passing

### ✅ Phase 2: Skill Engine Enhancements (Complete)

- SkillLoader with lazy loading and metadata-only discovery
- SkillCache with LRU eviction and time-based expiration
- ResultCache with deterministic result caching
- SkillEngine with execution optimization, context reuse, and concurrency limiting
- 114 unit tests passing (224 total across all modules)

### 🚧 Phase 3: Analytics and Reporting (Next)

- Token usage analytics with aggregation
- Data export functionality (CSV/JSON)
- Analytics dashboard UI (optional)

### 🚧 Phase 4: Preloading and Prediction (Future)

- Usage pattern analysis
- Skill preloading based on historical frequency
- Token-aware skill design tools
- Dynamic context window utilization

## Testing

Run all token-optimization tests:

```bash
npm test -- src/token-optimization
```

Run specific component tests:

```bash
npm test -- src/token-optimization/TokenManager.test.ts
npm test -- src/token-optimization/ContextOptimizer.test.ts
npm test -- src/token-optimization/SkillLoader.test.ts
npm test -- src/token-optimization/SkillEngine.test.ts
```

## Requirements Satisfied

### Phase 1 Requirements
- **1.1-1.6**: Context optimization (pruning, compression, selection)
- **2.1-2.5**: Compression strategies
- **3.1-3.7**: Token budget management
- **7.1-7.2**: Token analytics database schema
- **8.1-8.5**: Adaptive context selection

### Phase 2 Requirements
- **4.1-4.7**: Skill loading and caching
- **5.1-5.7**: Skill execution optimization
- **6.1-6.6**: Dependency management (Task 11, upcoming)

## Related Files

- `src/token-optimization/TokenManager.ts` - Token budget management
- `src/token-optimization/ContextOptimizer.ts` - Context optimization coordinator
- `src/token-optimization/PruningEngine.ts` - Content pruning
- `src/token-optimization/CompressionEngine.ts` - Content compression
- `src/token-optimization/AdaptiveSelector.ts` - Semantic selection
- `src/token-optimization/SkillLoader.ts` - Lazy skill loading
- `src/token-optimization/SkillCache.ts` - LRU skill cache
- `src/token-optimization/ResultCache.ts` - Result caching
- `src/token-optimization/SkillEngine.ts` - Skill execution engine
- `src/db/schema.ts` - Database schema for analytics
- `.kiro/specs/token-optimization-skills/` - Complete specification
