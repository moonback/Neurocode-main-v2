/**
 * Agent Selector Component
 * Allows users to select which agent to use for a task
 */

import { useState } from "react";
import { useAgentProfiles } from "@/renderer/hooks/useMultiAgent";
import type { AgentProfile } from "@/ipc/types/multi_agent";

interface AgentSelectorProps {
  selectedAgentId: number | null;
  onSelectAgent: (agentId: number | null) => void;
  className?: string;
}

export function AgentSelector({
  selectedAgentId,
  onSelectAgent,
  className = "",
}: AgentSelectorProps) {
  const { data: profiles, isLoading } = useAgentProfiles();
  const [isOpen, setIsOpen] = useState(false);

  const selectedProfile = profiles?.find((p) => p.id === selectedAgentId);

  const handleSelect = (agentId: number | null) => {
    onSelectAgent(agentId);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Loading agents...
      </div>
    );
  }

  const enabledProfiles = profiles?.filter((p) => p.isEnabled) || [];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <span className="text-gray-700 dark:text-gray-300">
          {selectedProfile ? (
            <>
              <span className="font-medium">{selectedProfile.displayName}</span>
              <span className="text-xs text-gray-500 ml-2">
                ({selectedProfile.role})
              </span>
            </>
          ) : (
            <span className="font-medium">Auto-select Agent</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 max-h-96 overflow-y-auto">
            {/* Auto-select option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 ${
                selectedAgentId === null ? "bg-blue-50 dark:bg-blue-900/20" : ""
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-gray-100">
                🤖 Auto-select Agent
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Let the orchestrator choose the best agent for your task
              </div>
            </button>

            {/* Agent profiles */}
            {enabledProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => handleSelect(profile.id)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  selectedAgentId === profile.id
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {getRoleEmoji(profile.role)} {profile.displayName}
                  </div>
                  {profile.isBuiltin && (
                    <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                      Built-in
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {profile.description}
                </div>
                {profile.allowedTools && profile.allowedTools.length > 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {profile.allowedTools.length} tools available
                  </div>
                )}
              </button>
            ))}

            {enabledProfiles.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No agents available
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getRoleEmoji(role: AgentProfile["role"]): string {
  switch (role) {
    case "orchestrator":
      return "🎯";
    case "code":
      return "💻";
    case "test":
      return "🧪";
    case "documentation":
      return "📝";
    case "research":
      return "🔍";
    case "database":
      return "🗄️";
    case "custom":
      return "⚙️";
    default:
      return "🤖";
  }
}
