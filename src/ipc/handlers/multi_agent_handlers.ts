import log from "electron-log";
import { createTypedHandler } from "./base";
import { multiAgentContracts } from "../types/multi_agent";
import { AgentRegistry } from "../../pro/main/agent_registry/AgentRegistry";
import { AgentOrchestrator } from "../../pro/main/orchestrator/AgentOrchestrator";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("multi_agent_handlers");
const registry = AgentRegistry.getInstance();

export function registerMultiAgentHandlers(): void {
  // ── getAgents ─────────────────────────────────────────────────────────────
  createTypedHandler(multiAgentContracts.getAgents, async () => {
    try {
      return await registry.getAll();
    } catch (err) {
      logger.error("Failed to get agents:", err);
      throw new DyadError(
        `Failed to get agents: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  // ── createCustomAgent ─────────────────────────────────────────────────────
  createTypedHandler(multiAgentContracts.createCustomAgent, async (_event, params) => {
    logger.info(`Creating custom agent: ${params.name}`);
    try {
      return await registry.register(params);
    } catch (err) {
      if (err instanceof DyadError) throw err;
      logger.error("Failed to create custom agent:", err);
      throw new DyadError(
        `Failed to create custom agent: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  // ── updateCustomAgent ─────────────────────────────────────────────────────
  createTypedHandler(multiAgentContracts.updateCustomAgent, async (_event, { id, updates }) => {
    logger.info(`Updating custom agent: ${id}`);
    try {
      return await registry.update(id, updates);
    } catch (err) {
      if (err instanceof DyadError) throw err;
      logger.error(`Failed to update custom agent ${id}:`, err);
      throw new DyadError(
        `Failed to update custom agent: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  // ── deleteCustomAgent ─────────────────────────────────────────────────────
  createTypedHandler(multiAgentContracts.deleteCustomAgent, async (_event, { id }) => {
    logger.info(`Deleting custom agent: ${id}`);
    try {
      await registry.unregister(id);
    } catch (err) {
      if (err instanceof DyadError) throw err;
      logger.error(`Failed to delete custom agent ${id}:`, err);
      throw new DyadError(
        `Failed to delete custom agent: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  // ── delegateTask ──────────────────────────────────────────────────────────
  createTypedHandler(multiAgentContracts.delegateTask, async (event, params) => {
    logger.info(`Delegating task ${params.taskId} to agent ${params.agentId}`);
    try {
      const orchestrator = new AgentOrchestrator();
      const plan = await orchestrator.createPlan(params.input);
      await orchestrator.executePlan(plan, event.sender);

      return {
        taskId: params.taskId,
        agentId: params.agentId,
        status: "completed",
        output: "Multi-agent workflow execution completed.",
      };
    } catch (err) {
      logger.error("Orchestration failed:", err);
      throw new DyadError(
        `Orchestration failed: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  logger.debug("Registered multi-agent IPC handlers");
}
