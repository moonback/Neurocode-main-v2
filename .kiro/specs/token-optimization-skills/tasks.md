# Implementation Plan: Token Optimization and Skills Performance

## Overview

This implementation plan follows a 4-phase migration strategy to add token optimization and skills performance improvements to the Dyad/Kiro Electron application. The implementation uses TypeScript and integrates with the existing Electron IPC architecture, React frontend with TanStack Router/Query, and Drizzle ORM database layer.

**Key Integration Points:**

- Electron IPC for main-renderer communication
- TanStack Query for data fetching/mutations
- Drizzle ORM for analytics database
- Existing skill system in `src/` directory
- Base UI components for any UI additions

## Tasks

### Phase 1: Core Token Manager and Context Optimizer

- [x] 1. Set up database schema for token analytics
  - Create migration file for `token_analytics` and `skill_analytics` tables
  - Add indexes for conversation_id, skill_name, and timestamp
  - Run migration and verify schema
  - _Requirements: 7.1, 7.2_

- [x] 2. Implement Token Manager core functionality
  - [x] 2.1 Create TokenManager class with budget allocation logic
    - Implement `allocateBudget()` method with task complexity detection
    - Implement `validateBudget()` against model context window limits
    - Define TypeScript interfaces: `TokenBudget`, `TokenUsage`, `TokenBudgetConfig`
    - _Requirements: 3.1, 3.6, 3.7_
  - [ ]\* 2.2 Write property test for budget allocation
    - **Property 10: Budget Rejection**
    - **Validates: Requirements 3.3**
  - [ ]\* 2.3 Write property test for model-specific limits
    - **Property 12: Model-Specific Budget Limits**
    - **Validates: Requirements 3.6, 3.7**
  - [x] 2.4 Implement token usage tracking
    - Implement `trackUsage()` method with database persistence
    - Implement `getStatistics()` with filtering by conversation/skill/time
    - Add cumulative tracking per conversation
    - _Requirements: 3.4, 7.1, 7.2_
  - [ ]\* 2.5 Write property test for token tracking
    - **Property 11: Token Consumption Tracking**
    - **Validates: Requirements 3.4**
  - [ ]\* 2.6 Write property test for usage recording
    - **Property 28: Usage Recording with Timestamps**
    - **Validates: Requirements 7.1**

- [x] 3. Implement Context Optimizer foundation
  - [x] 3.1 Create ContextOptimizer class with optimization pipeline
    - Implement `optimize()` method coordinating pruning/compression/selection
    - Implement `shouldOptimize()` threshold checking (80% warning, 90% critical)
    - Define TypeScript interfaces: `Context`, `OptimizedContext`, `ContextMetadata`
    - _Requirements: 1.1, 3.2_
  - [ ]\* 3.2 Write property test for threshold triggering
    - **Property 1: Context Optimization Threshold Triggering**
    - **Validates: Requirements 1.1, 3.2**
  - [x] 3.3 Implement user content preservation
    - Add logic to mark and preserve user-provided instructions
    - Ensure user content is never pruned or compressed
    - _Requirements: 1.2_
  - [ ]\* 3.4 Write property test for user content preservation
    - **Property 2: User Content Preservation**
    - **Validates: Requirements 1.2**

- [ ] 4. Implement Pruning Engine
  - [ ] 4.1 Create PruningEngine class with duplicate removal
    - Implement `removeDuplicates()` using content hashing
    - Implement `removeLogging()` with regex patterns for console.log, logger.debug, etc.
    - Implement `removeComments()` with language-aware parsing
    - Implement `prioritizeRecent()` for conversation turn selection
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [ ]\* 4.2 Write property test for duplicate removal
    - **Property 3: Duplicate Code Removal**
    - **Validates: Requirements 1.3**
  - [ ]\* 4.3 Write property test for logging removal
    - **Property 4: Logging Statement Removal**
    - **Validates: Requirements 1.4**
  - [ ]\* 4.4 Write property test for comment removal
    - **Property 5: Non-Semantic Comment Removal**
    - **Validates: Requirements 1.5**
  - [ ]\* 4.5 Write property test for turn prioritization
    - **Property 6: Recent Turn Prioritization**
    - **Validates: Requirements 1.6**

- [ ] 5. Implement Compression Engine
  - [ ] 5.1 Create CompressionEngine class with signature extraction
    - Implement `extractSignatures()` using TypeScript compiler API for files >500 lines
    - Implement `summarizeDocumentation()` for verbose docs
    - Implement `deduplicatePatterns()` with pattern matching
    - Implement `measureCompression()` to calculate compression metrics
    - _Requirements: 2.1, 2.3, 2.5_
  - [ ]\* 5.2 Write property test for signature extraction
    - **Property 7: Large File Signature Extraction**
    - **Validates: Requirements 2.1**
  - [ ]\* 5.3 Write property test for pattern deduplication
    - **Property 8: Pattern Deduplication**
    - **Validates: Requirements 2.3**
  - [ ]\* 5.4 Write property test for compression measurement
    - **Property 9: Compression Ratio Measurement**
    - **Validates: Requirements 2.5**

- [ ] 6. Implement Adaptive Selector
  - [ ] 6.1 Create AdaptiveSelector class with relevance ranking
    - Implement file relevance ranking by semantic similarity
    - Implement differential inclusion (full vs summary)
    - Implement conversation turn selection with semantic similarity
    - Implement user file prioritization
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ]\* 6.2 Write property test for relevance ranking
    - **Property 33: File Relevance Ranking**
    - **Validates: Requirements 8.1**
  - [ ]\* 6.3 Write property test for differential inclusion
    - **Property 34: Differential File Inclusion**
    - **Validates: Requirements 8.2**
  - [ ]\* 6.4 Write property test for turn selection
    - **Property 35: Conversation Turn Selection**
    - **Validates: Requirements 8.3**
  - [ ]\* 6.5 Write property test for semantic similarity
    - **Property 36: Semantic Similarity Selection**
    - **Validates: Requirements 8.4**
  - [ ]\* 6.6 Write property test for user file priority
    - **Property 37: User File Prioritization**
    - **Validates: Requirements 8.5**

- [ ] 7. Checkpoint - Phase 1 validation
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Skill Engine Enhancements

- [ ] 8. Implement Skill Loader with lazy loading
  - [ ] 8.1 Create SkillLoader class with metadata-only loading
    - Implement `loadMetadata()` to load skill metadata without full content
    - Implement `loadSkill()` with lazy content loading
    - Implement async loading without blocking main thread
    - Measure and report loading times
    - _Requirements: 4.1, 4.2, 4.5, 4.6_
  - [ ]\* 8.2 Write property test for lazy metadata loading
    - **Property 13: Lazy Metadata Loading**
    - **Validates: Requirements 4.1**
  - [ ]\* 8.3 Write property test for selective loading
    - **Property 14: Selective Skill Loading**
    - **Validates: Requirements 4.2**
  - [ ]\* 8.4 Write property test for loading time measurement
    - **Property 16: Loading Time Measurement**
    - **Validates: Requirements 4.6**

- [ ] 9. Implement Skill Cache with LRU eviction
  - [ ] 9.1 Create SkillCache class with LRU implementation
    - Implement `get()`, `put()`, `has()`, `evict()`, `clear()` methods
    - Implement time-based eviction (10-minute idle timeout)
    - Implement `getStats()` for cache hit/miss tracking
    - Define TypeScript interfaces: `CacheStats`, `CacheInfo`
    - _Requirements: 4.3, 4.4_
  - [ ]\* 9.2 Write property test for skill caching
    - **Property 15: Skill Caching**
    - **Validates: Requirements 4.3**
  - [ ]\* 9.3 Write property test for cache performance
    - **Property 22: Cache Performance**
    - **Validates: Requirements 5.7**
  - [ ] 9.4 Implement deterministic result caching
    - Add result caching for deterministic skills with identical inputs
    - Implement cache key generation based on skill name and inputs
    - _Requirements: 5.6_
  - [ ]\* 9.5 Write property test for result caching
    - **Property 21: Deterministic Result Caching**
    - **Validates: Requirements 5.6**

- [ ] 10. Implement Skill Engine execution optimization
  - [ ] 10.1 Enhance SkillEngine with execution context reuse
    - Implement `executeSkill()` with context reuse
    - Implement parallel execution for independent skills
    - Implement concurrency limiting to prevent resource exhaustion
    - Add performance warnings for executions >5 seconds
    - Implement detailed error reporting with execution time
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]\* 10.2 Write property test for context reuse
    - **Property 18: Execution Context Reuse**
    - **Validates: Requirements 5.1**
  - [ ]\* 10.3 Write property test for concurrency limiting
    - **Property 19: Concurrency Limiting**
    - **Validates: Requirements 5.4**
  - [ ]\* 10.4 Write property test for error reporting
    - **Property 20: Execution Error Reporting**
    - **Validates: Requirements 5.5**
  - [ ] 10.5 Implement unload functionality
    - Implement `unloadSkill()` to remove skills from memory
    - Ensure unload-reload idempotence
    - _Requirements: 4.7_
  - [ ]\* 10.6 Write property test for unload-reload idempotence
    - **Property 17: Load-Unload-Reload Idempotence**
    - **Validates: Requirements 4.7**

- [ ] 11. Implement Dependency Manager
  - [ ] 11.1 Create DependencyManager class with resolution logic
    - Implement `resolveDependencies()` with topological sorting
    - Implement `detectCircular()` for circular dependency detection
    - Implement `getDependencyGraph()` for visualization
    - Implement `invalidateDependents()` for cache invalidation
    - Implement `validateDependencies()` for availability checking
    - Define TypeScript interfaces: `DependencyGraph`, `DependencyNode`, `DependencyEdge`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]\* 11.2 Write property test for dependency ordering
    - **Property 23: Dependency Load Ordering**
    - **Validates: Requirements 6.1**
  - [ ]\* 11.3 Write property test for circular detection
    - **Property 24: Circular Dependency Detection**
    - **Validates: Requirements 6.2**
  - [ ]\* 11.4 Write property test for dependency sharing
    - **Property 25: Dependency Sharing**
    - **Validates: Requirements 6.3**
  - [ ]\* 11.5 Write property test for cache invalidation
    - **Property 26: Cache Invalidation on Dependency Update**
    - **Validates: Requirements 6.4**
  - [ ]\* 11.6 Write property test for dependency validation
    - **Property 27: Dependency Availability Validation**
    - **Validates: Requirements 6.5**

- [ ] 12. Checkpoint - Phase 2 validation
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Analytics and Reporting

- [ ] 13. Implement token usage analytics
  - [ ] 13.1 Enhance TokenManager with analytics methods
    - Implement database persistence for token usage events
    - Implement aggregation queries by conversation, skill, time period
    - Implement top consumer identification and ranking
    - Implement cost calculation based on model pricing
    - _Requirements: 7.1, 7.2, 7.3, 7.6_
  - [ ]\* 13.2 Write property test for usage aggregation
    - **Property 29: Usage Aggregation**
    - **Validates: Requirements 7.2**
  - [ ]\* 13.3 Write property test for top consumer identification
    - **Property 30: Top Consumer Identification**
    - **Validates: Requirements 7.3**
  - [ ]\* 13.4 Write property test for cost calculation
    - **Property 32: Cost Calculation**
    - **Validates: Requirements 7.6**

- [ ] 14. Implement data export functionality
  - [ ] 14.1 Add CSV export to TokenManager
    - Implement `exportData()` method with CSV format support
    - Add JSON export format as well
    - Validate CSV format with proper headers and escaping
    - _Requirements: 7.5_
  - [ ]\* 14.2 Write property test for CSV export
    - **Property 31: CSV Export Format**
    - **Validates: Requirements 7.5**

- [ ] 15. Create analytics dashboard UI (optional)
  - [ ] 15.1 Create token usage dashboard component
    - Create React component for displaying token usage trends
    - Use TanStack Query for data fetching from IPC endpoints
    - Display charts for usage over time, by conversation, by skill
    - Show top consumers and cost estimates
    - Use Base UI components for UI primitives
    - _Requirements: 7.4_
  - [ ] 15.2 Add IPC endpoints for analytics data
    - Create IPC handlers for fetching analytics data
    - Follow Electron IPC patterns from rules/electron-ipc.md
    - Use DyadError for error handling per rules/dyad-errors.md
    - _Requirements: 7.4_
  - [ ]\* 15.3 Write E2E test for analytics dashboard
    - Test dashboard displays correctly
    - Test data fetching and rendering
    - Test export functionality from UI
    - _Requirements: 7.4_

- [ ] 16. Checkpoint - Phase 3 validation
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Preloading and Prediction

- [ ] 17. Implement usage pattern analysis
  - [ ] 17.1 Create PreloaderPredictor class with pattern analysis
    - Implement usage pattern tracking and storage
    - Implement prediction algorithm based on historical frequency
    - Implement accuracy measurement and algorithm adjustment
    - _Requirements: 9.1, 9.6_
  - [ ]\* 17.2 Write property test for pattern prediction
    - **Property 38: Usage Pattern Prediction**
    - **Validates: Requirements 9.1**

- [ ] 18. Implement skill preloading
  - [ ] 18.1 Add background preloading to SkillEngine
    - Implement idle detection for background preloading
    - Implement priority-based preloading using historical frequency
    - Implement memory limits for preloading
    - Ensure preloaded skills are used immediately when requested
    - _Requirements: 9.2, 9.3, 9.4, 9.5_
  - [ ]\* 18.2 Write property test for preloading priority
    - **Property 39: Preloading Priority**
    - **Validates: Requirements 9.3**
  - [ ]\* 18.3 Write property test for preload utilization
    - **Property 40: Preload Utilization**
    - **Validates: Requirements 9.5**

- [ ] 19. Implement token-aware skill design tools
  - [ ] 19.1 Create skill analysis utilities
    - Implement token estimation tool using 4-char-per-token heuristic
    - Implement token limit warnings for skills
    - Implement redundancy detection in skill content
    - Provide optimization suggestions
    - _Requirements: 10.1, 10.2, 10.5_
  - [ ]\* 19.2 Write property test for token estimation
    - **Property 41: Token Estimation**
    - **Validates: Requirements 10.1**
  - [ ]\* 19.3 Write property test for token warnings
    - **Property 42: Token Limit Warnings**
    - **Validates: Requirements 10.2**
  - [ ]\* 19.4 Write property test for redundancy detection
    - **Property 43: Redundancy Detection**
    - **Validates: Requirements 10.5**

- [ ] 20. Implement dynamic context window utilization
  - [ ] 20.1 Enhance TokenManager with dynamic window management
    - Implement context window detection per model type
    - Implement adaptive context inclusion based on window size
    - Implement response token reservation
    - Implement feedback for insufficient context scenarios
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [ ]\* 20.2 Write property test for window detection
    - **Property 44: Context Window Detection**
    - **Validates: Requirements 11.1**
  - [ ]\* 20.3 Write property test for adaptive inclusion
    - **Property 45: Adaptive Context Inclusion**
    - **Validates: Requirements 11.2, 11.3, 11.5**
  - [ ]\* 20.4 Write property test for token reservation
    - **Property 46: Response Token Reservation**
    - **Validates: Requirements 11.4**
  - [ ]\* 20.5 Write property test for insufficient context feedback
    - **Property 47: Insufficient Context Feedback**
    - **Validates: Requirements 11.6**

- [ ] 21. Implement skill parsing and formatting utilities
  - [ ] 21.1 Create skill parser and formatter
    - Implement `parseSkill()` to parse skill files into structured objects
    - Implement `formatSkill()` to pretty-print skill objects back to files
    - Implement `validateSkill()` against schema
    - Implement descriptive error reporting with location info
    - Ensure round-trip consistency (parse → format → parse)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  - [ ]\* 21.2 Write property test for skill parsing
    - **Property 48: Skill Parsing**
    - **Validates: Requirements 12.1**
  - [ ]\* 21.3 Write property test for parse errors
    - **Property 49: Parse Error Reporting**
    - **Validates: Requirements 12.2**
  - [ ]\* 21.4 Write property test for round-trip consistency
    - **Property 50: Skill Formatting Round-Trip**
    - **Validates: Requirements 12.3, 12.4, 12.5**
  - [ ]\* 21.5 Write property test for schema validation
    - **Property 51: Schema Validation**
    - **Validates: Requirements 12.6**

- [ ] 22. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Integration and wiring
  - [ ] 23.1 Wire TokenManager into agent request pipeline
    - Integrate TokenManager into existing agent/LLM interface
    - Add optimization triggers at appropriate points
    - Ensure backward compatibility with existing functionality
    - _Requirements: 3.1, 3.2_
  - [ ] 23.2 Wire SkillEngine enhancements into skill system
    - Integrate SkillLoader, SkillCache, and DependencyManager
    - Update existing skill loading code to use new components
    - Ensure backward compatibility with existing skills
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 23.3 Add configuration settings for optimizations
    - Add settings for enabling/disabling optimizations
    - Add settings for cache size limits
    - Add settings for token budget defaults
    - Follow patterns from rules/adding-settings.md
    - _Requirements: All_
  - [ ]\* 23.4 Write E2E tests for complete workflows
    - Test conversation with token optimization enabled
    - Test skill loading and execution with caching
    - Test analytics data collection and export
    - Follow patterns from rules/e2e-testing.md
    - _Requirements: All_

- [ ] 24. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- All code should follow TypeScript best practices and existing codebase patterns
- IPC communication should follow rules/electron-ipc.md
- Error handling should use DyadError per rules/dyad-errors.md
- UI components should use Base UI per rules/base-ui-components.md
- Database changes should follow rules/database-drizzle.md
- E2E tests should follow rules/e2e-testing.md

## Property-Based Testing Configuration

All property tests should use `fast-check` library with:

- Minimum 100 iterations per test
- Each test tagged with: `Feature: token-optimization-skills, Property {number}: {property_text}`
- Tests should generate random valid inputs and verify properties hold universally

## Implementation Order Rationale

1. **Phase 1** establishes the foundation with token management and context optimization
2. **Phase 2** builds on Phase 1 by optimizing skill loading and execution
3. **Phase 3** adds visibility through analytics and reporting
4. **Phase 4** adds advanced features like preloading and prediction

This order ensures each phase builds on stable foundations from previous phases.
