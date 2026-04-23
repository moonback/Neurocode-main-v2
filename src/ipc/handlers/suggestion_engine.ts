import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../../db/schema";
import type { LanguageModel } from "../types/language-model";
import type {
  TaskContext,
  GeneratedSuggestion,
  Suggestion,
} from "../types/suggestions";
import { streamText } from "ai";
import { getModelClient } from "../utils/get_model_client";
import { readSettings } from "../../main/settings";
import { GeneratedSuggestionSchema } from "../types/suggestions";
import log from "electron-log";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

/**
 * Result of suggestion generation operation.
 * Validates Requirements: 2.1, 7.1, 7.2
 */
export interface SuggestionEngineResult {
  suggestions: GeneratedSuggestion[];
  error: string | null;
  processingTimeMs: number;
}

/**
 * SuggestionEngine analyzes completed tasks and generates contextual suggestions.
 *
 * This class is responsible for:
 * - Generating suggestions using LLM analysis
 * - Filtering duplicate suggestions
 * - Filtering suggestions that match existing tasks
 * - Persisting suggestions to the database
 *
 * Validates Requirements: 2.1, 9.1
 */
export class SuggestionEngine {
  constructor(
    private llmClient: LanguageModel,
    private db: BetterSQLite3Database<typeof schema>,
  ) {}

  /**
   * Generate suggestions for a completed task.
   *
   * Analyzes the task context using the LLM client and returns categorized suggestions
   * with priority scores. Respects the timeout constraint.
   *
   * Validates Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 9.1, 9.2, 9.3, 9.4
   *
   * @param context - Task context including description, files, spec type, and related tasks
   * @param timeoutMs - Maximum time to wait for LLM response (default: 5000ms)
   * @returns Result containing suggestions, error (if any), and processing time
   */
  async generateSuggestions(
    context: TaskContext,
    timeoutMs: number = 5000,
  ): Promise<SuggestionEngineResult> {
    const startTime = Date.now();
    const logger = log.scope("suggestion-engine");

    try {
      // Build structured prompt from task context
      const prompt = this.buildPrompt(context);

      // Get model client from settings
      const settings = await readSettings();
      const { modelClient } = await getModelClient(
        settings.selectedModel,
        settings,
      );

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new DyadError(
              `Suggestion generation timeout after ${timeoutMs}ms`,
              DyadErrorKind.External,
            ),
          );
        }, timeoutMs);
      });

      // Call LLM with timeout wrapper
      const streamPromise = (async () => {
        const stream = streamText({
          model: modelClient.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          maxRetries: 1,
        });

        // Collect full response
        let fullText = "";
        for await (const chunk of stream.textStream) {
          fullText += chunk;
        }

        return fullText;
      })();

      const responseText = await Promise.race([streamPromise, timeoutPromise]);

      // Parse LLM response into GeneratedSuggestion array
      const suggestions = this.parseResponse(responseText);

      const processingTimeMs = Date.now() - startTime;

      return {
        suggestions,
        error: null,
        processingTimeMs,
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      // Handle timeout and other errors
      if (error instanceof DyadError) {
        logger.error(
          `Suggestion generation failed for task ${context.taskId}:`,
          error.message,
        );
        return {
          suggestions: [],
          error: error.message,
          processingTimeMs,
        };
      }

      // Handle unexpected errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(
        `Unexpected error generating suggestions for task ${context.taskId}:`,
        errorMessage,
      );

      return {
        suggestions: [],
        error: `Failed to generate suggestions: ${errorMessage}`,
        processingTimeMs,
      };
    }
  }

  /**
   * Build a structured prompt from task context.
   * Validates Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   *
   * @param context - Task context to build prompt from
   * @returns Formatted prompt string
   */
  private buildPrompt(context: TaskContext): string {
    const relatedTasksText =
      context.relatedTasks.length > 0
        ? context.relatedTasks
            .map((t) => `- ${t.id}: ${t.description} (${t.status})`)
            .join("\n")
        : "None";

    const modifiedFilesText =
      context.modifiedFiles.length > 0
        ? context.modifiedFiles.map((f) => `- ${f}`).join("\n")
        : "None";

    return `You are a task completion assistant. A developer has just completed a task in a ${context.specType} specification.

Task Details:
- Task ID: ${context.taskId}
- Description: ${context.taskDescription}
- Spec Path: ${context.specPath}
- Spec Type: ${context.specType}

Modified Files:
${modifiedFilesText}

Related Tasks in Spec:
${relatedTasksText}

Based on this completed task, generate 1-5 actionable suggestions for what the developer should do next. Each suggestion should be:
1. Specific and actionable (not vague)
2. Relevant to the completed task
3. Categorized as one of: "new_feature", "bug_fix", or "improvement"
4. Assigned a priority score from 1-10 (10 = highest priority)

Consider:
- Missing edge cases or error handling
- Related features that would complement this work
- Code quality improvements (performance, maintainability, testing)
- Documentation or testing gaps
- Potential bugs or issues

Respond with a JSON array of suggestions. Each suggestion must have:
- category: "new_feature" | "bug_fix" | "improvement"
- description: string (at least 20 characters, specific and actionable)
- priorityScore: number (1-10)
- reasoning: string (optional, why this suggestion matters)

Example response format:
[
  {
    "category": "bug_fix",
    "description": "Add input validation to prevent empty strings from being processed",
    "priorityScore": 8,
    "reasoning": "The current implementation doesn't handle empty input, which could cause runtime errors"
  },
  {
    "category": "improvement",
    "description": "Extract the validation logic into a reusable utility function",
    "priorityScore": 6,
    "reasoning": "This would improve code maintainability and allow reuse across other modules"
  }
]

Respond ONLY with the JSON array, no additional text.`;
  }

  /**
   * Parse LLM response into GeneratedSuggestion array.
   * Validates Requirements: 2.2, 2.3, 10.4
   *
   * @param responseText - Raw LLM response text
   * @returns Array of validated suggestions
   */
  private parseResponse(responseText: string): GeneratedSuggestion[] {
    const logger = log.scope("suggestion-engine");

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith("```")) {
        const lines = jsonText.split("\n");
        // Remove first line (```json or ```)
        lines.shift();
        // Remove last line (```)
        if (lines[lines.length - 1]?.trim() === "```") {
          lines.pop();
        }
        jsonText = lines.join("\n").trim();
      }

      // Parse JSON
      const parsed = JSON.parse(jsonText);

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      // Validate each suggestion against schema
      const suggestions: GeneratedSuggestion[] = [];
      for (const item of parsed) {
        try {
          const validated = GeneratedSuggestionSchema.parse(item);
          suggestions.push(validated);
        } catch (validationError) {
          logger.warn(
            "Skipping invalid suggestion:",
            item,
            validationError instanceof Error
              ? validationError.message
              : String(validationError),
          );
          // Skip invalid suggestions but continue processing others
        }
      }

      return suggestions;
    } catch (error) {
      logger.error(
        "Failed to parse LLM response:",
        error instanceof Error ? error.message : String(error),
      );
      logger.debug("Raw response:", responseText);

      // Return empty array on parse failure
      return [];
    }
  }

  /**
   * Filter out duplicate suggestions for a given task.
   *
   * Compares suggestions against previously generated suggestions for the same task
   * to avoid presenting duplicates to the user.
   *
   * Validates Requirements: 10.2
   *
   * @param suggestions - List of suggestions to filter
   * @param taskId - ID of the task to check for duplicates
   * @returns Filtered list of suggestions with duplicates removed
   */
  async filterDuplicates(
    suggestions: GeneratedSuggestion[],
    taskId: string,
  ): Promise<GeneratedSuggestion[]> {
    const logger = log.scope("suggestion-engine");

    try {
      // Query database for existing suggestions for this task
      const { taskCompletionSuggestions } = await import("../../db/schema");
      const { eq } = await import("drizzle-orm");

      const existingSuggestions = await this.db
        .select()
        .from(taskCompletionSuggestions)
        .where(eq(taskCompletionSuggestions.taskId, taskId));

      // If no existing suggestions, return all input suggestions
      if (existingSuggestions.length === 0) {
        return suggestions;
      }

      // Create a set of existing descriptions (normalized to lowercase)
      const existingDescriptions = new Set(
        existingSuggestions.map((s) => s.description.toLowerCase()),
      );

      // Filter out suggestions with duplicate descriptions (case-insensitive)
      const filtered = suggestions.filter((suggestion) => {
        const normalizedDescription = suggestion.description.toLowerCase();
        return !existingDescriptions.has(normalizedDescription);
      });

      const removedCount = suggestions.length - filtered.length;
      if (removedCount > 0) {
        logger.info(
          `Filtered ${removedCount} duplicate suggestion(s) for task ${taskId}`,
        );
      }

      return filtered;
    } catch (error) {
      logger.error(
        `Error filtering duplicates for task ${taskId}:`,
        error instanceof Error ? error.message : String(error),
      );
      // On error, return original suggestions to avoid blocking the user
      return suggestions;
    }
  }

  /**
   * Filter out suggestions that match existing tasks in the spec.
   *
   * Compares suggestions against tasks already defined in the spec to avoid
   * suggesting work that is already planned or completed.
   *
   * Validates Requirements: 10.3
   *
   * @param suggestions - List of suggestions to filter
   * @param specPath - Path to the spec to check for existing tasks
   * @returns Filtered list of suggestions with existing tasks removed
   */
  async filterExistingTasks(
    suggestions: GeneratedSuggestion[],
    specPath: string,
  ): Promise<GeneratedSuggestion[]> {
    const logger = log.scope("suggestion-engine");

    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Construct path to tasks.md file
      const tasksFilePath = path.join(specPath, "tasks.md");

      // Read tasks.md file
      let tasksContent: string;
      try {
        tasksContent = await fs.readFile(tasksFilePath, "utf-8");
      } catch (error) {
        // If tasks.md doesn't exist, return all suggestions
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          logger.info(
            `No tasks.md found at ${tasksFilePath}, skipping existing task filter`,
          );
          return suggestions;
        }
        throw error;
      }

      // Parse task descriptions from tasks.md
      // Tasks are in markdown list format: "- [ ] Task description" or "- [x] Task description"
      const taskDescriptions = this.parseTaskDescriptions(tasksContent);

      if (taskDescriptions.length === 0) {
        logger.info(`No tasks found in ${tasksFilePath}`);
        return suggestions;
      }

      // Normalize existing task descriptions to lowercase for comparison
      const normalizedTaskDescriptions = taskDescriptions.map((desc) =>
        desc.toLowerCase(),
      );

      // Filter out suggestions that are too similar to existing tasks
      const filtered = suggestions.filter((suggestion) => {
        const normalizedSuggestion = suggestion.description.toLowerCase();

        // Check if suggestion description is a substring of any task or vice versa
        const isSimilar = normalizedTaskDescriptions.some((taskDesc) => {
          // Check if suggestion is contained in task description
          if (taskDesc.includes(normalizedSuggestion)) {
            return true;
          }
          // Check if task description is contained in suggestion
          if (normalizedSuggestion.includes(taskDesc)) {
            return true;
          }
          return false;
        });

        return !isSimilar;
      });

      const removedCount = suggestions.length - filtered.length;
      if (removedCount > 0) {
        logger.info(
          `Filtered ${removedCount} suggestion(s) matching existing tasks in ${specPath}`,
        );
      }

      return filtered;
    } catch (error) {
      logger.error(
        `Error filtering existing tasks for spec ${specPath}:`,
        error instanceof Error ? error.message : String(error),
      );
      // On error, return original suggestions to avoid blocking the user
      return suggestions;
    }
  }

  /**
   * Parse task descriptions from tasks.md content.
   *
   * Extracts task descriptions from markdown list items.
   * Supports both checked and unchecked tasks.
   *
   * @param content - Raw content of tasks.md file
   * @returns Array of task descriptions
   */
  private parseTaskDescriptions(content: string): string[] {
    const descriptions: string[] = [];

    // Match markdown list items with checkboxes: - [ ] or - [x] or - [-] or - [~]
    // Capture the text after the checkbox
    const taskRegex = /^[\s]*-\s+\[[^\]]*\]\s+(.+)$/gm;

    let match: RegExpExecArray | null;
    while ((match = taskRegex.exec(content)) !== null) {
      const description = match[1].trim();
      if (description) {
        descriptions.push(description);
      }
    }

    return descriptions;
  }

  /**
   * Persist suggestions to the database.
   *
   * Saves generated suggestions with their associated task context and metadata.
   * Returns the persisted suggestions with database-assigned IDs.
   *
   * Validates Requirements: 6.1, 6.4
   *
   * @param suggestions - List of suggestions to persist
   * @param context - Task context associated with the suggestions
   * @returns Persisted suggestions with database IDs
   */
  async persistSuggestions(
    suggestions: GeneratedSuggestion[],
    context: TaskContext,
  ): Promise<Suggestion[]> {
    throw new Error("Not implemented");
  }
}
