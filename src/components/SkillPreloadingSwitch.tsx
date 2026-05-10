import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SkillPreloadingSwitch() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="skill-preloading"
        aria-label="Skill Preloading"
        checked={settings?.enableSkillPreloading !== false}
        onCheckedChange={(checked) => {
          updateSettings({ enableSkillPreloading: checked });
        }}
      />
      <Label htmlFor="skill-preloading">Skill Preloading</Label>
    </div>
  );
}
