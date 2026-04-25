import { useState, useCallback, useMemo, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { atom } from "jotai";
import {
  Lightbulb,
  Bug,
  Zap,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { chatMessagesByIdAtom, selectedChatIdAtom } from "@/atoms/chatAtoms";
import { cn } from "@/lib/utils";
import { ipc } from "@/ipc/types";
import type { AISuggestion } from "@/ipc/types/prompts";

// ── Types ────────────────────────────────────────────────────────────────────

interface AISuggestionsStripProps {
  onSelectSuggestion: (prompt: string) => void;
  isStreaming: boolean;
}

// ── Atoms ────────────────────────────────────────────────────────────────────

const suggestionsCollapsedAtom = atom(false);
const suggestionsCacheAtom = atom<Record<number, AISuggestion[]>>({});

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  feature: {
    label: "Fonctionnalités",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
    activeColor: "bg-blue-500/25 border-blue-500/40",
    icon: <Sparkles size={13} />,
  },
  fix: {
    label: "Corrections",
    color: "text-red-500",
    bgColor: "bg-red-500/10 hover:bg-red-500/20 border-red-500/20",
    activeColor: "bg-red-500/25 border-red-500/40",
    icon: <Bug size={13} />,
  },
  optimize: {
    label: "Optimisations",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20",
    activeColor: "bg-amber-500/25 border-amber-500/40",
    icon: <Zap size={13} />,
  },
  improve: {
    label: "Améliorations",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20",
    activeColor: "bg-emerald-500/25 border-emerald-500/40",
    icon: <Lightbulb size={13} />,
  },
} as const;

// ── Component ────────────────────────────────────────────────────────────────

export function AISuggestionsStrip({
  onSelectSuggestion,
  isStreaming,
}: AISuggestionsStripProps) {
  const [isCollapsed, setIsCollapsed] = useAtom(suggestionsCollapsedAtom);
  const [cache, setCache] = useAtom(suggestionsCacheAtom);
  const [activeCategory, setActiveCategory] = useState<
    keyof typeof CATEGORY_CONFIG | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);

  const appId = useAtomValue(selectedAppIdAtom);
  const chatId = useAtomValue(selectedChatIdAtom);
  const messagesById = useAtomValue(chatMessagesByIdAtom);

  const dynamicSuggestions = chatId ? cache[chatId] ?? [] : [];
  const messages = chatId ? (messagesById.get(chatId) ?? []) : [];
  const hasMessages = messages.length > 0;

  const fetchSuggestions = useCallback(async () => {
    if (!chatId || isLoading) return;

    setIsLoading(true);
    try {
      const suggestions = await ipc.prompt.generateSuggestions({ chatId });
      setCache((prev) => ({ ...prev, [chatId]: suggestions }));
    } catch (error) {
      console.error("Failed to fetch AI suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, isLoading, setCache]);

  // Initial fetch when chatId changes and we don't have suggestions in cache yet
  useEffect(() => {
    if (chatId && hasMessages && !cache[chatId]) {
      fetchSuggestions();
    }
  }, [chatId, hasMessages, cache, fetchSuggestions]);

  // Filter suggestions by active category
  const displayedSuggestions = useMemo(() => {
    if (activeCategory) {
      return dynamicSuggestions.filter((s) => s.category === activeCategory);
    }
    return dynamicSuggestions;
  }, [dynamicSuggestions, activeCategory]);

  if (!appId || !hasMessages || (dynamicSuggestions.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <div
      className="border-b border-border bg-muted/30"
      data-testid="ai-suggestions-strip"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Lightbulb size={13} className={cn("text-amber-500", isLoading && "animate-pulse")} />
          <span>Suggestions</span>
          {isCollapsed ? (
            <ChevronDown size={12} />
          ) : (
            <ChevronUp size={12} />
          )}
        </button>

        {!isCollapsed && (
          <div className="flex items-center gap-1">
            {/* Category filters */}
            {(
              Object.entries(CATEGORY_CONFIG) as [
                keyof typeof CATEGORY_CONFIG,
                (typeof CATEGORY_CONFIG)[keyof typeof CATEGORY_CONFIG],
              ][]
            ).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setActiveCategory(activeCategory === key ? null : key)
                }
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer",
                  activeCategory === key
                    ? config.activeColor
                    : config.bgColor,
                  config.color,
                )}
              >
                {config.label}
              </button>
            ))}

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={isLoading || isStreaming}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              title="Rafraîchir les suggestions selon le contexte"
            >
              {isLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Suggestions chips */}
      {!isCollapsed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 min-h-[32px]">
          {isLoading && dynamicSuggestions.length === 0 ? (
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground animate-pulse pl-1">
              <Sparkles size={10} />
              Analyse du projet en cours...
            </div>
          ) : (
            displayedSuggestions.map((suggestion) => {
              const catConfig = CATEGORY_CONFIG[suggestion.category];
              return (
                <button
                  key={suggestion.id}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => onSelectSuggestion(suggestion.prompt)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    catConfig.bgColor,
                    catConfig.color,
                  )}
                  title={suggestion.prompt}
                >
                  {catConfig.icon}
                  <span className="truncate max-w-[200px]">
                    {suggestion.label}
                  </span>
                </button>
              );
            })
          )}

          {!isLoading && displayedSuggestions.length === 0 && activeCategory && (
            <div className="text-[10px] text-muted-foreground pl-1">
              Aucune suggestion dans cette catégorie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
