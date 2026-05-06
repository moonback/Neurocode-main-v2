# Guide des Logs Multi-Agent

Ce document explique les logs émis par le système multi-agent pour faciliter le débogage et la compréhension du flux d'exécution.

## 📊 Légende des Emojis

Les logs utilisent des emojis pour identifier rapidement le type d'opération :

- 🚀 **Démarrage** : Début d'une opération
- ✅ **Succès** : Opération réussie
- ❌ **Erreur** : Échec d'une opération
- 💥 **Crash** : Erreur critique avec stack trace
- ⏳ **En cours** : Opération en progression
- 📥 **Lecture** : Récupération de données
- 💾 **Écriture** : Sauvegarde de données
- 📡 **Communication** : Envoi d'événements IPC
- 🎯 **Décision** : Choix automatique ou délégation
- 👤 **Manuel** : Action manuelle de l'utilisateur
- 🔧 **Configuration** : Paramétrage ou filtrage
- 📝 **Génération** : Création de contenu
- 💬 **Message** : Création/manipulation de messages
- 🆔 **Identifiant** : Génération d'ID unique
- 📦 **Préparation** : Création de paramètres
- 🏁 **Fin** : Complétion d'une opération
- 🎉 **Célébration** : Succès complet
- ⚠️ **Avertissement** : Situation anormale mais non bloquante
- 🔀 **Parallèle** : Exécution parallèle
- ➡️ **Séquentiel** : Exécution séquentielle
- 🎬 **Requête** : Début d'une requête IPC
- 📤 **Réponse** : Retour d'une requête

## 🔄 Flux d'Exécution Normal

### 1. Réception de la Requête (Handler)

```
🎬 Starting agent execution request
   - chatId: ID du chat
   - agentProfileId: ID de l'agent (ou undefined pour auto-sélection)
   - taskLength: Longueur de la tâche
```

### 2. Sélection de l'Agent

**Option A : Auto-sélection (orchestrateur)**

```
🎯 No agent specified, delegating to orchestrator
✅ Orchestrator completed
   - executionCount: Nombre d'agents sélectionnés
   - executionIds: IDs des exécutions créées
```

**Option B : Sélection manuelle**

```
👤 Agent manually specified
   - agentProfileId: ID de l'agent choisi
✅ Agent profile verified
   - agentName: Nom de l'agent
   - agentRole: Rôle de l'agent
```

### 3. Création de l'Exécution

```
💾 Creating execution record
✅ Execution record created
   - executionId: ID unique de l'exécution
   - status: "pending"
```

### 4. Démarrage de l'Exécution en Arrière-Plan

```
🚀 Starting background execution
📤 Returning execution (background task started)
```

### 5. Exécution de l'Agent

```
🚀 Starting agent execution
   - executionId: ID de l'exécution

📥 Fetching execution data from database
✅ Execution data loaded
   - agentName: Nom de l'agent
   - agentRole: Rôle de l'agent
   - task: Tâche à exécuter
   - chatId: ID du chat

⏳ Updating execution status to 'running'
📡 Sending execution update to renderer
   - status: "running"

💬 Creating placeholder message
✅ Placeholder message created
   - messageId: ID du message créé

📝 Building agent system prompt
✅ System prompt built
   - promptLength: Longueur du prompt

🔧 Filtering tools for agent
   - hasAllowedTools: true/false
   - allowedToolsCount: Nombre d'outils autorisés
✅ Tools filtered
   - totalTools: Nombre total d'outils disponibles
   - allowedTools: Nombre d'outils après filtrage
   - toolNames: Liste des noms d'outils

📦 Creating chat stream params
🆔 Generated request ID
   - dyadRequestId: UUID unique

💾 Storing execution metadata
✅ Metadata stored

🎯 Starting local agent stream handler
   - toolCount: Nombre d'outils disponibles
🏁 Local agent stream handler completed
   - success: true/false
```

### 6. Finalisation

**En cas de succès :**

```
📥 Fetching final message content
✅ Final message retrieved
   - contentLength: Longueur du résultat

✅ Updating execution status to 'completed'
📡 Sending completion update to renderer
   - status: "completed"

🎉 Agent execution completed successfully
   - resultLength: Longueur du résultat final
```

**En cas d'échec :**

```
❌ Agent execution returned false
💥 Agent execution failed
   - error: Message d'erreur
   - stack: Stack trace (si disponible)

⚠️ Updating execution status to 'failed'
📡 Sending failure update to renderer
   - status: "failed"
```

## 🔀 Exécution Parallèle

```
🔀 Starting parallel agent execution
   - executionCount: Nombre d'agents
   - executionIds: Liste des IDs

🚀 Launching parallel agent 1/N
🚀 Launching parallel agent 2/N
...

✅ Parallel agent execution completed
```

## ➡️ Exécution Séquentielle

```
➡️ Starting sequential agent execution
   - executionCount: Nombre d'agents
   - executionIds: Liste des IDs

🚀 Executing agent 1/N
✅ Agent 1/N completed

🚀 Executing agent 2/N
✅ Agent 2/N completed

...

✅ Sequential agent execution completed
```

## 🐛 Débogage

### Problèmes Courants

#### 1. Agent non trouvé

```
❌ Agent profile not found or disabled
   - agentProfileId: ID recherché
```

**Solution** : Vérifier que l'agent existe et est activé dans la base de données.

#### 2. Chat non trouvé

```
❌ Chat not found for execution
   - executionId: ID de l'exécution
```

**Solution** : Vérifier que le chat existe et est associé à l'exécution.

#### 3. Exécution échouée

```
💥 Agent execution failed
   - error: Message d'erreur détaillé
   - stack: Stack trace complète
```

**Solution** : Examiner le message d'erreur et la stack trace pour identifier la cause.

#### 4. Aucun outil disponible

```
✅ Tools filtered
   - allowedTools: 0
```

**Solution** : Vérifier la configuration `allowedTools` de l'agent.

## 📈 Métriques Utiles

Les logs incluent des métriques pour analyser les performances :

- **promptLength** : Longueur du prompt système
- **toolCount** : Nombre d'outils disponibles
- **contentLength** : Longueur du contenu généré
- **resultLength** : Longueur du résultat final
- **executionCount** : Nombre d'agents exécutés

## 🔍 Recherche dans les Logs

Pour filtrer les logs par type d'opération :

```bash
# Voir uniquement les démarrages
grep "🚀" logs.txt

# Voir uniquement les erreurs
grep "❌\|💥" logs.txt

# Voir uniquement les succès
grep "✅\|🎉" logs.txt

# Suivre une exécution spécifique
grep "executionId: 123" logs.txt
```

## 📝 Exemple Complet

Voici un exemple de logs pour une exécution réussie :

```
12:00:00.000 (multi_agent_handlers) > 🎬 Starting agent execution request { chatId: 1, agentProfileId: 2, taskLength: 45 }
12:00:00.001 (multi_agent_handlers) > 👤 Agent manually specified { agentProfileId: 2 }
12:00:00.002 (multi_agent_handlers) > ✅ Agent profile verified { agentProfileId: 2, agentName: 'code-agent', agentRole: 'code' }
12:00:00.003 (multi_agent_handlers) > 💾 Creating execution record { chatId: 1, agentProfileId: 2 }
12:00:00.004 (multi_agent_handlers) > ✅ Execution record created { executionId: 3, agentProfileId: 2, status: 'pending' }
12:00:00.005 (multi_agent_handlers) > 🚀 Starting background execution { executionId: 3 }
12:00:00.006 (multi_agent_handlers) > 📤 Returning execution (background task started) { executionId: 3 }
12:00:00.010 (agent_executor) > 🚀 Starting agent execution { executionId: 3 }
12:00:00.011 (agent_executor) > 📥 Fetching execution data from database { executionId: 3 }
12:00:00.015 (agent_executor) > ✅ Execution data loaded { executionId: 3, agentName: 'code-agent', agentRole: 'code', task: 'Créer une fonction de validation email', chatId: 1 }
12:00:00.016 (agent_executor) > ⏳ Updating execution status to 'running' { executionId: 3 }
12:00:00.017 (agent_executor) > 📡 Sending execution update to renderer { executionId: 3, status: 'running' }
12:00:00.018 (agent_executor) > 💬 Creating placeholder message { executionId: 3 }
12:00:00.019 (agent_executor) > ✅ Placeholder message created { executionId: 3, messageId: 42 }
12:00:00.020 (agent_executor) > 📝 Building agent system prompt { executionId: 3, agentName: 'code-agent' }
12:00:00.021 (agent_executor) > ✅ System prompt built { executionId: 3, promptLength: 1250 }
12:00:00.022 (agent_executor) > 🔧 Filtering tools for agent { executionId: 3, agentName: 'code-agent', hasAllowedTools: true, allowedToolsCount: 15 }
12:00:00.023 (agent_executor) > ✅ Tools filtered { executionId: 3, agentName: 'code-agent', totalTools: 50, allowedTools: 15, toolNames: ['fsWrite', 'fsRead', ...] }
12:00:00.024 (agent_executor) > 📦 Creating chat stream params { executionId: 3 }
12:00:00.025 (agent_executor) > 🆔 Generated request ID { executionId: 3, dyadRequestId: 'abc-123-def-456' }
12:00:00.026 (agent_executor) > 💾 Storing execution metadata { executionId: 3 }
12:00:00.027 (agent_executor) > ✅ Metadata stored { executionId: 3 }
12:00:00.028 (agent_executor) > 🎯 Starting local agent stream handler { executionId: 3, agentName: 'code-agent', dyadRequestId: 'abc-123-def-456', toolCount: 15 }
12:00:05.123 (agent_executor) > 🏁 Local agent stream handler completed { executionId: 3, success: true }
12:00:05.124 (agent_executor) > 📥 Fetching final message content { executionId: 3, messageId: 42 }
12:00:05.125 (agent_executor) > ✅ Final message retrieved { executionId: 3, contentLength: 850 }
12:00:05.126 (agent_executor) > ✅ Updating execution status to 'completed' { executionId: 3 }
12:00:05.127 (agent_executor) > 📡 Sending completion update to renderer { executionId: 3, status: 'completed' }
12:00:05.128 (agent_executor) > 🎉 Agent execution completed successfully { executionId: 3, agentName: 'code-agent', resultLength: 850 }
```

## 🎯 Conseils

1. **Suivez le flux** : Les emojis permettent de suivre visuellement le flux d'exécution
2. **Cherchez les erreurs** : Les emojis ❌ et 💥 indiquent les problèmes
3. **Vérifiez les métriques** : Les longueurs et compteurs aident à identifier les anomalies
4. **Utilisez les IDs** : Filtrez par `executionId` pour suivre une exécution spécifique
5. **Comparez les timestamps** : Identifiez les opérations lentes

## 📚 Ressources

- [Guide d'utilisation des agents](./GUIDE_UTILISATION_AGENTS.md)
- [Intégration UI](./INTEGRATION_UI_AGENTS.md)
- [Documentation technique](./MULTI_AGENT_SYSTEM.md)
