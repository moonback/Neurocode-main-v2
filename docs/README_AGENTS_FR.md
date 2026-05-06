# 🤖 Système Multi-Agent - Guide Complet

## 📚 Documentation Disponible

### Pour les Utilisateurs

- **[Guide d'Utilisation](./GUIDE_UTILISATION_AGENTS.md)** - Comment utiliser les agents au quotidien
- **[Configuration du Modèle](./CONFIGURATION_MODELE_AGENTS.md)** ⭐ **NOUVEAU** - Configuration OpenRouter, résolution des problèmes
- **[Lancer un Agent depuis le Chat](./LANCER_AGENT_DEPUIS_CHAT.md)** - Utiliser le bouton 🤖 dans le chat
- **[Logs des Agents](./LOGS_AGENTS.md)** - Comprendre les logs et déboguer
- **[Guide d'Intégration UI](./INTEGRATION_UI_AGENTS.md)** - Comment intégrer l'interface dans l'application

### Pour les Développeurs

- **[Documentation Technique](./MULTI_AGENT_SYSTEM.md)** - Architecture et détails techniques (EN)
- **[Résumé d'Implémentation](../MULTI_AGENT_IMPLEMENTATION_SUMMARY.md)** - Détails de l'implémentation (EN)
- **[Sélection LLM](../PHASE_3_LLM_SELECTION_COMPLETE.md)** - Système de sélection intelligente (EN)

## 🚀 Démarrage Rapide

### 1. Vérifier l'Installation

```bash
# Assurez-vous que la base de données est à jour
npm run db:reset

# Démarrer l'application
npm run dev
```

### 2. Premiers Pas

#### Via l'Interface (Une fois intégrée)

1. Ouvrez NeuroCode
2. Trouvez le sélecteur d'agent dans l'interface
3. Choisissez un agent ou activez la sélection automatique
4. Décrivez votre tâche
5. Cliquez sur "Envoyer"

#### Via l'API (Pour les développeurs)

```typescript
// Exécuter un agent
const result = await window.electron.ipcRenderer.invoke(
  "multi-agent:execute-agent",
  {
    agentId: "code-agent",
    task: "Ajouter une fonction de validation",
    context: { files: ["src/utils.ts"] },
  },
);
```

## 🤖 Agents Disponibles

| Agent                   | Emoji | Rôle            | Utilisation                      |
| ----------------------- | ----- | --------------- | -------------------------------- |
| **Orchestrator**        | 🎯    | Coordination    | Tâches complexes multi-agents    |
| **Code Agent**          | 💻    | Développement   | Écriture et modification de code |
| **Test Agent**          | 🧪    | Tests           | Création et exécution de tests   |
| **Documentation Agent** | 📚    | Documentation   | Rédaction de docs et guides      |
| **Research Agent**      | 🔍    | Recherche       | Analyse et exploration de code   |
| **Database Agent**      | 🗄️    | Base de données | Schémas et migrations            |

## 📊 Fonctionnalités Principales

### ✅ Exécution d'Agents

- **Exécution unique** : Un agent pour une tâche spécifique
- **Exécution parallèle** : Plusieurs agents travaillent simultanément
- **Exécution séquentielle** : Agents travaillent dans l'ordre

### 🧠 Sélection Intelligente

- **Sélection manuelle** : Choisissez l'agent vous-même
- **Sélection automatique** : Le système choisit pour vous
- **Sélection LLM** : L'IA analyse la tâche et sélectionne les meilleurs agents

### 📈 Suivi en Temps Réel

- **Statut** : pending → running → completed/failed
- **Messages** : Voir ce que fait chaque agent
- **Annulation** : Arrêter une exécution en cours
- **Historique** : Consulter les exécutions passées

## 🎯 Exemples d'Utilisation

### Exemple 1 : Correction de Bug Simple

```
Tâche : "Corriger le bug dans la fonction de login"
Agent : Code Agent
Résultat : Bug corrigé en quelques minutes
```

### Exemple 2 : Nouvelle Fonctionnalité Complète

```
Tâche : "Créer un système d'authentification avec tests et documentation"
Agents : Orchestrator → Code Agent → Test Agent → Documentation Agent
Résultat : Fonctionnalité complète, testée et documentée
```

### Exemple 3 : Refactoring

```
Tâche : "Refactoriser le module de paiement"
Agents : Code Agent → Test Agent
Résultat : Code optimisé avec tests mis à jour
```

## 🔧 État Actuel du Système

### ✅ Fonctionnalités Implémentées

#### Backend (100% Complet)

- ✅ 4 tables de base de données
- ✅ 30 migrations appliquées
- ✅ 6 agents prédéfinis
- ✅ Système d'orchestration
- ✅ Exécution parallèle et séquentielle
- ✅ Sélection LLM avec fallback
- ✅ Gestion des messages et communications
- ✅ Annulation d'exécution
- ✅ Historique complet

#### Frontend (100% Complet)

- ✅ 13 hooks React Query
- ✅ Composant `AgentSelector`
- ✅ Composant `AgentExecutionPanel`
- ✅ Composant `AgentSelectionReasoning`
- ✅ Mises à jour en temps réel
- ✅ Gestion des erreurs

### ⚠️ Intégration UI (À Faire)

Les composants sont créés mais **pas encore intégrés** dans l'interface principale.

**Prochaines étapes** :

1. Choisir l'emplacement (chat, onglet dédié, modal)
2. Modifier les fichiers de routes/pages
3. Ajouter les imports et composants
4. Tester l'intégration

**Voir** : [Guide d'Intégration UI](./INTEGRATION_UI_AGENTS.md)

## 🛠️ Pour les Développeurs

### Structure du Code

```
src/
├── db/
│   └── schema.ts                    # Tables multi-agent
├── ipc/
│   ├── types/multi_agent.ts         # Types TypeScript
│   └── handlers/multi_agent_handlers.ts  # Handlers IPC
├── pro/main/ipc/handlers/multi_agent/
│   ├── orchestrator.ts              # Orchestration
│   ├── agent_executor.ts            # Exécution
│   ├── builtin_agents.ts            # Agents prédéfinis
│   └── llm_agent_selector.ts        # Sélection LLM
├── renderer/hooks/
│   └── useMultiAgent.ts             # Hooks React Query
└── components/
    ├── AgentSelector.tsx            # Sélecteur d'agent
    ├── AgentExecutionPanel.tsx      # Panneau d'exécution
    └── AgentSelectionReasoning.tsx  # Affichage du raisonnement
```

### API IPC Disponible

```typescript
// Gestion des profils
"multi-agent:list-profiles";
"multi-agent:get-profile";
"multi-agent:create-profile";
"multi-agent:update-profile";
"multi-agent:delete-profile";

// Exécution
"multi-agent:execute-agent";
"multi-agent:orchestrate";
"multi-agent:cancel-execution";

// Historique
"multi-agent:list-executions";
"multi-agent:get-execution";
"multi-agent:list-messages";
```

### Hooks React Query

```typescript
// Profils
useAgentProfiles();
useAgentProfile(agentId);
useCreateAgentProfile();
useUpdateAgentProfile();
useDeleteAgentProfile();

// Exécution
useExecuteAgent();
useOrchestrate();
useCancelAgentExecution();

// Historique
useAgentExecutions(chatId);
useAgentExecution(executionId);
useAgentMessages(executionId);
```

## 🐛 Dépannage

### Problème : "terminated_stream_retries_exhausted"

**Cause** : Échec de connexion au LLM après plusieurs tentatives

**Solutions** :

1. **Vérifier la clé API** : Paramètres → Model → API Key
2. **Vérifier le quota** : Consultez votre compte sur le site du provider
3. **Essayer un autre modèle** : Changez de modèle dans les paramètres
4. **Vérifier la connexion** : Testez d'abord dans le chat normal

**Voir** : [Guide de Configuration du Modèle](./CONFIGURATION_MODELE_AGENTS.md) pour plus de détails

### Problème : Tables manquantes

```bash
# Solution : Réinitialiser la base de données
npm run db:reset
npm run dev
```

### Problème : Agents ne s'affichent pas

**Cause** : Composants UI pas encore intégrés dans l'interface

**Solution** : Suivre le [Guide d'Intégration UI](./INTEGRATION_UI_AGENTS.md)

### Problème : Erreur lors de l'exécution

**Vérifier** :

- Les logs dans le panneau d'exécution
- Les permissions des outils
- La configuration du modèle LLM (voir [Configuration du Modèle](./CONFIGURATION_MODELE_AGENTS.md))

## 📈 Roadmap Future

### Phase 4 : Métriques et Observabilité (Suggéré)

- Dashboard de performance
- Statistiques d'utilisation
- Analyse des coûts
- Métriques de succès

### Améliorations Possibles

- Agents personnalisés via UI
- Templates de tâches
- Workflows prédéfinis
- Intégration avec CI/CD

## 💡 Conseils et Bonnes Pratiques

1. **Commencez Simple** : Utilisez un seul agent pour des tâches simples
2. **Soyez Spécifique** : Décrivez clairement votre tâche
3. **Utilisez l'Orchestrator** : Pour les tâches complexes
4. **Surveillez l'Exécution** : Gardez un œil sur le panneau
5. **Annulez si Nécessaire** : N'hésitez pas à recommencer

## 🎓 Ressources d'Apprentissage

### Tutoriels

1. **Débutant** : [Guide d'Utilisation](./GUIDE_UTILISATION_AGENTS.md)
2. **Intermédiaire** : [Guide d'Intégration UI](./INTEGRATION_UI_AGENTS.md)
3. **Avancé** : [Documentation Technique](./MULTI_AGENT_SYSTEM.md)

### Exemples de Code

- Voir les fichiers de composants dans `src/components/`
- Consulter les hooks dans `src/renderer/hooks/useMultiAgent.ts`
- Examiner les handlers dans `src/ipc/handlers/multi_agent_handlers.ts`

## 🤝 Contribution

Pour contribuer au système multi-agent :

1. Lisez la documentation technique
2. Créez un agent personnalisé
3. Partagez vos workflows
4. Proposez des améliorations

## 📞 Support

- **Documentation** : Consultez les guides ci-dessus
- **Issues** : Créez une issue sur GitHub
- **Discussions** : Rejoignez les discussions de la communauté

---

**Prêt à commencer ?** Suivez le [Guide d'Utilisation](./GUIDE_UTILISATION_AGENTS.md) pour vos premiers pas avec le système multi-agent !
