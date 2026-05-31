# Guide de contribution — NeuroCode

Merci de contribuer à NeuroCode. Ce guide décrit le workflow attendu pour garder le projet stable, testable et maintenable.

## Prérequis pour contribuer

| Outil            | Version / condition                                          |
| ---------------- | ------------------------------------------------------------ |
| Node.js          | >= 22                                                        |
| npm              | Version livrée avec Node 22 recommandée                      |
| Git              | Version récente                                              |
| OS               | macOS, Windows ou Linux supporté par Electron                |
| Comptes externes | Optionnels : GitHub, fournisseurs IA, Supabase, Neon, Vercel |

Installer le projet :

```bash
git clone https://github.com/dyad-sh/dyad.git NeuroCode
cd NeuroCode
npm install
cp .env.example .env
```

## Workflow Git

### Branches

Utilisez des branches courtes et explicites :

```bash
git checkout -b docs/update-api-reference
git checkout -b feat/add-provider-healthcheck
git checkout -b fix/git-branch-switch-error
```

Préfixes recommandés :

| Préfixe     | Usage                                              |
| ----------- | -------------------------------------------------- |
| `feat/`     | Nouvelle fonctionnalité utilisateur ou développeur |
| `fix/`      | Correction de bug                                  |
| `docs/`     | Documentation uniquement                           |
| `refactor/` | Refactor sans changement fonctionnel attendu       |
| `test/`     | Ajout/correction de tests                          |
| `chore/`    | Maintenance, tooling, dépendances                  |

### Commits

Utilisez Conventional Commits :

```text
feat(chat): add token usage banner
fix(github): handle empty remote branch list
docs(api): document ipc channels
refactor(db): simplify version relations
test(skills): cover skill validation errors
chore(deps): update electron forge
```

Règles :

- Un commit doit décrire une intention unique.
- Le scope doit correspondre au domaine touché (`chat`, `db`, `ipc`, `github`, `docs`, etc.).
- Mentionnez les migrations DB dans le body du commit si le schéma change.
- Ne commitez jamais `.env`, secrets, tokens, builds locaux ou fichiers générés temporaires.

### Pull requests

Une PR doit contenir :

- Résumé clair des changements.
- Captures ou vidéo si l'UI visible change.
- Liste des tests exécutés.
- Notes de migration si DB, settings ou formats de fichiers changent.
- Risques connus et limites.

## Standards de code

### TypeScript

- Préférez des types explicites aux `any`.
- Validez les frontières IPC, fichiers, réseau et providers avec Zod ou schémas existants.
- Gardez les contrats IPC dans `src/ipc/types/*` synchronisés avec les handlers `src/ipc/handlers/*`.
- Ne mettez jamais de `try/catch` autour des imports.
- Isolez les effets de bord dans le main process, les handlers ou les utilitaires dédiés.

### React

- Placez les pages dans `src/pages/` et les routes dans `src/routes/`.
- Réutilisez les composants de `src/components/ui/` avant d'ajouter une nouvelle primitive.
- Gardez l'état global minimal ; utilisez Jotai pour l'état transversal et TanStack Query pour les données asynchrones.
- Évitez de déclencher des appels IPC directement dans des composants profonds si un hook ou client de domaine existe.

### IPC / main process

- Déclarez tout nouveau canal dans un contrat typé.
- Ajoutez le handler correspondant et vérifiez qu'il est enregistré dans `src/ipc/ipc_host.ts` si nécessaire.
- Respectez la whitelist preload dérivée des contrats.
- Retournez des erreurs actionnables et évitez d'exposer des secrets dans les logs.

### Base de données

- Modifiez `src/db/schema.ts` puis générez une migration Drizzle.
- N'éditez pas manuellement les snapshots Drizzle sans comprendre l'impact.
- Décrivez les migrations destructives dans la PR.

### Sécurité

- Validez les chemins utilisateur avant toute lecture/écriture/suppression.
- Demandez un consentement explicite pour les outils MCP/agent dangereux.
- Ne loggez jamais les clés API, tokens OAuth ou secrets chiffrés/déchiffrés.
- Bloquez ou justifiez toute exécution shell issue d'une entrée utilisateur.

## Commandes de développement

### Lancer l'application

```bash
npm run dev
```

### Typecheck

```bash
npm run ts
```

### Formatage

```bash
npm run fmt:check
npm run fmt
```

### Lint

```bash
npm run lint
```

### Tests unitaires/intégration

```bash
npm test
npm run test:watch
npm run test:ui
```

### Tests E2E

```bash
npm run pre:e2e
npm run e2e
```

### Storybook

```bash
npm run storybook
npm run build-storybook
```

### Base de données

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

## Processus de review

1. Vérifier que la PR est limitée et compréhensible.
2. Lire les changements de contrats IPC, schémas DB et handlers en priorité.
3. Exécuter les tests pertinents localement ou valider les résultats CI.
4. Vérifier l'absence de secrets et de fichiers générés accidentels.
5. Demander des tests supplémentaires si une logique critique n'est pas couverte.
6. Squash ou rebase selon la politique du mainteneur avant merge.

## Code de conduite

- Soyez respectueux et factuel dans les discussions.
- Critiquez le code, pas les personnes.
- Expliquez les décisions techniques importantes.
- Accueillez les contributions débutantes avec des retours actionnables.
- Signalez tout comportement abusif aux mainteneurs du projet.

> ⚠️ À compléter : aucun fichier `CODE_OF_CONDUCT.md` dédié n'a été détecté. Cette section fournit un cadre minimal en attendant une politique officielle.
