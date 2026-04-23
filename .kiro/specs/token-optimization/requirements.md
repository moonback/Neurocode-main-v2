# Requirements Document: Token Optimization

## Introduction

This document defines the requirements for a comprehensive token optimization system for the Dyad AI application. The system aims to reduce token consumption and associated costs while maintaining or improving the quality of AI interactions across multiple LLM providers (OpenAI, Anthropic, Google, Azure, etc.). The feature addresses the need for more efficient context management, intelligent message history handling, provider-specific token allocation, and cost tracking capabilities.

## Glossary

- **Token_Optimizer**: The system component responsible for managing token usage across all AI interactions
- **Context_Pruner**: The subsystem that removes or compresses less relevant context from conversations
- **Message_History_Manager**: The subsystem that intelligently manages conversation history
- **Token_Allocator**: The subsystem that dynamically allocates token budgets based on provider capabilities
- **Cost_Tracker**: The subsystem that monitors and reports token usage costs
- **Provider**: An LLM service provider (OpenAI, Anthropic, Google, Azure, etc.)
- **Context_Window**: The maximum number of tokens a Provider can process in a single request
- **Token_Budget**: The allocated number of tokens for a specific operation or conversation
- **Pruning_Strategy**: An algorithm for selecting which context to remove or compress
- **Message_Priority**: A score indicating the importance of a message for retention
- **Cost_Budget**: A user-defined spending limit for AI operations

## Requirements

### Requirement 1: Aggressive Context Pruning

**User Story:** As a developer using Dyad, I want more aggressive context pruning, so that I can have longer conversations without hitting token limits or incurring excessive costs.

#### Acceptance Criteria

1. THE Context_Pruner SHALL implement at least three Pruning_Strategy options: conservative, balanced, and aggressive
2. WHEN a conversation approaches 80% of the Context_Window, THE Context_Pruner SHALL automatically trigger pruning
3. THE Context_Pruner SHALL preserve system messages, the most recent user message, and the most recent assistant message during pruning
4. WHEN pruning occurs, THE Context_Pruner SHALL prioritize retention based on Message_Priority scores
5. THE Context_Pruner SHALL compress repetitive or redundant information before removing messages entirely
6. WHEN pruning is complete, THE Context_Pruner SHALL log the number of tokens removed and the pruning strategy used
7. THE Context_Pruner SHALL maintain conversation coherence by preserving critical context references

### Requirement 2: Intelligent Message History Management

**User Story:** As a user, I want intelligent message history management, so that the system keeps relevant context while discarding outdated or irrelevant information.

#### Acceptance Criteria

1. THE Message_History_Manager SHALL assign Message_Priority scores to each message based on recency, user interactions, and semantic relevance
2. WHEN calculating Message_Priority, THE Message_History_Manager SHALL consider factors including: message age, user edits, explicit user approvals, and references from subsequent messages
3. THE Message_History_Manager SHALL implement a sliding window algorithm that retains high-priority messages beyond the standard window size
4. WHEN a message is referenced by a later message, THE Message_History_Manager SHALL increase the referenced message's Message_Priority score
5. THE Message_History_Manager SHALL support manual pinning of critical messages to prevent their removal
6. WHEN the conversation history exceeds the Token_Budget, THE Message_History_Manager SHALL remove the lowest-priority messages first
7. THE Message_History_Manager SHALL create summaries of removed message sequences to preserve essential context

### Requirement 3: Dynamic Token Allocation by Provider

**User Story:** As a developer, I want dynamic token allocation based on the selected Provider, so that I can maximize the capabilities of each LLM while staying within their limits.

#### Acceptance Criteria

1. THE Token_Allocator SHALL maintain a configuration mapping each Provider to its Context_Window size and optimal token distribution ratios
2. WHEN a Provider is selected, THE Token_Allocator SHALL automatically adjust the Token_Budget based on the Provider's Context_Window
3. THE Token_Allocator SHALL allocate tokens across input context, system instructions, and output generation based on Provider-specific optimization profiles
4. WHEN switching between Providers mid-conversation, THE Token_Allocator SHALL recalculate the Token_Budget and trigger pruning if necessary
5. THE Token_Allocator SHALL reserve a minimum token allocation for output generation to prevent truncated responses
6. WHERE a Provider supports extended context windows, THE Token_Allocator SHALL offer an option to utilize the extended capacity
7. THE Token_Allocator SHALL provide real-time feedback on current token usage as a percentage of the allocated Token_Budget

### Requirement 4: Cost Tracking and Budgeting

**User Story:** As a user, I want to track token usage costs and set spending budgets, so that I can control my AI-related expenses and make informed decisions about usage.

#### Acceptance Criteria

1. THE Cost_Tracker SHALL maintain up-to-date pricing information for each Provider's input and output tokens
2. WHEN tokens are consumed, THE Cost_Tracker SHALL calculate and record the cost based on the Provider's pricing model
3. THE Cost_Tracker SHALL aggregate costs by Provider, by application, by conversation, and by time period (daily, weekly, monthly)
4. THE Cost_Tracker SHALL display real-time cost estimates before sending requests to Providers
5. WHERE a Cost_Budget is defined, THE Cost_Tracker SHALL warn the user when approaching the budget threshold (at 80% and 95%)
6. IF the Cost_Budget is exceeded, THEN THE Cost_Tracker SHALL prevent further AI requests until the user acknowledges or adjusts the budget
7. THE Cost_Tracker SHALL export cost reports in CSV and JSON formats for external analysis
8. THE Cost_Tracker SHALL provide cost comparison visualizations across different Providers and time periods

### Requirement 5: Configuration and User Control

**User Story:** As a user, I want to configure token optimization settings, so that I can balance between cost savings and conversation quality according to my preferences.

#### Acceptance Criteria

1. THE Token_Optimizer SHALL provide a settings interface for configuring Pruning_Strategy, Token_Budget limits, and Cost_Budget thresholds
2. THE Token_Optimizer SHALL allow users to enable or disable automatic pruning on a per-application or global basis
3. THE Token_Optimizer SHALL support preset optimization profiles: "Maximum Quality", "Balanced", and "Maximum Savings"
4. WHEN a user selects an optimization profile, THE Token_Optimizer SHALL apply the corresponding configuration to all subsystems
5. THE Token_Optimizer SHALL allow users to customize token allocation ratios for input context versus output generation
6. THE Token_Optimizer SHALL persist user preferences across application restarts
7. THE Token_Optimizer SHALL provide a reset option to restore default optimization settings

### Requirement 6: Monitoring and Analytics

**User Story:** As a developer, I want detailed analytics on token usage patterns, so that I can identify optimization opportunities and understand my usage trends.

#### Acceptance Criteria

1. THE Token_Optimizer SHALL collect metrics including: total tokens consumed, tokens saved through pruning, average tokens per request, and cost per conversation
2. THE Token_Optimizer SHALL display token usage trends over time with daily, weekly, and monthly granularity
3. THE Token_Optimizer SHALL identify and highlight conversations or applications with unusually high token consumption
4. THE Token_Optimizer SHALL calculate and display the effectiveness of pruning strategies as a percentage of tokens saved
5. THE Token_Optimizer SHALL provide breakdown visualizations showing token distribution across system instructions, user messages, assistant responses, and context
6. THE Token_Optimizer SHALL export analytics data in JSON format for integration with external monitoring tools
7. THE Token_Optimizer SHALL compare actual token usage against estimated usage to improve future predictions

### Requirement 7: Integration with Existing Systems

**User Story:** As a developer, I want token optimization to integrate seamlessly with existing Dyad features, so that I can benefit from optimization without disrupting my workflow.

#### Acceptance Criteria

1. THE Token_Optimizer SHALL integrate with the existing context compaction system without conflicts
2. WHEN Smart Context mode is enabled, THE Token_Optimizer SHALL coordinate with Smart Context to avoid duplicate pruning operations
3. THE Token_Optimizer SHALL work with all supported Providers including OpenAI, Anthropic, Google, Azure, Bedrock, XAI, OpenRouter, Ollama, LM Studio, and MiniMax
4. THE Token_Optimizer SHALL preserve compatibility with existing conversation history, summaries, and backups
5. THE Token_Optimizer SHALL respect existing security and privacy settings when processing message content
6. WHEN MCP tools are active, THE Token_Optimizer SHALL account for tool call tokens in budget calculations
7. THE Token_Optimizer SHALL integrate with the existing IPC architecture following Electron security best practices

### Requirement 8: Parser and Serializer for Configuration

**User Story:** As a developer, I want reliable parsing and serialization of token optimization configurations, so that settings can be stored, loaded, and shared without errors.

#### Acceptance Criteria

1. WHEN a valid token optimization configuration file is provided, THE Configuration_Parser SHALL parse it into a TokenOptimizationConfig object
2. WHEN an invalid configuration file is provided, THE Configuration_Parser SHALL return a descriptive error indicating the specific validation failure
3. THE Configuration_Serializer SHALL format TokenOptimizationConfig objects into valid JSON configuration files
4. FOR ALL valid TokenOptimizationConfig objects, parsing then serializing then parsing SHALL produce an equivalent object (round-trip property)
5. THE Configuration_Parser SHALL validate that Pruning_Strategy values are one of: "conservative", "balanced", or "aggressive"
6. THE Configuration_Parser SHALL validate that Token_Budget and Cost_Budget values are positive numbers
7. THE Configuration_Serializer SHALL format configuration files with consistent indentation and field ordering for readability

---

## Notes

- Token counting mechanisms should be provider-specific to ensure accuracy across different tokenization schemes
- The system should handle edge cases such as very short conversations, conversations with large code blocks, and conversations with media attachments
- Performance impact of pruning and analysis operations should be minimized to avoid degrading user experience
- The feature should be designed to support future providers and token models without requiring architectural changes
- Cost tracking should account for potential pricing changes and provide mechanisms for updating pricing data
- Privacy considerations: message content analysis for prioritization should occur locally and not be transmitted to external services
