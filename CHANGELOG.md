# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [0.45.0-beta.1] - 2026-04-23

### ✨ Ajouté

#### Optimisation de prompt avec IA

- **Bouton d'optimisation de prompt** : Nouveau bouton avec icône ✨ (sparkles) dans le champ de saisie du chat
- **Amélioration automatique** : L'IA analyse et reformule vos prompts pour de meilleurs résultats
- **Support multi-fournisseurs** : Utilise le modèle d'IA sélectionné par l'utilisateur
- **Gestion des erreurs** : Notifications toast en cas d'erreur avec messages clairs
- **Interface intuitive** :
  - État de chargement avec spinner pendant l'optimisation
  - Désactivation automatique pendant le streaming
  - Tooltips informatifs
  - Intégration transparente dans ChatInput et HomeChatInput

**Fonctionnalités d'optimisation :**

- Rend les prompts plus spécifiques et actionnables
- Ajoute du contexte pertinent si manquant
- Décompose les demandes complexes en étapes claires
- Utilise un langage technique précis
- Maintient l'intention originale de l'utilisateur
- Garde les prompts concis mais complets

**Implémentation technique :**

- Nouveau contrat IPC `prompts:optimize`
- Handler backend avec `generateText` de l'AI SDK
- Composant React réutilisable `PromptOptimizerButton`
- Types TypeScript complets avec validation Zod
- Tests de type et linting passés

**Bénéfices utilisateur :**

- Meilleurs résultats IA dès le premier essai
- Outil d'apprentissage pour améliorer ses prompts
- Gain de temps en réduisant les allers-retours
- Accessibilité améliorée pour les utilisateurs non techniques

#### Système de Skills

- Création et gestion de skills réutilisables
- Format SKILL.md avec frontmatter YAML
- Invocation via commandes slash (`/skill-name`)
- Chargement automatique basé sur le contexte
- Skills groupés avec namespaces
- Partage au niveau utilisateur (`~/.neurocode/skills/`) et workspace (`.neurocode/skills/`)
- Bibliothèque de skills d'exemple :
  - `/examples:code-review` - Revue de code approfondie
  - `/examples:debug-error` - Débogage systématique
  - `/examples:write-tests` - Écriture de tests
  - `/examples:refactor-code` - Refactorisation sécurisée
  - `/examples:add-feature` - Ajout de fonctionnalités
  - `/examples:optimize-performance` - Optimisation
- Validation automatique du format et de la syntaxe

### 🔧 Amélioré

- **Context Manager** : Algorithmes de sélection de fichiers améliorés
- **Smart Context** : Meilleur scoring de pertinence
- **Performance** : Utilisation réduite de jetons sans perte de qualité
- **Stratégies** : Configurations de contexte (équilibrée, conservatrice, profonde)

### 📚 Documentation

- Ajout de la section "Optimisation de prompt" dans le README
- Mise à jour de la ROADMAP avec la nouvelle fonctionnalité
- Création de `PROMPT_OPTIMIZER_FEATURE.md` avec documentation détaillée
- Exemples d'utilisation et cas d'usage

---

## [0.44.0-beta.1] - 2026-04-10

### ✨ Ajouté

- **Système de gestion des médias**
  - Bibliothèque de médias pour les ressources d'application
  - Protocole personnalisé `dyad-media://`
  - Nettoyage et optimisation des fichiers médias
  - Service de médias persistant

- **Génération d'images**
  - Capacités de génération d'images par l'IA
  - Intégration avec les API de génération d'images
  - Intégration à la bibliothèque de médias

- **Système de thèmes**
  - Thèmes générés par l'IA
  - Création de thèmes personnalisés
  - Aperçu et gestion des thèmes
  - Sélection de thèmes par application

- **Intégration MCP améliorée**
  - Support du protocole Model Context Protocol
  - Intégration de serveurs d'outils externes
  - Gestion du consentement des outils
  - Configuration de l'auto-approbation

---

## [0.43.0] - 2026-03-25

### ✨ Ajouté

- **Mode Agent Local**
  - Agent autonome avec exécution d'outils
  - Appels d'outils en parallèle
  - Gestion des tâches multi-étapes
  - Boucle externe pour les tâches incomplètes
  - Support des modèles de raisonnement (o1/o3)

- **Compactage du contexte**
  - Résumé automatique des discussions
  - Gestion des jetons pour les longues conversations
  - Création de sauvegarde avant compactage
  - Déclencheurs de compactage configurables

- **Turbo Edits v2**
  - Édition intelligente de fichiers avec DSL recherche-remplacement
  - Modifications de code efficaces
  - Utilisation réduite de jetons

### 🔧 Amélioré

- Performance générale de l'application
- Gestion de la mémoire
- Temps de réponse de l'IA

---

## [0.42.0] - 2026-03-10

### ✨ Ajouté

- **Mode Plan**
  - Interface de planification assistée par l'IA
  - Collecte des besoins via des questionnaires
  - Plans d'implémentation détaillés
  - Flux de travail d'affinage du plan
  - Passage au mode Build pour l'exécution

### 🔧 Amélioré

- Interface utilisateur du chat
- Gestion des erreurs
- Messages de feedback

---

## [0.41.0] - 2026-02-25

### ✨ Ajouté

- **Fonctionnalités de sécurité**
  - Revue de sécurité assistée par l'IA
  - Détection de problèmes et correction automatique
  - Blocage des paquets non sécurisés
  - Directives de sécurité dans les instructions

### 🔧 Amélioré

- Analyse de code
- Détection de vulnérabilités
- Suggestions de sécurité

---

## [0.40.0] - 2026-02-10

### ✨ Ajouté

- **Intégration Vercel**
  - Déploiement en un clic
  - Gestion des variables d'environnement
  - Suivi des URL de déploiement
  - Builds de production

### 🔧 Amélioré

- Flux de déploiement
- Gestion des configurations
- Logs de déploiement

---

## Types de changements

- `✨ Ajouté` : Nouvelles fonctionnalités
- `🔧 Amélioré` : Améliorations de fonctionnalités existantes
- `🐛 Corrigé` : Corrections de bugs
- `🗑️ Déprécié` : Fonctionnalités bientôt supprimées
- `❌ Supprimé` : Fonctionnalités supprimées
- `🔒 Sécurité` : Corrections de vulnérabilités
- `📚 Documentation` : Changements de documentation uniquement
- `⚡ Performance` : Améliorations de performance

---

[0.45.0-beta.1]: https://github.com/dyad-sh/dyad/compare/v0.44.0-beta.1...v0.45.0-beta.1
[0.44.0-beta.1]: https://github.com/dyad-sh/dyad/compare/v0.43.0...v0.44.0-beta.1
[0.43.0]: https://github.com/dyad-sh/dyad/compare/v0.42.0...v0.43.0
[0.42.0]: https://github.com/dyad-sh/dyad/compare/v0.41.0...v0.42.0
[0.41.0]: https://github.com/dyad-sh/dyad/compare/v0.40.0...v0.41.0
[0.40.0]: https://github.com/dyad-sh/dyad/releases/tag/v0.40.0
