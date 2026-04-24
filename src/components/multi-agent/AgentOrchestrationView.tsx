/**
 * AgentOrchestrationView — real-time visualization of multi-agent workflow execution.
 * Shows task pipeline with status indicators and agent assignments.
 */

import {
  Code2,
  SearchCheck,
  FlaskConical,
  Bug,
  Boxes,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Ban,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowExecutionDto } from "@/ipc/types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Code2,
  SearchCheck,
  FlaskConical,
  Bug,
  Boxes,
  Sparkles,
};

const STATUS_CONFIG = {
  pending: { icon: Clock, label: "En attente", className: "text-muted-foreground" },
  running: { icon: Loader2, label: "En cours", className: "text-blue-500 animate-spin" },
  "waiting-for-input": { icon: Clock, label: "En attente d'entrée", className: "text-amber-500" },
  completed: { icon: CheckCircle2, label: "Terminé", className: "text-green-500" },
  failed: { icon: XCircle, label: "Échoué", className: "text-red-500" },
  cancelled: { icon: Ban, label: "Annulé", className: "text-muted-foreground" },
} as const;

interface AgentOrchestrationViewProps {
  workflow: WorkflowExecutionDto;
  agentNames?: Record<string, string>;
  className?: string;
}

export function AgentOrchestrationView({
  workflow,
  agentNames = {},
  className,
}: AgentOrchestrationViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = workflow.tasks.filter(
    (t) => t.status === "completed",
  ).length;
  const totalCount = workflow.tasks.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const overallStatus = STATUS_CONFIG[workflow.status];
  const OverallIcon = overallStatus.icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left"
      >
        <OverallIcon size={16} className={overallStatus.className} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              Flux multi-agents
            </span>
            <span className="text-xs text-muted-foreground">
              {workflow.strategy}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground">
              {completedCount}/{totalCount} tâches
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground" />
        )}
      </button>

      {/* Task List */}
      {isExpanded && (
        <div className="border-t border-border/40 divide-y divide-border/30">
          {workflow.tasks.map((task) => {
            const status = STATUS_CONFIG[task.status];
            const StatusIcon = status.icon;
            const agentName =
              agentNames[task.assignedAgentId] ?? task.assignedAgentId;

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-2.5"
              >
                <StatusIcon
                  size={14}
                  className={cn("mt-0.5 shrink-0", status.className)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug">
                    {task.description}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {agentName} · {status.label}
                  </p>
                  {task.error && (
                    <p className="text-[11px] text-red-500 mt-0.5 line-clamp-2">
                      {task.error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aggregated result */}
      {workflow.aggregatedResult && isExpanded && (
        <div className="border-t border-border/40 px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1">
            Résultat agrégé
          </p>
          <p className="text-xs whitespace-pre-wrap line-clamp-6">
            {workflow.aggregatedResult}
          </p>
        </div>
      )}
    </div>
  );
}
