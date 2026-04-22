import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useContextObservability,
  useRecentContextObservability,
} from "../hooks/useSmartContext";
import { ipc } from "@/ipc/types";
import type { ReactNode } from "react";

// Mock the IPC client
vi.mock("@/ipc/types", () => ({
  ipc: {
    smartContext: {
      getContextObservability: vi.fn(),
      getRecentContextObservability: vi.fn(),
    },
  },
}));

describe("useSmartContext hooks", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("useContextObservability", () => {
    it("should fetch observability data for a given interaction ID", async () => {
      const mockData = {
        interactionId: "test-123",
        timestamp: Date.now(),
        includedFiles: [
          {
            path: "src/test.ts",
            relevanceScore: 0.8,
            tokensUsed: 100,
            wasTruncated: false,
          },
        ],
        totalTokensUsed: 100,
        strategy: "balanced" as const,
      };

      vi.mocked(ipc.smartContext.getContextObservability).mockResolvedValue(
        mockData,
      );

      const { result } = renderHook(
        () => useContextObservability({ interactionId: "test-123" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(ipc.smartContext.getContextObservability).toHaveBeenCalledWith({
        interactionId: "test-123",
      });
    });

    it("should not fetch when no interaction ID is provided", () => {
      const { result } = renderHook(
        () => useContextObservability({ interactionId: undefined }),
        { wrapper },
      );

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(ipc.smartContext.getContextObservability).not.toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () =>
          useContextObservability({
            interactionId: "test-123",
            enabled: false,
          }),
        { wrapper },
      );

      expect(result.current.isFetching).toBe(false);
      expect(ipc.smartContext.getContextObservability).not.toHaveBeenCalled();
    });

    it("should handle error responses from IPC", async () => {
      const mockError = {
        error: "Observability data not available for this interaction",
      };

      vi.mocked(ipc.smartContext.getContextObservability).mockResolvedValue(
        mockError,
      );

      const { result } = renderHook(
        () => useContextObservability({ interactionId: "unknown-id" }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockError);
    });
  });

  describe("useRecentContextObservability", () => {
    it("should fetch recent observability records", async () => {
      const mockData = [
        {
          interactionId: "test-1",
          timestamp: Date.now(),
          includedFiles: [],
          totalTokensUsed: 50,
          strategy: "balanced" as const,
        },
        {
          interactionId: "test-2",
          timestamp: Date.now() - 1000,
          includedFiles: [],
          totalTokensUsed: 75,
          strategy: "deep" as const,
        },
      ];

      vi.mocked(
        ipc.smartContext.getRecentContextObservability,
      ).mockResolvedValue(mockData);

      const { result } = renderHook(() => useRecentContextObservability(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockData);
      expect(ipc.smartContext.getRecentContextObservability).toHaveBeenCalled();
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(
        () => useRecentContextObservability({ enabled: false }),
        { wrapper },
      );

      expect(result.current.isFetching).toBe(false);
      expect(
        ipc.smartContext.getRecentContextObservability,
      ).not.toHaveBeenCalled();
    });

    it("should return empty array when no recent interactions exist", async () => {
      vi.mocked(
        ipc.smartContext.getRecentContextObservability,
      ).mockResolvedValue([]);

      const { result } = renderHook(() => useRecentContextObservability(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });
  });
});
