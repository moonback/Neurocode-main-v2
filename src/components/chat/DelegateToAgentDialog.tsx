/**
 * Dialog for delegating a task to an agent from the chat
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AgentSelector } from "@/components/AgentSelector";
import {
  useAgentProfiles,
  useStartAgentExecution,
} from "@/renderer/hooks/useMultiAgent";
import { Loader2 } from "lucide-react";

interface DelegateToAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: number;
  task: string;
  onSuccess?: () => void;
}

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

export function DelegateToAgentDialog({
  open,
  onOpenChange,
  chatId,
  task,
  onSuccess,
}: DelegateToAgentDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const { data: profiles } = useAgentProfiles();
  const executeAgent = useStartAgentExecution();

  const selectedProfile = profiles?.find((p) => p.id === selectedAgent);

  const handleDelegate = async () => {
    if (!task.trim()) return;

    try {
      await executeAgent.mutateAsync({
        chatId,
        agentProfileId: selectedAgent ?? undefined,
        task: task,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("💥 Erreur lors de la délégation:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Déléguer à un Agent</DialogTitle>
          <DialogDescription>
            Choisissez un agent pour exécuter cette tâche de manière autonome.
            L'agent utilisera ses outils spécialisés pour accomplir la tâche.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tâche à déléguer
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap line-clamp-4">
                {task}
              </p>
            </div>
          </div>

          {/* Agent selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Sélectionner un Agent
            </label>
            <AgentSelector
              selectedAgentId={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
            {selectedAgent === null ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                L'orchestrateur analysera la tâche et choisira automatiquement
                le meilleur agent
              </p>
            ) : selectedProfile ? (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-xl">
                    {getRoleEmoji(selectedProfile.role)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedProfile.displayName}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {selectedProfile.description}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={executeAgent.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleDelegate}
            disabled={!task.trim() || executeAgent.isPending}
          >
            {executeAgent.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Délégation...
              </>
            ) : (
              "Déléguer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
