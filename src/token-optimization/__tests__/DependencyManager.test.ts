import { describe, it, expect, beforeEach, vi } from "vitest";
import { DependencyManager } from "../DependencyManager";
import { SkillLoader } from "../SkillLoader";
import type { LoadResult, SkillMetadata } from "../SkillLoader";

describe("DependencyManager", () => {
  let manager: DependencyManager;
  let mockLoader: SkillLoader;

  beforeEach(() => {
    mockLoader = {
      loadMetadata: vi.fn(),
    } as unknown as SkillLoader;
    manager = new DependencyManager(mockLoader);
  });

  describe("resolveDependencies", () => {
    it("should resolve dependencies with correct load order", async () => {
      // Setup: A depends on B, B depends on C
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(true);
      if (result.success) {
        // C should be loaded first, then B, then A
        expect(result.loadOrder).toEqual(["C", "B", "A"]);
      }
    });

    it("should handle skills with no dependencies", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          return {
            success: true,
            data: {
              name,
              description: `Skill ${name}`,
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.loadOrder).toEqual(["A"]);
      }
    });

    it("should handle diamond dependencies correctly", async () => {
      // Setup: A depends on B and C, both B and C depend on D
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B", "C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["D"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: ["D"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            D: {
              name: "D",
              description: "Skill D",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(true);
      if (result.success) {
        // D should be first, then B and C (order may vary), then A
        expect(result.loadOrder[0]).toBe("D");
        expect(result.loadOrder[3]).toBe("A");
        expect(result.loadOrder).toContain("B");
        expect(result.loadOrder).toContain("C");
      }
    });
  });

  describe("detectCircular", () => {
    it("should detect simple circular dependency", async () => {
      // Setup: A depends on B, B depends on A
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["A"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Circular dependency");
        expect(result.circularPath).toBeDefined();
      }
    });

    it("should detect complex circular dependency", async () => {
      // Setup: A -> B -> C -> A
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: ["A"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Circular dependency");
        expect(result.circularPath).toBeDefined();
        expect(result.circularPath!.length).toBeGreaterThan(2);
      }
    });

    it("should not detect circular dependency when none exists", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.resolveDependencies("A", "user");

      expect(result.success).toBe(true);
    });
  });

  describe("getDependencyGraph", () => {
    it("should return the dependency graph", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");
      const graph = manager.getDependencyGraph();

      expect(graph.nodes.size).toBe(2);
      expect(graph.edges.length).toBe(1);
      expect(graph.roots).toContain("B");
      expect(graph.leaves).toContain("A");
    });

    it("should identify roots correctly", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");
      const graph = manager.getDependencyGraph();

      expect(graph.roots).toEqual(["C"]);
    });
  });

  describe("invalidateDependents", () => {
    it("should invalidate all dependents", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");

      const invalidated: string[] = [];
      manager.invalidateDependents("C", (skill) => {
        invalidated.push(skill);
      });

      // C, B, and A should all be invalidated
      expect(invalidated).toContain("C");
      expect(invalidated).toContain("B");
      expect(invalidated).toContain("A");
    });

    it("should handle invalidation of skill with no dependents", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          return {
            success: true,
            data: {
              name,
              description: `Skill ${name}`,
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");

      const invalidated: string[] = [];
      manager.invalidateDependents("A", (skill) => {
        invalidated.push(skill);
      });

      expect(invalidated).toEqual(["A"]);
    });
  });

  describe("validateDependencies", () => {
    it("should validate all dependencies are available", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.validateDependencies("A", "user");

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.circular).toEqual([]);
    });

    it("should detect missing dependencies", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          if (name === "A") {
            return {
              success: true,
              data: {
                name: "A",
                description: "Skill A",
                dependencies: ["B"],
                estimatedTokens: 100,
                scope: "user",
                lastModified: Date.now(),
              },
              metrics: {
                skillName: name,
                operation: "loadMetadata",
                startTime: 0,
                endTime: 0,
                durationMs: 0,
                success: true,
              },
            } as LoadResult<SkillMetadata>;
          }

          return {
            success: false,
            error: "Skill not found",
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: false,
              error: "Skill not found",
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.validateDependencies("A", "user");

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("B");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect circular dependencies during validation", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["A"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      const result = await manager.validateDependencies("A", "user");

      expect(result.valid).toBe(false);
      expect(result.circular.length).toBeGreaterThan(0);
    });
  });

  describe("getStats", () => {
    it("should return graph statistics", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          const metadata: Record<string, SkillMetadata> = {
            A: {
              name: "A",
              description: "Skill A",
              dependencies: ["B"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            B: {
              name: "B",
              description: "Skill B",
              dependencies: ["C"],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            C: {
              name: "C",
              description: "Skill C",
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
          };

          return {
            success: true,
            data: metadata[name],
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");
      const stats = manager.getStats();

      expect(stats.totalNodes).toBe(3);
      expect(stats.totalEdges).toBe(2);
      expect(stats.roots).toBe(1);
      expect(stats.leaves).toBe(1);
      expect(stats.maxDepth).toBe(2);
    });
  });

  describe("clear", () => {
    it("should clear the dependency graph", async () => {
      vi.mocked(mockLoader.loadMetadata).mockImplementation(
        async (name: string) => {
          return {
            success: true,
            data: {
              name,
              description: `Skill ${name}`,
              dependencies: [],
              estimatedTokens: 100,
              scope: "user",
              lastModified: Date.now(),
            },
            metrics: {
              skillName: name,
              operation: "loadMetadata",
              startTime: 0,
              endTime: 0,
              durationMs: 0,
              success: true,
            },
          } as LoadResult<SkillMetadata>;
        },
      );

      await manager.resolveDependencies("A", "user");
      expect(manager.getStats().totalNodes).toBeGreaterThan(0);

      manager.clear();
      expect(manager.getStats().totalNodes).toBe(0);
    });
  });
});
