/**
 * Unit tests for TokenManager analytics methods
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
          get: vi.fn(),
          all: vi.fn(() => []),
          groupBy: vi.fn(() => ({
            all: vi.fn(() => []),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                all: vi.fn(() => []),
              })),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              all: vi.fn(() => []),
            })),
          })),
        })),
        get: vi.fn(),
        all: vi.fn(() => []),
        groupBy: vi.fn(() => ({
          all: vi.fn(() => []),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              all: vi.fn(() => []),
            })),
          })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            all: vi.fn(() => []),
          })),
        })),
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

describe("TokenManager - Analytics", () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager();
    vi.clearAllMocks();
  });

  describe("getTopConsumers", () => {
    it("should return top consumers across all types", () => {
      // Mock database responses
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 12000 });
      const mockAll = vi.fn()
        .mockReturnValueOnce([
          { id: "conv-2", totalTokens: 5250, requestCount: 2 },
          { id: "conv-1", totalTokens: 4500, requestCount: 2 },
        ])
        .mockReturnValueOnce([
          { id: "skill-a", totalTokens: 8250, requestCount: 3 },
          { id: "skill-b", totalTokens: 3000, requestCount: 1 },
        ])
        .mockReturnValueOnce([
          { id: "gpt-4o", totalTokens: 5250, requestCount: 2 },
          { id: "claude-3-5-sonnet-20241022", totalTokens: 4500, requestCount: 2 },
        ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 10);

      expect(topConsumers.length).toBeGreaterThan(0);
      expect(topConsumers.length).toBeLessThanOrEqual(10);

      // Should be sorted by total tokens descending
      for (let i = 1; i < topConsumers.length; i++) {
        expect(topConsumers[i - 1].totalTokens).toBeGreaterThanOrEqual(
          topConsumers[i].totalTokens
        );
      }

      // Should have percentage calculated
      for (const consumer of topConsumers) {
        expect(consumer.percentage).toBeGreaterThan(0);
        expect(consumer.percentage).toBeLessThanOrEqual(100);
      }
    });

    it("should return top conversations only", () => {
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 12000 });
      const mockAll = vi.fn().mockReturnValue([
        { id: "conv-2", totalTokens: 5250, requestCount: 2 },
        { id: "conv-1", totalTokens: 4500, requestCount: 2 },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 10, "conversation");

      expect(topConsumers.length).toBeGreaterThan(0);
      expect(topConsumers.every((c) => c.type === "conversation")).toBe(true);
      expect(topConsumers[0].id).toBe("conv-2");
      expect(topConsumers[0].totalTokens).toBe(5250);
    });

    it("should return top skills only", () => {
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 12000 });
      const mockAll = vi.fn().mockReturnValue([
        { id: "skill-a", totalTokens: 8250, requestCount: 3 },
        { id: "skill-b", totalTokens: 3000, requestCount: 1 },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 10, "skill");

      expect(topConsumers.length).toBeGreaterThan(0);
      expect(topConsumers.every((c) => c.type === "skill")).toBe(true);
      expect(topConsumers[0].id).toBe("skill-a");
      expect(topConsumers[0].totalTokens).toBe(8250);
    });

    it("should return top models only", () => {
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 12000 });
      const mockAll = vi.fn().mockReturnValue([
        { id: "gpt-4o", totalTokens: 5250, requestCount: 2 },
        { id: "claude-3-5-sonnet-20241022", totalTokens: 4500, requestCount: 2 },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 10, "model");

      expect(topConsumers.length).toBeGreaterThan(0);
      expect(topConsumers.every((c) => c.type === "model")).toBe(true);
      expect(topConsumers[0].id).toBe("gpt-4o");
      expect(topConsumers[0].totalTokens).toBe(5250);
    });

    it("should respect limit parameter", () => {
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 12000 });
      const mockAll = vi.fn()
        .mockReturnValueOnce([
          { id: "conv-1", totalTokens: 5000, requestCount: 1 },
          { id: "conv-2", totalTokens: 4000, requestCount: 1 },
        ])
        .mockReturnValueOnce([
          { id: "skill-a", totalTokens: 3000, requestCount: 1 },
          { id: "skill-b", totalTokens: 2000, requestCount: 1 },
        ])
        .mockReturnValueOnce([
          { id: "model-1", totalTokens: 1000, requestCount: 1 },
        ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 2);

      expect(topConsumers.length).toBeLessThanOrEqual(2);
    });

    it("should handle empty database", () => {
      const mockGet = vi.fn().mockReturnValue({ totalTokens: 0 });
      const mockAll = vi.fn().mockReturnValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            get: mockGet,
            groupBy: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  all: mockAll,
                }),
              }),
            }),
          }),
        }),
      } as any);

      const topConsumers = tokenManager.getTopConsumers({}, 10);

      expect(topConsumers).toEqual([]);
    });

    it("should handle database errors gracefully", () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error("Database error");
      });

      const topConsumers = tokenManager.getTopConsumers({}, 10);

      expect(topConsumers).toEqual([]);
    });
  });

  describe("calculateCost", () => {
    it("should calculate cost using default pricing", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1_500_000,
          outputTokens: 750_000,
        },
        {
          modelType: "gpt-4o-mini",
          inputTokens: 2_000_000,
          outputTokens: 1_000_000,
        },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const costBreakdown = tokenManager.calculateCost({});

      expect(costBreakdown.length).toBe(2);

      // Find claude-3-5-sonnet cost
      const claudeCost = costBreakdown.find(
        (c) => c.modelType === "claude-3-5-sonnet-20241022"
      );
      expect(claudeCost).toBeDefined();

      if (claudeCost) {
        // 1.5M input tokens * $3/1M = $4.50
        // 0.75M output tokens * $15/1M = $11.25
        // Total = $15.75
        expect(claudeCost.inputTokens).toBe(1_500_000);
        expect(claudeCost.outputTokens).toBe(750_000);
        expect(claudeCost.inputCost).toBeCloseTo(4.5, 2);
        expect(claudeCost.outputCost).toBeCloseTo(11.25, 2);
        expect(claudeCost.totalCost).toBeCloseTo(15.75, 2);
      }

      // Find gpt-4o-mini cost
      const gptCost = costBreakdown.find((c) => c.modelType === "gpt-4o-mini");
      expect(gptCost).toBeDefined();

      if (gptCost) {
        // 2M input tokens * $0.15/1M = $0.30
        // 1M output tokens * $0.6/1M = $0.60
        // Total = $0.90
        expect(gptCost.inputTokens).toBe(2_000_000);
        expect(gptCost.outputTokens).toBe(1_000_000);
        expect(gptCost.inputCost).toBeCloseTo(0.3, 2);
        expect(gptCost.outputCost).toBeCloseTo(0.6, 2);
        expect(gptCost.totalCost).toBeCloseTo(0.9, 2);
      }
    });

    it("should use custom pricing when provided", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1_500_000,
          outputTokens: 750_000,
        },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const customPricing = [
        {
          modelType: "claude-3-5-sonnet-20241022",
          inputPricePerMillion: 10.0,
          outputPricePerMillion: 20.0,
        },
      ];

      const costBreakdown = tokenManager.calculateCost({}, customPricing);

      const claudeCost = costBreakdown.find(
        (c) => c.modelType === "claude-3-5-sonnet-20241022"
      );

      if (claudeCost) {
        // 1.5M input tokens * $10/1M = $15.00
        // 0.75M output tokens * $20/1M = $15.00
        // Total = $30.00
        expect(claudeCost.inputCost).toBeCloseTo(15.0, 2);
        expect(claudeCost.outputCost).toBeCloseTo(15.0, 2);
        expect(claudeCost.totalCost).toBeCloseTo(30.0, 2);
      }
    });

    it("should sort by total cost descending", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 1_500_000,
          outputTokens: 750_000,
        },
        {
          modelType: "gpt-4o-mini",
          inputTokens: 2_000_000,
          outputTokens: 1_000_000,
        },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const costBreakdown = tokenManager.calculateCost({});

      for (let i = 1; i < costBreakdown.length; i++) {
        expect(costBreakdown[i - 1].totalCost).toBeGreaterThanOrEqual(
          costBreakdown[i].totalCost
        );
      }
    });

    it("should handle unknown models with default pricing", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          modelType: "unknown-model",
          inputTokens: 1_000_000,
          outputTokens: 500_000,
        },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const costBreakdown = tokenManager.calculateCost({});

      expect(costBreakdown.length).toBe(1);
      expect(costBreakdown[0].modelType).toBe("unknown-model");
      // Should use default fallback pricing ($3/$15)
      expect(costBreakdown[0].inputCost).toBeCloseTo(3.0, 2);
      expect(costBreakdown[0].outputCost).toBeCloseTo(7.5, 2);
    });

    it("should handle empty database", () => {
      const mockAll = vi.fn().mockReturnValue([]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const costBreakdown = tokenManager.calculateCost({});

      expect(costBreakdown).toEqual([]);
    });

    it("should handle database errors gracefully", () => {
      vi.mocked(db.select).mockImplementation(() => {
        throw new Error("Database error");
      });

      const costBreakdown = tokenManager.calculateCost({});

      expect(costBreakdown).toEqual([]);
    });

    it("should handle zero tokens", () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          modelType: "claude-3-5-sonnet-20241022",
          inputTokens: 0,
          outputTokens: 0,
        },
      ]);

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              all: mockAll,
            }),
          }),
        }),
      } as any);

      const costBreakdown = tokenManager.calculateCost({});

      expect(costBreakdown.length).toBe(1);
      expect(costBreakdown[0].totalCost).toBe(0);
    });
  });
});
