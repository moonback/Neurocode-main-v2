/**
 * React Query hooks for codebase export
 */

import { useMutation } from "@tanstack/react-query";
import type {
  CodebaseExportParams,
  CodebaseExportResult,
} from "@/ipc/types/codebase_export";

/**
 * Hook to export codebase to Markdown
 */
export function useExportCodebase() {
  return useMutation({
    mutationFn: async (
      params: CodebaseExportParams,
    ): Promise<CodebaseExportResult> => {
      // Use the electron preload API
      return (window as any).electron.ipcRenderer.invoke(
        "codebase:export",
        params,
      );
    },
  });
}
