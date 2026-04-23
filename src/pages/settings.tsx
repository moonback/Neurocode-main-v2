import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { ProviderSettingsGrid } from "@/components/ProviderSettings";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { ipc } from "@/ipc/types";
import { showSuccess, showError } from "@/lib/toast";
import { AutoApproveSwitch } from "@/components/AutoApproveSwitch";
import { TelemetrySwitch } from "@/components/TelemetrySwitch";
import { MaxChatTurnsSelector } from "@/components/MaxChatTurnsSelector";
import { MaxToolCallStepsSelector } from "@/components/MaxToolCallStepsSelector";
import { ThinkingBudgetSelector } from "@/components/ThinkingBudgetSelector";
import { useSettings } from "@/hooks/useSettings";
import { useAppVersion } from "@/hooks/useAppVersion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { GitHubIntegration } from "@/components/GitHubIntegration";
import { VercelIntegration } from "@/components/VercelIntegration";
import { SupabaseIntegration } from "@/components/SupabaseIntegration";
import { CustomAppsFolderSelector } from "@/components/CustomAppsFolderSelector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AutoFixProblemsSwitch } from "@/components/AutoFixProblemsSwitch";
import { AutoExpandPreviewSwitch } from "@/components/AutoExpandPreviewSwitch";
import { ChatEventNotificationSwitch } from "@/components/ChatEventNotificationSwitch";
import { AutoUpdateSwitch } from "@/components/AutoUpdateSwitch";
import { ReleaseChannelSelector } from "@/components/ReleaseChannelSelector";
import { NeonIntegration } from "@/components/NeonIntegration";
import { RuntimeModeSelector } from "@/components/RuntimeModeSelector";
import { NodePathSelector } from "@/components/NodePathSelector";
import { ToolsMcpSettings } from "@/components/settings/ToolsMcpSettings";
import { AgentToolsSettings } from "@/components/settings/AgentToolsSettings";
import { ZoomSelector } from "@/components/ZoomSelector";
import { LanguageSelector } from "@/components/LanguageSelector";
import { DefaultChatModeSelector } from "@/components/DefaultChatModeSelector";
import { ContextCompactionSwitch } from "@/components/ContextCompactionSwitch";
import { SmartContextStrategySelector } from "@/components/SmartContextStrategySelector";
import { BlockUnsafeNpmPackagesSwitch } from "@/components/BlockUnsafeNpmPackagesSwitch";
import { CloudSandboxExperimentSwitch } from "@/components/CloudSandboxExperimentSwitch";
import { SkillsSettings } from "@/components/settings/SkillsSettings";
import { TokenOptimizationSettings } from "@/components/settings/TokenOptimizationSettings";
import { TokenObservabilityDashboard } from "@/components/settings/TokenObservabilityDashboard";
import { useSetAtom } from "jotai";
import { activeSettingsSectionAtom } from "@/atoms/viewAtoms";
import { SECTION_IDS, SETTING_IDS } from "@/lib/settingsSearchIndex";

export default function SettingsPage() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const appVersion = useAppVersion();
  const { settings, updateSettings } = useSettings();
  const router = useRouter();
  const setActiveSettingsSection = useSetAtom(activeSettingsSectionAtom);

  useEffect(() => {
    setActiveSettingsSection(SECTION_IDS.general);
  }, [setActiveSettingsSection]);

  const handleResetEverything = async () => {
    setIsResetting(true);
    try {
      await ipc.system.resetAll();
      showSuccess("Successfully reset everything. Restart the application.");
    } catch (error) {
      console.error("Error resetting:", error);
      showError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen px-8 py-4">
      <div className="max-w-5xl mx-auto">
        <Button
          onClick={() => router.history.back()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 mb-4 bg-(--background-lightest) py-5"
        >
          <ArrowLeft className="h-4 w-4" />
          <p>Retour</p>
        </Button>
        <div className="flex justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Réglages
          </h1>
        </div>

        <div className="space-y-6">
          <GeneralSettings appVersion={appVersion} />
          <WorkflowSettings />
          <AISettings />

          <div
            id={SECTION_IDS.providers}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm"
          >
            <ProviderSettingsGrid />
          </div>

          <div className="space-y-6">
            <div
              id={SECTION_IDS.telemetry}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Télémetrie
              </h2>
              <div id={SETTING_IDS.telemetry} className="space-y-2">
                <TelemetrySwitch />
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Ceci enregistre des données d'utilisation anonymes pour
                  améliorer le produit.
                </div>
              </div>

              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <span className="mr-2 font-medium">ID de Télémétrie:</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
                  {settings ? settings.telemetryUserId : "n/a"}
                </span>
              </div>
            </div>
          </div>

          {/* Integrations Section */}
          <div
            id={SECTION_IDS.integrations}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Intégrations
            </h2>
            <div className="space-y-4">
              <div id={SETTING_IDS.github}>
                <GitHubIntegration />
              </div>
              <div id={SETTING_IDS.vercel}>
                <VercelIntegration />
              </div>
              <div id={SETTING_IDS.supabase}>
                <SupabaseIntegration />
              </div>
              <div id={SETTING_IDS.neon}>
                <NeonIntegration />
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div
            id={SECTION_IDS.skills}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Skills
            </h2>
            <div id={SETTING_IDS.skills}>
              <SkillsSettings />
            </div>
          </div>

          {/* Agent v2 Permissions */}

          <div
            id={SECTION_IDS.agentPermissions}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Permissions d'agent
            </h2>
            <AgentToolsSettings />
          </div>

          {/* Tools (MCP) */}
          <div
            id={SECTION_IDS.toolsMcp}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Tools (MCP)
            </h2>
            <ToolsMcpSettings />
          </div>

          {/* Experiments Section */}
          <div
            id={SECTION_IDS.experiments}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Expériments
            </h2>
            <div className="space-y-4">
              <div id={SETTING_IDS.nativeGit} className="space-y-1 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-native-git"
                    aria-label="Enable Native Git"
                    checked={!!settings?.enableNativeGit}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        enableNativeGit: checked,
                      });
                    }}
                  />
                  <Label htmlFor="enable-native-git">Activer Native Git</Label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Ceci ne requiert aucune installation Git externe et offre une
                  expérience de performance Git native plus rapide.
                </div>
              </div>
              <div
                id={SETTING_IDS.enableCloudSandbox}
                className="space-y-1 mt-4"
              >
                <CloudSandboxExperimentSwitch />
              </div>
              <div
                id={SETTING_IDS.blockUnsafeNpmPackages}
                className="space-y-1 mt-4"
              >
                <BlockUnsafeNpmPackagesSwitch />
              </div>
              <div
                id={SETTING_IDS.enableMcpServersForBuildMode}
                className="space-y-1 mt-4"
              >
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-mcp-servers-for-build-mode"
                    aria-label="Activer les serveurs MCP pour le mode Build"
                    checked={!!settings?.enableMcpServersForBuildMode}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        enableMcpServersForBuildMode: checked,
                      });
                    }}
                  />
                  <Label htmlFor="enable-mcp-servers-for-build-mode">
                    Activer les serveurs MCP pour le mode Build
                  </Label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Permet aux serveurs MCP d'être utilisés en mode Build. Note:
                  Les serveurs MCP sont toujours activés en mode Agent.
                </div>
              </div>
              <div
                id={SETTING_IDS.enableSelectAppFromHomeChatInput}
                className="space-y-1 mt-4"
              >
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-select-app-from-home-chat-input"
                    aria-label="Activer la sélection d'application depuis le champ de chat d'accueil"
                    checked={!!settings?.enableSelectAppFromHomeChatInput}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        enableSelectAppFromHomeChatInput: checked,
                      });
                    }}
                  />
                  <Label htmlFor="enable-select-app-from-home-chat-input">
                    Activer la sélection d'application depuis le champ de chat
                    d'accueil
                  </Label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Affiche un sélecteur d'application dans le champ de chat
                  d'accueil pour commencer un chat referencing an existing app.
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            id={SECTION_IDS.dangerZone}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-red-200 dark:border-red-800"
          >
            <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-4">
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div
                id={SETTING_IDS.reset}
                className="flex items-start justify-between flex-col sm:flex-row sm:items-center gap-4"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    Tout réinitialiser
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cela supprimera toutes vos applications, chats et
                    paramètres. Cette action ne peut pas être annulée.
                  </p>
                </div>
                <button
                  onClick={() => setIsResetDialogOpen(true)}
                  disabled={isResetting}
                  className="rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? "Réinitialisation..." : "Tout réinitialiser"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        title="Tout réinitialiser"
        message="Êtes-vous sûr de vouloir tout réinitialiser ? Cela supprimera toutes vos applications, chats et paramètres. Cette action ne peut pas être annulée."
        confirmText={isResetting ? "Resetting..." : "Tout réinitialiser"}
        cancelText="Annuler"
        confirmDisabled={isResetting}
        onConfirm={handleResetEverything}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

export function GeneralSettings({ appVersion }: { appVersion: string | null }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      id={SECTION_IDS.general}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Paramètres généraux
      </h2>

      <div className="space-y-4 mb-4">
        <div id={SETTING_IDS.theme} className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme
          </label>

          <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex">
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setTheme(option)}
                className={`
                px-4 py-1.5 text-sm font-medium rounded-md
                transition-all duration-200
                ${
                  theme === option
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }
              `}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <LanguageSelector />
      </div>

      <div id={SETTING_IDS.zoom} className="mt-4">
        <ZoomSelector />
      </div>

      <div id={SETTING_IDS.autoUpdate} className="space-y-1 mt-4">
        <AutoUpdateSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cela mettra automatiquement à jour l'application lorsque de nouvelles
          versions seront disponibles.
        </div>
      </div>

      <div id={SETTING_IDS.releaseChannel} className="mt-4">
        <ReleaseChannelSelector />
      </div>

      <div id={SETTING_IDS.runtimeMode} className="mt-4">
        <RuntimeModeSelector />
      </div>
      <div id={SETTING_IDS.nodePath} className="mt-4">
        <NodePathSelector />
      </div>
      <div id={SETTING_IDS.customAppsFolder} className="mt-4">
        <CustomAppsFolderSelector />
      </div>

      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <span className="mr-2 font-medium">App Version:</span>
        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-800 dark:text-gray-200 font-mono">
          {appVersion ? appVersion : "-"}
        </span>
      </div>
    </div>
  );
}

export function WorkflowSettings() {
  return (
    <div
      id={SECTION_IDS.workflow}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Paramètres du workflow
      </h2>

      <div id={SETTING_IDS.defaultChatMode} className="mt-4">
        <DefaultChatModeSelector />
      </div>

      <div id={SETTING_IDS.autoApprove} className="space-y-1 mt-4">
        <AutoApproveSwitch showToast={false} />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cela approuvera automatiquement les changements de code et les
          exécutera.
        </div>
      </div>

      <div id={SETTING_IDS.autoFix} className="space-y-1 mt-4">
        <AutoFixProblemsSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Cela corrigera automatiquement les erreurs TypeScript.
        </div>
      </div>

      <div id={SETTING_IDS.autoExpandPreview} className="space-y-1 mt-4">
        <AutoExpandPreviewSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Agrandit automatiquement le panneau d'aperçu lorsque des changements
          de code sont effectués.
        </div>
      </div>

      <div id={SETTING_IDS.chatEventNotification} className="space-y-1 mt-4">
        <ChatEventNotificationSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Affiche les notifications natives lorsqu'une réponse de chat est
          terminée ou qu'un questionnaire nécessite votre saisie alors que
          l'application n'est pas active.
        </div>
      </div>
    </div>
  );
}
export function AISettings() {
  return (
    <div
      id={SECTION_IDS.ai}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
    >
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Paramètres de l'IA
      </h2>

      <div id={SETTING_IDS.thinkingBudget} className="mt-4">
        <ThinkingBudgetSelector />
      </div>

      <div id={SETTING_IDS.maxChatTurns} className="mt-4">
        <MaxChatTurnsSelector />
      </div>

      <div id={SETTING_IDS.maxToolCallSteps} className="mt-4">
        <MaxToolCallStepsSelector />
      </div>

      <div id={SETTING_IDS.contextCompaction} className="space-y-1 mt-4">
        <ContextCompactionSwitch />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Compact automatiquement les longues conversations pour rester dans les
          limites de contexte. Les messages originaux sont conservés dans le
          répertoire de données de l'application.
        </div>
      </div>

      <div id={SETTING_IDS.smartContextStrategy} className="space-y-1 mt-4">
        <div className="mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Stratégie de contexte intelligent
          </label>
        </div>
        <SmartContextStrategySelector />
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Détermine avec quelle agressivité l'IA inclut les fichiers dans le
          contexte. L'option équilibrée est recommandée pour la plupart des
          workflows.
        </div>
      </div>

      <div id={SETTING_IDS.tokenOptimization} className="mt-8 pt-8 border-t border-muted/30">
        <TokenOptimizationSettings />
      </div>

      <div className="mt-8 pt-8 border-t border-muted/30">
        <TokenObservabilityDashboard />
      </div>
    </div>
  );
}
