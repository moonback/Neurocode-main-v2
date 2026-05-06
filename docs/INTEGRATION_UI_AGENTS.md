# Guide d'Intégration de l'Interface Multi-Agent

## 🎯 Objectif

Ce guide explique comment intégrer les composants UI du système multi-agent dans l'interface principale de NeuroCode.

## 📦 Composants Disponibles

### 1. `AgentSelector` - Sélecteur d'Agent

**Fichier** : `src/components/AgentSelector.tsx`

**Props** :

```typescript
interface AgentSelectorProps {
  selectedAgentId: number | null;
  onSelectAgent: (agentId: number | null) => void;
  autoSelect?: boolean;
  onAutoSelectChange?: (value: boolean) => void;
  className?: string;
}
```

**Utilisation** :

```tsx
import { AgentSelector } from "@/components/AgentSelector";

function MyComponent() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [autoSelect, setAutoSelect] = useState(false);

  return (
    <AgentSelector
      selectedAgentId={selectedAgent}
      onSelectAgent={setSelectedAgent}
      autoSelect={autoSelect}
      onAutoSelectChange={setAutoSelect}
    />
  );
}
```

### 2. `AgentExecutionPanel` - Panneau d'Exécution

**Fichier** : `src/components/AgentExecutionPanel.tsx`

**Props** :

```typescript
interface AgentExecutionPanelProps {
  chatId: number;
  className?: string;
}
```

**Utilisation** :

```tsx
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";

function MyComponent() {
  const chatId = 123; // ID du chat actuel

  return <AgentExecutionPanel chatId={chatId} />;
}
```

### 3. `AgentSelectionReasoning` - Affichage du Raisonnement LLM

**Fichier** : `src/components/AgentSelectionReasoning.tsx`

**Props** :

```typescript
interface AgentSelectionReasoningProps {
  reasoning: string;
  confidence: number;
  method: "llm" | "keyword";
  className?: string;
}
```

## 🔧 Intégration dans l'Interface Principale

### Option 1 : Intégration dans le Chat (Recommandé)

**Fichier à modifier** : `src/routes/home.tsx` ou le composant de chat principal

```tsx
import { AgentSelector } from "@/components/AgentSelector";
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";
import { useState } from "react";

export function HomePage() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [autoSelect, setAutoSelect] = useState(true);
  const currentChatId = 1; // Récupérer l'ID du chat actuel

  return (
    <div className="flex h-screen">
      {/* Sidebar gauche */}
      <aside className="w-64 border-r">
        {/* Contenu existant de la sidebar */}
      </aside>

      {/* Zone principale */}
      <main className="flex-1 flex flex-col">
        {/* Zone de chat */}
        <div className="flex-1 overflow-y-auto">{/* Messages du chat */}</div>

        {/* Zone d'input avec sélecteur d'agent */}
        <div className="border-t p-4 space-y-4">
          {/* Sélecteur d'agent */}
          <AgentSelector
            selectedAgentId={selectedAgent}
            onSelectAgent={setSelectedAgent}
            autoSelect={autoSelect}
            onAutoSelectChange={setAutoSelect}
            className="mb-2"
          />

          {/* Input de chat existant */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Décrivez votre tâche..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg">
              Envoyer
            </button>
          </div>
        </div>
      </main>

      {/* Sidebar droite - Panneau d'exécution */}
      <aside className="w-96 border-l overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Exécutions d'Agents</h2>
          <AgentExecutionPanel chatId={currentChatId} />
        </div>
      </aside>
    </div>
  );
}
```

### Option 2 : Intégration dans un Onglet Dédié

**Créer un nouvel onglet "Agents"** :

```tsx
// src/routes/agents.tsx
import { AgentSelector } from "@/components/AgentSelector";
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";
import { useAgentProfiles } from "@/renderer/hooks/useMultiAgent";

export function AgentsPage() {
  const { data: profiles } = useAgentProfiles();
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Système Multi-Agent</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche : Sélection et configuration */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Sélectionner un Agent
            </h2>
            <AgentSelector
              selectedAgentId={selectedAgent}
              onSelectAgent={setSelectedAgent}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Agents Disponibles</h2>
            <div className="space-y-2">
              {profiles?.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedAgent(profile.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {getRoleEmoji(profile.role)}
                    </span>
                    <div>
                      <h3 className="font-medium">{profile.name}</h3>
                      <p className="text-sm text-gray-600">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne droite : Exécutions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Exécutions Récentes</h2>
          <AgentExecutionPanel chatId={1} />
        </div>
      </div>
    </div>
  );
}

function getRoleEmoji(role: string): string {
  const emojis: Record<string, string> = {
    orchestrator: "🎯",
    "code-specialist": "💻",
    "test-specialist": "🧪",
    "documentation-specialist": "📚",
    "research-specialist": "🔍",
    "database-specialist": "🗄️",
  };
  return emojis[role] || "🤖";
}
```

### Option 3 : Intégration dans un Modal/Dialog

```tsx
import { Dialog } from "@base-ui/react/dialog";
import { AgentSelector } from "@/components/AgentSelector";

export function AgentSelectionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  const handleSubmit = () => {
    // Lancer l'exécution de l'agent
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Sélectionner un Agent</h2>

          <AgentSelector
            selectedAgentId={selectedAgent}
            onSelectAgent={setSelectedAgent}
            className="mb-4"
          />

          <textarea
            placeholder="Décrivez votre tâche en détail..."
            className="w-full h-32 p-3 border rounded-lg mb-4"
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Lancer l'Agent
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
```

## 🎨 Personnalisation du Style

Les composants utilisent Tailwind CSS et peuvent être personnalisés via la prop `className` :

```tsx
<AgentSelector
  selectedAgentId={selectedAgent}
  onSelectAgent={setSelectedAgent}
  className="bg-gray-50 border-2 border-blue-500 rounded-xl p-4"
/>
```

## 🔗 Connexion avec le Backend

### Exemple Complet : Soumettre une Tâche à un Agent

```tsx
import { useExecuteAgent } from "@/renderer/hooks/useMultiAgent";
import { AgentSelector } from "@/components/AgentSelector";
import { useState } from "react";

export function AgentTaskForm() {
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);
  const [task, setTask] = useState("");
  const executeAgent = useExecuteAgent();

  const handleSubmit = async () => {
    if (!selectedAgent || !task) return;

    try {
      const result = await executeAgent.mutateAsync({
        agentId: selectedAgent,
        task: task,
        context: {
          chatId: 1, // ID du chat actuel
          files: [], // Fichiers pertinents
        },
      });

      console.log("Agent exécuté avec succès:", result);
      setTask("");
    } catch (error) {
      console.error("Erreur lors de l'exécution:", error);
    }
  };

  return (
    <div className="space-y-4">
      <AgentSelector
        selectedAgentId={selectedAgent}
        onSelectAgent={setSelectedAgent}
      />

      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Décrivez votre tâche..."
        className="w-full h-32 p-3 border rounded-lg"
      />

      <button
        onClick={handleSubmit}
        disabled={!selectedAgent || !task || executeAgent.isPending}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {executeAgent.isPending ? "Exécution en cours..." : "Lancer l'Agent"}
      </button>

      {executeAgent.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Erreur : {executeAgent.error.message}
        </div>
      )}
    </div>
  );
}
```

## 📱 Responsive Design

Les composants sont conçus pour être responsives. Exemple d'adaptation mobile :

```tsx
<div className="flex flex-col lg:flex-row gap-4">
  {/* Sur mobile : colonne, sur desktop : ligne */}
  <div className="w-full lg:w-1/3">
    <AgentSelector
      selectedAgentId={selectedAgent}
      onSelectAgent={setSelectedAgent}
    />
  </div>

  <div className="w-full lg:w-2/3">
    <AgentExecutionPanel chatId={chatId} />
  </div>
</div>
```

## 🚀 Prochaines Étapes

1. **Choisir l'emplacement** : Décidez où intégrer les composants (chat, onglet dédié, modal)
2. **Modifier les fichiers** : Ajoutez les imports et composants dans les fichiers appropriés
3. **Tester** : Vérifiez que tout fonctionne correctement
4. **Personnaliser** : Adaptez le style à votre design

## 💡 Conseils

- **Commencez Simple** : Intégrez d'abord le `AgentSelector` dans le chat
- **Testez Progressivement** : Ajoutez un composant à la fois
- **Utilisez les Hooks** : Les hooks `useMultiAgent` gèrent toute la logique
- **Surveillez les Erreurs** : Utilisez les états `isLoading` et `isError` des hooks

## 📚 Ressources

- **Hooks disponibles** : `src/renderer/hooks/useMultiAgent.ts`
- **Types TypeScript** : `src/ipc/types/multi_agent.ts`
- **Composants UI** : `src/components/Agent*.tsx`

---

**Besoin d'aide pour l'intégration ?** Consultez les exemples ci-dessus ou créez une issue sur GitHub !
