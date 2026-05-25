# Audit CTO Complet — NeuroCode (25 mai 2026)

## 1) Executive Summary

NeuroCode possède déjà une **base produit très avancée** pour un IDE IA desktop : architecture Electron mature, contrat IPC typé, coverage de tests conséquent (unitaires + e2e), stack moderne (React 19, TanStack Router/Query, Jotai, Monaco, AI SDK, MCP), et beaucoup de primitives déjà en place pour l’autonomie agentique.

**Verdict CTO**: projet techniquement ambitieux et crédible pour viser une trajectoire “Cursor/Windsurf-like”, mais avec un niveau de complexité qui exige une consolidation architecture + sécurité + fiabilité opérationnelle avant d’accélérer fortement la surface produit.

### Scoring global (0-10)
- Qualité code: **7.4/10**
- Maintenabilité: **7.1/10**
- Scalabilité produit: **7.0/10**
- Sécurité app/IA: **6.6/10**
- Performance perçue: **7.2/10**
- DX interne: **8.0/10**
- Potentiel commercial: **8.4/10**

---

## 2) Audit technique complet

### 2.1 Architecture globale

**Points forts observés**
- Bonne séparation Electron Main/Renderer + preload bridge avec whitelist des channels IPC.  
- Contrats IPC centralisés/typage fort via `src/ipc/types/*` + dérivation des channels autorisés.  
- Main process organisé par domaines via un registre de handlers massif mais clair (`registerIpcHandlers`).
- Stack data côté renderer cohérente: TanStack Query (fetch/mutations/cache) + Jotai (UI/session state).
- Outillage AI large: providers multiples + MCP + outils locaux + mode stream.

**Faiblesses structurelles**
- `chat_stream_handlers.ts` apparaît comme un **god-module** (fort couplage, responsabilités multiples: orchestration LLM, parsing tags, RAG/context, télémetrie, persistence, tools, quota). Risque élevé de régressions.
- Registre IPC main très volumineux: risque de “plateau de complexité” sans architecture plugin/domain boundary stricte.
- Multiplicité de features “pro”/expérimentales dans le même runtime -> dette de compréhension et complexité cognitive.

### 2.2 Stack technique

**Très bon choix de stack** pour un IDE IA desktop local-first:
- Electron 40 + Forge + Vite.
- React 19 + TanStack Router/Query + Jotai.
- AI SDK multi-provider + MCP.
- better-sqlite3 + Drizzle ORM.
- Playwright + Vitest.

**Risques/angles morts**
- Coût de maintenance de la compatibilité multi-provider + modes agentiques.
- Absence (dans cet audit statique) de preuve d’un scheduler/queue unifié pour outils agents lourds.
- Dépendance forte aux flux streaming texte et parsing de balises custom (`<dyad-*>`) pouvant dériver en complexité.

### 2.3 Qualité de code

**Code smells prioritaires**
1. **God functions/modules** dans stream/chat orchestration.  
2. Couplage transversal UI/chat/settings/telemetry.  
3. Fort volume de logique métier dans handlers IPC plutôt que services domain-driven.
4. Surface d’API IPC très large (attack surface + maintenance cost).

**Recommandations de refactor**
- Extraire `chat_stream_handlers` en pipeline:
  - `PromptAssemblyService`
  - `ModelOrchestrator`
  - `ToolExecutionBroker`
  - `ResponseTagParser`
  - `PersistenceSink`
  - `TelemetrySink`
- Introduire une architecture “ports/adapters” pour outils agents.
- Ajouter des budgets de complexité (max LOC/function + règles lint architecture).

---

## 3) Audit UX/UI

### Observations
- Beaucoup de composants UX déjà présents (chat, preview, plan, sécurité, problèmes, settings détaillés).
- Risque de surcharge cognitive: très grand nombre de toggles/settings/modes.
- Navigation solide mais peut devenir dense pour un nouvel utilisateur.

### Frictions principales
- Onboarding potentiellement trop technique (providers, clés, modes, context options).
- Workflow multi-panneaux puissant mais probablement difficile à “lire” sans guidance progressive.
- Visibilité du “state machine” agent (ce qu’il fait, pourquoi, next step) à renforcer.

### Refonte recommandée
- **Navigation à 3 niveaux**: “Build”, “Inspect”, “Automate”.
- **Timeline agent** persistante (actions, fichiers touchés, coûts tokens, checkpoints).
- **Snapshots + replay diff** natifs (avant/après par action IA).
- **Mode débutant/expert** pour réduire la charge cognitive.

---

## 4) Audit sécurité

### Electron
- Positif: preload bridge + whitelist de channels.
- À durcir: audit systématique de validation input côté main sur chaque endpoint sensible.
- Vérifier politique CSP stricte renderer + politique protocoles custom.

### IA / agents
- Risques majeurs: prompt injection, command injection, exfiltration secrets via outils fichiers/shell/web.
- Recommandé:
  - Policy engine permissions par tool + scope + session.
  - Allowlist commandes shell + dry-run + diff preview obligatoire.
  - Classification automatique des actions “read-only / state-changing / destructive”.

### Secrets & data
- Chiffrer secrets locaux via keychain OS.
- Redaction systématique logs/telemetry.
- Segmentation workspace et droits filesystem minimaux.

---

## 5) Audit performance

### Points sensibles attendus
- Startup Electron + hydratation store + init providers.
- Streaming chat long contexte + parsing tags custom.
- Indexation codebase et watchers fichiers.
- Multipanel rendering + Monaco + preview live simultanés.

### Optimisations prioritaires
- Lazy-load agressif routes/features lourdes.
- Worker pool dédié pour indexation/analysis/context scoring.
- Cache multi-niveaux (prompt fragments, embeddings, file summaries).
- Profiling systématique (TTI, memory snapshot, CPU spike events).

---

## 6) Liste des problèmes critiques

1. **Orchestration chat/agent trop centralisée** (risque maintenabilité/régressions).  
2. **Surface IPC très large** (risque sécurité + dette évolution).  
3. **Complexité UX réglages/modes** pouvant réduire activation/rétention.  
4. **Absence visible d’un système explicite de gouvernance d’actions agent** (policy/risk tiers).  
5. **Couplage fort des features expérimentales dans runtime principal**.

---

## 7) Quick wins (30-60 jours)

- Mettre en place **Risk Engine** (Low/Medium/High/Critical) pour toute action agent.
- Ajouter **“Plan before execute”** par défaut en mode autonome.
- Introduire **Action receipts**: chaque action = justification + diff + rollback.
- Refactor initial de `chat_stream_handlers` en 3 services minimum.
- Dashboard perf interne (startup time, memory, token cost/chat, tool latency).

---

## 8) Architecture idéale proposée

### Couches
1. **UI Shell** (panels, timeline, chat, code, preview)
2. **Application Services** (chat orchestration, plan engine, task engine)
3. **Domain Core** (tools policy, context intelligence, cost controller)
4. **Infra Adapters** (LLM providers, MCP, shell sandbox, DB, FS)

### Multi-agents cible
- Planner Agent
- Coder Agent
- Reviewer Agent
- Tester Agent
- Security Agent
- Docs Agent

Coordination par **Task Graph Engine** (DAG), avec points de validation humaine configurables.

---

## 9) Roadmap produit détaillée

### V1 (MVP robuste) — 3-4 mois
- Chat IA, édition code, preview live, terminal, génération fichiers, refactor simple.
- Focus: fiabilité, UX claire, latence basse.
- Valeur: adoption initiale développeurs solo.

### V2 (Autonomie contrôlée) — +4 mois
- Planner + exécution multi-étapes contrôlée.
- Debug IA assisté + analysis projet + suggestions architecture.
- Valeur: différenciation claire vs “simple chat coding”.

### V3 (Collaboration & extensibilité) — +6 mois
- Multi-agents collaboratifs, plugin marketplace, cloud sync, collaboration temps réel.
- Valeur: montée en puissance équipe/entreprise.

### V4 (IDE autonome) — +8 à 12 mois
- Auto-debug, auto-tests, auto-refactor, auto-doc.
- Valeur: moat produit + premium enterprise.

---

## 10) Roadmap technique détaillée

- **Backend local/core**: services domain-driven + event bus interne.
- **Frontend**: navigation task-centric + state machine UI explicite.
- **Electron**: security hardening + process isolation stricte.
- **IA**: orchestration DAG + mémoire hiérarchique (short/episodic/project).
- **Infra**: optional cloud control plane (sync, billing, team policies).
- **DevOps**: observabilité produit/agent/perf/security unifiée.
- **DB**: séparation telemetry locale, state app, historique agent.
- **Sandbox**: exécution commandes dans environnement restreint par défaut.
- **Temps réel**: stream multiplexé fiable + backpressure.
- **Plugins**: API stable versionnée + permissions manifest.

---

## 11) Priorisation des tâches (RICE simplifié)

1. Hardening sécurité agent/tools (Impact très haut, effort moyen).  
2. Refactor orchestration chat/agent (Impact très haut, effort haut).  
3. UX simplification + onboarding guidé (Impact haut, effort moyen).  
4. Perf & observabilité runtime (Impact haut, effort moyen).  
5. Marketplace/plugins governance (Impact moyen-haut, effort haut).

---

## 12) Vision stratégique

Positionner NeuroCode comme **“Autonomous Software Workspace”**: pas seulement un IDE, mais une plateforme où l’IA exécute des tâches de dev de bout en bout sous gouvernance humaine configurable.

---

## 13) Stack recommandée (cible)

- Desktop: Electron + React + TanStack + Monaco.
- Agent runtime: orchestrateur DAG + tools policy engine + MCP-first.
- Data locale: SQLite/Drizzle + vector index local (Qdrant local ou LanceDB embarqué).
- Cloud optionnel: sync état/tâches/policies + collaboration.

---

## 14) Recommandations CTO

- Transformer la proposition de valeur de “chat coding app” vers “execution platform”.
- Mettre la **sécurité agentique** au centre de la marque produit.
- Investir tôt dans l’**explainability** (timeline, receipts, rollback) pour la confiance utilisateur.
- Discipliner la complexité via architecture modulaire stricte et budgets de dette.

---

## 15) Plan d’évolution 24 mois

### 0-6 mois
- Stabilisation architecture, hardening sécurité, UX onboarding, métriques fiables.

### 6-12 mois
- Agent planner/coder/reviewer/tester, workspace snapshots, plugin SDK v1.

### 12-18 mois
- Collaboration temps réel, cloud sync, gouvernance équipe/entreprise.

### 18-24 mois
- Autonomie avancée (auto-maintenance, self-healing pipelines), enterprise controls complets.

---

## Benchmark concurrence (synthèse)

- **Cursor/Windsurf**: avance UX intégrée éditeur + rapidité iteration.
- **Replit/Bolt/Lovable**: vitesse prototypage cloud-native.
- **Claude Code/Devin**: autonomie et workflow agentique en progression.

**Opportunité NeuroCode**: différenciation par autonomie visuelle + contrôle fin local + gouvernance sécurité explicable.

---

## Modèle de monétisation SaaS recommandé

- **Free**: quotas limités, 1 workspace actif, providers externes user-supplied.
- **Pro (29-49€/mois)**: autonomie avancée, historique long, snapshots, optimisations context.
- **Team (79-149€/user/mois)**: policies équipe, audit trail, shared agents.
- **Enterprise**: SSO, VPC/on-prem options, policy packs sécurité, SLA.
- Add-ons: crédits IA, marketplace plugins premium, compute cloud tasks.
