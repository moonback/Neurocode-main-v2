import { AgentSelector } from "@/components/AgentSelector";
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";
import {
  useAgentProfiles,
  useStartAgentExecution,
  useGetOrCreateAgentChat,
} from "@/renderer/hooks/useMultiAgent";
import { useState } from "react";
import { useLoadApps } from "@/hooks/useLoadApps";

function getRoleEmoji(role: string): string {
  const emojis: Record<string, string> = {
    orchestrator: "🎯",
    "code-specialist": "💻",
    "test-specialist": "🧪",
    "documentation-specialist": "📚",
    "research-specialist": "🔍",
    "database-specialist": "🗄️",
  };
  return emojis[role] || "🤖";
}

export default function AgentsPage() {
  const { data: profiles, isLoading: profilesLoading } = useAgentProfiles();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [task, setTask] = useState("");
  const executeAgent = useStartAgentExecution();

  // Get all apps using the standard hook
  const { apps, loading: appsLoading, error: appsError } = useLoadApps();
  const firstApp = apps[0];

  console.log("🔍 Agent page state:", {
    apps,
    firstApp,
    appsLoading,
    appsError,
  });

  // Get or create a dedicated agent chat for this app
  const {
    data: agentChatId,
    isLoading: chatLoading,
    error: chatError,
  } = useGetOrCreateAgentChat(firstApp?.id);

  const handleExecute = async () => {
    if (!task || !agentChatId) return;

    try {
      console.log("🚀 Executing agent", {
        chatId: agentChatId,
        agentProfileId: selectedAgent ?? undefined,
        task,
      });

      await executeAgent.mutateAsync({
        chatId: agentChatId,
        agentProfileId: selectedAgent ?? undefined,
        task: task,
      });

      console.log("✅ Agent execution started");
      setTask("");
    } catch (error) {
      console.error("💥 Erreur lors de l'exécution:", error);
    }
  };

  // Show loading state while fetching app and chat
  if (appsLoading || chatLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Initialisation du système multi-agent...
          </p>
        </div>
      </div>
    );
  }

  // Show error if no app exists
  if (!firstApp) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Aucune Application
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Vous devez créer une application avant d'utiliser les agents. Allez
            dans la section Applications pour en créer une.
          </p>
          {appsError && (
            <p className="text-sm text-red-600 dark:text-red-400 font-mono mt-2">
              Erreur: {appsError.message}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            Debug: {apps.length} application(s) trouvée(s)
          </p>
        </div>
      </div>
    );
  }

  // Show error if chat creation failed
  if (chatError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Erreur d'Initialisation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Impossible de créer le chat pour les agents.
          </p>
          <p className="text-sm text-red-600 dark:text-red-400 font-mono">
            {chatError.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Système Multi-Agent
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Déléguez vos tâches à des agents spécialisés qui travaillent de
            manière autonome
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche : Sélection et exécution */}
          <div className="space-y-6">
            {/* Sélecteur d'agent */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Sélectionner un Agent
              </h2>
              <AgentSelector
                selectedAgentId={selectedAgent}
                onSelectAgent={setSelectedAgent}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {selectedAgent === null
                  ? "L'orchestrateur choisira automatiquement le meilleur agent pour votre tâche"
                  : "Agent sélectionné manuellement"}
              </p>
            </div>

            {/* Formulaire de tâche */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Décrire la Tâche
              </h2>
              <div className="space-y-4">
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Décrivez votre tâche en détail... Par exemple : 'Créer une fonction de validation d'email dans src/utils.ts'"
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <button
                  onClick={handleExecute}
                  disabled={!task || executeAgent.isPending}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {executeAgent.isPending
                    ? "Exécution en cours..."
                    : "Lancer l'Agent"}
                </button>

                {executeAgent.isError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    Erreur : {executeAgent.error.message}
                  </div>
                )}

                {executeAgent.isSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
                    Agent lancé avec succès ! Consultez le panneau d'exécution
                    pour suivre la progression.
                  </div>
                )}
              </div>
            </div>

            {/* Liste des agents disponibles */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Agents Disponibles
              </h2>
              {profilesLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Chargement des agents...
                </div>
              ) : profiles && profiles.length > 0 ? (
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAgent === profile.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setSelectedAgent(profile.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">
                          {getRoleEmoji(profile.role)}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {profile.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {profile.description}
                          </p>
                          {profile.allowedTools &&
                            profile.allowedTools.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                  {profile.allowedTools.length} outils
                                  disponibles
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Aucun agent disponible. Assurez-vous que la base de données
                  est initialisée.
                </div>
              )}
            </div>
          </div>

          {/* Colonne droite : Exécutions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Exécutions Récentes
            </h2>
            <AgentExecutionPanel chatId={agentChatId!} />
          </div>
        </div>
      </div>
    </div>
  );
}
