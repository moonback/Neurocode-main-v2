import { useSettings } from "@/hooks/useSettings";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ipc } from "@/ipc/types";
import type { ReleaseChannel } from "@/lib/schemas";
import { useTranslation } from "react-i18next";

export function ReleaseChannelSelector() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  if (!settings) {
    return null;
  }

  const handleReleaseChannelChange = (value: ReleaseChannel) => {
    updateSettings({ releaseChannel: value });
    if (value === "stable") {
      toast("Vous utilisez maintenant le canal de distribution stable", {
        description:
          "Vous resterez sur votre version actuelle jusqu'à ce qu'une nouvelle version stable soit disponible, ou vous pouvez rétrograder manuellement maintenant.",
        action: {
          label: "Télécharger la version stable",
          onClick: () => {
            ipc.system.openExternalUrl("https://#");
          },
        },
      });
    } else {
      toast("Vous utilisez maintenant le canal de distribution bêta", {
        description:
          "Vous devez redémarrer NeuroCode pour que vos paramètres prennent effet.",
        action: {
          label: "Redémarrer NeuroCode",
          onClick: () => {
            ipc.system.restartDyad();
          },
        },
      });
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <label
          htmlFor="release-channel"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("general.releaseChannel")}
        </label>
        <Select
          value={settings.releaseChannel}
          onValueChange={(v) => v && handleReleaseChannelChange(v)}
        >
          <SelectTrigger className="w-32" id="release-channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stable">{t("general.stable")}</SelectItem>
            <SelectItem value="beta">{t("general.beta")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        <p>{t("general.releaseChannelDescription")}</p>
      </div>
    </div>
  );
}
