# Système Multi-Agent - Documentation Complète

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Correction du problème "running mais rien ne se passe"](#correction-du-problème-running-mais-rien-ne-se-passe)
4. [Utilisation](#utilisation)
5. [Agents disponibles](#agents-disponibles)
6. [Dépannage](#dépannage)

## 🎯 Vue d'ensemble

Le système multi-agent permet de déléguer des tâches à des agents spécialisés qui exécutent des outils de manière autonome. Chaque agent a :

- **Un rôle spécifique** (code, test, documentation, etc.)
- **Des outils autorisés** (lecture de fichiers, exécution de commandes, etc.)
- **Un prompt système personnalisé** qui guide son comportement
- **Une exécution autonome** avec suivi en temps réel

## 🏗️ Architecture

### Composants principaux

```
┌─────────────────────────────────────────────────────────────┐
│                     Interface Utilisateur                    │
│  (src/pages/agents.tsx + src/components/AgentSelector.tsx)  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    IPC Handlers                              │
│         (src/ipc/handlers/multi_agent_handlers.ts)           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Orchestrateur                              │
│  (src/pro/main/ipc/handlers/multi_agent/orchestrator.ts)    │
│  - Sélection d'agent (LLM ou mots-clés)                     │
│  - Coordination des exécutions                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Agent Executor                              │
│  (src/pro/main/ipc/handlers/multi_agent/agent_executor.ts)  │
│  - Exécution via handleLocalAgentStream                      │
│  - Filtrage des outils                                       │
│  - Suivi de l'état                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Local Agent Stream Handler                      │
│  (src/pro/main/ipc/handlers/local_agent/...)                │
│  - Exécution des outils                                      │
│  - Streaming des réponses                                    │
└─────────────────────────────────────────────────────────────┘
```

### Base de données

Le système utilise 4 tables principales :

1. **`agent_profiles`** : Définition des agents (nom, rôle, prompt, outils)
2. **`agent_executions`** : Historique des exécutions (statut, résultat, erreur)
3. **`agent_messages`** : Messages échangés pendant l'exécution
4. **`agent_communications`** : Communications entre agents

## 🔧 Correction du problème "running mais rien ne se passe"

### Problème identifié

L'agent affichait le statut "running" mais ne faisait rien. La cause était :

**Le chat utilisé n'avait pas d'application associée**, ce qui est requis par `handleLocalAgentStream`.

### Solution implémentée

#### 1. Validation stricte dans `agent_executor.ts`

Ajout de vérifications explicites avant l'exécution :

```typescript
if (!chat) {
  throw new DyadError(
    `Chat not found for execution: ${executionId}. Chat ID ${execution.chatId} does not exist in the database.`,
    DyadErrorKind.NotFound,
  );
}

if (!chat.app) {
  throw new DyadError(
    `Chat ${execution.chatId} has no associated app. Agents require a chat with an app to execute tasks.`,
    DyadErrorKind.Validation,
  );
}
```

#### 2. Nouveau endpoint IPC : `getOrCreateAgentChat`

Créé un endpoint qui :

- Vérifie qu'une application existe
- Cherche un chat existant avec le titre "🤖 Agents"
- Crée un nouveau chat si nécessaire
- Retourne l'ID du chat

**Fichiers modifiés :**

- `src/ipc/types/multi_agent.ts` : Ajout du contrat
- `src/ipc/handlers/multi_agent_handlers.ts` : Implémentation du handler
- `src/renderer/hooks/useMultiAgent.ts` : Hook React Query
- `src/lib/queryKeys.ts` : Clé de cache

#### 3. Mise à jour de l'interface utilisateur

La page agents (`src/pages/agents.tsx`) maintenant :

- Récupère la première application disponible
- Obtient ou crée un chat dédié pour cette application
- Affiche des états de chargement et d'erreur appropriés
- Utilise le chat créé pour toutes les exécutions d'agents

### Flux d'exécution corrigé

```
1. Utilisateur ouvre la page Agents
   ↓
2. Récupération de la première application (ipc.app.listApps())
   ↓
3. Obtention/création du chat agent (ipc.multiAgent.getOrCreateAgentChat(appId))
   ↓
4. Utilisateur décrit une tâche et clique "Lancer l'Agent"
   ↓
5. Création de l'exécution avec le chatId valide
   ↓
6. Agent Executor vérifie que le chat existe et a une app
   ↓
7. Exécution via handleLocalAgentStream avec tous les paramètres requis
   ↓
8. Streaming des résultats en temps réel vers l'UI
```

## 📖 Utilisation

### Prérequis

1. **Avoir au moins une application créée**
   - Allez dans la section Applications
   - Créez une nouvelle application ou importez-en une

2. **Base de données initialisée**
   - Fermez l'application
   - Exécutez `npm run db:reset`
   - Redémarrez l'application

### Utilisation de base

1. **Accédez à la page Agents** via le menu latéral (icône 🤖)

2. **Sélectionnez un agent** (optionnel)
   - Laissez sur "Auto" pour que l'orchestrateur choisisse
   - Ou sélectionnez manuellement un agent spécifique

3. **Décrivez votre tâche** dans la zone de texte

   ```
   Exemple : "Créer une fonction de validation d'email dans src/utils.ts"
   ```

4. **Cliquez sur "Lancer l'Agent"**

5. **Suivez l'exécution** dans le panneau "Exécutions Récentes"
   - Statut en temps réel (pending → running → completed/failed)
   - Messages échangés
   - Outils utilisés
   - Résultat final

### Utilisation avancée

#### Sélection automatique par LLM

L'orchestrateur utilise un LLM pour analyser votre tâche et choisir le meilleur agent :

```typescript
await ipc.multiAgent.orchestrateAgents({
  chatId: agentChatId,
  prompt: "Créer des tests unitaires pour la fonction validateEmail",
  useLLMSelection: true, // Par défaut
});
```

Le LLM analyse :

- La nature de la tâche
- Les compétences requises
- Les outils nécessaires
- Le contexte du projet

#### Sélection manuelle

Pour forcer un agent spécifique :

```typescript
await ipc.multiAgent.startAgentExecution({
  chatId: agentChatId,
  agentProfileId: 2, // ID de l'agent code-agent
  task: "Refactoriser la fonction getUserData",
});
```

#### Exécution parallèle

Pour exécuter plusieurs agents en parallèle :

```typescript
await ipc.multiAgent.orchestrateAgents({
  chatId: agentChatId,
  prompt: "Créer une API REST complète avec tests et documentation",
  parallelExecution: true,
});
```

## 🤖 Agents disponibles

### 1. Orchestrator (orchestrator-agent)

- **Rôle** : Coordination et délégation
- **Outils** : Tous les outils disponibles
- **Usage** : Analyse la tâche et délègue aux agents spécialisés

### 2. Code Specialist (code-agent)

- **Rôle** : Développement et refactoring
- **Outils** :
  - `readFile`, `readMultipleFiles`, `readCode`
  - `fsWrite`, `fsAppend`, `strReplace`
  - `grepSearch`, `fileSearch`
  - `executePwsh`, `listDirectory`
- **Usage** : Écriture, modification et refactoring de code

### 3. Test Specialist (test-agent)

- **Rôle** : Tests et validation
- **Outils** :
  - Lecture de fichiers
  - Exécution de commandes
  - Écriture de tests
- **Usage** : Création et exécution de tests unitaires/E2E

### 4. Documentation Specialist (documentation-agent)

- **Rôle** : Documentation technique
- **Outils** :
  - Lecture de code
  - Écriture de fichiers Markdown
  - Recherche dans le projet
- **Usage** : Création de README, guides, documentation API

### 5. Research Specialist (research-agent)

- **Rôle** : Recherche et analyse
- **Outils** :
  - `remote_web_search`, `webFetch`
  - Lecture de fichiers
  - Analyse de code
- **Usage** : Recherche de solutions, analyse de dépendances

### 6. Database Specialist (database-agent)

- **Rôle** : Gestion de base de données
- **Outils** :
  - Lecture/écriture de schémas
  - Exécution de migrations
  - Requêtes SQL
- **Usage** : Création de schémas, migrations, requêtes

## 🔍 Dépannage

### L'agent ne démarre pas

**Symptôme** : Erreur "Chat not found" ou "Chat has no associated app"

**Solution** :

1. Vérifiez qu'une application existe dans la section Applications
2. Rechargez la page Agents pour recréer le chat
3. Vérifiez les logs de la console pour plus de détails

### L'agent reste bloqué en "running"

**Symptôme** : Le statut reste "running" indéfiniment

**Solutions** :

1. Vérifiez les logs de la console (F12)
2. Cherchez les messages avec emoji 🚀, ✅, ❌
3. Vérifiez que `handleLocalAgentStream` est bien appelé
4. Annulez l'exécution et réessayez

### Aucun agent disponible

**Symptôme** : La liste des agents est vide

**Solution** :

1. Fermez l'application
2. Exécutez `npm run db:reset`
3. Redémarrez l'application
4. Les agents builtin seront recréés automatiquement

### Erreur "Agent profile not found or disabled"

**Symptôme** : L'agent sélectionné n'existe pas

**Solution** :

1. Vérifiez que l'agent existe dans la base de données
2. Vérifiez que `isEnabled = true` pour cet agent
3. Utilisez la sélection automatique au lieu de la sélection manuelle

### Logs de débogage

Pour activer les logs détaillés, ouvrez la console (F12) et cherchez :

```
🚀 Starting agent execution
📥 Fetching execution data
✅ Execution data loaded
🔧 Filtering tools for agent
🎯 Starting local agent stream handler
🏁 Local agent stream handler completed
```

Si vous ne voyez pas ces logs, l'exécution ne démarre pas correctement.

## 📚 Ressources supplémentaires

- [Guide d'utilisation des agents](./GUIDE_UTILISATION_AGENTS.md)
- [Intégration UI des agents](./INTEGRATION_UI_AGENTS.md)
- [Logs des agents](./LOGS_AGENTS.md)
- [README principal](./README_AGENTS_FR.md)

## 🎉 Résumé des changements

### Fichiers créés

- `docs/MULTI_AGENT_SYSTEM.md` (ce fichier)

### Fichiers modifiés

1. **`src/ipc/types/multi_agent.ts`**
   - Ajout du contrat `getOrCreateAgentChat`

2. **`src/ipc/handlers/multi_agent_handlers.ts`**
   - Implémentation du handler `getOrCreateAgentChat`
   - Création automatique d'un chat avec titre "🤖 Agents"

3. **`src/renderer/hooks/useMultiAgent.ts`**
   - Ajout du hook `useGetOrCreateAgentChat`

4. **`src/lib/queryKeys.ts`**
   - Ajout de la clé `agentChat`

5. **`src/pages/agents.tsx`**
   - Récupération de la première application
   - Obtention/création du chat agent
   - États de chargement et d'erreur
   - Suppression du chatId hardcodé

6. **`src/pro/main/ipc/handlers/multi_agent/agent_executor.ts`**
   - Validation stricte de l'existence du chat et de l'app
   - Messages d'erreur détaillés
   - Logs améliorés

### Résultat

✅ Les agents s'exécutent maintenant correctement
✅ Validation stricte avant l'exécution
✅ Messages d'erreur clairs et actionnables
✅ Création automatique du chat si nécessaire
✅ Interface utilisateur robuste avec gestion d'erreurs
