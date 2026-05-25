# Suivi de l'Audit CTO - NeuroCode

Ce fichier récapitule l'ensemble des chantiers et tâches identifiés lors de l'audit CTO du 25 mai 2026. Il permet de suivre l'avancement de la consolidation technique et de la roadmap de l'application.

---

## ⚡ Quick Wins (Priorité Haute - 30-60 jours)

- [ ] **Mise en place d'un Risk Engine**
  - [ ] Classifier chaque action d'agent selon 4 niveaux de risque (`Low`, `Medium`, `High`, `Critical`).
- [ ] **Planification systématique ("Plan before execute")**
  - [ ] Activer par défaut le mode "Plan before execute" pour les agents autonomes.
- [ ] **Reçus d'action ("Action receipts")**
  - [ ] Implémenter un système de reçus pour chaque action : justification de l'action + diff visuel + mécanisme de rollback.
- [ ] **Premier niveau de refactoring de l'orchestration**
  - [ ] Découper le module `chat_stream_handlers.ts` en au moins 3 sous-services distincts.
- [ ] **Dashboard de performance interne**
  - [ ] Suivre et afficher les métriques clés : temps de démarrage (startup time), consommation mémoire, coût des tokens par chat, latence des outils (tool latency).

---

## 🔒 Sécurité & Gouvernance des Agents

### Sécurité Electron
- [ ] Réaliser un audit systématique de la validation des entrées sur chaque endpoint IPC côté main process.
- [ ] Valider et durcir la politique de Content Security Policy (CSP) du renderer.
- [ ] Valider la politique d'accès et d'enregistrement des protocoles custom.

### Contrôle des Actions Agents
- [ ] Concevoir un moteur de règles de permissions (Policy Engine) par outil, par portée (scope) et par session.
- [ ] Mettre en place une Allowlist des commandes shell autorisées.
- [ ] Implémenter un mode simulation ("dry-run") pour les commandes shell.
- [ ] Rendre obligatoire la prévisualisation du diff pour toute modification de fichier.
- [ ] Classifier automatiquement les outils en : `read-only`, `state-changing` ou `destructive`.

### Gestion des Données & Secrets
- [ ] Chiffrer les secrets locaux (clés API, credentials) en utilisant le keychain natif de l'OS (via node-keytar ou similaire).
- [ ] Mettre en place une anonymisation/redaction automatique des logs et des métriques de télémétrie.
- [ ] Restreindre les privilèges d'accès au système de fichiers en segmentant le workspace de l'agent.

---

## 🏗️ Architecture & Qualité de Code

### Refactoring de la boucle Agent & Chat
- [ ] Extraire les responsabilités de `chat_stream_handlers.ts` dans des services dédiés :
  - [ ] `PromptAssemblyService` (assemblage des invites et du contexte).
  - [ ] `ModelOrchestrator` (appels LLM, gestion des providers).
  - [ ] `ToolExecutionBroker` (exécution et cycle de vie des outils).
  - [ ] `ResponseTagParser` (parsing des balises custom `<dyad-*>`).
  - [ ] `PersistenceSink` (sauvegarde de l'historique et des sessions).
  - [ ] `TelemetrySink` (télémétrie et suivi des coûts).
- [ ] Introduire une architecture "Ports & Adapters" (Clean Architecture) pour découpler l'exécution des outils de l'orchestrateur.

### Pratiques & Dette Technique
- [ ] Définir et configurer des budgets de complexité de code (par exemple, nombre maximum de lignes par fonction/module).
- [ ] Mettre en place des règles de lint spécifiques pour l'architecture et les frontières de domaines.
- [ ] Consolider le registre IPC du main process en introduisant des modules de domaine plus stricts pour éviter l'effet "god-module".

---

## 🎨 Expérience Utilisateur (UX/UI)

- [ ] **Refonte de la navigation principale**
  - [ ] Restructurer l'IDE autour de 3 modes clés : `Build` (Développement), `Inspect` (Analyse/Code Review), `Automate` (Agents autonomes).
- [ ] **Timeline d'activité de l'agent**
  - [ ] Créer une vue chronologique (timeline) affichant les actions passées/en cours, les fichiers modifiés, le coût des tokens et les points de contrôle.
- [ ] **Visualisation des changements**
  - [ ] Intégrer un outil natif de snapshots et de replay de diffs pour visualiser le projet avant/après chaque action de l'IA.
- [ ] **Réduction de la charge cognitive**
  - [ ] Mettre en place un onboarding progressif et interactif.
  - [ ] Proposer un mode d'affichage simplifié (mode débutant) vs complet (mode expert) pour masquer la complexité des réglages.

---

## ⚡ Performance & Optimisation

- [ ] Charger à la demande (lazy-load) de manière agressive les routes et les fonctionnalités lourdes du renderer.
- [ ] Créer un worker pool dédié aux tâches intensives en arrière-plan (indexation de codebase, analyse statique, calcul de score de contexte).
- [ ] Développer un système de cache multi-niveaux pour :
  - [ ] Les fragments de prompts répétitifs.
  - [ ] Les embeddings générés pour le code.
  - [ ] Les résumés de fichiers fréquemment consultés.
- [ ] Intégrer un profilage systématique avec alertes en cas de pic d'utilisation CPU, de fuite mémoire ou de dégradation du TTI (Time to Interactive).

---

## 🗺️ Suivi de la Roadmap

### V1 — MVP Robuste (3-4 mois)
- [ ] Consolider la fiabilité du chat IA, de l'édition et de la prévisualisation en direct.
- [ ] Assurer une faible latence et une UX claire.

### V2 — Autonomie Contrôlée (+4 mois)
- [ ] Implémenter le Planner avec exécution multi-étapes sécurisée.
- [ ] Développer le module de diagnostic et d'aide au debug IA.

### V3 — Collaboration & Extensibilité (+6 mois)
- [ ] Introduire le multi-agent collaboratif.
- [ ] Concevoir le SDK d'extension/plugin (V1) et la marketplace de plugins.

### V4 — IDE Autonome (+8-12 mois)
- [ ] Implémenter les boucles automatiques d'auto-debug, auto-tests, auto-refactor et auto-documentation.
