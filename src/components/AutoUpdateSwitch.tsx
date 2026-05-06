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
    <div className="flex items-center space-x-2 opacity-50">
      <Switch
        id="enable-auto-update"
        aria-label="Auto-update"
        checked={false}
        disabled={true}
        onCheckedChange={(checked) => {
          // Désactivé - ne fait rien
          toast("Mise à jour automatique désactivée", {
            description:
              "La mise à jour automatique est actuellement désactivée et ne peut pas être activée.",
          });
        }}
      />
      <Label htmlFor="enable-auto-update" className="cursor-not-allowed">
        {t("general.autoUpdate")} (Désactivé)
      </Label>
    </div>
  );
}
