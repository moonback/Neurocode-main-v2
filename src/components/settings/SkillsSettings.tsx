import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Trash2, Edit, Play } from "lucide-react";
import { showInfo, showSuccess, showError } from "@/lib/toast";

export function SkillsSettings() {
  const [skills, _setSkills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Placeholder pour la découverte des skills
  const handleDiscoverSkills = async () => {
    setIsLoading(true);
    try {
      showInfo("Découverte des skills en cours...");
      // TODO: Appeler l'IPC pour découvrir les skills
      // const discoveredSkills = await ipc.skills.discover();
      // setSkills(discoveredSkills);
      showSuccess("Skills découverts avec succès");
    } catch (error) {
      showError("Erreur lors de la découverte des skills");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSkill = () => {
    showInfo("Création de skill - À implémenter");
    // TODO: Ouvrir un dialogue pour créer un nouveau skill
  };

  const handleEditSkill = (skillName: string) => {
    showInfo(`Édition du skill: ${skillName} - À implémenter`);
    // TODO: Ouvrir l'éditeur de skill
  };

  const handleDeleteSkill = (skillName: string) => {
    showInfo(`Suppression du skill: ${skillName} - À implémenter`);
    // TODO: Confirmer et supprimer le skill
  };

  const handleInvokeSkill = (skillName: string) => {
    showInfo(`Invocation du skill: ${skillName} - À implémenter`);
    // TODO: Invoquer le skill dans le chat
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Les skills sont des instructions réutilisables qui étendent les
            capacités de l'IA. Créez vos propres skills ou utilisez les exemples
            fournis.
          </p>
        </div>
        <Button
          onClick={handleCreateSkill}
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Nouveau Skill
        </Button>
      </div>

      {/* Section d'information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen
            size={20}
            className="text-blue-600 dark:text-blue-400 mt-0.5"
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

      {/* Liste des skills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Skills disponibles
          </h3>
          <Button
            onClick={handleDiscoverSkills}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? "Découverte..." : "Découvrir les skills"}
          </Button>
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">Aucun skill découvert</p>
            <p className="text-sm">
              Cliquez sur "Découvrir les skills" pour scanner les répertoires
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
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
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {skill.description}
                  </p>
                </div>
                <div className="flex items-center gap-1">
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
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skills d'exemple */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Skills d'exemple
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Des skills prêts à l'emploi pour les workflows courants :
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            {
              name: "examples:code-review",
              description: "Revue de code approfondie",
            },
            {
              name: "examples:debug-error",
              description: "Débogage systématique d'erreurs",
            },
            {
              name: "examples:write-tests",
              description: "Écriture de tests complets",
            },
            {
              name: "examples:refactor-code",
              description: "Refactorisation sécurisée",
            },
            {
              name: "examples:add-feature",
              description: "Ajout de nouvelles fonctionnalités",
            },
            {
              name: "examples:optimize-performance",
              description: "Optimisation des performances",
            },
          ].map((example) => (
            <div
              key={example.name}
              className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm"
            >
              <code className="text-blue-600 dark:text-blue-400">
                /{example.name}
              </code>
              <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                {example.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
