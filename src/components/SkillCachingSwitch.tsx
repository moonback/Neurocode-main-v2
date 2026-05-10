import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SkillCachingSwitch() {
  const { settings, updateSettings } = useSettings();
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="skill-caching"
        aria-label="Skill Caching"
        checked={settings?.enableSkillCaching !== false}
        onCheckedChange={(checked) => {
          updateSettings({ enableSkillCaching: checked });
        }}
      />
      <Label htmlFor="skill-caching">Skill Caching</Label>
    </div>
  );
}
