import { z } from "zod";
import { defineContract, createClient } from "../contracts/core";

// =============================================================================
// Suggestion Schemas
// =============================================================================

/**
 * Enum for suggestion categories.
 * Validates Requirements: 2.2, 4.1
 */
export const SuggestionCategory = z.enum([
  "new_feature",
  "bug_fix",
  "improvement",
]);

/**
 * Enum for user actions on suggestions.
 * Validates Requirements: 5.5
 */
export const UserAction = z.enum(["pending", "accepted", "dismissed"]);

/**
 * Schema for a suggestion record.
 * Represents a single task completion suggestion with all metadata.
 * Validates Requirements: 2.2, 4.1, 5.5
 */
export const SuggestionSchema = z.object({
  id: z.number(),
  taskId: z.string(),
  taskDescription: z.string(),
  specType: z.enum(["feature", "bugfix", "other"]),
  specPath: z.string(),
  category: SuggestionCategory,
  description: z.string().min(20),
  priorityScore: z.number().int().min(1).max(10),
  userAction: UserAction,
  actionTimestamp: z.date().nullable(),
  createdAt: z.date(),
  createdTaskId: z.string().nullable(),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

/**
 * Schema for task context used to generate suggestions.
 * Contains all information needed to analyze a completed task.
 */
export const TaskContextSchema = z.object({
  taskId: z.string(),
  taskDescription: z.string(),
  specPath: z.string(),
  specType: z.enum(["feature", "bugfix", "other"]),
  modifiedFiles: z.array(z.string()),
  relatedTasks: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      status: z.string(),
    }),
  ),
});

export type TaskContext = z.infer<typeof TaskContextSchema>;

/**
 * Schema for a generated suggestion before persistence.
 * Used by the suggestion engine to return raw suggestions.
 */
export const GeneratedSuggestionSchema = z.object({
  category: SuggestionCategory,
  description: z.string().min(20),
  priorityScore: z.number().int().min(1).max(10),
  reasoning: z.string().optional(),
});

export type GeneratedSuggestion = z.infer<typeof GeneratedSuggestionSchema>;

// =============================================================================
// Suggestion Contracts
// =============================================================================

/**
 * Suggestion contracts define the IPC interface for task completion suggestions.
 * Validates Requirements: 1.2, 2.1, 9.1, 9.2, 9.3, 9.4
 */
export const suggestionContracts = {
  /**
   * Generate suggestions for a completed task.
   * Analyzes task context and returns categorized suggestions.
   * Validates Requirements: 1.2, 2.1, 9.1, 9.2, 9.3, 9.4
   */
  generateSuggestions: defineContract({
    channel: "suggestions:generate",
    input: z.object({
      taskId: z.string(),
      taskDescription: z.string(),
      specPath: z.string(),
      specType: z.enum(["feature", "bugfix", "other"]),
      modifiedFiles: z.array(z.string()),
      relatedTasks: z.array(
        z.object({
          id: z.string(),
          description: z.string(),
          status: z.string(),
        }),
      ),
    }),
    output: z.object({
      suggestions: z.array(SuggestionSchema),
      error: z.string().nullable(),
    }),
  }),

  /**
   * Accept a suggestion and create a new task.
   * Validates Requirements: 5.1, 5.3
   */
  acceptSuggestion: defineContract({
    channel: "suggestions:accept",
    input: z.object({
      suggestionId: z.number(),
      specPath: z.string(),
    }),
    output: z.object({
      taskId: z.string(),
      success: z.boolean(),
    }),
  }),

  /**
   * Dismiss a suggestion.
   * Validates Requirements: 5.2, 5.4
   */
  dismissSuggestion: defineContract({
    channel: "suggestions:dismiss",
    input: z.object({
      suggestionId: z.number(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
  }),

  /**
   * Retrieve suggestion history with optional filters.
   * Validates Requirements: 6.2, 6.3, 6.4
   */
  getSuggestionHistory: defineContract({
    channel: "suggestions:getHistory",
    input: z.object({
      taskId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().int().positive().default(50),
    }),
    output: z.object({
      suggestions: z.array(SuggestionSchema),
    }),
  }),

  /**
   * Get current suggestion settings.
   * Validates Requirements: 8.1, 8.2, 8.4, 8.5
   */
  getSuggestionSettings: defineContract({
    channel: "suggestions:getSettings",
    input: z.object({}),
    output: z.object({
      enabled: z.boolean(),
      displayEnabled: z.boolean(),
      maxSuggestionsPerTask: z.number().int().min(1).max(10),
    }),
  }),

  /**
   * Update suggestion settings.
   * Validates Requirements: 8.1, 8.2, 8.4, 8.5
   */
  updateSuggestionSettings: defineContract({
    channel: "suggestions:updateSettings",
    input: z.object({
      enabled: z.boolean().optional(),
      displayEnabled: z.boolean().optional(),
      maxSuggestionsPerTask: z.number().int().min(1).max(10).optional(),
    }),
    output: z.object({
      success: z.boolean(),
    }),
  }),
} as const;

// =============================================================================
// Suggestion Client
// =============================================================================

/**
 * Type-safe client for suggestion IPC operations.
 * Auto-generated from contracts - method names match contract keys.
 *
 * @example
 * const result = await suggestionClient.generateSuggestions({
 *   taskId: "1.1",
 *   taskDescription: "Implement user authentication",
 *   specPath: ".kiro/specs/auth-feature",
 *   specType: "feature",
 *   modifiedFiles: ["src/auth.ts"],
 *   relatedTasks: [],
 * });
 */
export const suggestionClient = createClient(suggestionContracts);

// =============================================================================
// Type Exports
// =============================================================================

/** Input type for generateSuggestions */
export type GenerateSuggestionsInput = z.infer<
  (typeof suggestionContracts)["generateSuggestions"]["input"]
>;

/** Output type for generateSuggestions */
export type GenerateSuggestionsOutput = z.infer<
  (typeof suggestionContracts)["generateSuggestions"]["output"]
>;

/** Input type for acceptSuggestion */
export type AcceptSuggestionInput = z.infer<
  (typeof suggestionContracts)["acceptSuggestion"]["input"]
>;

/** Output type for acceptSuggestion */
export type AcceptSuggestionOutput = z.infer<
  (typeof suggestionContracts)["acceptSuggestion"]["output"]
>;

/** Input type for dismissSuggestion */
export type DismissSuggestionInput = z.infer<
  (typeof suggestionContracts)["dismissSuggestion"]["input"]
>;

/** Output type for dismissSuggestion */
export type DismissSuggestionOutput = z.infer<
  (typeof suggestionContracts)["dismissSuggestion"]["output"]
>;

/** Input type for getSuggestionHistory */
export type GetSuggestionHistoryInput = z.infer<
  (typeof suggestionContracts)["getSuggestionHistory"]["input"]
>;

/** Output type for getSuggestionHistory */
export type GetSuggestionHistoryOutput = z.infer<
  (typeof suggestionContracts)["getSuggestionHistory"]["output"]
>;

/** Input type for getSuggestionSettings */
export type GetSuggestionSettingsInput = z.infer<
  (typeof suggestionContracts)["getSuggestionSettings"]["input"]
>;

/** Output type for getSuggestionSettings */
export type GetSuggestionSettingsOutput = z.infer<
  (typeof suggestionContracts)["getSuggestionSettings"]["output"]
>;

/** Input type for updateSuggestionSettings */
export type UpdateSuggestionSettingsInput = z.infer<
  (typeof suggestionContracts)["updateSuggestionSettings"]["input"]
>;

/** Output type for updateSuggestionSettings */
export type UpdateSuggestionSettingsOutput = z.infer<
  (typeof suggestionContracts)["updateSuggestionSettings"]["output"]
>;
