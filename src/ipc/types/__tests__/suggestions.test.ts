import { describe, it, expect } from "vitest";
import {
  suggestionContracts,
  SuggestionSchema,
  TaskContextSchema,
  GeneratedSuggestionSchema,
  SuggestionCategory,
  UserAction,
} from "../suggestions";

describe("Suggestion IPC Contracts", () => {
  describe("suggestionContracts", () => {
    it("should define generateSuggestions contract with correct channel", () => {
      expect(suggestionContracts.generateSuggestions.channel).toBe(
        "suggestions:generate",
      );
    });

    it("should define acceptSuggestion contract with correct channel", () => {
      expect(suggestionContracts.acceptSuggestion.channel).toBe(
        "suggestions:accept",
      );
    });

    it("should define dismissSuggestion contract with correct channel", () => {
      expect(suggestionContracts.dismissSuggestion.channel).toBe(
        "suggestions:dismiss",
      );
    });

    it("should define getSuggestionHistory contract with correct channel", () => {
      expect(suggestionContracts.getSuggestionHistory.channel).toBe(
        "suggestions:getHistory",
      );
    });

    it("should validate correct input schema", () => {
      const validInput = {
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specPath: ".kiro/specs/auth-feature",
        specType: "feature" as const,
        modifiedFiles: ["src/auth.ts"],
        relatedTasks: [
          {
            id: "1.2",
            description: "Add login form",
            status: "pending",
          },
        ],
      };

      const result =
        suggestionContracts.generateSuggestions.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject invalid input schema", () => {
      const invalidInput = {
        taskId: "1.1",
        // Missing required fields
      };

      const result =
        suggestionContracts.generateSuggestions.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should validate correct output schema", () => {
      const validOutput = {
        suggestions: [
          {
            id: 1,
            taskId: "1.1",
            taskDescription: "Implement user authentication",
            specType: "feature" as const,
            specPath: ".kiro/specs/auth-feature",
            category: "new_feature" as const,
            description: "Add password reset functionality",
            priorityScore: 8,
            userAction: "pending" as const,
            actionTimestamp: null,
            createdAt: new Date(),
            createdTaskId: null,
          },
        ],
        error: null,
      };

      const result =
        suggestionContracts.generateSuggestions.output.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate acceptSuggestion input schema", () => {
      const validInput = {
        suggestionId: 1,
        specPath: ".kiro/specs/auth-feature",
      };

      const result =
        suggestionContracts.acceptSuggestion.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject acceptSuggestion input with missing fields", () => {
      const invalidInput = {
        suggestionId: 1,
        // Missing specPath
      };

      const result =
        suggestionContracts.acceptSuggestion.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should validate acceptSuggestion output schema", () => {
      const validOutput = {
        taskId: "1.3",
        success: true,
      };

      const result =
        suggestionContracts.acceptSuggestion.output.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate dismissSuggestion input schema", () => {
      const validInput = {
        suggestionId: 1,
      };

      const result =
        suggestionContracts.dismissSuggestion.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject dismissSuggestion input with invalid suggestionId type", () => {
      const invalidInput = {
        suggestionId: "not-a-number",
      };

      const result =
        suggestionContracts.dismissSuggestion.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should validate dismissSuggestion output schema", () => {
      const validOutput = {
        success: true,
      };

      const result =
        suggestionContracts.dismissSuggestion.output.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate getSuggestionHistory input with all optional fields", () => {
      const validInput = {
        taskId: "1.1",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        limit: 100,
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate getSuggestionHistory input with no optional fields", () => {
      const validInput = {};

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50); // Default value
      }
    });

    it("should validate getSuggestionHistory input with only taskId", () => {
      const validInput = {
        taskId: "1.1",
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should validate getSuggestionHistory input with date range only", () => {
      const validInput = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should reject getSuggestionHistory input with negative limit", () => {
      const invalidInput = {
        limit: -10,
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject getSuggestionHistory input with zero limit", () => {
      const invalidInput = {
        limit: 0,
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject getSuggestionHistory input with non-integer limit", () => {
      const invalidInput = {
        limit: 10.5,
      };

      const result =
        suggestionContracts.getSuggestionHistory.input.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should validate getSuggestionHistory output schema", () => {
      const validOutput = {
        suggestions: [
          {
            id: 1,
            taskId: "1.1",
            taskDescription: "Implement user authentication",
            specType: "feature" as const,
            specPath: ".kiro/specs/auth-feature",
            category: "new_feature" as const,
            description: "Add password reset functionality",
            priorityScore: 8,
            userAction: "pending" as const,
            actionTimestamp: null,
            createdAt: new Date(),
            createdTaskId: null,
          },
        ],
      };

      const result =
        suggestionContracts.getSuggestionHistory.output.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it("should validate getSuggestionHistory output with empty suggestions array", () => {
      const validOutput = {
        suggestions: [],
      };

      const result =
        suggestionContracts.getSuggestionHistory.output.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe("SuggestionSchema", () => {
    it("should validate a complete suggestion", () => {
      const suggestion = {
        id: 1,
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specType: "feature" as const,
        specPath: ".kiro/specs/auth-feature",
        category: "new_feature" as const,
        description: "Add password reset functionality",
        priorityScore: 8,
        userAction: "pending" as const,
        actionTimestamp: null,
        createdAt: new Date(),
        createdTaskId: null,
      };

      const result = SuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should reject suggestion with description less than 20 characters", () => {
      const suggestion = {
        id: 1,
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specType: "feature" as const,
        specPath: ".kiro/specs/auth-feature",
        category: "new_feature" as const,
        description: "Too short", // Less than 20 characters
        priorityScore: 8,
        userAction: "pending" as const,
        actionTimestamp: null,
        createdAt: new Date(),
        createdTaskId: null,
      };

      const result = SuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });

    it("should reject suggestion with invalid priority score", () => {
      const suggestion = {
        id: 1,
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specType: "feature" as const,
        specPath: ".kiro/specs/auth-feature",
        category: "new_feature" as const,
        description: "Add password reset functionality",
        priorityScore: 11, // Out of range (1-10)
        userAction: "pending" as const,
        actionTimestamp: null,
        createdAt: new Date(),
        createdTaskId: null,
      };

      const result = SuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(false);
    });
  });

  describe("TaskContextSchema", () => {
    it("should validate complete task context", () => {
      const context = {
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specPath: ".kiro/specs/auth-feature",
        specType: "feature" as const,
        modifiedFiles: ["src/auth.ts", "src/login.tsx"],
        relatedTasks: [
          {
            id: "1.2",
            description: "Add login form",
            status: "pending",
          },
        ],
      };

      const result = TaskContextSchema.safeParse(context);
      expect(result.success).toBe(true);
    });

    it("should validate task context with empty arrays", () => {
      const context = {
        taskId: "1.1",
        taskDescription: "Implement user authentication",
        specPath: ".kiro/specs/auth-feature",
        specType: "feature" as const,
        modifiedFiles: [],
        relatedTasks: [],
      };

      const result = TaskContextSchema.safeParse(context);
      expect(result.success).toBe(true);
    });
  });

  describe("GeneratedSuggestionSchema", () => {
    it("should validate generated suggestion with reasoning", () => {
      const suggestion = {
        category: "new_feature" as const,
        description: "Add password reset functionality",
        priorityScore: 8,
        reasoning: "Users often forget passwords",
      };

      const result = GeneratedSuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });

    it("should validate generated suggestion without reasoning", () => {
      const suggestion = {
        category: "bug_fix" as const,
        description: "Fix authentication token expiry",
        priorityScore: 9,
      };

      const result = GeneratedSuggestionSchema.safeParse(suggestion);
      expect(result.success).toBe(true);
    });
  });

  describe("SuggestionCategory", () => {
    it("should accept valid categories", () => {
      expect(SuggestionCategory.safeParse("new_feature").success).toBe(true);
      expect(SuggestionCategory.safeParse("bug_fix").success).toBe(true);
      expect(SuggestionCategory.safeParse("improvement").success).toBe(true);
    });

    it("should reject invalid categories", () => {
      expect(SuggestionCategory.safeParse("invalid").success).toBe(false);
      expect(SuggestionCategory.safeParse("feature").success).toBe(false);
    });
  });

  describe("UserAction", () => {
    it("should accept valid user actions", () => {
      expect(UserAction.safeParse("pending").success).toBe(true);
      expect(UserAction.safeParse("accepted").success).toBe(true);
      expect(UserAction.safeParse("dismissed").success).toBe(true);
    });

    it("should reject invalid user actions", () => {
      expect(UserAction.safeParse("invalid").success).toBe(false);
      expect(UserAction.safeParse("completed").success).toBe(false);
    });
  });
});
