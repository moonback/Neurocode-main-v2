# Multi-Agent Workflow Design Document

## Overview

The Multi-Agent Workflow feature extends the existing Dyad/Kiro agent infrastructure to support orchestration of multiple specialized agents working collaboratively on complex tasks. This design leverages the existing IPC architecture, tool system, and database layer while introducing new components for agent registry, delegation, and inter-agent communication.

### Key Design Principles

1. **Leverage Existing Infrastructure**: Build on top of the proven IPC contract system, Drizzle ORM, and agent execution framework
2. **Type Safety**: Maintain end-to-end type safety across IPC boundaries using Zod schemas
3. **Minimal Disruption**: Extend rather than replace existing agent capabilities
4. **Scalability**: Design for easy addition of new specialized agents
5. **Context Efficiency**: Optimize context sharing to manage token budgets effectively

### Research Summary

**Multi-Agent Architecture Patterns**:
- **Hierarchical Orchestration**: A main orchestrator delegates to specialized agents (chosen approach)
- **Peer-to-Peer**: Agents communicate directly without central coordination (not suitable for our use case)
- **Blackboard System**: Shared knowledge base with agents contributing independently (too complex for initial implementation)

**Context Management Strategies**:
- **Full Context Sharing**: All agents see everything (simple but inefficient)
- **Selective Context**: Orchestrator filters relevant context per agent (chosen approach)
- **Isolated Context**: Each agent operates independently (limits collaboration)

**Tool Access Control**:
- **Capability-Based**: Agents declare required capabilities (flexible but complex)
- **Allowlist-Based**: Explicit tool permissions per agent (chosen for security and clarity)
- **Role-Based**: Predefined roles with tool sets (too rigid for custom agents)

## Architecture

### High-Level Architecture

```mermaid
graph TB
    User[User Request] --> Orchestrator[Main Orchestrator Agent]
    Orchestrator --> Registry[Agent Registry]
    Orchestrator --> Delegation[Task Delegation Engine]
    
    Delegation --> FrontendAgent[Frontend Agent]
    Delegation --> BackendAgent[Backend Agent]
    Delegation --> TestingAgent[Testing Agent]
    Delegation --> CustomAgent[Custom Agent]
    
    FrontendAgent --> ToolSystem[Tool System]
    BackendAgent --> ToolSystem
    TestingAgent --> ToolSystem
    CustomAgent --> ToolSystem
    
    Registry --> DB[(Database)]
    ToolSystem --> IPC[IPC Layer]
    IPC --> Renderer[Renderer Process]
    
    FrontendAgent -.->|Agent-to-Agent| BackendAgent
    BackendAgent -.->|Agent-to-Agent| TestingAgent
