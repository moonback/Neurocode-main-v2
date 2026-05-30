import { useCallback } from "react";
import { useAtom } from "jotai";
import {
  localModelsAtom,
  localModelsLoadingAtom,
  localModelsErrorAtom,
} from "@/atoms/localModelsAtoms";
import { ipc } from "@/ipc/types";
import {
  getLocalModelConnectionError,
  isExpectedLocalModelConnectionError,
  toError,
} from "./localModelErrorUtils";

export function useLocalModels() {
  const [models, setModels] = useAtom(localModelsAtom);
  const [loading, setLoading] = useAtom(localModelsLoadingAtom);
  const [error, setError] = useAtom(localModelsErrorAtom);

  /**
   * Load local models from Ollama
   */
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const { models: modelList } = await ipc.languageModel.listOllamaModels();
      setModels(modelList);
      setError(null);

      return modelList;
    } catch (error) {
      if (!isExpectedLocalModelConnectionError(error, "Ollama")) {
        console.error("Error loading local Ollama models:", error);
        setError(toError(error));
      } else {
        setError(getLocalModelConnectionError("Ollama"));
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
