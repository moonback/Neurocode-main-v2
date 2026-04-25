import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCountTokens } from "@/hooks/useCountTokens";
import {
  MessageSquare,
  Code,
  Bot,
  AlignLeft,
  ExternalLink,
} from "lucide-react";
import { chatInputValueAtom } from "@/atoms/chatAtoms";
import { useAtom } from "jotai";
import { useSettings } from "@/hooks/useSettings";
import { ipc } from "@/ipc/types";

interface TokenBarProps {
  chatId?: number;
}

export function TokenBar({ chatId }: TokenBarProps) {
  const [inputValue] = useAtom(chatInputValueAtom);
  const { settings } = useSettings();
  const { result, error } = useCountTokens(chatId ?? null, inputValue);

  if (!chatId || !result) {
    return null;
  }

  const {
    estimatedTotalTokens: totalTokens,
    messageHistoryTokens,
    codebaseTokens,
    mentionedAppsTokens,
    systemPromptTokens,
    inputTokens,
    contextWindow,
  } = result;

  const percentUsed = Math.min((totalTokens / contextWindow) * 100, 100);

  // Calculate widths for each token type
  const messageHistoryPercent = (messageHistoryTokens / contextWindow) * 100;
  const codebasePercent = (codebaseTokens / contextWindow) * 100;
  const mentionedAppsPercent = (mentionedAppsTokens / contextWindow) * 100;
  const systemPromptPercent = (systemPromptTokens / contextWindow) * 100;
  const inputPercent = (inputTokens / contextWindow) * 100;

  return (
    <div className="px-4 pb-2 text-xs" data-testid="token-bar">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="w-full">
            <div className="w-full">
              <div className="flex gap-3 mb-1 text-xs text-muted-foreground">
                <span>Tokens : {totalTokens.toLocaleString()}</span>
                <span>{Math.round(percentUsed)}%</span>
                <span>
                  Fenêtre de contexte : {(contextWindow / 1000).toFixed(0)}K
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                {/* Historique des messages */}
                <div
                  className="h-full bg-blue-400"
                  style={{ width: `${messageHistoryPercent}%` }}
                />
                {/* Base de code */}
                <div
                  className="h-full bg-green-400"
                  style={{ width: `${codebasePercent}%` }}
                />
                {/* Applications mentionnées */}
                <div
                  className="h-full bg-orange-400"
                  style={{ width: `${mentionedAppsPercent}%` }}
                />
                {/* Prompt système */}
                <div
                  className="h-full bg-purple-400"
                  style={{ width: `${systemPromptPercent}%` }}
                />
                {/* Entrée actuelle */}
                <div
                  className="h-full bg-yellow-400"
                  style={{ width: `${inputPercent}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-64 p-2">
            <div className="space-y-1">
              <div className="font-medium">Détail de l'utilisation des tokens</div>
              <div className="grid grid-cols-[20px_1fr_auto] gap-x-2 items-center">
                <MessageSquare size={12} className="text-blue-500" />
                <span>Historique des messages</span>
                <span>{messageHistoryTokens.toLocaleString()}</span>

                <Code size={12} className="text-green-500" />
                <span>Base de code</span>
                <span>{codebaseTokens.toLocaleString()}</span>

                <ExternalLink size={12} className="text-orange-500" />
                <span>Applications mentionnées</span>
                <span>{mentionedAppsTokens.toLocaleString()}</span>

                <Bot size={12} className="text-purple-500" />
                <span>Prompt système</span>
                <span>{systemPromptTokens.toLocaleString()}</span>

                <AlignLeft size={12} className="text-yellow-500" />
                <span>Entrée actuelle</span>
                <span>{inputTokens.toLocaleString()}</span>
              </div>
              <div className="pt-1 border-t border-border">
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>{totalTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {error && (
        <div className="text-red-500 text-xs mt-1">Échec du comptage des tokens</div>
      )}

    </div>
  );
}
