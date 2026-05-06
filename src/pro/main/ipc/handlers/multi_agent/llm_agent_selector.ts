/**
 * LLM-based Agent Selector
 * Uses semantic analysis to select the most appropriate agents for a task
 */

import log from "electron-log";
import { generateText } from "ai";
import { getModelClient } from "@/ipc/utils/get_model_client";
import { readSettings } from "@/main/settings";
import type { AgentProfile } from "@/ipc/types/multi_agent";
import { z } from "zod";

const logger = log.scope("llm_agent_selector");

/**
 * Schema for LLM agent selection response
 */
const AgentSelectionResponseSchema = z.object({
  primaryAgent: z.string(),
  supportingAgents: z.array(z.string()),
  reasoning: z.string(),
  parallelExecution: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
});

type AgentSelectionResponse = z.infer<typeof AgentSelectionResponseSchema>;

/**
 * Result of agent selection with full profile information
 */
export interface LLMAgentSelectionResult {
  primaryAgent: AgentProfile;
  supportingAgents: AgentProfile[];
  reasoning: string;
  parallelExecution: boolean;
  confidence?: number;
  method: "llm" | "fallback" | "manual";
}

/**
 * Select agents using LLM semantic analysis
 */
export async function selectAgentsWithLLM(
  task: string,
  availableAgents: AgentProfile[],
): Promise<LLMAgentSelectionResult> {
  logger.info("Starting LLM-based agent selection", {
    task: task.substring(0, 100),
    availableAgentsCount: availableAgents.length,
  });

  try {
    // Build the prompt for agent selection
    const prompt = buildAgentSelectionPrompt(task, availableAgents);

    // Get settings for model configuration
    const settings = readSettings();

    // Use the default model from settings for agent selection
    const model = settings.model as {
      name: string;
      provider: string;
      customModelId?: number;
    };
    const { modelClient } = await getModelClient(model, settings);

    logger.info("Calling LLM for agent selection", {
      model: model.name,
    });

    // Generate the selection
    const result = await generateText({
      model: modelClient.model,
      prompt,
      temperature: 0.3, // Low temperature for consistent selection
      maxRetries: 2,
    });

    logger.info("LLM response received", {
      responseLength: result.text.length,
    });

    // Parse the JSON response
    const selection = parseAgentSelection(result.text);

    // Validate and map agent names to profiles
    const mappedSelection = mapAgentNamesToProfiles(selection, availableAgents);

    logger.info("Agent selection completed", {
      primaryAgent: mappedSelection.primaryAgent.name,
      supportingAgents: mappedSelection.supportingAgents.map((a) => a.name),
      parallelExecution: mappedSelection.parallelExecution,
      method: "llm",
    });

    return {
      ...mappedSelection,
      method: "llm",
    };
  } catch (error) {
    logger.error("LLM agent selection failed, using fallback", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to keyword-based selection
    return selectAgentsWithKeywords(task, availableAgents);
  }
}

/**
 * Build the prompt for LLM agent selection
 */
function buildAgentSelectionPrompt(
  task: string,
  availableAgents: AgentProfile[],
): string {
  const agentDescriptions = availableAgents
    .map(
      (agent) => `
**${agent.name}** (${agent.role})
- Display Name: ${agent.displayName}
- Description: ${agent.description}
- Tools: ${agent.allowedTools?.length || "all"} available
- Specialization: ${getAgentSpecialization(agent)}
`,
    )
    .join("\n");

  return `You are an intelligent agent orchestrator. Your task is to analyze a user's request and select the most appropriate AI agents to handle it.

## User's Task

${task}

## Available Agents

${agentDescriptions}

## Your Task

Analyze the user's request and determine:
1. Which agent should be the PRIMARY agent (main responsibility)
2. Which agents should be SUPPORTING agents (if any)
3. Whether agents can work in PARALLEL or should work SEQUENTIALLY
4. Your REASONING for these choices
5. Your CONFIDENCE level (0.0 to 1.0)

## Selection Guidelines

- **Code Agent**: Use for implementing features, fixing bugs, refactoring code
- **Test Agent**: Use when tests are explicitly mentioned or needed
- **Documentation Agent**: Use when documentation, comments, or README updates are needed
- **Research Agent**: Use when information needs to be gathered from the web
- **Database Agent**: Use for database schema changes, migrations, or SQL queries
- **Orchestrator Agent**: Use for complex tasks requiring coordination of multiple agents

## Parallel vs Sequential

- **Parallel**: Use when tasks are independent (e.g., "implement feature AND write tests")
- **Sequential**: Use when tasks depend on each other (e.g., "research best practices THEN implement")

## Response Format

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):

{
  "primaryAgent": "agent-name",
  "supportingAgents": ["agent-name1", "agent-name2"],
  "reasoning": "Detailed explanation of why these agents were selected and how they will work together",
  "parallelExecution": true,
  "confidence": 0.95
}

**Important**: 
- Use exact agent names from the list above
- supportingAgents can be an empty array if only one agent is needed
- reasoning should be clear and specific to the task
- confidence should reflect how certain you are about the selection

Respond now with the JSON:`;
}

/**
 * Get agent specialization description
 */
function getAgentSpecialization(agent: AgentProfile): string {
  switch (agent.role) {
    case "orchestrator":
      return "Coordinates multiple agents for complex tasks";
    case "code":
      return "Writes, modifies, and refactors code";
    case "test":
      return "Creates unit, integration, and e2e tests";
    case "documentation":
      return "Writes documentation, comments, and guides";
    case "research":
      return "Searches web for information and best practices";
    case "database":
      return "Manages database schemas, migrations, and queries";
    case "custom":
      return agent.description;
    default:
      return "General purpose agent";
  }
}

/**
 * Parse the LLM response into structured data
 */
function parseAgentSelection(responseText: string): AgentSelectionResponse {
  // Try to extract JSON from the response
  // LLMs sometimes wrap JSON in markdown code blocks
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1];
  }

  // Find JSON object in the text
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonText);
    const validated = AgentSelectionResponseSchema.parse(parsed);
    return validated;
  } catch (error) {
    logger.error("Failed to parse LLM response", {
      error: error instanceof Error ? error.message : String(error),
      responseText: responseText.substring(0, 200),
    });
    throw new Error("Failed to parse LLM agent selection response");
  }
}

/**
 * Map agent names from LLM response to actual agent profiles
 */
function mapAgentNamesToProfiles(
  selection: AgentSelectionResponse,
  availableAgents: AgentProfile[],
): Omit<LLMAgentSelectionResult, "method"> {
  // Create a map of agent names to profiles (case-insensitive)
  const agentMap = new Map<string, AgentProfile>();
  for (const agent of availableAgents) {
    agentMap.set(agent.name.toLowerCase(), agent);
    agentMap.set(agent.displayName.toLowerCase(), agent);
    agentMap.set(agent.role.toLowerCase(), agent);
  }

  // Find primary agent
  const primaryAgent = agentMap.get(selection.primaryAgent.toLowerCase());
  if (!primaryAgent) {
    throw new Error(
      `Primary agent not found: ${selection.primaryAgent}. Available: ${availableAgents.map((a) => a.name).join(", ")}`,
    );
  }

  // Find supporting agents
  const supportingAgents: AgentProfile[] = [];
  for (const agentName of selection.supportingAgents) {
    const agent = agentMap.get(agentName.toLowerCase());
    if (agent && agent.id !== primaryAgent.id) {
      supportingAgents.push(agent);
    } else if (!agent) {
      logger.warn("Supporting agent not found, skipping", { agentName });
    }
  }

  return {
    primaryAgent,
    supportingAgents,
    reasoning: selection.reasoning,
    parallelExecution: selection.parallelExecution,
    confidence: selection.confidence,
  };
}

/**
 * Fallback keyword-based agent selection
 * Used when LLM selection fails
 */
function selectAgentsWithKeywords(
  task: string,
  availableAgents: AgentProfile[],
): LLMAgentSelectionResult {
  logger.info("Using keyword-based fallback selection");

  const taskLower = task.toLowerCase();
  let primaryAgent: AgentProfile | undefined;
  const supportingAgents: AgentProfile[] = [];

  // Find orchestrator for fallback
  const orchestrator = availableAgents.find((a) => a.role === "orchestrator");

  // Determine primary agent based on keywords
  if (
    taskLower.includes("test") ||
    taskLower.includes("unit test") ||
    taskLower.includes("e2e")
  ) {
    primaryAgent = availableAgents.find((a) => a.role === "test");
  } else if (
    taskLower.includes("document") ||
    taskLower.includes("readme") ||
    taskLower.includes("comment")
  ) {
    primaryAgent = availableAgents.find((a) => a.role === "documentation");
  } else if (
    taskLower.includes("search") ||
    taskLower.includes("find") ||
    taskLower.includes("research")
  ) {
    primaryAgent = availableAgents.find((a) => a.role === "research");
  } else if (
    taskLower.includes("database") ||
    taskLower.includes("sql") ||
    taskLower.includes("query") ||
    taskLower.includes("migration")
  ) {
    primaryAgent = availableAgents.find((a) => a.role === "database");
  } else if (
    taskLower.includes("code") ||
    taskLower.includes("implement") ||
    taskLower.includes("fix") ||
    taskLower.includes("bug") ||
    taskLower.includes("feature")
  ) {
    primaryAgent = availableAgents.find((a) => a.role === "code");
  }

  // Default to orchestrator or first available agent
  if (!primaryAgent) {
    primaryAgent = orchestrator || availableAgents[0];
  }

  // For complex tasks, add supporting agents
  if (orchestrator && primaryAgent.role !== "orchestrator") {
    // If task mentions multiple concerns, add relevant supporting agents
    if (taskLower.includes("test") && primaryAgent.role !== "test") {
      const testAgent = availableAgents.find((a) => a.role === "test");
      if (testAgent) supportingAgents.push(testAgent);
    }

    if (
      taskLower.includes("document") &&
      primaryAgent.role !== "documentation"
    ) {
      const docAgent = availableAgents.find((a) => a.role === "documentation");
      if (docAgent) supportingAgents.push(docAgent);
    }

    if (taskLower.includes("research") && primaryAgent.role !== "research") {
      const researchAgent = availableAgents.find((a) => a.role === "research");
      if (researchAgent) supportingAgents.push(researchAgent);
    }
  }

  // Determine if parallel execution is appropriate
  const parallelExecution =
    supportingAgents.length > 0 &&
    (taskLower.includes(" and ") ||
      taskLower.includes(" with ") ||
      taskLower.includes(" plus "));

  const reasoning = `Keyword-based selection (fallback): Selected ${primaryAgent.role} agent as primary based on task keywords. ${
    supportingAgents.length > 0
      ? `Supporting agents: ${supportingAgents.map((a) => a.role).join(", ")}.`
      : "No supporting agents needed."
  } ${parallelExecution ? "Tasks appear independent, using parallel execution." : "Using sequential execution."}`;

  return {
    primaryAgent,
    supportingAgents,
    reasoning,
    parallelExecution,
    confidence: 0.6, // Lower confidence for keyword-based selection
    method: "fallback",
  };
}

/**
 * Validate that LLM selection makes sense
 * Returns true if selection is valid, false otherwise
 */
export function validateAgentSelection(
  selection: LLMAgentSelectionResult,
  _task: string,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check if primary agent exists
  if (!selection.primaryAgent) {
    issues.push("No primary agent selected");
  }

  // Check for duplicate agents
  const allAgentIds = [
    selection.primaryAgent.id,
    ...selection.supportingAgents.map((a) => a.id),
  ];
  const uniqueIds = new Set(allAgentIds);
  if (uniqueIds.size !== allAgentIds.length) {
    issues.push("Duplicate agents in selection");
  }

  // Check if reasoning is provided
  if (!selection.reasoning || selection.reasoning.length < 20) {
    issues.push("Insufficient reasoning provided");
  }

  // Warn if confidence is low
  if (selection.confidence && selection.confidence < 0.5) {
    issues.push(`Low confidence: ${selection.confidence}`);
  }

  // Check if parallel execution makes sense
  if (selection.parallelExecution && selection.supportingAgents.length === 0) {
    issues.push("Parallel execution selected but no supporting agents");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
