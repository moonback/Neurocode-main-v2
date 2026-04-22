import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { showError } from "@/lib/toast";
import { ipc } from "@/ipc/types";

interface CreateSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillCreated?: () => void;
}

export function CreateSkillDialog({
  isOpen,
  onClose,
  onSkillCreated,
}: CreateSkillDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<"user" | "workspace">("user");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      showError("Le nom du skill est requis");
      return;
    }

    if (!description.trim()) {
      showError("La description du skill est requise");
      return;
    }

    if (!content.trim()) {
      showError("Le contenu du skill est requis");
      return;
    }

    // Validate name format (kebab-case)
    const nameRegex = /^[a-z0-9-]+(?::[a-z0-9-]+)?$/;
    if (!nameRegex.test(name)) {
      showError(
        "Le nom doit être en kebab-case (lettres minuscules, chiffres et tirets uniquement)",
      );
      return;
    }

    setIsCreating(true);
    try {
      await ipc.skills.create({
        name: name.trim(),
        description: description.trim(),
        content: content.trim(),
        scope,
      });

      // Reset form
      setName("");
      setDescription("");
      setContent("");
      setScope("user");

      // Notify parent
      onSkillCreated?.();
      onClose();
    } catch (error) {
      showError(
        error instanceof Error
          ? error.message
          : "Erreur lors de la création du skill",
      );
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setContent("");
    setScope("user");
    onClose();
  };

  const generateTemplate = () => {
    const template = `# ${name || "Mon Skill"}

${description || "Description du skill"}

## Instructions

1. Première étape
2. Deuxième étape
3. Troisième étape

## Exemples

Ajoutez des exemples d'utilisation si nécessaire.
`;
    setContent(template);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Créer un nouveau skill
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="skill-name">
              Nom du skill <span className="text-red-500">*</span>
            </Label>
            <Input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mon-skill ou namespace:mon-skill"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Format : kebab-case (lettres minuscules, chiffres et tirets).
              Exemple : lint, git:commit
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="skill-description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description brève du skill"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Utilisée pour le chargement automatique et l'affichage dans la
              liste
            </p>
          </div>

          {/* Scope */}
          <div>
            <Label>Portée</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="user"
                  checked={scope === "user"}
                  onChange={(e) =>
                    setScope(e.target.value as "user" | "workspace")
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Utilisateur (personnel)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="workspace"
                  checked={scope === "workspace"}
                  onChange={(e) =>
                    setScope(e.target.value as "user" | "workspace")
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Workspace (partagé avec l'équipe)
                </span>
              </label>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="skill-content">
                Contenu (Markdown) <span className="text-red-500">*</span>
              </Label>
              <Button
                onClick={generateTemplate}
                variant="outline"
                size="sm"
                type="button"
              >
                Générer un template
              </Button>
            </div>
            <Textarea
              id="skill-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Mon Skill&#10;&#10;Instructions détaillées en Markdown..."
              className="mt-1 font-mono text-sm min-h-[300px]"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Instructions complètes du skill en Markdown (sans le frontmatter
              YAML)
            </p>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              💡 Conseils
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Utilisez des titres Markdown pour structurer</li>
              <li>• Numérotez les étapes pour la clarté</li>
              <li>• Ajoutez des exemples de code si nécessaire</li>
              <li>
                • Le skill sera sauvegardé dans{" "}
                {scope === "user"
                  ? "~/.neurocode/skills/"
                  : ".neurocode/skills/"}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleCancel} variant="outline" disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? "Création..." : "Créer le skill"}
          </Button>
        </div>
      </div>
    </div>
  );
}
