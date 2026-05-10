/**
 * DependencyManager - Manages skill dependencies with resolution and validation
 *
 * This class is responsible for:
 * - Resolving skill dependencies with topological sorting
 * - Detecting circular dependencies
 * - Managing dependency graphs
 * - Invalidating dependent caches
 * - Validating dependency availability
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { SkillLoader } from "./SkillLoader";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Dependency node in the graph
 */
export interface DependencyNode {
  skillName: string;
  dependencies: string[];
  dependents: string[];
  isLoaded: boolean;
  loadOrder?: number;
}

/**
 * Dependency edge in the graph
 */
export interface DependencyEdge {
  from: string;
  to: string;
  type: "requires" | "optional";
}

/**
 * Dependency graph structure
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  roots: string[]; // Skills with no dependencies
  leaves: string[]; // Skills with no dependents
}

/**
 * Dependency resolution result
 */
export type DependencyResolutionResult =
  | { success: true; loadOrder: string[] }
  | { success: false; error: string; circularPath?: string[] };

/**
 * Dependency validation result
 */
export interface DependencyValidationResult {
  valid: boolean;
  missing: string[];
  circular: string[][];
  warnings: string[];
}

// =============================================================================
// DependencyManager Class
// =============================================================================

export class DependencyManager {
  private graph: DependencyGraph;
  private loader: SkillLoader;

  constructor(loader: SkillLoader) {
    this.loader = loader;
    this.graph = {
      nodes: new Map(),
      edges: [],
      roots: [],
      leaves: [],
    };
  }

  /**
   * Resolve dependencies for a skill using topological sorting
   *
   * @param skillName - Name of the skill to resolve dependencies for
   * @param scope - Scope of the skill (user or workspace)
   * @returns Resolution result with load order or error
   *
   * Requirements: 6.1
   */
  async resolveDependencies(
    skillName: string,
    scope: "user" | "workspace",
  ): Promise<DependencyResolutionResult> {
    try {
      // Build dependency graph starting from the skill
      await this.buildGraph(skillName, scope);

      // Check for circular dependencies
      const circular = this.detectCircular();
      if (circular.length > 0) {
        return {
          success: false,
          error: `Circular dependency detected: ${circular[0].join(" -> ")}`,
          circularPath: circular[0],
        };
      }

      // Perform topological sort to get load order
      const loadOrder = this.topologicalSort();

      return {
        success: true,
        loadOrder,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Detect circular dependencies in the graph
   *
   * @returns Array of circular dependency paths
   *
   * Requirements: 6.2
   */
  detectCircular(): string[][] {
    const circular: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const nodeData = this.graph.nodes.get(node);
      if (nodeData) {
        for (const dep of nodeData.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep, [...path])) {
              return true;
            }
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = path.indexOf(dep);
            circular.push([...path.slice(cycleStart), dep]);
            return true;
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of this.graph.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return circular;
  }

  /**
   * Get the dependency graph
   *
   * @returns The current dependency graph
   *
   * Requirements: 6.3
   */
  getDependencyGraph(): DependencyGraph {
    return {
      nodes: new Map(this.graph.nodes),
      edges: [...this.graph.edges],
      roots: [...this.graph.roots],
      leaves: [...this.graph.leaves],
    };
  }

  /**
   * Invalidate caches for all dependents of a skill
   *
   * @param skillName - Name of the skill that was updated
   * @param invalidateCallback - Callback to invalidate cache for a skill
   *
   * Requirements: 6.4
   */
  invalidateDependents(
    skillName: string,
    invalidateCallback: (skill: string) => void,
  ): void {
    const node = this.graph.nodes.get(skillName);
    if (!node) {
      return;
    }

    // Invalidate the skill itself
    invalidateCallback(skillName);

    // Recursively invalidate all dependents
    const visited = new Set<string>();
    const queue = [...node.dependents];

    while (queue.length > 0) {
      const dependent = queue.shift()!;
      if (visited.has(dependent)) {
        continue;
      }

      visited.add(dependent);
      invalidateCallback(dependent);

      const dependentNode = this.graph.nodes.get(dependent);
      if (dependentNode) {
        queue.push(...dependentNode.dependents);
      }
    }
  }

  /**
   * Validate that all dependencies are available
   *
   * @param skillName - Name of the skill to validate
   * @param scope - Scope of the skill (user or workspace)
   * @returns Validation result
   *
   * Requirements: 6.5, 6.6
   */
  async validateDependencies(
    skillName: string,
    scope: "user" | "workspace",
  ): Promise<DependencyValidationResult> {
    const missing: string[] = [];
    const warnings: string[] = [];

    try {
      // Clear existing graph before validation
      this.clear();
      
      // Build graph to discover dependencies
      await this.buildGraph(skillName, scope);

      // Check for circular dependencies
      const circular = this.detectCircular();

      // Check for missing dependencies
      for (const [name, node] of this.graph.nodes) {
        for (const dep of node.dependencies) {
          const depNode = this.graph.nodes.get(dep);
          if (!depNode || !depNode.isLoaded) {
            if (!missing.includes(dep)) {
              missing.push(dep);
            }
            warnings.push(
              `Skill "${name}" depends on "${dep}" which is not available`,
            );
          }
        }
      }

      return {
        valid: missing.length === 0 && circular.length === 0,
        missing,
        circular,
        warnings,
      };
    } catch (error) {
      return {
        valid: false,
        missing,
        circular: [],
        warnings: [
          `Failed to validate dependencies: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Build dependency graph starting from a skill
   *
   * @param skillName - Name of the skill to start from
   * @param scope - Scope of the skill (user or workspace)
   *
   * @private
   */
  private async buildGraph(
    skillName: string,
    scope: "user" | "workspace",
  ): Promise<void> {
    const visited = new Set<string>();
    const queue = [skillName];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // Load skill metadata to get dependencies
      const result = await this.loader.loadMetadata(current, scope);
      if (!result.success) {
        // Skill not found, add as missing node
        if (!this.graph.nodes.has(current)) {
          this.graph.nodes.set(current, {
            skillName: current,
            dependencies: [],
            dependents: [],
            isLoaded: false,
          });
        }
        continue;
      }

      const metadata = result.data;
      const dependencies = metadata.dependencies;

      // Add node to graph if not already present
      if (!this.graph.nodes.has(current)) {
        this.graph.nodes.set(current, {
          skillName: current,
          dependencies,
          dependents: [],
          isLoaded: true,
        });
      } else {
        // Update existing node
        const node = this.graph.nodes.get(current)!;
        node.dependencies = dependencies;
        node.isLoaded = true;
      }

      // Add edges and queue dependencies
      for (const dep of dependencies) {
        this.graph.edges.push({
          from: current,
          to: dep,
          type: "requires",
        });

        // Ensure dependency node exists
        if (!this.graph.nodes.has(dep)) {
          this.graph.nodes.set(dep, {
            skillName: dep,
            dependencies: [],
            dependents: [],
            isLoaded: false,
          });
        }

        // Add to dependents of the dependency
        const depNode = this.graph.nodes.get(dep)!;
        if (!depNode.dependents.includes(current)) {
          depNode.dependents.push(current);
        }

        queue.push(dep);
      }
    }

    // Identify roots and leaves
    this.identifyRootsAndLeaves();
  }

  /**
   * Identify root and leaf nodes in the graph
   *
   * @private
   */
  private identifyRootsAndLeaves(): void {
    this.graph.roots = [];
    this.graph.leaves = [];

    for (const [name, node] of this.graph.nodes) {
      if (node.dependencies.length === 0) {
        this.graph.roots.push(name);
      }
      if (node.dependents.length === 0) {
        this.graph.leaves.push(name);
      }
    }
  }

  /**
   * Perform topological sort to get load order
   *
   * @returns Array of skill names in load order
   *
   * @private
   */
  private topologicalSort(): string[] {
    const result: string[] = [];
    const inDegree = new Map<string, number>();
    const queue: string[] = [];

    // Calculate in-degree for each node
    for (const [name, node] of this.graph.nodes) {
      inDegree.set(name, node.dependencies.length);
      if (node.dependencies.length === 0) {
        queue.push(name);
      }
    }

    // Process nodes with in-degree 0
    let order = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const node = this.graph.nodes.get(current);
      if (node) {
        node.loadOrder = order++;

        // Reduce in-degree of dependents
        for (const dependent of node.dependents) {
          const degree = inDegree.get(dependent)! - 1;
          inDegree.set(dependent, degree);

          if (degree === 0) {
            queue.push(dependent);
          }
        }
      }
    }

    return result;
  }

  /**
   * Clear the dependency graph
   */
  clear(): void {
    this.graph = {
      nodes: new Map(),
      edges: [],
      roots: [],
      leaves: [],
    };
  }

  /**
   * Get statistics about the dependency graph
   */
  getStats() {
    return {
      totalNodes: this.graph.nodes.size,
      totalEdges: this.graph.edges.length,
      roots: this.graph.roots.length,
      leaves: this.graph.leaves.length,
      maxDepth: this.calculateMaxDepth(),
    };
  }

  /**
   * Calculate maximum depth of the dependency graph
   *
   * @private
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;
    const visited = new Set<string>();
    const memo = new Map<string, number>();

    const dfs = (node: string): number => {
      if (memo.has(node)) {
        return memo.get(node)!;
      }

      if (visited.has(node)) {
        return 0; // Circular dependency, return 0
      }

      visited.add(node);

      const nodeData = this.graph.nodes.get(node);
      let depth = 0;

      if (nodeData && nodeData.dependencies.length > 0) {
        for (const dep of nodeData.dependencies) {
          depth = Math.max(depth, dfs(dep) + 1);
        }
      }

      visited.delete(node);
      memo.set(node, depth);
      return depth;
    };

    // Calculate depth for all nodes and find maximum
    for (const node of this.graph.nodes.keys()) {
      maxDepth = Math.max(maxDepth, dfs(node));
    }

    return maxDepth;
  }
}
