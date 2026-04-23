import { Sparkles, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { ipc } from "@/ipc/types";
import { showError } from "@/lib/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface PromptOptimizerButtonProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptOptimizerButton({
  value,
  onChange,
  disabled = false,
}: PromptOptimizerButtonProps) {
  const { t } = useTranslation("chat");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = useCallback(async () => {
    if (!value.trim() || isOptimizing) return;

    setIsOptimizing(true);
    try {
      const optimizedPrompt = await ipc.prompt.optimize({
        prompt: value,
      });
      onChange(optimizedPrompt);
    } catch (error) {
      console.error("Error optimizing prompt:", error);
      showError(
        t("optimizePromptError", {
          defaultValue: "Échec de l'optimisation du prompt",
          message: (error as Error).message,
        }),
      );
    } finally {
      setIsOptimizing(false);
    }
  }, [value, onChange, isOptimizing, t]);

  const isDisabled = disabled || !value.trim() || isOptimizing;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            onClick={handleOptimize}
            disabled={isDisabled}
            aria-label={t("optimizePrompt", {
              defaultValue: "Optimisation du prompt",
            })}
            className="px-2 py-1.5 text-muted-foreground hover:text-primary rounded-lg transition-colors duration-150 disabled:opacity-30 disabled:hover:text-muted-foreground cursor-pointer disabled:cursor-default"
          />
        }
      >
        {isOptimizing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {isOptimizing
          ? t("optimizingPrompt", { defaultValue: "Optimisation du prompt..." })
          : t("optimizePromptTooltip", {
            defaultValue: "Améliorer le prompt pour de meilleurs résultats",
          })}
      </TooltipContent>
    </Tooltip>
  );
}
