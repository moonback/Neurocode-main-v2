# Implementation Plan: Multi-Agent Workflow

## Overview

This implementation plan breaks down the Multi-Agent Workflow feature into discrete coding tasks. The feature extends the existing Dyad/Kiro agent infrastructure to support orchestration of multiple specialized agents working collaboratively on complex tasks.

The implementation leverages the existing IPC contract system, Drizzle ORM, and agent execution framework while introducing new components for agent registry, delegation, and inter-agent communication.

## Tasks

- [ ] 1. Set up database schema and migrations for agent registry
  - Create Drizzle schema for `custom_agents` table with fields: id, name, description, systemPrompt, toolConfiguration, createdAt, updatedAt
  - Create Drizzle schema for `agent_executions` table to track agent task history
  - Create Drizzle schema for `agent_messages` table for agent-to-agent communication
  - Generate database migrations using `npm run db:generate`
  - _Requirements: 1.1, 1.3, 2.3, 4.2_

- [ ] 2. Implement Agent Registry core module
  - [ ] 2.1 Create agent registry service in `src/pro/main/agent_registry/`
    - Implement `AgentRegistry` class with methods: `register()`, `unregister()`, `findByCapability()`, `getAll()`
    - Implement agent definition validation using Zod schemas
    - Add built-in agent definitions (Frontend, Backend, Testing, Documentation, Debugging)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 7.1-7.6_
  
  - [ ]* 2.2 Write unit tests for agent registry
    - Test agent registration and validation
    - Test capability-based queries
    - Test duplicate agent handling
    - _Requirements: 1.1, 1.5_

- [ ] 3. Create IPC contracts for multi-agent operations
  - [ ] 3.1 Define agent contracts in `src/ipc/types/multi_agent.ts`
    - Create Zod schemas for agent definitions, task delegation, and results
    - Define contracts: `createCustomAgent`, `updateCustomAgent`, `deleteCustomAgent`, `getAgents`, `delegateTask`
    - Create event contracts: `agentTaskStarted`, `agentTaskCompleted`, `agentTaskFailed`, `agentCommunication`
    - Export typed clients using `createClient()` and `createEventClient()`
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 6.2, 6.3_
  
  - [ ] 3.2 Register contracts in `src/ipc/types/index.ts`
    - Re-export multi-agent contracts and clients
    - Add to unified `ipc` namespace object
    - _Requirements: 2.1, 3.1_

- [ ] 4. Implement IPC handlers for agent management
  - [ ] 4.1 Create agent management handlers in `src/ipc/handlers/multi_agent_handlers.ts`
    - Implement `createCustomAgent` handler with validation and database persistence
    - Implement `updateCustomAgent` handler with existence checks
    - Implement `deleteCustomAgent` handler with cleanup
    - Implement `getAgents` handler to query registry
    - Use `createTypedHandler()` for runtime Zod validation
    - Throw `DyadError` with appropriate `DyadErrorKind` for validation failures
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 4.2 Register handlers in `src/ipc/ipc_host.ts`
    - Import and call `registerMultiAgentHandlers()`
    - _Requirements: 2.1_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement agent orchestration engine
  - [ ] 6.1 Create orchestrator service in `src/pro/main/orchestrator/`
    - Implement `AgentOrchestrator` class with task analysis and delegation logic
    - Implement execution plan creation with dependency tracking
    - Implement agent selection algorithm based on capabilities
    - Add error handling and retry logic with exponential backoff
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 11.1, 11.2, 11.3, 11.4_
  
  - [ ] 6.2 Implement task delegation handler
    - Create `delegateTask` IPC handler in `src/ipc/handlers/multi_agent_handlers.ts`
    - Integrate with orchestrator to analyze request and create execution plan
    - Emit `agentTaskStarted` events when delegating to specialized agents
    - Collect results and emit `agentTaskCompleted` or `agentTaskFailed` events
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.2, 6.3_
  
  - [ ]* 6.3 Write integration tests for orchestration
    - Test multi-agent task delegation flow
    - Test error handling and retry logic
    - Test execution plan creation
    - _Requirements: 3.1, 3.6, 11.1, 11.2_

- [ ] 7. Implement agent-to-agent communication via IPC
  - [ ] 7.1 Create agent communication channel in `src/pro/main/agent_communication/`
    - Implement `AgentCommunicationChannel` class using IPC for message routing
    - Support synchronous request-response patterns
    - Support asynchronous fire-and-forget messaging
    - Implement message serialization/deserialization with Zod schemas
    - Add error handling for non-existent target agents
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [ ] 7.2 Add communication methods to agent execution context
    - Extend agent context to include `sendMessage()` and `requestFromAgent()` methods
    - Integrate communication channel with agent tool execution
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 7.3 Write unit tests for agent communication
    - Test message routing between agents
    - Test synchronous and asynchronous patterns
    - Test error handling for invalid targets
    - _Requirements: 4.1, 4.2, 4.6_

- [ ] 8. Implement agent context management
  - [ ] 8.1 Create context manager in `src/pro/main/context_manager/`
    - Implement `AgentContextManager` class to maintain per-agent context
    - Support isolated context mode (default)
    - Support shared context mode with context pool
    - Implement context size limits and token budget tracking
    - Add methods for context sharing during task delegation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ] 8.2 Integrate context manager with orchestrator
    - Pass relevant context elements when delegating tasks
    - Allow agents to update shared context upon task completion
    - Enforce context size limits before LLM invocation
    - _Requirements: 5.2, 5.5, 5.6_
  
  - [ ]* 8.3 Write unit tests for context management
    - Test isolated vs shared context modes
    - Test context size limit enforcement
    - Test context updates from agents
    - _Requirements: 5.1, 5.3, 5.4, 5.6_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement tool access control for agents
  - [ ] 10.1 Create tool permission system in `src/pro/main/agent_registry/tool_permissions.ts`
    - Define tool permission schemas with Zod
    - Implement tool allowlist validation
    - Support tool permission inheritance from base templates
    - Implement read-only agent mode (non-modifying tools only)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 10.2 Integrate tool permissions with agent execution
    - Modify `buildAgentToolSet()` to filter tools based on agent permissions
    - Add runtime checks before tool invocation
    - Return errors for disallowed tool usage
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [ ]* 10.3 Write unit tests for tool access control
    - Test tool allowlist enforcement
    - Test permission inheritance
    - Test read-only mode
    - Test disallowed tool rejection
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

- [ ] 11. Implement agent result aggregation
  - [ ] 11.1 Create result aggregator in `src/pro/main/orchestrator/result_aggregator.ts`
    - Implement `ResultAggregator` class to collect agent results
    - Implement merge strategies for combining results
    - Implement conflict resolution based on agent priority
    - Preserve attribution showing which agent contributed what
    - Format aggregated results for user presentation
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 11.2 Integrate result aggregator with orchestrator
    - Collect results from all delegated agents
    - Apply aggregation and conflict resolution
    - Return formatted response to user
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 11.3 Write unit tests for result aggregation
    - Test result collection and merging
    - Test conflict resolution strategies
    - Test attribution preservation
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 12. Implement agent performance metrics tracking
  - [ ] 12.1 Create metrics service in `src/pro/main/metrics/agent_metrics.ts`
    - Implement `AgentMetricsService` class to record execution time, token usage, success/failure rates
    - Store metrics in database (extend `agent_executions` table if needed)
    - Add methods to query metrics by agent type, time range, task category
    - _Requirements: 10.1, 10.2, 10.3, 10.5_
  
  - [ ] 12.2 Integrate metrics tracking with agent execution
    - Record start/end times for each agent task
    - Track token usage from LLM responses
    - Record success/failure status
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 12.3 Write unit tests for metrics tracking
    - Test metric recording and storage
    - Test metric queries and filtering
    - _Requirements: 10.1, 10.2, 10.3, 10.5_

- [ ] 13. Implement conversation history management for agents
  - [ ] 13.1 Create conversation history filter in `src/pro/main/orchestrator/conversation_filter.ts`
    - Implement filtering logic to extract relevant conversation history for delegated tasks
    - Implement history truncation to fit within agent context limits
    - Maintain separate conversation threads per agent
    - _Requirements: 12.1, 12.2, 12.3, 12.5_
  
  - [ ] 13.2 Integrate conversation history with task delegation
    - Pass filtered conversation history when delegating tasks
    - Append agent actions and results to conversation history upon completion
    - _Requirements: 12.1, 12.4_
  
  - [ ]* 13.3 Write unit tests for conversation history management
    - Test history filtering for relevance
    - Test history truncation
    - Test separate thread maintenance
    - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Build frontend UI for custom agent creation
  - [ ] 15.1 Create custom agent form component in `src/components/agents/`
    - Build form with fields: name, description, system prompt, tool selection
    - Use Base UI components (not Radix UI) for form elements
    - Implement form validation with Zod schemas
    - Use TanStack Query for IPC mutations (`createCustomAgent`, `updateCustomAgent`)
    - Add query keys to `src/lib/queryKeys.ts` following the factory pattern
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ] 15.2 Create agent list view component
    - Display all available agents (built-in + custom)
    - Show agent capabilities and tool permissions
    - Add edit/delete actions for custom agents
    - Use TanStack Query for data fetching with `queryKeys.agents.all`
    - _Requirements: 1.1, 2.4, 2.5_
  
  - [ ]* 15.3 Write E2E tests for agent management UI
    - Test creating a custom agent
    - Test editing and deleting custom agents
    - Test form validation
    - _Requirements: 2.1, 2.4, 2.5_

- [ ] 16. Build frontend UI for workflow monitoring
  - [ ] 16.1 Create workflow monitor component in `src/components/agents/`
    - Display active agents and their current tasks
    - Show workflow visualization with agent dependencies
    - Subscribe to agent events using `agentEventClient`
    - Display task start/completion/failure events in real-time
    - Add pause/cancel controls for running workflows
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 16.2 Create agent activity log component
    - Display chronological log of agent activities
    - Show task assignments, completions, and errors
    - Add filtering by agent type and time range
    - _Requirements: 6.6_
  
  - [ ]* 16.3 Write E2E tests for workflow monitoring UI
    - Test workflow visualization display
    - Test real-time event updates
    - Test pause/cancel functionality
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 17. Build frontend UI for agent performance analytics
  - [ ] 17.1 Create analytics dashboard component in `src/components/agents/`
    - Display agent performance metrics (execution time, token usage, success rates)
    - Add charts using Recharts library (already in dependencies)
    - Implement filtering by agent type, time range, task category
    - Use TanStack Query to fetch metrics data
    - Add query keys to `src/lib/queryKeys.ts` for metrics queries
    - _Requirements: 10.4, 10.5_
  
  - [ ]* 17.2 Write E2E tests for analytics dashboard
    - Test metrics display
    - Test filtering functionality
    - _Requirements: 10.4, 10.5_

- [ ] 18. Implement error handling and logging
  - [ ] 18.1 Add comprehensive error handling to all agent operations
    - Use `DyadError` with appropriate `DyadErrorKind` for non-bug failures
    - Add error context (agent name, task ID, step number) to all errors
    - Implement error recovery strategies in orchestrator
    - _Requirements: 11.1, 11.5_
  
  - [ ] 18.2 Add structured logging for agent operations
    - Use `electron-log` with scoped loggers for each agent module
    - Log all agent lifecycle events (start, complete, fail)
    - Log agent communication messages
    - Log context management operations
    - _Requirements: 6.6, 11.5_
  
  - [ ]* 18.3 Write integration tests for error handling
    - Test error propagation from agents to orchestrator
    - Test retry logic with exponential backoff
    - Test fallback to alternative agents
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 19. Integration and wiring
  - [ ] 19.1 Wire all components together in the main process
    - Initialize agent registry on application startup
    - Register all built-in specialized agents
    - Connect orchestrator with registry, communication channel, and context manager
    - Ensure all IPC handlers are registered
    - _Requirements: 1.2, 7.6_
  
  - [ ] 19.2 Add agent workflow entry points to chat interface
    - Integrate multi-agent orchestration with existing chat stream handler
    - Add UI controls to enable/disable multi-agent mode
    - Add settings for agent preferences and behavior
    - _Requirements: 3.1, 6.1_
  
  - [ ]* 19.3 Write end-to-end integration tests
    - Test complete multi-agent workflow from user request to aggregated response
    - Test agent-to-agent communication in real scenarios
    - Test context sharing between agents
    - Test error recovery across multiple agents
    - _Requirements: 3.1, 3.6, 4.1, 5.4, 11.1_

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Run full test suite: `npm run test`
  - Run E2E tests: `npm run build && npm run e2e`
  - Run type checks: `npm run ts`
  - Run linting: `npm run lint`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- All code should follow TypeScript best practices and existing codebase patterns
- Use Base UI (`@base-ui/react`) for all UI primitives, never Radix UI
- Follow IPC contract patterns defined in `rules/electron-ipc.md`
- Follow database migration patterns defined in `rules/database-drizzle.md`
- Use `DyadError` with `DyadErrorKind` for non-bug errors as per `rules/dyad-errors.md`
- Add E2E tests following patterns in `rules/e2e-testing.md`
- This is an infrastructure/integration feature without property-based testing requirements
