import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { Bot, Plus, Trash2, Edit, Save, X, Settings2, Cpu, MessageSquare, ShieldCheck, Play } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { AgentOrchestrationDashboard } from "./AgentOrchestrationDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export function AgentManagementPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => ipc.multiAgent.getAgents(),
  });

  const createMutation = useMutation({
    mutationFn: (agent: any) => ipc.multiAgent.createCustomAgent(agent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setIsCreating(false);
      toast.success("Agent créé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ipc.multiAgent.deleteCustomAgent({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent supprimé");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, agent }: { id: string; agent: any }) => ipc.multiAgent.updateCustomAgent({ id, updates: agent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setEditingAgentId(null);
      toast.success("Agent mis à jour");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Bot className="h-8 w-8 animate-bounce text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Multi-Agent Orchestration
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos agents spécialisés et configurez leurs capacités.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Nouvel Agent
        </Button>
      </div>

      <Tabs defaultValue="management" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 backdrop-blur-md">
          <TabsTrigger value="management">Gestion des Agents</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring Orchestration</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isCreating && (
              <AgentForm 
                onCancel={() => setIsCreating(false)} 
                onSubmit={(agent) => createMutation.mutate(agent)} 
              />
            )}
            
            {agents?.map((agent: any) => (
              <div key={agent.id}>
                {editingAgentId === agent.id ? (
                  <AgentForm
                    initialData={agent}
                    onCancel={() => setEditingAgentId(null)}
                    onSubmit={(data) => updateMutation.mutate({ id: agent.id, agent: data })}
                  />
                ) : (
                  <AgentCard
                    agent={agent}
                    onEdit={() => setEditingAgentId(agent.id)}
                    onDelete={() => deleteMutation.mutate(agent.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-8">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Tester l'Orchestration</CardTitle>
              <CardDescription>
                Lancez une requête complexe pour voir les agents collaborer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input placeholder="Ex: Crée une application React avec un backend Node.js et des tests..." id="test-request" className="flex-1" />
                <Button onClick={() => {
                  const input = document.getElementById("test-request") as HTMLInputElement;
                  if (input.value) {
                    ipc.multiAgent.delegateTask({
                      taskId: `test-${Date.now()}`,
                      agentId: "orchestrator",
                      input: input.value
                    }).then(() => toast.success("Orchestration lancée"))
                      .catch(e => toast.error(`Erreur: ${e.message}`));
                  }
                }} className="gap-2">
                  <Play className="h-4 w-4" /> Lancer
                </Button>
              </div>
            </CardContent>
          </Card>
          <AgentOrchestrationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentCard({ agent, onEdit, onDelete }: { agent: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity" />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-lg bg-primary/10 text-primary mb-2">
            <Bot className="h-6 w-6" />
          </div>
          <Badge variant={agent.isBuiltIn ? "secondary" : "outline"} className="capitalize">
            {agent.isBuiltIn ? "Built-in" : "Custom"}
          </Badge>
        </div>
        <CardTitle className="text-xl">{agent.name}</CardTitle>
        <CardDescription className="line-clamp-2">{agent.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {agent.capabilities.map((cap: string) => (
            <Badge key={cap} variant="outline" className="text-[10px] uppercase tracking-wider">
              {cap}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2 pt-0">
        {!agent.isBuiltIn && (
          <>
            <Button variant="ghost" size="icon" onClick={onEdit} className="hover:text-primary hover:bg-primary/10">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function AgentForm({ initialData, onCancel, onSubmit }: { initialData?: any; onCancel: () => void; onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    systemPrompt: initialData?.systemPrompt || "",
    capabilities: initialData?.capabilities?.join(", ") || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      capabilities: formData.capabilities.split(",").map((c: string) => c.trim()).filter(Boolean),
      toolConfiguration: {},
    });
  };

  return (
    <Card className="border-primary/50 shadow-xl shadow-primary/10 animate-in zoom-in-95 duration-200 lg:col-span-2">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {initialData ? "Modifier l'agent" : "Nouvel Agent"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Expert Frontend"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capabilities">Capacités (séparées par des virgules)</Label>
              <Input
                id="capabilities"
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                placeholder="react, typescript, css"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Bref résumé de l'utilité de cet agent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              placeholder="Instructions détaillées pour l'agent..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" className="gap-2">
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
