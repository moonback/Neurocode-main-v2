import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Trash2, Edit, Play, RefreshCw } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { CreateSkillDialog } from "./CreateSkillDialog";
import { useState } from "react";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

export function SkillsSettings() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // ── Fetch skills list ────────────────────────────────────────────────────
  const {
    data: skills = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.skills.list(),
    queryFn: () => ipc.skills.list(),
  });

  // ── Discover mutation ────────────────────────────────────────────────────
  const discoverMutation = useMutation({
    mutationFn: () => ipc.skills.discover(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
      showSuccess(
        `${result.registered} nouveau(x) skill(s) découvert(s) — ${result.discovered} au total`,
      );
    },
    onError: (err) => {
      showError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la découverte des skills",
      );
    },
  });

  // ── Delete mutation ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (name: string) => ipc.skills.delete(name),
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
      showSuccess(`Skill "${name}" supprimé`);
    },
    onError: (err) => {
      showError(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    },
  });

  const handleDeleteSkill = (name: string) => {
    if (confirm(`Supprimer le skill "${name}" ?`)) {
      deleteMutation.mutate(name);
    }
  };

  const handleEditSkill = (name: string) => {
    showError(`Édition du skill "${name}" — à implémenter`);
  };

  const handleInvokeSkill = (name: string) => {
    showSuccess(`Skill "${name}" invoqué dans le chat`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Les skills sont des instructions réutilisables qui étendent les
          capacités de l'IA. Créez vos propres skills ou utilisez les exemples
          fournis.
        </p>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          className="flex items-center gap-2 shrink-0 ml-4"
        >
          <Plus size={16} />
          Nouveau Skill
        </Button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen
            size={20}
            className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
          />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Comment utiliser les skills
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                • <strong>Invocation :</strong> Utilisez{" "}
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  /nom-du-skill
                </code>{" "}
                dans le chat
              </li>
              <li>
                • <strong>Emplacements :</strong> Niveau utilisateur (
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  ~/.neurocode/skills/
                </code>
                ) ou workspace (
                <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                  .neurocode/skills/
                </code>
                )
              </li>
              <li>
                • <strong>Chargement automatique :</strong> L'IA suggère les
                skills pertinents selon le contexte
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Skills list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Skills disponibles
          </h3>
          <Button
            onClick={() => discoverMutation.mutate()}
            variant="outline"
            size="sm"
            disabled={discoverMutation.isPending}
            className="flex items-center gap-1"
          >
            <RefreshCw
              size={14}
              className={discoverMutation.isPending ? "animate-spin" : ""}
            />
            {discoverMutation.isPending ? "Découverte..." : "Actualiser"}
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            Chargement des skills...
          </div>
        )}

        {isError && (
          <div className="text-center py-8 text-red-500 text-sm">
            Erreur lors du chargement des skills.
          </div>
        )}

        {!isLoading && !isError && skills.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">Aucun skill trouvé</p>
            <p className="text-sm">
              Cliquez sur "Actualiser" pour scanner les répertoires, ou créez un
              nouveau skill.
            </p>
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">
                      /{skill.name}
                    </code>
                    {skill.scope === "workspace" && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-0.5 rounded">
                        Workspace
                      </span>
                    )}
                    {skill.scope === "user" && (
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                        Utilisateur
                      </span>
                    )}
                  </div>
                  {skill.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {skill.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => handleInvokeSkill(skill.name)}
                    variant="ghost"
                    size="sm"
                    title="Invoquer"
                  >
                    <Play size={16} />
                  </Button>
                  <Button
                    onClick={() => handleEditSkill(skill.name)}
                    variant="ghost"
                    size="sm"
                    title="Modifier"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    onClick={() => handleDeleteSkill(skill.name)}
                    variant="ghost"
                    size="sm"
                    title="Supprimer"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <CreateSkillDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSkillCreated={() => {
          setIsCreateDialogOpen(false);
          queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
          showSuccess("Skill créé avec succès !");
        }}
      />


    </div>
  );
}
