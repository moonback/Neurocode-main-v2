import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function TokenOptimizationSwitch() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="token-optimization"
        aria-label="Token Optimization"
        checked={settings?.enableTokenOptimization !== false}
        onCheckedChange={(checked) => {
          updateSettings({ enableTokenOptimization: checked });
        }}
      />
      <Label htmlFor="token-optimization">Token Optimization</Label>
    </div>
  );
}
