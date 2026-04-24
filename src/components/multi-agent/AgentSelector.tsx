/**
 * AgentSelector — lets users pick specialized agents for multi-agent workflows.
 * Displays built-in agents as selectable cards with capability badges.
 */

import { useState } from "react";
import {
  Code2,
  SearchCheck,
  FlaskConical,
  Bug,
  Boxes,
  Check,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useMultiAgentList } from "@/hooks/useMultiAgent";
import type { AgentDefinitionDto } from "@/ipc/types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Code2,
  SearchCheck,
  FlaskConical,
  Bug,
  Boxes,
  Sparkles,
};

interface AgentSelectorProps {
  selectedAgentIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCreateCustom?: () => void;
  className?: string;
}

export function AgentSelector({
  selectedAgentIds,
  onSelectionChange,
  onCreateCustom,
  className,
}: AgentSelectorProps) {
  const { data: agents = [], isLoading } = useMultiAgentList();

  const toggleAgent = (agentId: string) => {
    if (selectedAgentIds.includes(agentId)) {
      onSelectionChange(selectedAgentIds.filter((id) => id !== agentId));
    } else {
      onSelectionChange([...selectedAgentIds, agentId]);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex gap-2 flex-wrap", className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 w-36 rounded-xl bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 flex-wrap", className)}>
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          isSelected={selectedAgentIds.includes(agent.id)}
          onToggle={() => toggleAgent(agent.id)}
        />
      ))}
      {onCreateCustom && (
        <button
          onClick={onCreateCustom}
          className="flex flex-col items-center justify-center gap-1.5 h-20 w-36 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer text-muted-foreground hover:text-primary"
        >
          <Plus size={18} />
          <span className="text-xs font-medium">Agent personnalisé</span>
        </button>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  isSelected,
  onToggle,
}: {
  agent: AgentDefinitionDto;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const IconComponent = ICON_MAP[agent.icon] ?? Sparkles;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            data-testid={`agent-card-${agent.id}`}
            onClick={onToggle}
            className={cn(
              "relative flex flex-col items-start gap-1 h-20 w-36 p-3 rounded-xl border transition-all cursor-pointer text-left",
              isSelected
                ? "border-primary bg-primary/8 shadow-sm shadow-primary/10"
                : "border-border/50 bg-card hover:border-border hover:bg-muted/30",
            )}
          />
        }
      >
        <div className="flex items-center gap-2 w-full">
          <span className={cn("shrink-0", agent.color)}>
            <IconComponent size={16} />
          </span>
          <span className="text-xs font-semibold truncate">{agent.name}</span>
          {isSelected && (
            <Check
              size={14}
              className="ml-auto text-primary shrink-0"
            />
          )}
        </div>
        <span className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
          {agent.description}
        </span>
        {agent.isCustom && (
          <span className="absolute top-1 right-1.5 text-[9px] bg-accent/60 text-accent-foreground px-1 rounded">
            custom
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        <p className="font-medium text-sm mb-1">{agent.name}</p>
        <p className="text-xs text-muted-foreground mb-1.5">
          {agent.description}
        </p>
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full"
            >
              {cap}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
