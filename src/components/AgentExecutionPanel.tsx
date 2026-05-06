/**
 * Agent Execution Panel
 * Shows active agent executions with real-time status updates
 */

import { useState } from "react";
import {
  useAgentExecutions,
  useAgentExecutionUpdates,
  useCancelAgentExecution,
} from "@/renderer/hooks/useMultiAgent";
import type { AgentExecutionDetail } from "@/ipc/types/multi_agent";

interface AgentExecutionPanelProps {
  chatId: number;
  className?: string;
}

export function AgentExecutionPanel({
  chatId,
  className = "",
}: AgentExecutionPanelProps) {
  const { data: executions, isLoading } = useAgentExecutions(chatId);
  const cancelMutation = useCancelAgentExecution();
  const [expandedExecutionId, setExpandedExecutionId] = useState<number | null>(
    null,
  );

  // Subscribe to real-time updates
  useAgentExecutionUpdates(chatId);

  // Auto-expand the first running execution
  const runningExecution = executions?.find((e) => e.status === "running");
  if (runningExecution && expandedExecutionId !== runningExecution.id) {
    setExpandedExecutionId(runningExecution.id);
  }

  if (isLoading) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Chargement des exécutions...
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Aucune exécution pour le moment. Lancez un agent pour commencer !
      </div>
    );
  }

  const activeExecutions = executions.filter(
    (e) => e.status === "pending" || e.status === "running",
  );
  const completedExecutions = executions.filter(
    (e) =>
      e.status === "completed" ||
      e.status === "failed" ||
      e.status === "cancelled",
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Executions */}
      {activeExecutions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Active Agents ({activeExecutions.length})
          </h3>
          <div className="space-y-2">
            {activeExecutions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                isExpanded={expandedExecutionId === execution.id}
                onToggleExpand={() =>
                  setExpandedExecutionId(
                    expandedExecutionId === execution.id ? null : execution.id,
                  )
                }
                onCancel={() => cancelMutation.mutate(execution.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Executions */}
      {completedExecutions.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Completed ({completedExecutions.length})
          </h3>
          <div className="space-y-2">
            {completedExecutions.slice(0, 5).map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                isExpanded={expandedExecutionId === execution.id}
                onToggleExpand={() =>
                  setExpandedExecutionId(
                    expandedExecutionId === execution.id ? null : execution.id,
                  )
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExecutionCardProps {
  execution: AgentExecutionDetail;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCancel?: () => void;
}

function ExecutionCard({
  execution,
  isExpanded,
  onToggleExpand,
  onCancel,
}: ExecutionCardProps) {
  const statusColor = getStatusColor(execution.status);
  const statusIcon = getStatusIcon(execution.status);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Status indicator */}
          <div className={`flex-shrink-0 ${statusColor}`}>{statusIcon}</div>

          {/* Agent info */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {execution.agentProfile.displayName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {execution.task}
            </div>
          </div>

          {/* Status badge */}
          <div
            className={`flex-shrink-0 px-2 py-1 text-xs rounded ${getStatusBadgeClass(execution.status)}`}
          >
            {execution.status}
          </div>
        </div>

        {/* Expand icon */}
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
          {/* Progress indicator for running agents */}
          {execution.status === "running" && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
              <span>Agent is working...</span>
            </div>
          )}

          {/* Task */}
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Task
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {execution.task}
            </div>
          </div>

          {/* Result */}
          {execution.result && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Result
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                {execution.result}
              </div>
            </div>
          )}

          {/* Error */}
          {execution.error && (
            <div>
              <div className="text-xs font-medium text-red-500 mb-1">Error</div>
              <div className="text-sm text-red-600 dark:text-red-400 max-h-32 overflow-y-auto">
                {execution.error}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            {execution.startedAt && (
              <div>
                Started: {new Date(execution.startedAt).toLocaleTimeString()}
              </div>
            )}
            {execution.completedAt && (
              <div>
                Completed:{" "}
                {new Date(execution.completedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Messages */}
          {execution.messages && execution.messages.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                Messages ({execution.messages.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {execution.messages.map((message) => (
                  <div
                    key={message.id}
                    className="text-sm p-2 rounded bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {message.role === "user"
                          ? "👤 User"
                          : message.role === "assistant"
                            ? "🤖 Assistant"
                            : "⚙️ System"}
                      </span>
                      {message.toolName && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          🔧 {message.toolName}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {message.content && (
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {message.content.length > 200
                          ? `${message.content.substring(0, 200)}...`
                          : message.content}
                      </div>
                    )}
                    {message.toolInput && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Tool Input
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                          {JSON.stringify(message.toolInput, null, 2)}
                        </pre>
                      </details>
                    )}
                    {message.toolOutput && (
                      <details className="mt-1">
                        <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                          Tool Output
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto max-h-32">
                          {message.toolOutput.length > 500
                            ? `${message.toolOutput.substring(0, 500)}...`
                            : message.toolOutput}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Child executions */}
          {execution.childExecutions &&
            execution.childExecutions.length > 0 && (
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Sub-agents ({execution.childExecutions.length})
                </div>
                <div className="space-y-1">
                  {execution.childExecutions.map((child) => (
                    <div
                      key={child.id}
                      className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        Execution #{child.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded ${getStatusBadgeClass(child.status)}`}
                      >
                        {child.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Cancel button */}
          {(execution.status === "pending" || execution.status === "running") &&
            onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                Cancel Execution
              </button>
            )}
        </div>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "text-gray-400";
    case "running":
      return "text-blue-500";
    case "completed":
      return "text-green-500";
    case "failed":
      return "text-red-500";
    case "cancelled":
      return "text-gray-500";
    default:
      return "text-gray-400";
  }
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "pending":
      return "⏳";
    case "running":
      return "⚡";
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    case "cancelled":
      return "🚫";
    default:
      return "❓";
  }
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    case "running":
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400";
    case "completed":
      return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400";
    case "failed":
      return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400";
    case "cancelled":
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  }
}
