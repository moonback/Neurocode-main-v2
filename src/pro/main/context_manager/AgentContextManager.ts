import log from "electron-log";

const logger = log.scope("agent_context_manager");

export interface AgentContextData {
  agentId: string;
  history: any[];
  variables: Record<string, any>;
  tokenUsage: number;
}

export class AgentContextManager {
  private static instance: AgentContextManager;
  private contexts = new Map<string, AgentContextData>();
  private sharedPool: Record<string, any> = {};

  private constructor() {}

  static getInstance(): AgentContextManager {
    if (!AgentContextManager.instance) {
      AgentContextManager.instance = new AgentContextManager();
    }
    return AgentContextManager.instance;
  }

  getContext(agentId: string): AgentContextData {
    let ctx = this.contexts.get(agentId);
    if (!ctx) {
      ctx = {
        agentId,
        history: [],
        variables: {},
        tokenUsage: 0,
      };
      this.contexts.set(agentId, ctx);
    }
    return ctx;
  }

  updateContext(agentId: string, updates: Partial<AgentContextData>) {
    const ctx = this.getContext(agentId);
    if (updates.history) ctx.history.push(...updates.history);
    if (updates.variables) ctx.variables = { ...ctx.variables, ...updates.variables };
    if (updates.tokenUsage !== undefined) ctx.tokenUsage += updates.tokenUsage;
  }

  clearContext(agentId: string) {
    this.contexts.delete(agentId);
  }

  // Shared context pool methods
  setSharedVariable(key: string, value: any) {
    this.sharedPool[key] = value;
  }

  getSharedVariable(key: string): any {
    return this.sharedPool[key];
  }

  getSharedContext(): Record<string, any> {
    return this.sharedPool;
  }
}
