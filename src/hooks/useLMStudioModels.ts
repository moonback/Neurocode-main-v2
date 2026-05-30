import { useCallback } from "react";
import { useAtom } from "jotai";
import {
  lmStudioModelsAtom,
  lmStudioModelsLoadingAtom,
  lmStudioModelsErrorAtom,
} from "@/atoms/localModelsAtoms";
import { ipc } from "@/ipc/types";
import {
  getLocalModelConnectionError,
  isExpectedLocalModelConnectionError,
  toError,
} from "./localModelErrorUtils";

export function useLocalLMSModels() {
  const [models, setModels] = useAtom(lmStudioModelsAtom);
  const [loading, setLoading] = useAtom(lmStudioModelsLoadingAtom);
  const [error, setError] = useAtom(lmStudioModelsErrorAtom);

  /**
   * Load local models from LMStudio
   */
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const { models: modelList } =
        await ipc.languageModel.listLMStudioModels();
      setModels(modelList);
      setError(null);

      return modelList;
    } catch (error) {
      if (!isExpectedLocalModelConnectionError(error, "LM Studio")) {
        console.error("Error loading local LMStudio models:", error);
        setError(toError(error));
      } else {
        setError(getLocalModelConnectionError("LM Studio"));
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [setModels, setError, setLoading]);

  return {
    models,
    loading,
    error,
    loadModels,
  };
}
