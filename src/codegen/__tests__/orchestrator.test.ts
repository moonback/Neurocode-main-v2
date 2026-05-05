/**
 * Unit tests for Orchestrator
 *
 * Tests workflow coordination, error handling, and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Orchestrator, WorkflowOptions } from "../orchestrator";
import { FileOperationResult } from "../file-system";

// Mock generators
const createMockGenerator = (name: string) => ({
  generate: vi.fn(async () => [
    {
      path: `${name}-file.ts`,
      action: "create" as const,
      success: true,
      size: 100,
    },
  ]),
});

describe("Orchestrator", () => {
  let ipcGen: ReturnType<typeof createMockGenerator>;
  let componentGen: ReturnType<typeof createMockGenerator>;
  let dbGen: ReturnType<typeof createMockGenerator>;
  let testGen: ReturnType<typeof createMockGenerator>;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    ipcGen = createMockGenerator("ipc");
    componentGen = createMockGenerator("component");
    dbGen = createMockGenerator("db");
    testGen = createMockGenerator("test");
    orchestrator = new Orchestrator(
      ipcGen as any,
      componentGen as any,
      dbGen as any,
      testGen as any,
    );
  });

  describe("executeWorkflow", () => {
    it("should execute all generators when all flags are true", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        domain: "test",
        withIpc: true,
        withComponent: true,
        withDb: true,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(dbGen.generate).toHaveBeenCalledWith({
        name: "testFeature",
        append: true,
      });
      expect(ipcGen.generate).toHaveBeenCalledWith({
        name: "testFeature",
        domain: "test",
        mutation: true,
      });
      expect(componentGen.generate).toHaveBeenCalledWith({
        name: "testFeature",
        directory: "src/components/test",
      });

      expect(results).toHaveLength(3);
    });

    it("should only execute IPC generator when only withIpc is true", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        domain: "test",
        withIpc: true,
        withComponent: false,
        withDb: false,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(ipcGen.generate).toHaveBeenCalled();
      expect(componentGen.generate).not.toHaveBeenCalled();
      expect(dbGen.generate).not.toHaveBeenCalled();

      expect(results).toHaveLength(1);
    });

    it("should only execute component generator when only withComponent is true", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        domain: "test",
        withIpc: false,
        withComponent: true,
        withDb: false,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(componentGen.generate).toHaveBeenCalled();
      expect(ipcGen.generate).not.toHaveBeenCalled();
      expect(dbGen.generate).not.toHaveBeenCalled();

      expect(results).toHaveLength(1);
    });

    it("should only execute db generator when only withDb is true", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        domain: "test",
        withIpc: false,
        withComponent: false,
        withDb: true,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(dbGen.generate).toHaveBeenCalled();
      expect(ipcGen.generate).not.toHaveBeenCalled();
      expect(componentGen.generate).not.toHaveBeenCalled();

      expect(results).toHaveLength(1);
    });

    it("should return empty results when all flags are false", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        domain: "test",
        withIpc: false,
        withComponent: false,
        withDb: false,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(ipcGen.generate).not.toHaveBeenCalled();
      expect(componentGen.generate).not.toHaveBeenCalled();
      expect(dbGen.generate).not.toHaveBeenCalled();

      expect(results).toHaveLength(0);
    });

    it("should use default domain 'app' when domain is not provided", async () => {
      const options: WorkflowOptions = {
        name: "testFeature",
        withIpc: true,
        withComponent: true,
      };

      await orchestrator.executeWorkflow(options);

      expect(ipcGen.generate).toHaveBeenCalledWith({
        name: "testFeature",
        domain: "app",
        mutation: true,
      });
      expect(componentGen.generate).toHaveBeenCalledWith({
        name: "testFeature",
        directory: "src/components/features",
      });
    });

    it("should aggregate results from multiple generators", async () => {
      ipcGen.generate.mockResolvedValue([
        {
          path: "ipc-file-1.ts",
          action: "create" as const,
          success: true,
          size: 100,
        },
        {
          path: "ipc-file-2.ts",
          action: "create" as const,
          success: true,
          size: 200,
        },
      ]);

      componentGen.generate.mockResolvedValue([
        {
          path: "component-file.tsx",
          action: "create" as const,
          success: true,
          size: 300,
        },
      ]);

      const options: WorkflowOptions = {
        name: "testFeature",
        withIpc: true,
        withComponent: true,
      };

      const results = await orchestrator.executeWorkflow(options);

      expect(results).toHaveLength(3);
      expect(results[0].path).toBe("ipc-file-1.ts");
      expect(results[1].path).toBe("ipc-file-2.ts");
      expect(results[2].path).toBe("component-file.tsx");
    });

    it("should handle generator errors gracefully", async () => {
      ipcGen.generate.mockRejectedValue(new Error("IPC generation failed"));

      const options: WorkflowOptions = {
        name: "testFeature",
        withIpc: true,
      };

      await expect(orchestrator.executeWorkflow(options)).rejects.toThrow(
        "IPC generation failed",
      );
    });

    it("should execute generators in correct order (db, ipc, component)", async () => {
      const executionOrder: string[] = [];

      dbGen.generate.mockImplementation(async () => {
        executionOrder.push("db");
        return [];
      });

      ipcGen.generate.mockImplementation(async () => {
        executionOrder.push("ipc");
        return [];
      });

      componentGen.generate.mockImplementation(async () => {
        executionOrder.push("component");
        return [];
      });

      const options: WorkflowOptions = {
        name: "testFeature",
        withIpc: true,
        withComponent: true,
        withDb: true,
      };

      await orchestrator.executeWorkflow(options);

      expect(executionOrder).toEqual(["db", "ipc", "component"]);
    });

    it("should handle empty name gracefully", async () => {
      const options: WorkflowOptions = {
        name: "",
        withIpc: true,
      };

      await orchestrator.executeWorkflow(options);

      expect(ipcGen.generate).toHaveBeenCalledWith({
        name: "",
        domain: "app",
        mutation: true,
      });
    });

    it("should handle special characters in name", async () => {
      const options: WorkflowOptions = {
        name: "test-feature_v2",
        domain: "test",
        withIpc: true,
      };

      await orchestrator.executeWorkflow(options);

      expect(ipcGen.generate).toHaveBeenCalledWith({
        name: "test-feature_v2",
        domain: "test",
        mutation: true,
      });
    });
  });
});
