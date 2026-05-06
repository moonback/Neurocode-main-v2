/**
 * Agent Selection Reasoning Component
 * Displays the LLM's reasoning for agent selection
 */

import { useState } from "react";

interface AgentSelectionReasoningProps {
  reasoning: string;
  method: "llm" | "fallback" | "manual";
  confidence?: number;
  primaryAgent: string;
  supportingAgents: string[];
  parallelExecution: boolean;
  className?: string;
}

export function AgentSelectionReasoning({
  reasoning,
  method,
  confidence,
  primaryAgent,
  supportingAgents,
  parallelExecution,
  className = "",
}: AgentSelectionReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const methodLabel = {
    llm: "🤖 AI-Selected",
    fallback: "🔤 Keyword-Based",
    manual: "👤 User-Selected",
  }[method];

  const methodColor = {
    llm: "text-blue-600 dark:text-blue-400",
    fallback: "text-yellow-600 dark:text-yellow-400",
    manual: "text-green-600 dark:text-green-400",
  }[method];

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${methodColor}`}>
            {methodLabel}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {primaryAgent}
            {supportingAgents.length > 0 &&
              ` + ${supportingAgents.length} more`}
          </span>
          {confidence !== undefined && (
            <span
              className={`text-xs px-2 py-0.5 rounded ${getConfidenceBadgeClass(confidence)}`}
            >
              {Math.round(confidence * 100)}% confident
            </span>
          )}
        </div>

        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          {/* Agent selection */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Selected Agents
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Primary:</span> {primaryAgent}
              </div>
              {supportingAgents.length > 0 && (
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Supporting:</span>{" "}
                  {supportingAgents.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Execution mode */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Execution Mode
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {parallelExecution ? (
                <span className="flex items-center gap-1">
                  <span>⚡</span>
                  <span>Parallel (agents work simultaneously)</span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>➡️</span>
                  <span>Sequential (agents work one after another)</span>
                </span>
              )}
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Reasoning
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {reasoning}
            </div>
          </div>

          {/* Method info */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {method === "llm" && (
                <span>
                  ✨ This selection was made by AI analyzing your task
                  semantically
                </span>
              )}
              {method === "fallback" && (
                <span>⚠️ AI selection failed, used keyword-based fallback</span>
              )}
              {method === "manual" && (
                <span>👤 You manually selected this agent</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getConfidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.8) {
    return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
  } else if (confidence >= 0.6) {
    return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400";
  } else {
    return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
  }
}
