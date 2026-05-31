# NeuroCode

## Pitch

NeuroCode est une application desktop open source pour créer, modifier et exécuter des applications avec l'aide de modèles d'IA.
Elle s'adresse aux développeurs, makers et équipes qui veulent prototyper rapidement tout en gardant les projets sur leur machine.
L'application combine chat IA, édition de code, prévisualisation locale, historique Git et intégrations cloud optionnelles.
Elle supporte plusieurs fournisseurs IA, des modèles locaux, des workflows de prompts, des skills et des outils MCP.
Elle fournit aussi des fonctions d'administration pour les paramètres, la télémétrie, les intégrations GitHub/Supabase/Neon/Vercel et les métriques de tokens.

## Badges

![Build](https://img.shields.io/badge/build-CI%20GitHub%20Actions-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-0.44.0--beta.1-orange)

## Stack technique

| Technologie                 | Rôle                                           | Version détectable                    |
| --------------------------- | ---------------------------------------------- | ------------------------------------- |
| Electron                    | Shell desktop, processus main/preload/renderer | 40.0.0                                |
| Electron Forge              | Packaging, makers, publication                 | ^7.11.1                               |
| Vite                        | Bundling main, preload, renderer et worker     | ^5.4.17                               |
| React                       | UI renderer                                    | ^19.2.4                               |
| TypeScript                  | Typage applicatif                              | ^5.8.3                                |
| TanStack Router             | Routing frontend typé                          | ^1.114.34                             |
| TanStack Query              | Cache et orchestration des requêtes UI         | ^5.75.5                               |
| Jotai                       | État UI local et global                        | ^2.12.2                               |
| Tailwind CSS                | Styles utilitaires                             | ^4.1.3                                |
| Base UI / composants locaux | Primitives UI accessibles                      | @base-ui/react ^1.2.0                 |
| Drizzle ORM                 | Mapping SQLite et migrations                   | ^0.41.0                               |
| better-sqlite3              | Base locale embarquée                          | ^12.6.2                               |
| AI SDK                      | Abstraction multi-fournisseurs IA              | ai ^6.0.68                            |
| MCP SDK                     | Intégration Model Context Protocol             | ^1.17.5                               |
| Dugite / isomorphic-git     | Opérations Git locales et GitHub               | dugite ^3.0.0, isomorphic-git ^1.30.1 |
| Vitest                      | Tests unitaires/intégration                    | ^3.1.1                                |
| Playwright                  | Tests E2E Electron                             | ^1.58.2                               |
| Storybook                   | Catalogue de composants                        | ^8.6.15                               |
| Oxlint / Oxfmt              | Lint et formatage                              | oxlint ^1.41.0, oxfmt ^0.26.0         |

## Fonctionnalités principales

### Utilisateur

- Créer, importer, copier, renommer, rechercher, lancer, arrêter et redémarrer des applications locales.
- Dialoguer avec l'IA en modes build, ask, plan et agent local, avec streaming, annulation, pièces jointes et sélection de composants.
- Modifier et lire des fichiers de projet depuis l'interface, rechercher dans le code et suivre les versions générées.
- Configurer plusieurs fournisseurs IA : OpenAI, Anthropic, Google, Vertex, OpenRouter, Ollama, LM Studio, Azure, xAI, Bedrock, Minimax et NVIDIA.
- Utiliser des modèles locaux, des providers custom, des prompts réutilisables, des skills et des serveurs MCP.
- Gérer les intégrations GitHub, Supabase, Neon et Vercel depuis l'application.
- Visualiser médias, thèmes, bibliothèque de prompts/templates, analytics de tokens et notes de release.
- Activer la génération d'images, la transcription audio Pro, les sandboxes cloud et les liens de partage lorsque les services associés sont disponibles.

### Administrateur / mainteneur

- Gérer les paramètres utilisateur chiffrés localement, la télémétrie, le canal de release et les fonctionnalités expérimentales.
- Définir le dossier d'applications, le chemin Node.js, les variables d'environnement par application et les règles de sécurité npm.
- Superviser logs, debug bundle, métriques de performance, statut Node.js et état des processus applicatifs.
- Exécuter migrations Drizzle, tests unitaires, tests E2E, lint, formatage, packaging et publication Electron Forge.
- Maintenir les contrats IPC typés, les handlers main process, les migrations SQLite et les tests associés.

## Prérequis

| Outil / compte                   | Version minimale / condition                          | Pourquoi                                                                |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Node.js                          | >= 22                                                 | Requis par `package.json` et les scripts Electron/Vite                  |
| npm                              | Version fournie avec Node 22 recommandée              | Les scripts utilisent `npm run ...`                                     |
| Git                              | Version récente                                       | Gestion des projets générés, synchronisation GitHub et repository local |
| Python / outils natifs           | Selon OS, requis par certains modules natifs Electron | Compilation de `better-sqlite3`, `node-pty` si nécessaire               |
| Compte fournisseur IA            | Optionnel                                             | Requis pour les modèles cloud configurés par clé API ou OAuth           |
| Compte GitHub                    | Optionnel                                             | Requis pour connecter, créer, pousser et cloner des dépôts              |
| Comptes Supabase / Neon / Vercel | Optionnel                                             | Requis pour les intégrations cloud correspondantes                      |
| macOS Apple Developer            | Optionnel                                             | Uniquement pour notarisation/signature macOS                            |

## Installation

1. Cloner le dépôt.

```bash
git clone https://github.com/dyad-sh/dyad.git NeuroCode
cd NeuroCode
```

2. Installer les dépendances.

```bash
npm install
```

3. Préparer la configuration locale.

```bash
cp .env.example .env
```

4. Renseigner les clés et options nécessaires dans `.env`.

```bash
$EDITOR .env
```

5. Vérifier le typage, le formatage et les tests avant de développer.

```bash
npm run ts
npm run fmt:check
npm test
```

## Configuration

| Variable                    | Description                                               | Exemple                       | Obligatoire |
| --------------------------- | --------------------------------------------------------- | ----------------------------- | ----------- |
| `OPENAI_API_KEY`            | Clé API OpenAI utilisée par le provider OpenAI.           | `sk-proj-...`                 | Non         |
| `ANTHROPIC_API_KEY`         | Clé API Anthropic utilisée par le provider Anthropic.     | `sk-ant-...`                  | Non         |
| `GOOGLE_API_KEY`            | Clé API Google AI.                                        | `AIza...`                     | Non         |
| `OLLAMA_HOST`               | URL d'un serveur Ollama local ou distant.                 | `http://127.0.0.1:11434`      | Non         |
| `GITHUB_CLIENT_ID`          | Client ID OAuth GitHub pour le flux d'intégration GitHub. | `Ov23li...`                   | Non         |
| `GITHUB_CLIENT_SECRET`      | Secret OAuth GitHub associé au client ID.                 | `github_pat_or_secret`        | Non         |
| `GITHUB_TOKEN`              | Token GitHub personnel pour les opérations API/scripts.   | `ghp_...`                     | Non         |
| `APPLE_ID`                  | Apple ID utilisé pour la notarisation macOS.              | `dev@example.com`             | Non         |
| `APPLE_PASSWORD`            | Mot de passe app-specific Apple pour notarisation.        | `xxxx-xxxx-xxxx-xxxx`         | Non         |
| `APPLE_TEAM_ID`             | Team ID Apple Developer.                                  | `ABCDE12345`                  | Non         |
| `SM_CODE_SIGNING_CERT_SHA1` | Empreinte SHA1 du certificat de signature macOS.          | `012345...`                   | Non         |
| `NODE_ENV`                  | Mode d'exécution Node/Electron.                           | `development`                 | Non         |
| `E2E_TEST_BUILD`            | Active les comportements de build E2E.                    | `true`                        | Non         |
| `CI`                        | Indique une exécution en CI.                              | `true`                        | Non         |
| `DYAD_ENGINE_URL`           | URL d'un moteur IA compatible Dyad.                       | `http://localhost:8080/v1`    | Non         |
| `DYAD_GATEWAY_URL`          | URL d'une gateway Dyad si utilisée.                       | `https://gateway.example.com` | Non         |

Les secrets utilisateur saisis dans l'application sont stockés dans le fichier de paramètres local et chiffrés via `electron.safeStorage` lorsque disponible. Les données applicatives locales sont stockées dans le répertoire utilisateur Electron, notamment `sqlite.db`.

## Lancement

### Développement

```bash
npm run dev
```

Avec moteur IA local compatible Dyad :

```bash
npm run dev:engine
```

### Production / packaging local

```bash
npm run package
npm run make
```

Lancer l'application packagée dépend du répertoire généré par Electron Forge dans `out/`.

## Structure du projet

```text
.
├── assets/                    # Logos, icônes et assets statiques
├── docs/                      # Documentation fonctionnelle existante
├── drizzle/                   # Migrations SQLite générées par Drizzle
├── e2e-tests/                 # Scénarios Playwright Electron
├── scripts/                   # Scripts release, codegen et maintenance
├── scaffold/                  # Template de projet généré par l'application
├── src/
│   ├── app/                   # Layout Electron renderer
│   ├── atoms/                 # État Jotai
│   ├── components/            # Composants UI, chat, intégrations, settings
│   ├── db/                    # Initialisation DB et schéma Drizzle
│   ├── ipc/                   # Contrats, handlers, preload channels et utilitaires IPC
│   ├── lib/                   # Schémas, constantes et helpers partagés
│   ├── main/                  # Services main process et paramètres
│   ├── pages/                 # Pages React
│   ├── routes/                # Définition TanStack Router
│   ├── skills/                # Registre et exécution des skills
│   └── utils/                 # Utilitaires transverses
├── workers/                   # Workers Node/Vite, notamment TypeScript
├── package.json               # Scripts, métadonnées et dépendances
├── drizzle.config.ts          # Configuration Drizzle SQLite
└── vite.*.config.mts          # Configurations Vite par cible Electron
```

## Contribuer

Consultez [CONTRIBUTING.md](./CONTRIBUTING.md) pour le workflow Git, les conventions de commits, les standards de code et les commandes de test.

## Licence

MIT. La licence est déclarée dans `package.json`.
