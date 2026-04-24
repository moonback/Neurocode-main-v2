/**
 * Agent Executor — executes a single agent's task within a workflow.
 *
 * This bridges the multi-agent system with the existing local agent handler's
 * tool execution capabilities.
 */

import { generateText, ToolSet } from "ai";
import log from "electron-log";
import { getModelClient } from "@/ipc/utils/get_model_client";
import { buildAgentToolSet } from "@/pro/main/ipc/handlers/local_agent/tool_definitions";
import { AgentContext } from "@/pro/main/ipc/handlers/local_agent/tools/types";
import { constructLocalAgentPrompt } from "@/prompts/local_agent_prompt";
import type { AgentDefinition, WorkflowContext } from "../types";
import { EventEmitter } from "node:events";

const logger = log.scope("agent_executor");

/**
 * Execute a task for a specific agent.
 */
export async function executeAgentTask(
  agent: AgentDefinition,
  taskDescription: string,
  workflowContext: WorkflowContext,
): Promise<string> {
  const { appId, appPath, messageBus } = workflowContext;

  logger.info(`Executing task for ${agent.name}: ${taskDescription}`);

  // 1. Create agent context
  const context: AgentContext = {
    appId,
    appPath,
    eventEmitter: new EventEmitter() as any,
    // Add other context fields if needed by tools
    // Note: Some tools might need a real event emitter for IPC
  };

  // 2. Build toolset for this agent
  const toolSet = buildAgentToolSet(context, {
    // Filter tools based on agent's allowed/excluded list
    filter: (toolName) => {
      if (agent.allowedTools && !agent.allowedTools.includes(toolName)) return false;
      if (agent.excludedTools && agent.excludedTools.includes(toolName)) return false;
      return true;
    },
  });

  // 3. Prepare prompt
  const systemPrompt = constructLocalAgentPrompt(agent.systemPrompt);

  // 4. Run agent loop
  const model = getModelClient();
  if (!model) throw new Error("No model client available");

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: taskDescription,
      tools: toolSet as any,
      maxSteps: agent.maxToolCallSteps ?? 10,
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        // Log progress or notify message bus
        logger.debug(`[${agent.name}] Step finished. Tool calls: ${toolCalls.length}`);
        
        // Notify bus of progress
        messageBus.broadcast(agent.id, "status-update", {
          kind: "status-update",
          status: "running",
          detail: text || (toolCalls.length > 0 ? `Exécution de outils: ${toolCalls.map(c => c.toolName).join(", ")}` : undefined),
        });
      },
    });

    return text;
  } catch (err) {
    logger.error(`Error in agent ${agent.name} execution:`, err);
    throw err;
  }
}
