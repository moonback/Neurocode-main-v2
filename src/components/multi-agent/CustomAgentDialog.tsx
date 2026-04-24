/**
 * CustomAgentDialog — form for creating/editing custom agents.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCustomAgent, useUpdateCustomAgent } from "@/hooks/useMultiAgent";
import { toast } from "sonner";
import type { AgentDefinitionDto } from "@/ipc/types";

const CAPABILITY_OPTIONS = [
  { value: "file-read", label: "Lecture fichiers" },
  { value: "file-write", label: "Écriture fichiers" },
  { value: "code-search", label: "Recherche code" },
  { value: "web-search", label: "Recherche web" },
  { value: "test-generation", label: "Génération tests" },
  { value: "code-review", label: "Revue de code" },
  { value: "architecture", label: "Architecture" },
  { value: "debugging", label: "Débogage" },
  { value: "planning", label: "Planification" },
  { value: "documentation", label: "Documentation" },
  { value: "refactoring", label: "Refactorisation" },
  { value: "security-review", label: "Revue sécurité" },
  { value: "performance-optimization", label: "Optimisation perf." },
] as const;

const ICON_OPTIONS = [
  { value: "Code2", label: "Code" },
  { value: "SearchCheck", label: "Revue" },
  { value: "FlaskConical", label: "Test" },
  { value: "Bug", label: "Debug" },
  { value: "Boxes", label: "Architecture" },
  { value: "Sparkles", label: "Custom" },
] as const;

const COLOR_OPTIONS = [
  { value: "text-blue-500", label: "Bleu" },
  { value: "text-green-500", label: "Vert" },
  { value: "text-red-500", label: "Rouge" },
  { value: "text-amber-500", label: "Ambre" },
  { value: "text-purple-500", label: "Violet" },
  { value: "text-cyan-500", label: "Cyan" },
  { value: "text-pink-500", label: "Rose" },
  { value: "text-orange-500", label: "Orange" },
] as const;

interface CustomAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAgent?: AgentDefinitionDto;
}

export function CustomAgentDialog({
  open,
  onOpenChange,
  editingAgent,
}: CustomAgentDialogProps) {
  const isEditing = !!editingAgent;
  const createMutation = useCreateCustomAgent();
  const updateMutation = useUpdateCustomAgent();

  const [name, setName] = useState(editingAgent?.name ?? "");
  const [description, setDescription] = useState(editingAgent?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(
    editingAgent ? [...editingAgent.capabilities] : ["file-read", "file-write"],
  );
  const [icon, setIcon] = useState(editingAgent?.icon ?? "Sparkles");
  const [color, setColor] = useState(editingAgent?.color ?? "text-blue-500");

  const toggleCapability = (cap: string) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("Le nom et le prompt système sont requis");
      return;
    }

    try {
      if (isEditing && editingAgent) {
        await updateMutation.mutateAsync({
          id: editingAgent.id,
          name: name.trim(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
          capabilities: capabilities as any,
          icon,
          color,
        });
        toast.success("Agent mis à jour");
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
          capabilities: capabilities as any,
          icon,
          color,
        });
        toast.success("Agent créé");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'agent" : "Créer un agent personnalisé"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="agent-name">Nom</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon Agent Spécialisé"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="agent-desc">Description</Label>
            <Input
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Spécialiste en..."
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="agent-prompt">Prompt système</Label>
            <Textarea
              id="agent-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="<role>\nVous êtes un agent spécialisé dans...\n</role>"
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Icône</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIcon(opt.value)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      icon === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setColor(opt.value)}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      color === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <span className={opt.value}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-1.5">
            <Label>Capacités</Label>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleCapability(opt.value)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    capabilities.includes(opt.value)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? "Sauvegarde..."
              : isEditing
                ? "Mettre à jour"
                : "Créer l'agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
