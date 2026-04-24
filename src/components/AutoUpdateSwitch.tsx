import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ipc } from "@/ipc/types";
import { useTranslation } from "react-i18next";

export function AutoUpdateSwitch() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  if (!settings) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="enable-auto-update"
        aria-label="Auto-update"
        checked={settings.enableAutoUpdate}
        onCheckedChange={(checked) => {
          updateSettings({ enableAutoUpdate: checked });
          toast("Paramètres de mise à jour automatique modifiés", {
            description:
              "Vous devez redémarrer NeuroCode pour que vos paramètres prennent effet.",
            action: {
              label: "Redémarrer NeuroCode",
              onClick: () => {
                ipc.system.restartDyad();
              },
            },
          });
        }}
      />
      <Label htmlFor="enable-auto-update">{t("general.autoUpdate")}</Label>
    </div>
  );
}
