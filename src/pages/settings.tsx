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
import { useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Settings2,
  Workflow,
  Brain,
  Plug,
  FlaskConical,
  ShieldAlert,
  Stars,
  Wrench,
  BarChart3,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
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
import { TokenOptimizationSwitch } from "@/components/TokenOptimizationSwitch";
import { SkillCachingSwitch } from "@/components/SkillCachingSwitch";
import { SkillPreloadingSwitch } from "@/components/SkillPreloadingSwitch";
import { SmartContextStrategySelector } from "@/components/SmartContextStrategySelector";
import { BlockUnsafeNpmPackagesSwitch } from "@/components/BlockUnsafeNpmPackagesSwitch";
import { CloudSandboxExperimentSwitch } from "@/components/CloudSandboxExperimentSwitch";
import { SkillsSettings } from "@/components/settings/SkillsSettings";
import { useSetAtom } from "jotai";
import { activeSettingsSectionAtom } from "@/atoms/viewAtoms";
import { SECTION_IDS, SETTING_IDS } from "@/lib/settingsSearchIndex";
import { router } from "src/router";


/* ─────────────────────────────────────────────────────────────────────────────
   Shared sub-components
───────────────────────────────────────────────────────────────────────────── */
function SectionCard({
  id,
  icon: Icon,
  title,
  accent,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  accent?: "red";
  children: React.ReactNode;
}) {
  const isRed = accent === "red";
  return (
    <div
      id={id}
      className={`rounded-2xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
        isRed
          ? "border-red-500/25 bg-red-500/[0.03]"
          : "border-border/50 bg-card"
      }`}
    >
      {/* Section header */}
      <div
        className={`flex items-center gap-3 px-6 py-4 border-b ${
          isRed
            ? "border-red-500/15 bg-red-500/[0.06]"
            : "border-border/30 bg-muted/20"
        }`}
      >
        <div
          className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
            isRed
              ? "bg-red-500/15 text-red-500"
              : "bg-[#6c55dc]/12 text-[#6c55dc]"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h2
          className={`text-sm font-semibold tracking-tight ${
            isRed ? "text-red-500" : "text-foreground"
          }`}
        >
          {title}
        </h2>
      </div>

      {/* Section body */}
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="py-0.5">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border/40 my-0.5" />;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────────────────── */
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
      showSuccess("Réinitialisation réussie. L'application va redémarrer...");
    } catch (error) {
      console.error("Error resetting:", error);
      showError(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue s'est produite",
      );
    } finally {
      setIsResetting(false);
      setIsResetDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page header ── */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-3.5 border-b border-border/40 bg-background/90 backdrop-blur-sm">
        <Button
          onClick={() => router.history.back()}
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground -ml-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="h-4 w-px bg-border/60" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-[#6c55dc]/12 flex items-center justify-center">
            <Settings2 className="h-3.5 w-3.5 text-[#6c55dc]" />
          </div>
          <h1 className="text-sm font-semibold tracking-tight">Réglages</h1>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-5">
        <SectionCard id={SECTION_IDS.general} icon={Settings2} title="Paramètres généraux">
          <GeneralSettings appVersion={appVersion} />
        </SectionCard>

        <SectionCard id={SECTION_IDS.workflow} icon={Workflow} title="Workflow">
          <WorkflowSettings />
        </SectionCard>

        <SectionCard id={SECTION_IDS.ai} icon={Brain} title="Intelligence artificielle">
          <AISettings />
        </SectionCard>

        <SectionCard id={SECTION_IDS.providers} icon={Plug} title="Fournisseurs d'IA">
          <ProviderSettingsGrid />
        </SectionCard>

        <SectionCard id={SECTION_IDS.integrations} icon={Plug} title="Intégrations">
          <SettingRow id={SETTING_IDS.github}><GitHubIntegration /></SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.vercel}><VercelIntegration /></SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.supabase}><SupabaseIntegration /></SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.neon}><NeonIntegration /></SettingRow>
        </SectionCard>

        <SectionCard id={SECTION_IDS.skills} icon={Stars} title="Skills">
          <SettingRow id={SETTING_IDS.skills}><SkillsSettings /></SettingRow>
        </SectionCard>

        <SectionCard id={SECTION_IDS.agentPermissions} icon={ShieldAlert} title="Permissions d'agent">
          <AgentToolsSettings />
        </SectionCard>

        <SectionCard id={SECTION_IDS.toolsMcp} icon={Wrench} title="Outils (MCP)">
          <ToolsMcpSettings />
        </SectionCard>

        <SectionCard id={SECTION_IDS.telemetry} icon={BarChart3} title="Télémétrie">
          <SettingRow id={SETTING_IDS.telemetry}>
            <TelemetrySwitch />
            <p className="text-sm text-muted-foreground mt-1">
              Enregistre des données d'utilisation anonymes pour améliorer le produit.
            </p>
          </SettingRow>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <span className="font-medium">ID de télémétrie :</span>
            <code className="font-mono text-xs bg-background border border-border/60 px-2 py-0.5 rounded">
              {settings ? settings.telemetryUserId : "n/a"}
            </code>
          </div>
        </SectionCard>

        <SectionCard id={SECTION_IDS.experiments} icon={FlaskConical} title="Expériments">
          <SettingRow id={SETTING_IDS.nativeGit}>
            <div className="flex items-center gap-3">
              <Switch
                id="enable-native-git"
                aria-label="Activer Native Git"
                checked={!!settings?.enableNativeGit}
                onCheckedChange={(checked) => updateSettings({ enableNativeGit: checked })}
              />
              <Label htmlFor="enable-native-git">Activer Native Git</Label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Requiert aucune installation Git externe et offre une performance Git native plus rapide.
            </p>
          </SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.enableCloudSandbox}>
            <CloudSandboxExperimentSwitch />
          </SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.blockUnsafeNpmPackages}>
            <BlockUnsafeNpmPackagesSwitch />
          </SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.enableMcpServersForBuildMode}>
            <div className="flex items-center gap-3">
              <Switch
                id="enable-mcp-servers-for-build-mode"
                aria-label="Activer les serveurs MCP pour le mode Build"
                checked={!!settings?.enableMcpServersForBuildMode}
                onCheckedChange={(checked) => updateSettings({ enableMcpServersForBuildMode: checked })}
              />
              <Label htmlFor="enable-mcp-servers-for-build-mode">
                Serveurs MCP en mode Build
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Permet aux serveurs MCP d'être utilisés en mode Build. Toujours actifs en mode Agent.
            </p>
          </SettingRow>
          <Divider />
          <SettingRow id={SETTING_IDS.enableSelectAppFromHomeChatInput}>
            <div className="flex items-center gap-3">
              <Switch
                id="enable-select-app-from-home-chat-input"
                aria-label="Activer la sélection d'application depuis le champ de chat d'accueil"
                checked={!!settings?.enableSelectAppFromHomeChatInput}
                onCheckedChange={(checked) => updateSettings({ enableSelectAppFromHomeChatInput: checked })}
              />
              <Label htmlFor="enable-select-app-from-home-chat-input">
                Sélection d'app depuis le chat d'accueil
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Affiche un sélecteur d'application dans le champ de chat d'accueil.
            </p>
          </SettingRow>
        </SectionCard>

        <SectionCard id={SECTION_IDS.dangerZone} icon={ShieldAlert} title="Zone dangereuse" accent="red">
          <SettingRow id={SETTING_IDS.reset}>
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tout réinitialiser</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supprime toutes vos applications, chats et paramètres. Action irréversible.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsResetDialogOpen(true)}
                disabled={isResetting}
                className="shrink-0"
              >
                {isResetting ? "Réinitialisation..." : "Tout réinitialiser"}
              </Button>
            </div>
          </SettingRow>
        </SectionCard>
      </div>

      <ConfirmationDialog
        isOpen={isResetDialogOpen}
        title="Tout réinitialiser"
        message="Êtes-vous sûr de vouloir tout réinitialiser ? Cela supprimera toutes vos applications, chats et paramètres. L'application redémarrera automatiquement après la réinitialisation. Cette action ne peut pas être annulée."
        confirmText={isResetting ? "Réinitialisation..." : "Tout réinitialiser"}
        cancelText="Annuler"
        confirmDisabled={isResetting}
        onConfirm={handleResetEverything}
        onCancel={() => setIsResetDialogOpen(false)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GeneralSettings — inlined inside SectionCard, kept as export for legacy use
───────────────────────────────────────────────────────────────────────────── */
export function GeneralSettings({ appVersion }: { appVersion: string | null }) {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { value: "system", label: "Système", icon: Monitor },
    { value: "light", label: "Clair", icon: Sun },
    { value: "dark", label: "Sombre", icon: Moon },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Theme picker */}
      <SettingRow id={SETTING_IDS.theme}>
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-3 block">Thème de l'interface</label>
        <div className="inline-flex bg-muted/40 border border-border/40 rounded-2xl p-1 gap-1 shadow-inner">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all duration-300 ${theme === value
                ? "bg-background text-[#6c55dc] shadow-md border border-border/60 scale-[1.02]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </SettingRow>

      <Divider />

      <SettingRow>
        <LanguageSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.zoom}>
        <ZoomSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.autoUpdate}>
        <AutoUpdateSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Met automatiquement à jour l'application lorsque de nouvelles versions sont disponibles.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.releaseChannel}>
        <ReleaseChannelSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.runtimeMode}>
        <RuntimeModeSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.nodePath}>
        <NodePathSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.customAppsFolder}>
        <CustomAppsFolderSelector />
      </SettingRow>

      <Divider />

      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#6c55dc]/5 border border-[#6c55dc]/10 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#6c55dc] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6c55dc]/80">Version de l'application</span>
        </div>
        <code className="font-mono text-xs font-bold text-[#6c55dc] bg-[#6c55dc]/10 px-2.5 py-1 rounded-lg">
          {appVersion ?? "—"}
        </code>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   WorkflowSettings
───────────────────────────────────────────────────────────────────────────── */
export function WorkflowSettings() {
  return (
    <div className="space-y-5">
      <SettingRow id={SETTING_IDS.defaultChatMode}>
        <DefaultChatModeSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.autoApprove}>
        <AutoApproveSwitch showToast={false} />
        <p className="text-sm text-muted-foreground mt-1">
          Approuve automatiquement les changements de code et les exécute.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.autoFix}>
        <AutoFixProblemsSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Corrige automatiquement les erreurs TypeScript.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.autoExpandPreview}>
        <AutoExpandPreviewSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Agrandit automatiquement le panneau d'aperçu lorsque des changements de code sont effectués.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.chatEventNotification}>
        <ChatEventNotificationSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Affiche des notifications natives lorsqu'une réponse de chat est terminée ou qu'un questionnaire nécessite votre saisie.
        </p>
      </SettingRow>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AISettings
───────────────────────────────────────────────────────────────────────────── */
export function AISettings() {
  return (
    <div className="space-y-5">
      <SettingRow id={SETTING_IDS.thinkingBudget}>
        <ThinkingBudgetSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.maxChatTurns}>
        <MaxChatTurnsSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.maxToolCallSteps}>
        <MaxToolCallStepsSelector />
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.contextCompaction}>
        <ContextCompactionSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Compacte automatiquement les longues conversations pour rester dans les limites de contexte.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.enableTokenOptimization}>
        <TokenOptimizationSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Active l'optimisation avancée des tokens : élagage du contexte, compression et sélection adaptative.
        </p>
        <div className="mt-3">
          <a
            href="/token-analytics"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#6c55dc] bg-[#6c55dc]/10 border border-[#6c55dc]/20 rounded-lg hover:bg-[#6c55dc]/15 transition-all shadow-sm"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Voir le tableau de bord analytique
          </a>
        </div>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.enableSkillCaching}>
        <SkillCachingSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Met en cache les skills chargés en mémoire pour une exécution plus rapide.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.enableSkillPreloading}>
        <SkillPreloadingSwitch />
        <p className="text-sm text-muted-foreground mt-1">
          Précharge les skills fréquemment utilisés en arrière-plan selon les patterns d'utilisation.
        </p>
      </SettingRow>

      <Divider />

      <SettingRow id={SETTING_IDS.smartContextStrategy}>
        <label className="text-sm font-medium text-foreground block mb-2">
          Stratégie de contexte intelligent
        </label>
        <SmartContextStrategySelector />
        <p className="text-sm text-muted-foreground mt-1">
          Détermine avec quelle agressivité l'IA inclut les fichiers dans le contexte. L'option équilibrée est recommandée.
        </p>
      </SettingRow>
    </div>
  );
}
