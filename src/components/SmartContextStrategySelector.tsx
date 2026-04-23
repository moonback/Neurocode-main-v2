import { useSettings } from "@/hooks/useSettings";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { showInfo } from "@/lib/toast";
import { type SmartContextMode } from "@/lib/schemas";

const STRATEGY_OPTIONS: Array<{
  value: SmartContextMode;
  label: string;
  description: string;
}> = [
    {
      value: "conservative",
      label: "Conservative",
      description:
        "Contexte minimal : seul le fichier actif et les fichiers très pertinents (score ≥ 0,7) sont inclus. Utilise jusqu’à 25 % du budget de jetons.",
    },
    {
      value: "balanced",
      label: "Balanced",
      description:
        "Contexte modéré — inclut les fichiers avec un score ≥ 0,4. Utilise jusqu’à 50 % du budget de jetons.",
    },
    {
      value: "deep",
      label: "Deep",
      description:
        "Contexte maximal — inclut tous les fichiers pertinents (score > 0,1). Utilise jusqu’à 80 % du budget de jetons.",
    },
  ];

export function SmartContextStrategySelector() {
  const { settings, updateSettings } = useSettings();

  const currentStrategy = settings?.proSmartContextOption ?? "balanced";

  const handleStrategyChange = async (value: string[]) => {
    if (value && value.length > 0) {
      const newStrategy = value[value.length - 1] as SmartContextMode;
      await updateSettings({ proSmartContextOption: newStrategy });
      showInfo(`Smart context strategy set to ${newStrategy}`);
    }
  };

  return (
    <div className="space-y-4">
      <ToggleGroup
        value={[currentStrategy]}
        onValueChange={handleStrategyChange}
        variant="outline"
        className="flex flex-col gap-3"
      >
        {STRATEGY_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={`${option.label} strategy`}
            className="flex h-auto w-full flex-col items-start gap-2 rounded-xl border-2 px-6 py-5 text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-50/50 dark:data-[state=on]:border-blue-400 dark:data-[state=on]:bg-blue-900/20"
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {option.label}
              </span>
              {currentStrategy === option.value && (
                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
              )}
            </div>
            <span className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {option.description}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
