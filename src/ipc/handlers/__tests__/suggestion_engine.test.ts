import { describe, it, expect, vi, beforeEach } from "vitest";
import { SuggestionEngine } from "../suggestion_engine";
import type { TaskContext } from "../../types/suggestions";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "../../../db/schema";

// Mock dependencies
vi.mock("ai", () => ({
  streamText: vi.fn(),
}));

vi.mock("@/ipc/utils/get_model_client", () => ({
  getModelClient: vi.fn(),
}));

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(),
}));

vi.mock("electron-log", () => ({
  default: {
    scope: vi.fn(() => ({
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

// Mock fs/promises for filterExistingTasks tests
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
}));

vi.mock("node:path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));

import { streamText } from "ai";
import { getModelClient } from "@/ipc/utils/get_model_client";
import { readSettings } from "@/main/settings";
import { readFile } from "node:fs/promises";

describe("SuggestionEngine", () => {
  let engine: SuggestionEngine;
  let mockDb: BetterSQLite3Database<typeof schema>;

  const mockTaskContext: TaskContext = {
    taskId: "3.2",
    taskDescription: "Implement generateSuggestions method with LLM integration",
    specPath: ".kiro/specs/task-completion-suggestions",
    specType: "feature",
    modifiedFiles: ["src/ipc/handlers/suggestion_engine.ts"],
    relatedTasks: [
      {
        id: "3.1",
        description: "Create SuggestionEngine class",
        status: "completed",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock database
    mockDb = {} as BetterSQLite3Database<typeof schema>;

    // Create engine instance
    engine = new SuggestionEngine({} as any, mockDb);

    // Mock readSettings
    vi.mocked(readSettings).mockResolvedValue({
      selectedModel: {
        provider: "openai",
        name: "gpt-4",
      },
    } as any);

    // Mock getModelClient
    vi.mocked(getModelClient).mockResolvedValue({
      modelClient: {
        model: { id: "gpt-4" } as any,
      },
    } as any);
  });

  describe("generateSuggestions", () => {
    it("should generate suggestions successfully", async () => {
      // Mock LLM response
      const mockResponse = JSON.stringify([
        {
          category: "improvement",
          description: "Add unit tests for the generateSuggestions method to ensure reliability",
          priorityScore: 8,
          reasoning: "Testing is crucial for maintaining code quality",
        },
        {
          category: "bug_fix",
          description: "Add error handling for malformed JSON responses from the LLM",
          priorityScore: 7,
          reasoning: "LLM responses may not always be valid JSON",
        },
      ]);

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield mockResponse;
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext);

      expect(result.error).toBeNull();
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toMatchObject({
        category: "improvement",
        description: "Add unit tests for the generateSuggestions method to ensure reliability",
        priorityScore: 8,
      });
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it("should handle LLM response with markdown code blocks", async () => {
      // Mock LLM response with markdown
      const mockResponse = `\`\`\`json
[
  {
    "category": "new_feature",
    "description": "Add support for custom timeout values per task type",
    "priorityScore": 6
  }
]
\`\`\``;

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield mockResponse;
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext);

      expect(result.error).toBeNull();
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].category).toBe("new_feature");
    });

    it("should handle timeout", async () => {
      // Mock a slow LLM response
      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          await new Promise((resolve) => setTimeout(resolve, 6000));
          yield "[]";
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext, 100);

      expect(result.error).toContain("timeout");
      expect(result.suggestions).toHaveLength(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(100);
    });

    it("should handle invalid JSON response", async () => {
      // Mock invalid JSON response
      const mockResponse = "This is not valid JSON";

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield mockResponse;
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext);

      expect(result.error).toBeNull(); // No error thrown, just empty suggestions
      expect(result.suggestions).toHaveLength(0);
    });

    it("should skip invalid suggestions but keep valid ones", async () => {
      // Mock response with mix of valid and invalid suggestions
      const mockResponse = JSON.stringify([
        {
          category: "improvement",
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
        {
          category: "invalid_category", // Invalid category
          description: "This should be skipped",
          priorityScore: 5,
        },
        {
          category: "bug_fix",
          description: "Short", // Too short (< 20 chars)
          priorityScore: 7,
        },
        {
          category: "new_feature",
          description: "Implement caching mechanism for frequently accessed suggestions",
          priorityScore: 6,
        },
      ]);

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield mockResponse;
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext);

      expect(result.error).toBeNull();
      expect(result.suggestions).toHaveLength(2); // Only valid suggestions
      expect(result.suggestions[0].category).toBe("improvement");
      expect(result.suggestions[1].category).toBe("new_feature");
    });

    it("should handle empty task context gracefully", async () => {
      const emptyContext: TaskContext = {
        taskId: "1.1",
        taskDescription: "Empty task",
        specPath: ".kiro/specs/test",
        specType: "feature",
        modifiedFiles: [],
        relatedTasks: [],
      };

      const mockResponse = JSON.stringify([
        {
          category: "improvement",
          description: "Add more context to the task description for better suggestions",
          priorityScore: 5,
        },
      ]);

      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          yield mockResponse;
        })(),
      } as any);

      const result = await engine.generateSuggestions(emptyContext);

      expect(result.error).toBeNull();
      expect(result.suggestions).toHaveLength(1);
    });

    it("should handle LLM errors gracefully", async () => {
      // Mock LLM throwing an error
      vi.mocked(streamText).mockImplementation(() => {
        throw new Error("LLM service unavailable");
      });

      const result = await engine.generateSuggestions(mockTaskContext);

      expect(result.error).toContain("Failed to generate suggestions");
      expect(result.suggestions).toHaveLength(0);
    });

    it("should respect custom timeout value", async () => {
      // Mock a response that takes 200ms
      vi.mocked(streamText).mockReturnValue({
        textStream: (async function* () {
          await new Promise((resolve) => setTimeout(resolve, 200));
          yield "[]";
        })(),
      } as any);

      const result = await engine.generateSuggestions(mockTaskContext, 100);

      expect(result.error).toContain("timeout");
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(100);
    });

    it("should build prompt with all task context fields", async () => {
      let capturedPrompt = "";

      vi.mocked(streamText).mockImplementation((options: any) => {
        capturedPrompt = options.messages[0].content;
        return {
          textStream: (async function* () {
            yield "[]";
          })(),
        } as any;
      });

      await engine.generateSuggestions(mockTaskContext);

      // Verify prompt includes all context fields
      expect(capturedPrompt).toContain(mockTaskContext.taskId);
      expect(capturedPrompt).toContain(mockTaskContext.taskDescription);
      expect(capturedPrompt).toContain(mockTaskContext.specPath);
      expect(capturedPrompt).toContain(mockTaskContext.specType);
      expect(capturedPrompt).toContain(mockTaskContext.modifiedFiles[0]);
      expect(capturedPrompt).toContain(mockTaskContext.relatedTasks[0].id);
    });
  });

  describe("filterDuplicates", () => {
    it("should return all suggestions when no existing suggestions exist", async () => {
      // Mock database query to return empty array
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      expect(result).toHaveLength(2);
      expect(result).toEqual(suggestions);
    });

    it("should filter out exact duplicate descriptions (case-insensitive)", async () => {
      // Mock database query to return existing suggestions
      const existingSuggestions = [
        {
          id: 1,
          taskId: "3.2",
          description: "Add comprehensive error handling throughout the codebase",
          category: "improvement",
          priorityScore: 8,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSuggestions),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase", // Exact match
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "Fix potential null pointer exception in user input validation",
      );
    });

    it("should filter out duplicates with different casing", async () => {
      // Mock database query to return existing suggestions
      const existingSuggestions = [
        {
          id: 1,
          taskId: "3.2",
          description: "add comprehensive error handling throughout the codebase",
          category: "improvement",
          priorityScore: 8,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSuggestions),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add Comprehensive Error Handling Throughout The Codebase", // Different casing
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "Fix potential null pointer exception in user input validation",
      );
    });

    it("should filter multiple duplicates", async () => {
      // Mock database query to return existing suggestions
      const existingSuggestions = [
        {
          id: 1,
          taskId: "3.2",
          description: "Add comprehensive error handling throughout the codebase",
          category: "improvement",
          priorityScore: 8,
        },
        {
          id: 2,
          taskId: "3.2",
          description: "Implement caching mechanism for frequently accessed data",
          category: "new_feature",
          priorityScore: 6,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSuggestions),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
        {
          category: "new_feature" as const,
          description: "Implement caching mechanism for frequently accessed data",
          priorityScore: 6,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "Fix potential null pointer exception in user input validation",
      );
    });

    it("should return empty array when all suggestions are duplicates", async () => {
      // Mock database query to return existing suggestions
      const existingSuggestions = [
        {
          id: 1,
          taskId: "3.2",
          description: "Add comprehensive error handling throughout the codebase",
          category: "improvement",
          priorityScore: 8,
        },
        {
          id: 2,
          taskId: "3.2",
          description: "Fix potential null pointer exception in user input validation",
          category: "bug_fix",
          priorityScore: 7,
        },
      ];

      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingSuggestions),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      expect(result).toHaveLength(0);
    });

    it("should handle database errors gracefully", async () => {
      // Mock database query to throw an error
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
      ];

      const result = await engine.filterDuplicates(suggestions, "3.2");

      // Should return original suggestions on error
      expect(result).toEqual(suggestions);
    });

    it("should handle empty input suggestions", async () => {
      mockDb.select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await engine.filterDuplicates([], "3.2");

      expect(result).toHaveLength(0);
    });
  });

  describe("filterExistingTasks", () => {
    // Mock fs module
    const mockFs = {
      readFile: vi.fn(),
    };

    beforeEach(() => {
      vi.clearAllMocks();
      // Mock dynamic import of fs/promises
      vi.doMock("node:fs/promises", () => mockFs);
    });

    it("should return all suggestions when tasks.md does not exist", async () => {
      // Mock ENOENT error (file not found)
      const error: NodeJS.ErrnoException = new Error("File not found");
      error.code = "ENOENT";
      mockFs.readFile.mockRejectedValue(error);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase",
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toEqual(suggestions);
      expect(result).toHaveLength(2);
    });

    it("should filter out suggestions matching existing task descriptions", async () => {
      // Mock tasks.md content
      const tasksContent = `# Tasks

- [x] 1.1 Create database schema
- [ ] 1.2 Add comprehensive error handling throughout the codebase
- [ ] 1.3 Implement user authentication
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling throughout the codebase", // Exact match
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix potential null pointer exception in user input validation",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe(
        "Fix potential null pointer exception in user input validation",
      );
    });

    it("should filter suggestions that are substrings of existing tasks", async () => {
      const tasksContent = `# Tasks

- [ ] 1.1 Implement comprehensive error handling throughout the entire codebase with proper logging
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "error handling throughout the codebase", // Substring of existing task
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix memory leak in event listeners",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Fix memory leak in event listeners");
    });

    it("should filter existing tasks that are substrings of suggestions", async () => {
      const tasksContent = `# Tasks

- [ ] 1.1 Add error handling
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description:
            "Add error handling and logging throughout the entire application", // Contains existing task
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix memory leak in event listeners",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Fix memory leak in event listeners");
    });

    it("should be case-insensitive when comparing", async () => {
      const tasksContent = `# Tasks

- [ ] 1.1 ADD COMPREHENSIVE ERROR HANDLING
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "add comprehensive error handling", // Different case
          priorityScore: 8,
        },
        {
          category: "bug_fix" as const,
          description: "Fix memory leak in event listeners",
          priorityScore: 7,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Fix memory leak in event listeners");
    });

    it("should handle tasks with different checkbox states", async () => {
      const tasksContent = `# Tasks

- [x] 1.1 Completed task description
- [ ] 1.2 Pending task description
- [-] 1.3 In progress task description
- [~] 1.4 Partially done task description
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Completed task description",
          priorityScore: 8,
        },
        {
          category: "improvement" as const,
          description: "Pending task description",
          priorityScore: 7,
        },
        {
          category: "improvement" as const,
          description: "In progress task description",
          priorityScore: 6,
        },
        {
          category: "improvement" as const,
          description: "Partially done task description",
          priorityScore: 5,
        },
        {
          category: "bug_fix" as const,
          description: "New unique suggestion",
          priorityScore: 9,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("New unique suggestion");
    });

    it("should handle nested task lists", async () => {
      const tasksContent = `# Tasks

- [ ] 1. Parent task
  - [ ] 1.1 Child task one
  - [ ] 1.2 Child task two
    - [ ] 1.2.1 Nested child task
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Child task one",
          priorityScore: 8,
        },
        {
          category: "improvement" as const,
          description: "Nested child task",
          priorityScore: 7,
        },
        {
          category: "bug_fix" as const,
          description: "Completely new task",
          priorityScore: 9,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Completely new task");
    });

    it("should return all suggestions when tasks.md is empty", async () => {
      mockFs.readFile.mockResolvedValue("");

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling",
          priorityScore: 8,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toEqual(suggestions);
    });

    it("should return all suggestions when tasks.md has no task items", async () => {
      const tasksContent = `# Tasks

This is just some text without any task items.

## Section

More text here.
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling",
          priorityScore: 8,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toEqual(suggestions);
    });

    it("should handle file system errors gracefully", async () => {
      // Mock a non-ENOENT error
      mockFs.readFile.mockRejectedValue(new Error("Permission denied"));

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add comprehensive error handling",
          priorityScore: 8,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      // Should return original suggestions on error
      expect(result).toEqual(suggestions);
    });

    it("should handle empty input suggestions", async () => {
      const tasksContent = `# Tasks

- [ ] 1.1 Some existing task
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const result = await engine.filterExistingTasks(
        [],
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(0);
    });

    it("should filter multiple matching suggestions", async () => {
      const tasksContent = `# Tasks

- [ ] 1.1 Add error handling
- [ ] 1.2 Implement caching
- [ ] 1.3 Add logging
`;

      mockFs.readFile.mockResolvedValue(tasksContent);

      const suggestions = [
        {
          category: "improvement" as const,
          description: "Add error handling throughout the application",
          priorityScore: 8,
        },
        {
          category: "new_feature" as const,
          description: "Implement caching mechanism",
          priorityScore: 7,
        },
        {
          category: "improvement" as const,
          description: "Add logging to all API endpoints",
          priorityScore: 6,
        },
        {
          category: "bug_fix" as const,
          description: "Fix memory leak in event listeners",
          priorityScore: 9,
        },
      ];

      const result = await engine.filterExistingTasks(
        suggestions,
        ".kiro/specs/test-spec",
      );

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe("Fix memory leak in event listeners");
    });
  });
});
