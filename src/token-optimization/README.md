# Token Optimization Module

This module provides token budget management and optimization capabilities for the Dyad/Kiro application.

## Overview

The Token Optimization module helps manage and optimize token usage when interacting with LLM APIs. It provides:

- **Budget Allocation**: Automatically allocates token budgets based on task complexity
- **Budget Validation**: Validates budgets against model context window limits
- **Token Tracking**: (Coming in Task 2.4) Tracks token consumption across requests
- **Analytics**: (Coming in Task 2.4) Provides insights into token usage patterns

## Components

### TokenManager

The main class responsible for token budget management.

#### Key Methods

- `allocateBudget(request: AgentRequest): Promise<TokenBudget>`
  - Allocates a token budget based on task complexity (simple: 30%, medium: 60%, complex: 85% of context window)
  - Accounts for estimated context tokens
  - Returns budget with warning (80%) and critical (90%) thresholds

- `validateBudget(budget: number, model: LargeLanguageModel): Promise<ValidationResult>`
  - Validates a proposed budget against the model's context window
  - Ensures budget is positive and within limits
  - Returns validation result with error messages if invalid

## Usage Example

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
console.log(`Remaining: ${budget.remaining} tokens`);

// Validate a budget adjustment
const validation = await tokenManager.validateBudget(100_000, {
  name: "claude-3-5-sonnet-20241022",
  provider: "anthropic",
});

if (!validation.valid) {
  console.error(`Invalid budget: ${validation.error}`);
}
```

## Task Complexity Ratios

The module uses the following budget allocation ratios based on task complexity:

- **Simple**: 30% of context window - For straightforward queries and simple tasks
- **Medium**: 60% of context window - For moderate complexity tasks (default)
- **Complex**: 85% of context window - For complex, multi-step tasks requiring extensive context

## Thresholds

- **Warning Threshold**: 80% of allocated budget
- **Critical Threshold**: 90% of allocated budget

These thresholds can be used to trigger optimization strategies before running out of tokens.

## Implementation Status

### ✅ Completed (Task 2.1)

- TokenManager class with budget allocation
- Budget validation against model limits
- TypeScript interfaces for TokenBudget, TokenUsage, TokenBudgetConfig
- Comprehensive unit tests

### 🚧 Coming Soon (Task 2.4)

- Token usage tracking with database persistence
- Usage statistics and analytics
- Data export functionality (CSV/JSON)

## Testing

Run the unit tests:

```bash
npm test -- src/token-optimization/__tests__/TokenManager.test.ts
```

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 3.1**: Token budget allocation based on task complexity
- **Requirement 3.6**: Model-specific budget limits
- **Requirement 3.7**: Budget validation against context window limits

## Related Files

- `src/token-optimization/TokenManager.ts` - Main implementation
- `src/token-optimization/__tests__/TokenManager.test.ts` - Unit tests
- `src/token-optimization/index.ts` - Module exports
- `src/db/schema.ts` - Database schema for token analytics (Task 1)
