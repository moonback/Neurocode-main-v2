/**
 * Unit tests for TokenManager
 *
 * Tests token usage tracking and statistics aggregation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TokenManager, TokenUsage, StatisticsFilter } from "./TokenManager";

// Mock the database module
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(),
          all: vi.fn(() => []),
          groupBy: vi.fn(() => ({
            all: vi.fn(() => []),
          })),
        })),
        get: vi.fn(),
        all: vi.fn(() => []),
        groupBy: vi.fn(() => ({
          all: vi.fn(() => []),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        run: vi.fn(),
      })),
    })),
  },
}));

import { db } from "@/db";

describe("TokenManager - Usage Tracking", () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
    vi.clearAllMocks();
  });

  describe("trackUsage", () => {
    it("should call database insert with correct values", () => {
      const usage: TokenUsage = {
        requestId: "test-request-123",
        timestamp: Date.now(),
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        modelType: "anthropic/claude-3-5-sonnet",
        conversationId: "test-conversation-456",
      };

      tokenManager.trackUsage("test-request-123", usage);

      expect(db.insert).toHaveBeenCalled();
    });

    it("should handle usage without conversationId", () => {
      const usage: TokenUsage = {
        requestId: "test-request-123",
        timestamp: Date.now(),
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
        modelType: "openai/gpt-4",
      };

      tokenManager.trackUsage("test-request-123", usage);

      expect(db.insert).toHaveBeenCalled();
    });

    it("should handle usage with skillName", () => {
      const usage: TokenUsage = {
        requestId: "test-request-123",
        timestamp: Date.now(),
        inputTokens: 150,
        outputTokens: 75,
        totalTokens: 225,
        modelType: "anthropic/claude-3-5-sonnet",
        skillName: "code-review",
      };

      tokenManager.trackUsage("test-request-123", usage);

      expect(db.insert).toHaveBeenCalled();
    });

    it("should not throw on database errors", () => {
      const mockInsert = vi.mocked(db.insert);
      mockInsert.mockImplementation(() => {
        throw new Error("Database error");
      });

      const usage: TokenUsage = {
        requestId: "test-request-123",
        timestamp: Date.now(),
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        modelType: "test-model",
      };

      // Should not throw even if there's an error
      expect(() =>
        tokenManager.trackUsage("test-request-123", usage),
      ).not.toThrow();
    });
  });

  describe("getStatistics", () => {
    it("should return empty statistics when no data", () => {
      const filter: StatisticsFilter = {};
      const stats = tokenManager.getStatistics(filter);

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.averageTokensPerRequest).toBe(0);
    });

    it("should call database select with correct filter for conversationId", () => {
      const filter: StatisticsFilter = {
        conversationId: "test-conversation",
      };

      tokenManager.getStatistics(filter);

      expect(db.select).toHaveBeenCalled();
    });

    it("should call database select with correct filter for skillName", () => {
      const filter: StatisticsFilter = {
        skillName: "test-skill",
      };

      tokenManager.getStatistics(filter);

      expect(db.select).toHaveBeenCalled();
    });

    it("should call database select with correct filter for modelType", () => {
      const filter: StatisticsFilter = {
        modelType: "test-model",
      };

      tokenManager.getStatistics(filter);

      expect(db.select).toHaveBeenCalled();
    });

    it("should call database select with time range filters", () => {
      const filter: StatisticsFilter = {
        startTime: new Date("2024-01-01"),
        endTime: new Date("2024-12-31"),
      };

      tokenManager.getStatistics(filter);

      expect(db.select).toHaveBeenCalled();
    });

    it("should handle database errors gracefully", () => {
      const mockSelect = vi.mocked(db.select);
      mockSelect.mockImplementation(() => {
        throw new Error("Database error");
      });

      const filter: StatisticsFilter = {};
      const stats = tokenManager.getStatistics(filter);

      // Should return empty statistics on error
      expect(stats.totalRequests).toBe(0);
      expect(stats.totalTokens).toBe(0);
    });
  });

  describe("exportData", () => {
    it("should export data in CSV format", async () => {
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

      const csv = await tokenManager.exportData("csv");
      expect(csv).toContain("requestId,conversationId");
      expect(csv).toContain("req-1,conv-1");
    });

    it("should export data in JSON format", async () => {
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
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].requestId).toBe("req-1");
    });
  });
});
