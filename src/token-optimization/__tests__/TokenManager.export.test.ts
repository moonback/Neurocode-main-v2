/**
 * Unit tests for TokenManager export functionality
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenManager } from "../TokenManager";

// Mock the database module
vi.mock("@/db", () => {
  const mockDb = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
        all: vi.fn(() => []),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        run: vi.fn(),
      })),
      run: vi.fn(),
    })),
  };
  return { db: mockDb };
});

import { db } from "@/db";

describe("TokenManager - Export", () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
    vi.clearAllMocks();
  });

  describe("exportData - CSV format", () => {
    it("should export data to CSV format", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill-a",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 100,
          costEstimate: 0.05,
          timestamp: 1234567890,
        },
        {
          requestId: "req-2",
          conversationId: "conv-1",
          skillName: "skill-b",
          modelType: "gpt-4o",
          inputTokens: 2000,
          outputTokens: 1000,
          totalTokens: 3000,
          optimizationsSaved: 200,
          costEstimate: 0.10,
          timestamp: 1234567900,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should have header
      expect(csv).toContain(
        "requestId,conversationId,skillName,modelType,inputTokens,outputTokens,totalTokens,optimizationsSaved,costEstimate,timestamp"
      );

      // Should have data rows
      expect(csv).toContain("req-1,conv-1,skill-a,claude-3-5-sonnet-20241022");
      expect(csv).toContain("req-2,conv-1,skill-b,gpt-4o");

      // Should have correct values
      expect(csv).toContain("1000,500,1500,100,0.05,1234567890");
      expect(csv).toContain("2000,1000,3000,200,0.1,1234567900");

      // Should end with newline
      expect(csv.endsWith("\n")).toBe(true);
    });

    it("should handle empty data", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([]),
          }),
          all: vi.fn().mockReturnValue([]),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should have header only
      expect(csv).toBe(
        "requestId,conversationId,skillName,modelType,inputTokens,outputTokens,totalTokens,optimizationsSaved,costEstimate,timestamp\n"
      );
    });

    it("should escape CSV fields with commas", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill,with,commas",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should wrap field with commas in quotes
      expect(csv).toContain('"skill,with,commas"');
    });

    it("should escape CSV fields with quotes", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: 'skill"with"quotes',
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should escape quotes by doubling them
      expect(csv).toContain('"skill""with""quotes"');
    });

    it("should escape CSV fields with newlines", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill\nwith\nnewlines",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should wrap field with newlines in quotes
      expect(csv).toContain('"skill\nwith\nnewlines"');
    });

    it("should handle null/undefined values", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: null,
          skillName: undefined,
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: null,
          costEstimate: undefined,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv");

      // Should handle null/undefined as empty string or 0
      expect(csv).toContain("req-1,,,claude-3-5-sonnet-20241022,1000,500,1500,0,0,1234567890");
    });

    it("should filter by conversation", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill-a",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
        }),
      } as any);

      const csv = await tokenManager.exportData("csv", {
        conversationId: "conv-1",
      });

      expect(csv).toContain("req-1,conv-1");
    });
  });

  describe("exportData - JSON format", () => {
    it("should export data to JSON format", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill-a",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 100,
          costEstimate: 0.05,
          timestamp: 1234567890,
        },
        {
          requestId: "req-2",
          conversationId: "conv-1",
          skillName: "skill-b",
          modelType: "gpt-4o",
          inputTokens: 2000,
          outputTokens: 1000,
          totalTokens: 3000,
          optimizationsSaved: 200,
          costEstimate: 0.10,
          timestamp: 1234567900,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const json = await tokenManager.exportData("json");

      // Should be valid JSON
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);

      // Should have correct data
      expect(parsed[0].requestId).toBe("req-1");
      expect(parsed[0].conversationId).toBe("conv-1");
      expect(parsed[0].skillName).toBe("skill-a");
      expect(parsed[0].inputTokens).toBe(1000);

      expect(parsed[1].requestId).toBe("req-2");
      expect(parsed[1].skillName).toBe("skill-b");
      expect(parsed[1].inputTokens).toBe(2000);
    });

    it("should handle empty data", async () => {
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([]),
          }),
          all: vi.fn().mockReturnValue([]),
        }),
      } as any);

      const json = await tokenManager.exportData("json");

      // Should be empty array
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });

    it("should format JSON with indentation", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill-a",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
          all: vi.fn().mockReturnValue(mockRecords),
        }),
      } as any);

      const json = await tokenManager.exportData("json");

      // Should have indentation (2 spaces)
      expect(json).toContain("  ");
      expect(json).toContain("[\n");
      expect(json).toContain("]");
    });

    it("should filter by skill", async () => {
      const mockRecords = [
        {
          requestId: "req-1",
          conversationId: "conv-1",
          skillName: "skill-a",
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          optimizationsSaved: 0,
          costEstimate: 0,
          timestamp: 1234567890,
        },
      ];

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue(mockRecords),
          }),
        }),
      } as any);

      const json = await tokenManager.exportData("json", {
        skillName: "skill-a",
      });

      const parsed = JSON.parse(json);
      expect(parsed[0].skillName).toBe("skill-a");
    });
  });

  describe("exportData - Error handling", () => {
    it("should handle database errors", async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(tokenManager.exportData("csv")).rejects.toThrow(
        "Failed to export data: Database error"
      );
    });

    it("should handle unknown errors", async () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw "Unknown error";
      });

      await expect(tokenManager.exportData("csv")).rejects.toThrow(
        "Failed to export data: Unknown error"
      );
    });
  });
});
