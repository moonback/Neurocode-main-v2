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
    <div className="space-y-3">
      <ToggleGroup
        value={[currentStrategy]}
        onValueChange={handleStrategyChange}
        variant="outline"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {STRATEGY_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={`${option.label} strategy`}
            className="flex h-auto flex-col items-start gap-2 px-4 py-4 text-left transition-all hover:bg-accent/50 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:ring-1 data-[state=on]:ring-primary"
          >
            <span className="text-sm font-semibold">{option.label}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {option.description}
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
