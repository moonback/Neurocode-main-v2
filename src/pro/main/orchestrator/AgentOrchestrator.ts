import { AgentRegistry } from "../agent_registry/AgentRegistry";
import {
  AgentDefinition,
  AgentCapability,
  AgentTaskResult,
  TaskDelegation,
} from "../../../ipc/types/multi_agent";
import { db } from "../../../db";
import { agentExecutions, agentMessages } from "../../../db/schema";
import { eq } from "drizzle-orm";
import log from "electron-log";
import { getModelClient } from "../../../ipc/utils/get_model_client";
import { readSettings } from "../../../main/settings";
import { generateText } from "ai";
import { AgentCommunicationChannel } from "../agent_communication/AgentCommunicationChannel";
import { AgentContextManager } from "../context_manager/AgentContextManager";
import { DyadError, DyadErrorKind } from "../../../errors/dyad_error";
import { safeSend } from "../../../ipc/utils/safe_sender";
import { WebContents } from "electron";

const logger = log.scope("agent_orchestrator");

export interface SubTask {
  id: string;
  agentId: string;
  description: string;
  dependencies: string[];
  status: "pending" | "running" | "completed" | "failed";
  input: string;
  output?: string;
  error?: string;
}

export interface ExecutionPlan {
  tasks: SubTask[];
}

export class AgentOrchestrator {
  private registry = AgentRegistry.getInstance();

  async createPlan(userRequest: string): Promise<ExecutionPlan> {
    const agents = await this.registry.getAll();
    const settings = readSettings();
    const { modelClient } = await getModelClient(settings.selectedModel, settings);

    const agentList = agents
      .map((a) => `- ${a.id}: ${a.name} (${a.capabilities.join(", ")}) - ${a.description}`)
      .join("\n");

    const prompt = `You are an AI Architect. Your task is to break down a complex user request into a set of subtasks that can be executed by specialized agents.
    
Available Agents:
${agentList}

User Request:
"${userRequest}"

Create an execution plan as a JSON object with a "tasks" array. Each task should have:
- "id": A unique string ID for the task.
- "agentId": The ID of the agent best suited for this task.
- "description": A clear instruction for the agent.
- "dependencies": An array of task IDs that must be completed before this task can start.
- "input": The initial input for the task.

Example output:
{
  "tasks": [
    { "id": "task1", "agentId": "agent-backend", "description": "Design schema", "dependencies": [], "input": "..." },
    { "id": "task2", "agentId": "agent-frontend", "description": "Create UI", "dependencies": ["task1"], "input": "..." }
  ]
}

Return ONLY the JSON object.`;

    try {
      const { text } = await generateText({
        model: modelClient.model,
        prompt: prompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to parse execution plan JSON");
      }

      const plan: ExecutionPlan = JSON.parse(jsonMatch[0]);
      // Initialize statuses
      plan.tasks.forEach((t) => (t.status = "pending"));
      return plan;
    } catch (err) {
      logger.error("Failed to create execution plan:", err);
      throw new DyadError(
        `Failed to create execution plan: ${err instanceof Error ? err.message : String(err)}`,
        DyadErrorKind.Internal,
      );
    }
  }

  async executePlan(plan: ExecutionPlan, sender: WebContents): Promise<void> {
    const completedTasks = new Set<string>();
    const runningTasks = new Set<string>();
    const failedTasks = new Set<string>();

    while (completedTasks.size + failedTasks.size < plan.tasks.length) {
      const availableTasks = plan.tasks.filter(
        (t) =>
          t.status === "pending" &&
          t.dependencies.every((depId) => completedTasks.has(depId)) &&
          !runningTasks.has(t.id),
      );

      if (availableTasks.length === 0 && runningTasks.size === 0) {
        break;
      }

      const taskPromises = availableTasks.map(async (task) => {
        runningTasks.add(task.id);
        task.status = "running";

        safeSend(sender, "multi-agent:task-started", {
          taskId: task.id,
          agentId: task.agentId,
        });

        try {
          const result = await this.delegate(task, sender);
          if (result.status === "completed") {
            task.status = "completed";
            task.output = result.output;
            completedTasks.add(task.id);
            safeSend(sender, "multi-agent:task-completed", result);
          } else {
            task.status = "failed";
            task.error = result.error;
            failedTasks.add(task.id);
            safeSend(sender, "multi-agent:task-failed", result);
          }
        } catch (err) {
          task.status = "failed";
          task.error = err instanceof Error ? err.message : String(err);
          failedTasks.add(task.id);
          safeSend(sender, "multi-agent:task-failed", {
            taskId: task.id,
            agentId: task.agentId,
            status: "failed",
            error: task.error,
          });
        } finally {
          runningTasks.delete(task.id);
        }
      });

      await Promise.all(taskPromises);

      if (failedTasks.size > 0) {
        logger.warn(`Plan execution encountered ${failedTasks.size} failures.`);
      }
    }
  }

  private async delegate(
    task: SubTask,
    sender: WebContents,
    retryCount = 0,
  ): Promise<AgentTaskResult> {
    const MAX_RETRIES = 3;
    const agent = await this.registry.findById(task.agentId);
    if (!agent) {
      return {
        taskId: task.id,
        agentId: task.agentId,
        status: "failed",
        error: `Agent ${task.agentId} not found`,
      };
    }

    const [execution] = await db
      .insert(agentExecutions)
      .values({
        agentId: agent.isBuiltIn ? null : parseInt(agent.id, 10),
        agentName: agent.name,
        taskId: task.id,
        status: "running",
        input: task.input,
        createdAt: new Date(),
      })
      .returning();

    try {
      const result = await this.runAgentLoop(agent, task.input, sender);

      await db
        .update(agentExecutions)
        .set({
          status: result.status,
          output: result.output,
          error: result.error,
          tokenUsage: result.tokenUsage,
          finishedAt: new Date(),
        })
        .where(eq(agentExecutions.id, execution.id));

      return {
        taskId: task.id,
        agentId: task.agentId,
        status: result.status,
        output: result.output,
        error: result.error,
        tokenUsage: result.tokenUsage,
      };
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`Retrying task ${task.id} (attempt ${retryCount + 1}) after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.delegate(task, sender, retryCount + 1);
      }

      await db
        .update(agentExecutions)
        .set({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        })
        .where(eq(agentExecutions.id, execution.id));

      return {
        taskId: task.id,
        agentId: task.agentId,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async runAgentLoop(
    agent: AgentDefinition,
    input: string,
    sender: WebContents,
  ): Promise<Omit<AgentTaskResult, "taskId" | "agentId">> {
    const settings = readSettings();
    const { modelClient } = await getModelClient(settings.selectedModel, settings);
    const contextManager = AgentContextManager.getInstance();
    const context = contextManager.getContext(agent.id);

    const messages: any[] = [
      ...context.history,
      { role: "user", content: input },
    ];

    const { text, usage } = await generateText({
      model: modelClient.model,
      system: agent.systemPrompt,
      messages: messages,
    });

    contextManager.updateContext(agent.id, {
      history: [
        { role: "user", content: input },
        { role: "assistant", content: text },
      ],
      tokenUsage: usage.totalTokens,
    });

    return {
      status: "completed",
      output: text,
      tokenUsage: usage.totalTokens,
    };
  }
}
