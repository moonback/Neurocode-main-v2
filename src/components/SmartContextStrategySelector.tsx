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
      "Minimal context — only the active file and highly relevant files (score ≥ 0.7). Uses up to 25% of token budget. Best for focused tasks.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Moderate context — includes files with score ≥ 0.4. Uses up to 50% of token budget. Recommended for most workflows.",
  },
  {
    value: "deep",
    label: "Deep",
    description:
      "Maximum context — includes all relevant files (score > 0.1). Uses up to 80% of token budget. Best for complex refactoring.",
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
        className="flex-col items-stretch sm:flex-row"
      >
        {STRATEGY_OPTIONS.map((option) => (
          <div key={option.value} className="flex flex-col">
            <ToggleGroupItem
              value={option.value}
              aria-label={`${option.label} strategy`}
              className="flex-col items-start gap-1 px-4 py-3 text-left"
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </ToggleGroupItem>
          </div>
        ))}
      </ToggleGroup>
    </div>
  );
}
