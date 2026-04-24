/**
 * Multi-Agent Orchestration IPC Handler
 *
 * Implements the start-workflow contract and manages the lifecycle of
 * multi-agent workflows in the main process.
 */

import { IpcMainInvokeEvent } from "electron";
import log from "electron-log";
import { createLoggedHandler } from "@/ipc/handlers/safe_handle";
import {
  createWorkflow,
  executeWorkflow,
  autoDecompose,
  getActiveWorkflow,
} from "../orchestrator";
import { executeAgentTask } from "./agent_executor";
import { getDyadAppPath } from "@/paths/paths";
import { multiAgentEventClient } from "@/ipc/types/multi-agent";
import type {
  StartWorkflowParams,
  WorkflowExecutionDto,
} from "@/ipc/types/multi-agent";
import { getAgentById } from "../registry";

const logger = log.scope("multi_agent_orchestration");
const handle = createLoggedHandler(logger);

export function registerOrchestrationHandlers(): void {
  // Start a new multi-agent workflow
  handle(
    "multi-agent:start-workflow",
    async (event: IpcMainInvokeEvent, params: StartWorkflowParams): Promise<WorkflowExecutionDto> => {
      const { chatId, appId, userRequest, strategy = "sequential", selectedAgentIds } = params;
      
      const appPath = getDyadAppPath(appId);

      // 1. Decompose request into tasks
      // In a real implementation, we could use an LLM to decompose.
      // For now, we use our heuristics.
      const taskDecompositions = autoDecompose(userRequest);
      
      // If user selected specific agents, we can override the assignments
      // This is a simplified version - in a real UI the user might assign agents per task.

      // 2. Create workflow
      const workflow = createWorkflow(
        chatId,
        appId,
        userRequest,
        taskDecompositions,
        strategy
      );

      // 3. Execute workflow in background (don't await full completion)
      // We emit events as it progresses
      executeWorkflow(
        workflow.id,
        { chatId, appId, appPath },
        {
          onWorkflowUpdate: (w) => {
            multiAgentEventClient.emitWorkflowUpdate(event.sender, { workflow: w as any });
          },
          onTaskStart: (task, agent) => {
            multiAgentEventClient.emitTaskStart(event.sender, {
              workflowId: workflow.id,
              task: task as any,
              agentName: agent.name,
            });
          },
          onTaskComplete: (task) => {
            multiAgentEventClient.emitTaskComplete(event.sender, {
              workflowId: workflow.id,
              task: task as any,
            });
          },
          onTaskFail: (task, error) => {
            multiAgentEventClient.emitTaskFail(event.sender, {
              workflowId: workflow.id,
              task: task as any,
            });
          },
          executeAgentTask: (agent, taskDescription, context) => 
            executeAgentTask(agent, taskDescription, context),
        }
      ).catch(err => {
        logger.error(`Workflow ${workflow.id} background execution failed:`, err);
      });

      return {
        ...workflow,
        tasks: workflow.tasks.map(t => ({ ...t, dependsOn: [...t.dependsOn] }))
      } as any;
    }
  );
}
