# Feuille de route NeuroCode

Ce document décrit la feuille de route du développement de NeuroCode, incluant les fonctionnalités terminées, les travaux en cours et les projets futurs.

---

## Version actuelle : 0.45.0-beta.1

---

## ✅ Fonctionnalités terminées

### Plateforme de base (v0.1 - v0.30)

- [x] **Fondation de l'application Electron**
  - Application de bureau avec frontend React
  - Couche de communication IPC sécurisée
  - Base de données SQLite avec Drizzle ORM
  - Gestion des paramètres avec stockage chiffré

- [x] **Intégration multi-fournisseurs d'IA**
  - OpenAI (GPT-4, GPT-3.5, o1, o3)
  - Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
  - Google (Gemini Pro, Gemini Ultra)
  - Google Vertex AI
  - Azure OpenAI
  - Amazon Bedrock
  - XAI (Grok)
  - OpenRouter
  - Ollama (modèles locaux)
  - LM Studio (modèles locaux)
  - MiniMax

- [x] **Gestion des applications**
  - Création, importation et gestion d'applications web
  - Support des dossiers d'applications personnalisés
  - Favoris et recherche d'applications
  - Versionnage des applications avec suivi des commits Git

- [x] **Interface de discussion (Chat)**
  - Chat en temps réel avec l'IA
  - Historique des discussions et recherche
  - Flux de travail d'approbation/rejet des messages
  - Résumés de discussion

- [x] **Édition de code et aperçu**
  - Intégration de l'éditeur Monaco
  - Panneau d'aperçu en direct avec iframe
  - Panneaux de mise en page redimensionnables
  - Changement de mode d'appareil (ordinateur, tablette, mobile)

### Fonctionnalités avancées (v0.31 - v0.40)

- [x] **Intégration Git**
  - Support Git natif (compatible Windows)
  - Intégration des dépôts GitHub
  - Gestion des branches
  - Suivi des commits
  - Détection des conflits de fusion

- [x] **Intégrations de bases de données**
  - Intégration Supabase (PostgreSQL + Auth)
  - Intégration Neon (PostgreSQL Serverless)
  - Gestion des schémas
  - Bases de données de développement basées sur les branches

- [x] **Déploiement**
  - Intégration Vercel
  - Déploiement en un clic
  - Gestion des variables d'environnement
  - Suivi des URL de déploiement

- [x] **Mode Build (Construction)**
  - Génération de code interactive
  - Exécution autonome des outils
  - Modifications de code en temps réel
  - Directives de sécurité

- [x] **Mode Ask (Question)**
  - Questions-réponses sur la base de code
  - Exploration en lecture seule
  - Aucune modification autonome

### Fonctionnalités récentes (v0.41 - v0.44)

- [x] **Mode Plan** (v0.42)
  - Interface de planification assistée par l'IA
  - Collecte des besoins via des questionnaires
  - Plans d'implémentation détaillés
  - Flux de travail d'affinage du plan
  - Passage au mode Build pour l'exécution

- [x] **Mode Agent Local** (v0.43)
  - Agent autonome avec exécution d'outils
  - Appels d'outils en parallèle
  - Gestion des tâches multi-étapes
  - Boucle externe pour les tâches incomplètes
  - Support des modèles de raisonnement (o1/o3)

- [x] **Compactage du contexte** (v0.43)
  - Résumé automatique des discussions
  - Gestion des jetons pour les longues conversations
  - Création de sauvegarde avant compactage
  - Déclencheurs de compactage configurables

- [x] **Turbo Edits v2** (v0.44)
  - Édition intelligente de fichiers avec DSL recherche-remplacement
  - Modifications de code efficaces
  - Utilisation réduite de jetons

- [x] **Gestion des médias** (v0.44)
  - Bibliothèque de médias pour les ressources d'application
  - Protocole personnalisé dyad-media://
  - Nettoyage et optimisation des fichiers médias
  - Service de médias persistant

- [x] **Génération d'images** (v0.44)
  - Capacités de génération d'images par l'IA
  - Intégration avec les API de génération d'images
  - Intégration à la bibliothèque de médias

- [x] **Système de thèmes** (v0.44)
  - Thèmes générés par l'IA
  - Création de thèmes personnalisés
  - Aperçu et gestion des thèmes
  - Sélection de thèmes par application

- [x] **Intégration MCP** (v0.44)
  - Support du protocole Model Context Protocol
  - Intégration de serveurs d'outils externes
  - Gestion du consentement des outils
  - Configuration de l'auto-approbation

- [x] **Fonctionnalités de sécurité** (v0.44)
  - Revue de sécurité assistée par l'IA
  - Détection de problèmes et correction automatique
  - Blocage des paquets non sécurisés
  - Directives de sécurité dans les instructions (prompts)

- [x] **Système de Skills** (v0.45)
  - Création et gestion de skills réutilisables
  - Format SKILL.md avec frontmatter YAML
  - Invocation via commandes slash
  - Chargement automatique basé sur le contexte
  - Skills groupés avec namespaces
  - Partage au niveau utilisateur et workspace
  - Bibliothèque de skills d'exemple
  - Validation automatique des skills

- [x] **Optimisation de prompt** (v0.45)
  - Amélioration automatique des prompts par l'IA
  - Bouton d'optimisation dans le champ de saisie (icône ✨)
  - Rend les prompts plus spécifiques et actionnables
  - Ajoute du contexte et des détails pertinents
  - Décompose les demandes complexes
  - Utilise le modèle sélectionné par l'utilisateur
  - Gestion des erreurs avec notifications

---

## 🚧 En cours (v0.46 - v0.50)

### Performance et Optimisation

- [x] **Améliorations du mode Smart Context**
  - Algorithmes de sélection de fichiers améliorés
  - Meilleur scoring de pertinence du contexte
  - Utilisation réduite de jetons sans perte de qualité
  - Stratégies de contexte configurables (équilibrée, conservatrice, profonde)

- [ ] **Optimisation des jetons**
  - Élagage du contexte plus agressif
  - Gestion plus intelligente de l'historique des messages
  - Allocation dynamique de jetons par fournisseur
  - Suivi des coûts et budgétisation

- [ ] **Suivi des performances**
  - Suivi amélioré de l'utilisation de la mémoire
  - Optimisation de l'utilisation du processeur (CPU)
  - Amélioration du temps de démarrage
  - Optimisation du rendu de l'aperçu

### Expérience utilisateur

- [x] **Optimisation de prompt** (v0.45)
  - Amélioration automatique des prompts par l'IA
  - Interface utilisateur intuitive
  - Gestion des erreurs robuste
  - Support multi-fournisseurs

- [ ] **Flux d'intégration (Onboarding)**
  - Tutoriel pour les nouveaux utilisateurs
  - Découverte interactive des fonctionnalités
  - Projets d'exemple et modèles
  - Guides de démarrage rapide

- [ ] **Gestion des erreurs améliorée**
  - Meilleurs messages d'erreur
  - Suggestions de récupération
  - Améliorations du rapport d'erreurs
  - Outils de diagnostic

- [ ] **Affinages UI/UX**
  - Personnalisation des raccourcis clavier
  - Améliorations de la palette de commandes
  - Meilleur aperçu sur appareils mobiles
  - Améliorations de l'accessibilité

### Expérience développeur

- [ ] **Débogage amélioré**
  - Meilleures traces d'appels d'erreurs (stack traces)
  - Mode débogage pour les réponses de l'IA
  - Journalisation de l'exécution des outils
  - Profilage des performances

- [ ] **Améliorations des tests**
  - Plus de couverture de tests E2E
  - Tests de régression visuelle
  - Benchmarks de performance
  - Détection des tests instables (flaky)

---

## 🔮 Fonctionnalités prévues (v0.51+)

### T2 2026 : Collaboration et Partage

- [ ] **Collaboration en équipe**
  - Support multi-utilisateurs
  - Collaboration en temps réel sur les applications
  - Historique de chat partagé
  - Paramètres d'équipe et permissions

- [ ] **Partage d'applications**
  - Exportation/importation de configurations d'applications
  - Partage d'applications avec d'autres utilisateurs
  - Marché/Galerie d'applications
  - Partage de modèles (templates)

- [ ] **Synchronisation Cloud (Optionnel)**
  - Synchronisation des paramètres sur tous les appareils
  - Sauvegarde cloud des applications et chats
  - Historique de chat multi-appareils
  - Chiffrement de bout en bout

### T3 2026 : Fonctionnalités IA avancées

- [ ] **Flux de travail multi-agents**
  - Agents spécialisés pour différentes tâches
  - Orchestration des agents
  - Communication d'agent à agent
  - Création d'agents personnalisés

- [ ] **Mode d'édition visuelle**
  - Édition de composants par glisser-déposer
  - Éditeur de style visuel
  - Constructeur de mise en page (layout builder)
  - Navigateur de bibliothèque de composants

- [ ] **Agent de revue de code**
  - Revue de code automatisée
  - Suggestions de bonnes pratiques
  - Conseils d'optimisation de performance
  - Détection de vulnérabilités de sécurité

- [ ] **Agent de test**
  - Génération de tests automatisés
  - Analyse de la couverture de tests
  - Création de tests E2E
  - Maintenance des tests

### T4 2026 : Fonctionnalités Entreprise

- [ ] **Modèles d'IA auto-hébergés**
  - Support de plus de modèles locaux
  - Interface d'ajustement fin des modèles (fine-tuning)
  - Entraînement de modèles personnalisés
  - Comparaison des performances des modèles

- [ ] **Sécurité avancée**
  - Contrôle d'accès basé sur les rôles (RBAC)
  - Journalisation d'audit (audit logging)
  - Rapports de conformité
  - Politiques de rétention des données

- [ ] **Intégrations entreprise**
  - Intégration JIRA
  - Notifications Slack/Teams
  - Intégration de pipeline CI/CD
  - Support de webhooks personnalisés

- [ ] **Analyses et informations (Insights)**
  - Tableau de bord analytique d'utilisation
  - Métriques de performance de l'IA
  - Suivi et optimisation des coûts
  - Aperçu de la productivité de l'équipe

### 2027 : Expansion de la plateforme

- [ ] **Application mobile**
  - Applications iOS et Android
  - Interface optimisée pour mobile
  - Synchronisation avec l'application de bureau
  - Notifications push

- [ ] **Version Web**
  - Version basée sur le navigateur
  - Progressive Web App (PWA)
  - Option d'hébergement cloud
  - Support hors ligne

- [ ] **Système de plugins**
  - Support des plugins tiers
  - Marché de plugins
  - Création d'outils personnalisés
  - API d'extension

- [ ] **Support des langages**
  - Plus de langages de programmation
  - Modèles spécifiques à certains frameworks
  - Instructions IA spécifiques au langage
  - Documentation multilingue

---

## 🎯 Vision à long terme

### Productivité des développeurs

- **Programmation en binôme avec l'IA :** Assistance IA en temps réel pendant le codage
- **Complétion de code intelligente :** Suggestions contextuelles
- **Refactorisation automatisée :** Améliorations de code assistées par l'IA
- **Génération de documentation :** Documentation automatique à partir du code

### Écosystème de la plateforme

- **Marketplace :** Modèles, thèmes, plugins et agents
- **Communauté :** Forums, tutoriels et partage de connaissances
- **Éducation :** Ressources d'apprentissage et cours
- **Certification :** Programme de certification pour les développeurs

### Capacités de l'IA

- **IA multimodale :** Support de la vision, de l'audio et de la vidéo
- **Entraînement de modèles personnalisés :** Ajustez les modèles sur votre base de code
- **Apprentissage fédéré :** Apprendre de la communauté sans partager le code
- **IA explicable :** Comprendre la prise de décision de l'IA

### Écosystème d'intégration

- **Plus de fournisseurs cloud :** AWS, GCP, DigitalOcean, etc.
- **Plus de bases de données :** MongoDB, PostgreSQL, MySQL, Redis, etc.
- **Plus de frameworks :** Next.js, Nuxt, SvelteKit, Astro, etc.
- **Plus d'outils :** Docker, Kubernetes, Terraform, etc.

---

## 📊 Priorisation des fonctionnalités

Les fonctionnalités sont priorisées en fonction de :

1. **Impact utilisateur :** Combien d'utilisateurs en bénéficieront ?
2. **Effort de développement :** Quelle est la complexité de l'implémentation ?
3. **Valeur stratégique :** Est-ce aligné avec la vision à long terme ?
4. **Retour de la communauté :** Que demandent les utilisateurs ?
5. **Dette technique :** Est-ce que cela améliore la qualité du code ?

---

## 🤝 Implication de la communauté

Nous accueillons les contributions de la communauté ! Voici comment vous pouvez aider :

### Demandes de fonctionnalités

- Ouvrez un ticket (issue) avec le label `feature-request`
- Décrivez le cas d'utilisation et le comportement attendu
- Fournissez des exemples ou des maquettes si possible
- Votez pour les demandes de fonctionnalités existantes

### Rapports de bugs

- Ouvrez un ticket avec le label `bug`
- Incluez les étapes pour reproduire
- Fournissez des informations sur votre système
- Joignez des journaux (logs) ou des captures d'écran

### Pull Requests

- Consultez la feuille de route pour les fonctionnalités prévues
- Discutez d'abord des changements majeurs dans un ticket
- Suivez les directives de contribution
- Écrivez des tests pour les nouvelles fonctionnalités

### Documentation

- Améliorez la documentation existante
- Écrivez des tutoriels et des guides
- Traduisez la documentation
- Créez des tutoriels vidéo

---

## 📅 Calendrier de sortie

### Sorties Bêta

- **Fréquence :** Toutes les 2-3 semaines
- **Focus :** Nouvelles fonctionnalités et améliorations
- **Stabilité :** Peut contenir des bugs, à utiliser avec précaution
- **Canal :** `beta` dans les paramètres

### Sorties Stables

- **Fréquence :** Toutes les 4-6 semaines
- **Focus :** Corrections de bugs et stabilité
- **Stabilité :** Prêt pour la production
- **Canal :** `stable` dans les paramètres (par défaut)

### Sorties de correctifs (Hotfix)

- **Fréquence :** Selon les besoins
- **Focus :** Corrections de bugs critiques
- **Stabilité :** Modifications minimales, haute priorité
- **Canal :** À la fois `beta` et `stable`

---

## 🔄 Historique des versions

### v0.45.0-beta.1 (Actuelle)

- Système de Skills complet
- Création et gestion de skills réutilisables
- Invocation par commandes slash
- Chargement automatique intelligent
- Bibliothèque de skills d'exemple
- **Optimisation de prompt avec IA**
- Amélioration automatique des prompts pour de meilleurs résultats
- Interface intuitive avec bouton sparkles (✨)
- Support de tous les fournisseurs d'IA

### v0.44.0-beta.1

- Système de gestion des médias
- Capacités de génération d'images
- Améliorations du système de thèmes
- Améliorations de l'intégration MCP

### v0.43.0

- Mode Agent Local
- Compactage du contexte
- Turbo Edits v2
- Améliorations de performance

### v0.42.0

- Mode Plan
- Collecte des besoins
- Planification d'implémentation
- Flux de travail d'affinage du plan

### v0.41.0

- Fonctionnalités de revue de sécurité
- Détection de problèmes
- Capacités de correction automatique
- Gestion des erreurs améliorée

### v0.40.0

- Intégration Vercel
- Gestion du déploiement
- Variables d'environnement
- Builds de production

---

## 📝 Notes

- Cette feuille de route est susceptible de changer en fonction des retours des utilisateurs et des contraintes techniques
- Les dates sont des estimations et peuvent varier en fonction de l'avancement du développement
- Les contributions de la communauté peuvent accélérer le développement des fonctionnalités

---

## 🙏 Retours

Nous apprécions vos retours ! N'hésitez pas à partager vos réflexions :

- **GitHub Issues :** [Signaler des bugs ou demander des fonctionnalités](https://github.com/dyad-sh/dyad/issues)
- **GitHub Discussions :** [Rejoindre la conversation](https://github.com/dyad-sh/dyad/discussions)
- **Bouton d'aide :** Utilisez le bouton d'aide intégré à l'application pour un retour direct
- **E-mail :** willchen90@gmail.com

---

<div align="center">

**Dernière mise à jour :** Avril 2026

[⬆ Retour en haut](#feuille-de-route-neurocode)

</div>
