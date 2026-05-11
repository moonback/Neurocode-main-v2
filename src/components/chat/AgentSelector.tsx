import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { selectedAgentIdAtom } from "@/atoms/chatAtoms";
import { ipc, AgentDefinition } from "@/ipc/types";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bot, ChevronDown, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentSelector() {
  const [selectedAgentId, setSelectedAgentId] = useAtom(selectedAgentIdAtom);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const allAgents = await ipc.multiAgent.getAgents();
        setAgents(allAgents);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger 
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md bg-muted/20 border border-transparent hover:border-border/50 cursor-pointer"
      >
        <Bot size={14} className={cn(selectedAgentId ? "text-primary" : "text-muted-foreground")} />
        <span className="truncate max-w-[100px]">{selectedAgent ? selectedAgent.name : "Select Agent"}</span>
        <ChevronDown size={12} className="opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem 
          onClick={() => setSelectedAgentId(null)}
          className="flex items-center gap-2"
        >
          <Sparkles size={14} className="text-primary" />
          <span>Standard (AI Assistant)</span>
          {!selectedAgentId && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Custom Agents
        </div>
        {loading && <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading...</div>}
        {agents.length === 0 && !loading && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No custom agents found</div>
        )}
        {agents.map((agent) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => setSelectedAgentId(agent.id)}
            className="flex items-center gap-2"
          >
            <Bot size={14} className="text-muted-foreground" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{agent.name}</span>
              <span className="text-[10px] text-muted-foreground line-clamp-1">{agent.description}</span>
            </div>
            {selectedAgentId === agent.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
