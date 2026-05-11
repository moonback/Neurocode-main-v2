import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/client";
import { Bot, Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";
import { Link } from "@tanstack/react-router";

interface AgentListProps {
  show: boolean;
}

export function AgentList({ show }: AgentListProps) {
  const { data: agents, isLoading, refetch } = useQuery({
    queryKey: ["agents"],
    queryFn: () => ipc.multiAgent.getAgents(),
    enabled: show,
  });

  if (!show) return null;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border animate-in slide-in-from-left duration-300">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Agents
        </h2>
        <Button size="icon" variant="ghost" asChild>
          <Link to="/agents/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
            Chargement des agents...
          </div>
        ) : agents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm p-4 text-center">
            <Bot className="h-8 w-8 mb-2 opacity-20" />
            Aucun agent personnalisé trouvé.
          </div>
        ) : (
          <div className="space-y-1">
            {agents?.map((agent) => (
              <div
                key={agent.id}
                className="group flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Link
                  to="/agents"
                  search={{ id: agent.id }}
                  className="flex-1 min-w-0 flex flex-col"
                >
                  <span className="text-sm font-medium truncate">
                    {agent.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {agent.description}
                  </span>
                </Link>
                <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
