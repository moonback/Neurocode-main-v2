# Guide d'Utilisation du Système Multi-Agent

## 📋 Vue d'ensemble

Le système multi-agent vous permet de déléguer des tâches à des agents spécialisés qui travaillent de manière autonome. Chaque agent a des compétences spécifiques et peut exécuter des outils pour accomplir sa mission.

## 🤖 Agents Disponibles

### 1. **Orchestrator** 🎯

- **Rôle** : Coordonne les autres agents et décompose les tâches complexes
- **Utilisation** : Tâches nécessitant plusieurs agents ou coordination
- **Outils** : Tous les outils disponibles

### 2. **Code Agent** 💻

- **Rôle** : Écriture, modification et refactoring de code
- **Utilisation** : Développement, corrections de bugs, optimisation
- **Outils** : Lecture/écriture de fichiers, recherche, exécution de commandes

### 3. **Test Agent** 🧪

- **Rôle** : Création et exécution de tests
- **Utilisation** : Tests unitaires, tests d'intégration, débogage
- **Outils** : Lecture de fichiers, exécution de tests, diagnostics

### 4. **Documentation Agent** 📚

- **Rôle** : Rédaction et mise à jour de documentation
- **Utilisation** : README, guides, commentaires de code
- **Outils** : Lecture/écriture de fichiers, recherche

### 5. **Research Agent** 🔍

- **Rôle** : Recherche d'informations et analyse de code
- **Utilisation** : Exploration de codebase, recherche de patterns
- **Outils** : Lecture de fichiers, recherche, navigation

### 6. **Database Agent** 🗄️

- **Rôle** : Gestion de schémas et migrations de base de données
- **Utilisation** : Modifications de schéma, migrations, requêtes
- **Outils** : Lecture/écriture de fichiers, exécution de commandes DB

## 🚀 Comment Utiliser les Agents

### Méthode 1 : Via l'Interface Utilisateur

#### Étape 1 : Ouvrir le Sélecteur d'Agent

1. Dans l'interface principale de NeuroCode
2. Cherchez le composant **AgentSelector** (normalement dans la barre latérale ou le panneau de chat)
3. Cliquez sur le menu déroulant pour voir les agents disponibles

#### Étape 2 : Sélectionner un Agent

- **Sélection Manuelle** : Choisissez un agent spécifique dans la liste
- **Sélection Automatique** : Cochez "Auto-select agent" pour laisser le système choisir

#### Étape 3 : Soumettre une Tâche

1. Décrivez votre tâche dans le champ de texte
2. Cliquez sur "Envoyer" ou appuyez sur Entrée
3. L'agent sélectionné commencera à travailler

#### Étape 4 : Suivre l'Exécution

- Le **AgentExecutionPanel** affiche :
  - ✅ Statut en temps réel (pending, running, completed, failed)
  - 📊 Progression de chaque agent
  - 💬 Messages et résultats
  - ❌ Bouton d'annulation si nécessaire

### Méthode 2 : Via l'API IPC (Pour les Développeurs)

```typescript
// Exemple : Exécuter un agent unique
const result = await window.electron.ipcRenderer.invoke(
  "multi-agent:execute-agent",
  {
    agentId: "code-agent",
    task: "Ajouter une fonction de validation dans src/utils.ts",
    context: {
      files: ["src/utils.ts"],
      additionalInfo: "La fonction doit valider les emails",
    },
  },
);

// Exemple : Orchestration automatique
const orchestrationResult = await window.electron.ipcRenderer.invoke(
  "multi-agent:orchestrate",
  {
    task: "Créer une nouvelle fonctionnalité de login avec tests",
    executionMode: "parallel", // ou 'sequential'
    useLLMSelection: true, // Utilise l'IA pour sélectionner les agents
  },
);
```

## 📊 Modes d'Exécution

### Mode Parallèle (Parallel)

- **Quand l'utiliser** : Tâches indépendantes qui peuvent être faites simultanément
- **Exemple** : "Écrire des tests ET mettre à jour la documentation"
- **Avantage** : Plus rapide

### Mode Séquentiel (Sequential)

- **Quand l'utiliser** : Tâches dépendantes qui doivent être faites dans l'ordre
- **Exemple** : "Écrire le code PUIS créer les tests PUIS documenter"
- **Avantage** : Plus de contrôle

## 🎯 Exemples d'Utilisation

### Exemple 1 : Correction de Bug

```
Tâche : "Corriger le bug dans la fonction de login"
Agent recommandé : Code Agent
Mode : Single
```

### Exemple 2 : Nouvelle Fonctionnalité Complète

```
Tâche : "Créer un système d'authentification avec tests et documentation"
Agent recommandé : Orchestrator (sélection auto)
Mode : Sequential
Agents utilisés : Code Agent → Test Agent → Documentation Agent
```

### Exemple 3 : Refactoring

```
Tâche : "Refactoriser le module de paiement et mettre à jour les tests"
Agent recommandé : Orchestrator
Mode : Sequential
Agents utilisés : Code Agent → Test Agent
```

### Exemple 4 : Documentation

```
Tâche : "Créer un guide d'utilisation pour l'API REST"
Agent recommandé : Documentation Agent
Mode : Single
```

## 🔧 Sélection Intelligente par LLM

Le système peut utiliser l'IA pour analyser votre tâche et sélectionner automatiquement les meilleurs agents :

### Avantages

- ✅ Analyse sémantique de la tâche
- ✅ Sélection optimale des agents
- ✅ Raisonnement explicable
- ✅ Score de confiance

### Comment l'activer

1. Cochez "Use LLM Selection" dans l'interface
2. OU définissez `useLLMSelection: true` dans l'API

### Fallback

Si la sélection LLM échoue, le système utilise automatiquement la sélection par mots-clés.

## 📈 Suivi et Historique

### Panneau d'Exécution

- **Statut en temps réel** : Voir la progression de chaque agent
- **Messages** : Lire les messages et résultats
- **Annulation** : Arrêter une exécution en cours
- **Historique** : Consulter les exécutions passées

### Base de Données

Toutes les exécutions sont sauvegardées dans la base de données :

- `agent_executions` : Informations sur chaque exécution
- `agent_messages` : Messages échangés
- `agent_communications` : Communications entre agents

## 🛠️ Intégration dans Votre Workflow

### 1. Développement Quotidien

```
"Ajouter une nouvelle route API pour les utilisateurs"
→ Code Agent crée la route
→ Test Agent crée les tests
→ Documentation Agent met à jour l'API doc
```

### 2. Maintenance

```
"Analyser et corriger les problèmes de performance"
→ Research Agent analyse le code
→ Code Agent applique les optimisations
→ Test Agent vérifie les performances
```

### 3. Migration

```
"Migrer la base de données vers PostgreSQL"
→ Database Agent crée les migrations
→ Code Agent adapte le code
→ Test Agent vérifie la compatibilité
```

## ⚙️ Configuration Avancée

### Créer un Agent Personnalisé

```typescript
// Via l'API
await window.electron.ipcRenderer.invoke("multi-agent:create-profile", {
  name: "Security Agent",
  role: "security-specialist",
  description: "Analyse de sécurité et corrections",
  systemPrompt: "Tu es un expert en sécurité...",
  allowedTools: ["readFile", "grepSearch", "getDiagnostics"],
  capabilities: ["security-audit", "vulnerability-scan"],
});
```

### Modifier un Agent Existant

```typescript
await window.electron.ipcRenderer.invoke("multi-agent:update-profile", {
  agentId: "code-agent",
  updates: {
    systemPrompt: "Nouveau prompt personnalisé...",
    allowedTools: ["readFile", "fsWrite", "executePwsh"],
  },
});
```

## 🐛 Dépannage

### Problème : Les agents ne s'affichent pas

**Solution** : Vérifiez que la base de données est initialisée

```bash
npm run db:reset
npm run dev
```

### Problème : L'exécution échoue

**Solution** : Consultez les logs dans le panneau d'exécution et vérifiez :

- Les permissions des outils
- La validité de la tâche
- Les dépendances du projet

### Problème : Sélection LLM ne fonctionne pas

**Solution** :

- Vérifiez que vous avez configuré un modèle par défaut
- Le système utilisera automatiquement la sélection par mots-clés en fallback

## 📚 Ressources Supplémentaires

- **Documentation Technique** : `docs/MULTI_AGENT_SYSTEM.md`
- **Détails d'Implémentation** : `MULTI_AGENT_IMPLEMENTATION_SUMMARY.md`
- **Guide de Démarrage Rapide** : `IMPLEMENTATION_SUCCESS.md`
- **Sélection LLM** : `PHASE_3_LLM_SELECTION_COMPLETE.md`

## 💡 Conseils et Bonnes Pratiques

1. **Soyez Spécifique** : Plus votre tâche est claire, meilleurs seront les résultats
2. **Utilisez le Bon Agent** : Choisissez l'agent adapté à votre tâche
3. **Mode Séquentiel pour les Dépendances** : Si une tâche dépend d'une autre, utilisez le mode séquentiel
4. **Surveillez l'Exécution** : Gardez un œil sur le panneau d'exécution
5. **Annulez si Nécessaire** : N'hésitez pas à annuler et reformuler si l'agent ne comprend pas

## 🎓 Exemples Pratiques

### Scénario Complet : Nouvelle Fonctionnalité

```
Tâche : "Créer un système de notifications push"

Étapes automatiques :
1. Research Agent → Analyse l'architecture existante
2. Code Agent → Crée les composants nécessaires
3. Database Agent → Ajoute les tables de notifications
4. Test Agent → Crée les tests unitaires et d'intégration
5. Documentation Agent → Documente l'API et l'utilisation

Résultat : Fonctionnalité complète, testée et documentée
```

---

**Besoin d'aide ?** Consultez la documentation technique ou créez un agent personnalisé adapté à vos besoins spécifiques !
