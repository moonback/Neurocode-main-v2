import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2 } from "lucide-react";
import { showError, showSuccess } from "@/lib/toast";
import { ipc } from "@/ipc/types";
import { Skill } from "@/ipc/types/skills";

interface EditSkillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skillName: string | null;
  onSkillUpdated?: () => void;
}

export function EditSkillDialog({
  isOpen,
  onClose,
  skillName,
  onSkillUpdated,
}: EditSkillDialogProps) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && skillName) {
      loadSkill(skillName);
    } else {
      setSkill(null);
      setDescription("");
      setContent("");
    }
  }, [isOpen, skillName]);

  const loadSkill = async (name: string) => {
    setIsLoading(true);
    try {
      const data = await ipc.skills.get(name);
      setSkill(data);
      setDescription(data.description);
      setContent(data.content);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Erreur lors du chargement du skill",
      );
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!skill) return;

    if (!description.trim()) {
      showError("La description du skill est requise");
      return;
    }

    if (!content.trim()) {
      showError("Le contenu du skill est requis");
      return;
    }

    setIsUpdating(true);
    try {
      await ipc.skills.update({
        name: skill.name,
        description: description.trim(),
        content: content.trim(),
      });

      showSuccess(`Skill "${skill.name}" mis à jour`);
      onSkillUpdated?.();
      onClose();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Erreur lors de la mise à jour",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Modifier le skill {skillName ? `"${skillName}"` : ""}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-500">Chargement du skill...</p>
            </div>
          ) : (
            <>
              {/* Name (Read-only) */}
              <div>
                <Label htmlFor="edit-skill-name">Nom du skill</Label>
                <Input
                  id="edit-skill-name"
                  value={skillName || ""}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-900 opacity-70"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="edit-skill-description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-skill-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description brève du skill"
                  className="mt-1"
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="edit-skill-content">
                  Contenu (Markdown) <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="edit-skill-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Mon Skill&#10;&#10;Instructions détaillées en Markdown..."
                  className="mt-1 font-mono text-sm min-h-[350px]"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="outline" disabled={isUpdating}>
            Annuler
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || isLoading}>
            {isUpdating ? "Mise à jour..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}
