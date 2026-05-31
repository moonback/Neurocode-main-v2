# Référence API — NeuroCode

> NeuroCode ne détecte pas d'API HTTP REST interne. Les endpoints ci-dessous sont des **canaux IPC Electron** exposés au renderer via le preload et validés par contrats Zod dans `src/ipc/types/*`.
>
> Convention de lecture :
>
> - **Méthode** : `IPC invoke` pour une requête/réponse, `IPC stream` pour un démarrage avec événements, `IPC event` pour un événement main → renderer.
> - **Route** : nom du canal IPC.
> - **Auth** : pas de session interne ; certaines routes requièrent des tokens externes déjà configurés localement.
> - **Codes HTTP** : non applicable. Les succès retournent la valeur typée du contrat ; les erreurs sont rejetées côté IPC avec un message d'erreur.

## Exemple générique de requête IPC

```typescript
const result = await window.electron.ipcRenderer.invoke("create-app", {
  name: "mon-app",
});
```

## Exemple générique de succès

```json
{
  "app": {
    "id": 1,
    "name": "mon-app",
    "path": "/Users/me/neuro-apps/mon-app",
    "resolvedPath": "/Users/me/neuro-apps/mon-app"
  },
  "chatId": 1
}
```

## Exemple générique d'erreur

```json
{
  "message": "Validation failed or handler error",
  "channel": "create-app"
}
```

## Applications

| Méthode    | Route                             | Description                                          | Auth                    | Paramètres principaux                                  | Réponse succès                               | Codes HTTP |
| ---------- | --------------------------------- | ---------------------------------------------------- | ----------------------- | ------------------------------------------------------ | -------------------------------------------- | ---------- |
| IPC invoke | `create-app`                      | Crée une application locale et un chat initial.      | Non                     | body `{ name: string }` requis                         | `{ app, chatId }`                            | N/A        |
| IPC invoke | `get-app`                         | Charge une application avec fichiers et métadonnées. | Non                     | body `number` appId requis                             | `App`                                        | N/A        |
| IPC invoke | `list-apps`                       | Liste les applications locales.                      | Non                     | `void`                                                 | `{ apps: ListedApp[] }`                      | N/A        |
| IPC invoke | `delete-app`                      | Supprime une application.                            | Non                     | body `{ appId: number }` requis                        | `void`                                       | N/A        |
| IPC invoke | `copy-app`                        | Copie une application avec ou sans historique.       | Non                     | body `{ appId, newAppName, withHistory }`              | `{ app }`                                    | N/A        |
| IPC invoke | `rename-app`                      | Renomme une application et son chemin.               | Non                     | body `{ appId, appName, appPath }`                     | `void`                                       | N/A        |
| IPC invoke | `run-app`                         | Lance la preview/processus d'une application.        | Non                     | body `{ appId }`                                       | `void`                                       | N/A        |
| IPC invoke | `stop-app`                        | Arrête la preview/processus d'une application.       | Non                     | body `{ appId }`                                       | `void`                                       | N/A        |
| IPC invoke | `restart-app`                     | Redémarre une application, avec options de reset.    | Non                     | body `{ appId, removeNodeModules?, recreateSandbox? }` | `void`                                       | N/A        |
| IPC invoke | `get-cloud-sandbox-status`        | Récupère l'état de sandbox cloud.                    | Service cloud optionnel | body `{ appId }`                                       | `CloudSandboxStatus \| null`                 | N/A        |
| IPC invoke | `create-cloud-sandbox-share-link` | Crée un lien de partage pour sandbox cloud.          | Service cloud optionnel | body `{ appId, expiresInSeconds? }`                    | `{ sandboxId, shareLinkId, url, expiresAt }` | N/A        |
| IPC invoke | `edit-app-file`                   | Écrit le contenu d'un fichier de l'app.              | Non                     | body `{ appId, filePath, content }`                    | `{ warning? }`                               | N/A        |
| IPC invoke | `read-app-file`                   | Lit un fichier de l'app.                             | Non                     | body `{ appId, filePath }`                             | `string`                                     | N/A        |
| IPC invoke | `respond-to-app-input`            | Répond à une demande d'entrée du processus app.      | Non                     | body `{ appId, response }`                             | `void`                                       | N/A        |
| IPC invoke | `search-app-files`                | Recherche dans les fichiers d'une app.               | Non                     | body `{ appId, query }`                                | `AppFileSearchResult[]`                      | N/A        |
| IPC invoke | `change-app-location`             | Déplace l'application vers un parent directory.      | Non                     | body `{ appId, parentDirectory }`                      | `{ resolvedPath }`                           | N/A        |
| IPC invoke | `rename-branch`                   | Renomme une branche locale de l'app.                 | Non                     | body `{ appId, oldBranchName, newBranchName }`         | `void`                                       | N/A        |
| IPC invoke | `add-to-favorite`                 | Bascule le statut favori.                            | Non                     | body `{ appId }`                                       | `{ isFavorite }`                             | N/A        |
| IPC invoke | `select-app-location`             | Ouvre un sélecteur de dossier.                       | Non                     | body `{ defaultPath? }`                                | `{ path, canceled }`                         | N/A        |
| IPC invoke | `check-app-name`                  | Vérifie la disponibilité d'un nom d'app.             | Non                     | body `{ appName: string }`                             | `{ exists, message? }`                       | N/A        |
| IPC invoke | `search-app`                      | Recherche des applications par nom/chat.             | Non                     | body `string` query                                    | `AppSearchResult[]`                          | N/A        |
| IPC invoke | `update-app-commands`             | Met à jour les commandes install/start.              | Non                     | body `{ appId, installCommand, startCommand }`         | `void`                                       | N/A        |
| IPC invoke | `select-app-for-preview`          | Signale l'app active dans la preview.                | Non                     | body `{ appId: number \| null }`                       | `void`                                       | N/A        |

## Chat, streaming et aide

| Méthode    | Route                      | Description                               | Auth                     | Paramètres principaux                                                               | Réponse succès / événement | Codes HTTP |
| ---------- | -------------------------- | ----------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- | -------------------------- | ---------- |
| IPC invoke | `get-chat`                 | Charge un chat complet.                   | Non                      | body `number` chatId                                                                | `Chat`                     | N/A        |
| IPC invoke | `get-chats`                | Liste les chats, optionnellement par app. | Non                      | body `number?` appId                                                                | `ChatSummary[]`            | N/A        |
| IPC invoke | `create-chat`              | Crée un chat pour une app.                | Non                      | body `number` appId                                                                 | `number` chatId            | N/A        |
| IPC invoke | `update-chat`              | Renomme un chat.                          | Non                      | body `{ chatId, title }`                                                            | `void`                     | N/A        |
| IPC invoke | `delete-chat`              | Supprime un chat.                         | Non                      | body `number` chatId                                                                | `void`                     | N/A        |
| IPC invoke | `delete-messages`          | Supprime les messages d'un chat.          | Non                      | body `number` chatId                                                                | `void`                     | N/A        |
| IPC invoke | `search-chats`             | Recherche dans les chats d'une app.       | Non                      | body `{ appId, query }`                                                             | `ChatSearchResult[]`       | N/A        |
| IPC invoke | `chat:count-tokens`        | Estime les tokens du prompt et contexte.  | Provider IA local/config | body `{ chatId, input }`                                                            | `TokenCountResult`         | N/A        |
| IPC invoke | `chat:cancel`              | Annule un stream de chat.                 | Non                      | body `number` chatId                                                                | `boolean`                  | N/A        |
| IPC stream | `chat:stream`              | Démarre une réponse IA streaming.         | Provider IA configuré    | body `{ chatId, prompt, displayPrompt?, redo?, attachments?, selectedComponents? }` | événements ci-dessous      | N/A        |
| IPC event  | `chat:response:chunk`      | Chunk de réponse chat.                    | Non                      | payload `{ chatId, messages?, streamingMessageId?, streamingContent? }`             | événement                  | N/A        |
| IPC event  | `chat:response:end`        | Fin de réponse chat.                      | Non                      | payload `{ chatId, updatedFiles, ... }`                                             | événement                  | N/A        |
| IPC event  | `chat:response:error`      | Erreur de réponse chat.                   | Non                      | payload `{ chatId, error, warningMessages? }`                                       | événement                  | N/A        |
| IPC invoke | `help:chat:start`          | Démarre le chat d'aide.                   | Provider IA configuré    | body selon contrat help                                                             | événement stream           | N/A        |
| IPC invoke | `help:chat:cancel`         | Annule le chat d'aide.                    | Non                      | body selon contrat help                                                             | `boolean/void`             | N/A        |
| IPC event  | `help:chat:response:chunk` | Chunk du chat d'aide.                     | Non                      | payload typé help                                                                   | événement                  | N/A        |
| IPC event  | `help:chat:response:end`   | Fin du chat d'aide.                       | Non                      | payload typé help                                                                   | événement                  | N/A        |
| IPC event  | `help:chat:response:error` | Erreur du chat d'aide.                    | Non                      | payload typé help                                                                   | événement                  | N/A        |

## GitHub et Git

| Méthode    | Route                          | Description                                | Auth                | Paramètres principaux   | Réponse succès  | Codes HTTP |
| ---------- | ------------------------------ | ------------------------------------------ | ------------------- | ----------------------- | --------------- | ---------- |
| IPC invoke | `github:start-flow`            | Lance le flux OAuth GitHub.                | GitHub OAuth        | body selon contrat      | URL/statut flow | N/A        |
| IPC invoke | `github:list-repos`            | Liste les dépôts GitHub accessibles.       | Token GitHub        | pagination/filtres      | `Repo[]`        | N/A        |
| IPC invoke | `github:get-repo-branches`     | Liste les branches d'un dépôt.             | Token GitHub        | owner/repo              | `Branch[]`      | N/A        |
| IPC invoke | `github:is-repo-available`     | Vérifie la disponibilité d'un nom de repo. | Token GitHub        | owner/repo              | disponibilité   | N/A        |
| IPC invoke | `github:create-repo`           | Crée un dépôt GitHub et connecte l'app.    | Token GitHub        | appId/name/private?     | repo connecté   | N/A        |
| IPC invoke | `github:connect-existing-repo` | Connecte une app à un dépôt existant.      | Token GitHub        | appId/owner/repo/branch | `void`          | N/A        |
| IPC invoke | `github:push`                  | Pousse les commits de l'app.               | Token GitHub        | appId/options           | résultat Git    | N/A        |
| IPC invoke | `github:fetch`                 | Fetch distant.                             | Token GitHub        | appId                   | résultat Git    | N/A        |
| IPC invoke | `github:pull`                  | Pull distant.                              | Token GitHub        | appId                   | résultat Git    | N/A        |
| IPC invoke | `github:rebase`                | Lance un rebase.                           | Token GitHub        | appId/branch            | résultat Git    | N/A        |
| IPC invoke | `github:rebase-abort`          | Annule un rebase.                          | Non                 | appId                   | résultat Git    | N/A        |
| IPC invoke | `github:merge-abort`           | Annule un merge.                           | Non                 | appId                   | résultat Git    | N/A        |
| IPC invoke | `github:rebase-continue`       | Continue un rebase.                        | Non                 | appId                   | résultat Git    | N/A        |
| IPC invoke | `github:list-local-branches`   | Liste les branches locales.                | Non                 | appId                   | branches        | N/A        |
| IPC invoke | `github:list-remote-branches`  | Liste les branches distantes.              | Token GitHub        | appId                   | branches        | N/A        |
| IPC invoke | `github:create-branch`         | Crée une branche.                          | Non                 | appId/name              | branche         | N/A        |
| IPC invoke | `github:switch-branch`         | Change de branche.                         | Non                 | appId/name              | `void`          | N/A        |
| IPC invoke | `github:delete-branch`         | Supprime une branche.                      | Non                 | appId/name              | `void`          | N/A        |
| IPC invoke | `github:rename-branch`         | Renomme une branche.                       | Non                 | appId/old/new           | `void`          | N/A        |
| IPC invoke | `github:merge-branch`          | Merge une branche.                         | Non                 | appId/source/target     | résultat Git    | N/A        |
| IPC invoke | `github:get-conflicts`         | Liste les conflits Git.                    | Non                 | appId                   | conflits        | N/A        |
| IPC invoke | `github:get-git-state`         | Retourne l'état Git courant.               | Non                 | appId                   | état Git        | N/A        |
| IPC invoke | `github:disconnect`            | Déconnecte GitHub pour l'app.              | Non                 | appId                   | `void`          | N/A        |
| IPC invoke | `github:list-collaborators`    | Liste les collaborateurs.                  | Token GitHub        | owner/repo              | collaborateurs  | N/A        |
| IPC invoke | `github:invite-collaborator`   | Invite un collaborateur.                   | Token GitHub        | owner/repo/user         | invitation      | N/A        |
| IPC invoke | `github:remove-collaborator`   | Retire un collaborateur.                   | Token GitHub        | owner/repo/user         | `void`          | N/A        |
| IPC invoke | `github:clone-repo-from-url`   | Clone un dépôt depuis une URL.             | Accès repo si privé | url/destination         | app importée    | N/A        |
| IPC invoke | `git:get-uncommitted-files`    | Liste les fichiers non commités.           | Non                 | appId                   | fichiers        | N/A        |
| IPC invoke | `git:commit-changes`           | Crée un commit local.                      | Non                 | appId/message           | commit hash     | N/A        |
| IPC invoke | `git:discard-changes`          | Annule des changements locaux.             | Non                 | appId/files?            | `void`          | N/A        |
| IPC event  | `github:flow-update`           | Notification progression OAuth GitHub.     | Non                 | payload flow            | événement       | N/A        |
| IPC event  | `github:flow-success`          | OAuth GitHub réussi.                       | Non                 | payload flow            | événement       | N/A        |
| IPC event  | `github:flow-error`            | OAuth GitHub échoué.                       | Non                 | payload erreur          | événement       | N/A        |

## Fournisseurs IA, modèles, prompts et génération

| Méthode    | Route                                   | Description                         | Auth                        | Paramètres principaux      | Réponse succès | Codes HTTP |
| ---------- | --------------------------------------- | ----------------------------------- | --------------------------- | -------------------------- | -------------- | ---------- |
| IPC invoke | `get-language-model-providers`          | Liste providers IA.                 | Non                         | `void`                     | providers      | N/A        |
| IPC invoke | `get-language-models`                   | Liste modèles IA.                   | Non                         | filtres optionnels         | models         | N/A        |
| IPC invoke | `get-language-models-by-providers`      | Liste modèles par provider.         | Non                         | providers                  | models groupés | N/A        |
| IPC invoke | `create-custom-language-model-provider` | Crée un provider IA custom.         | Non                         | nom/baseURL/env            | provider       | N/A        |
| IPC invoke | `edit-custom-language-model-provider`   | Modifie un provider custom.         | Non                         | id + champs                | provider       | N/A        |
| IPC invoke | `delete-custom-language-model-provider` | Supprime un provider custom.        | Non                         | id                         | `void`         | N/A        |
| IPC invoke | `create-custom-language-model`          | Crée un modèle custom.              | Non                         | provider/model metadata    | model          | N/A        |
| IPC invoke | `delete-custom-language-model`          | Supprime un modèle custom.          | Non                         | id                         | `void`         | N/A        |
| IPC invoke | `delete-custom-model`                   | Alias/suppression de modèle custom. | Non                         | id                         | `void`         | N/A        |
| IPC invoke | `local-models:list-ollama`              | Liste les modèles Ollama.           | Ollama local optionnel      | host?                      | models         | N/A        |
| IPC invoke | `local-models:list-lmstudio`            | Liste les modèles LM Studio.        | LM Studio optionnel         | host?                      | models         | N/A        |
| IPC invoke | `generate-image`                        | Lance une génération d'image.       | Provider image configuré    | prompt/model/options       | job/résultat   | N/A        |
| IPC invoke | `cancel-image-generation`               | Annule une génération d'image.      | Non                         | requestId/jobId            | `void`         | N/A        |
| IPC invoke | `pro:transcribe-audio`                  | Transcrit un fichier audio.         | Fonctionnalité Pro/provider | audio payload              | transcription  | N/A        |
| IPC invoke | `prompts:list`                          | Liste les prompts.                  | Non                         | filtres optionnels         | prompts        | N/A        |
| IPC invoke | `prompts:create`                        | Crée un prompt.                     | Non                         | title/content/description? | prompt         | N/A        |
| IPC invoke | `prompts:update`                        | Met à jour un prompt.               | Non                         | id + champs                | prompt         | N/A        |
| IPC invoke | `prompts:delete`                        | Supprime un prompt.                 | Non                         | id                         | `void`         | N/A        |
| IPC invoke | `prompts:optimize`                      | Optimise un prompt via IA.          | Provider IA configuré       | prompt/contexte            | suggestion     | N/A        |
| IPC invoke | `prompts:generate-suggestions`          | Génère des suggestions de prompts.  | Provider IA configuré       | contexte                   | suggestions    | N/A        |

## Intégrations cloud et déploiement

| Méthode    | Route                                   | Description                                       | Auth                    | Paramètres principaux  | Réponse succès     | Codes HTTP |
| ---------- | --------------------------------------- | ------------------------------------------------- | ----------------------- | ---------------------- | ------------------ | ---------- |
| IPC invoke | `supabase:list-organizations`           | Liste les organisations Supabase.                 | OAuth Supabase          | `void`/filtres         | organisations      | N/A        |
| IPC invoke | `supabase:delete-organization`          | Supprime credentials d'organisation.              | OAuth Supabase          | organizationSlug       | `void`             | N/A        |
| IPC invoke | `supabase:list-all-projects`            | Liste les projets Supabase.                       | OAuth Supabase          | organization?          | projets            | N/A        |
| IPC invoke | `supabase:list-branches`                | Liste les branches Supabase.                      | OAuth Supabase          | projectId              | branches           | N/A        |
| IPC invoke | `supabase:get-edge-logs`                | Récupère les logs Edge Supabase.                  | OAuth Supabase          | project/function       | logs               | N/A        |
| IPC invoke | `supabase:set-app-project`              | Associe un projet Supabase à une app.             | OAuth Supabase          | appId/project/org      | `void`             | N/A        |
| IPC invoke | `supabase:unset-app-project`            | Désassocie Supabase.                              | Non                     | appId                  | `void`             | N/A        |
| IPC invoke | `supabase:fake-connect-and-set-project` | Connecteur de test/dev Supabase.                  | Non/dev                 | payload test           | `void`             | N/A        |
| IPC invoke | `neon:create-project`                   | Crée un projet Neon.                              | OAuth Neon              | appId/name             | projet             | N/A        |
| IPC invoke | `neon:get-project`                      | Charge un projet Neon.                            | OAuth Neon              | projectId              | projet             | N/A        |
| IPC invoke | `neon:list-projects`                    | Liste projets Neon.                               | OAuth Neon              | `void`                 | projets            | N/A        |
| IPC invoke | `neon:set-app-project`                  | Associe Neon à une app.                           | OAuth Neon              | appId/project/branches | `void`             | N/A        |
| IPC invoke | `neon:unset-app-project`                | Désassocie Neon.                                  | Non                     | appId                  | `void`             | N/A        |
| IPC invoke | `neon:set-active-branch`                | Définit la branche Neon active.                   | OAuth Neon              | appId/branchId         | `void`             | N/A        |
| IPC invoke | `neon:get-email-password-config`        | Lit config auth email/password Neon.              | OAuth Neon              | projectId              | config             | N/A        |
| IPC invoke | `neon:update-email-verification`        | Met à jour la vérification email.                 | OAuth Neon              | projectId/enabled      | config             | N/A        |
| IPC invoke | `neon:fake-connect`                     | Connecteur Neon de test/dev.                      | Non/dev                 | payload test           | résultat           | N/A        |
| IPC invoke | `vercel:save-token`                     | Sauvegarde un token Vercel.                       | Token Vercel            | token                  | `void`             | N/A        |
| IPC invoke | `vercel:list-projects`                  | Liste les projets Vercel.                         | Token Vercel            | team?                  | projets            | N/A        |
| IPC invoke | `vercel:is-project-available`           | Vérifie disponibilité nom projet.                 | Token Vercel            | name/team?             | disponibilité      | N/A        |
| IPC invoke | `vercel:create-project`                 | Crée un projet Vercel.                            | Token Vercel            | appId/name/team?       | projet             | N/A        |
| IPC invoke | `vercel:connect-existing-project`       | Connecte un projet Vercel existant.               | Token Vercel            | appId/projectId        | `void`             | N/A        |
| IPC invoke | `vercel:get-deployments`                | Liste les déploiements Vercel.                    | Token Vercel            | projectId/team?        | deployments        | N/A        |
| IPC invoke | `vercel:disconnect`                     | Déconnecte Vercel d'une app.                      | Non                     | appId                  | `void`             | N/A        |
| IPC invoke | `migration:push`                        | Pousse des migrations vers un backend DB externe. | Supabase/Neon selon app | appId/options          | résultat migration | N/A        |
| IPC invoke | `portal:migrate-create`                 | Crée une migration via portail.                   | Service portail         | payload migration      | résultat           | N/A        |

## MCP, agent local, skills et plans

| Méthode    | Route                         | Description                               | Auth                     | Paramètres principaux          | Réponse succès / événement | Codes HTTP |
| ---------- | ----------------------------- | ----------------------------------------- | ------------------------ | ------------------------------ | -------------------------- | ---------- |
| IPC invoke | `mcp:list-servers`            | Liste serveurs MCP.                       | Non                      | `void`                         | serveurs                   | N/A        |
| IPC invoke | `mcp:create-server`           | Ajoute un serveur MCP.                    | Non                      | name/transport/command/url/env | serveur                    | N/A        |
| IPC invoke | `mcp:update-server`           | Modifie un serveur MCP.                   | Non                      | id + champs                    | serveur                    | N/A        |
| IPC invoke | `mcp:delete-server`           | Supprime un serveur MCP.                  | Non                      | id                             | `void`                     | N/A        |
| IPC invoke | `mcp:list-tools`              | Liste les outils d'un serveur MCP.        | Serveur MCP              | serverId                       | tools                      | N/A        |
| IPC invoke | `mcp:get-tool-consents`       | Liste consentements outils MCP.           | Non                      | serverId                       | consents                   | N/A        |
| IPC invoke | `mcp:set-tool-consent`        | Définit un consentement outil MCP.        | Non                      | serverId/toolName/consent      | `void`                     | N/A        |
| IPC invoke | `mcp:tool-consent-response`   | Répond à une demande de consentement MCP. | Non                      | requestId/decision             | `void`                     | N/A        |
| IPC event  | `mcp:tool-consent-request`    | Demande de consentement MCP.              | Non                      | payload demande                | événement                  | N/A        |
| IPC invoke | `agent-tool:get-tools`        | Liste les outils agent local.             | Non                      | `void`                         | tools                      | N/A        |
| IPC invoke | `agent-tool:set-consent`      | Définit consentement outil agent.         | Non                      | tool/consent                   | `void`                     | N/A        |
| IPC invoke | `agent-tool:consent-response` | Répond au consentement agent.             | Non                      | requestId/decision             | `void`                     | N/A        |
| IPC event  | `agent-tool:consent-request`  | Demande de consentement agent.            | Non                      | payload demande                | événement                  | N/A        |
| IPC event  | `agent-tool:todos-update`     | Mise à jour TODOs agent.                  | Non                      | todos                          | événement                  | N/A        |
| IPC event  | `agent-tool:problems-update`  | Mise à jour problèmes agent.              | Non                      | problems                       | événement                  | N/A        |
| IPC invoke | `skills:list`                 | Liste les skills.                         | Non                      | filtres?                       | skills                     | N/A        |
| IPC invoke | `skills:get`                  | Charge un skill.                          | Non                      | id/name                        | skill                      | N/A        |
| IPC invoke | `skills:create`               | Crée un skill.                            | Non                      | metadata/contenu               | skill                      | N/A        |
| IPC invoke | `skills:importWithFiles`      | Importe un skill avec fichiers.           | Non                      | fichiers/metadata              | skill                      | N/A        |
| IPC invoke | `skills:update`               | Met à jour un skill.                      | Non                      | id + champs                    | skill                      | N/A        |
| IPC invoke | `skills:delete`               | Supprime un skill.                        | Non                      | id                             | `void`                     | N/A        |
| IPC invoke | `skills:execute`              | Exécute un skill.                         | Non/provider selon skill | skill/input                    | résultat                   | N/A        |
| IPC invoke | `skills:validate`             | Valide un skill.                          | Non                      | skill payload                  | diagnostic                 | N/A        |
| IPC invoke | `skills:discover`             | Redécouvre les skills utilisateur.        | Non                      | `void`                         | skills                     | N/A        |
| IPC invoke | `plan:create`                 | Crée un plan.                             | Non                      | chatId/contenu                 | plan                       | N/A        |
| IPC invoke | `plan:get`                    | Charge un plan.                           | Non                      | planId                         | plan                       | N/A        |
| IPC invoke | `plan:get-for-chat`           | Charge le plan d'un chat.                 | Non                      | chatId                         | plan/null                  | N/A        |
| IPC invoke | `plan:update-plan`            | Met à jour un plan.                       | Non                      | planId + champs                | plan                       | N/A        |
| IPC invoke | `plan:delete`                 | Supprime un plan.                         | Non                      | planId                         | `void`                     | N/A        |
| IPC invoke | `plan:questionnaire-response` | Répond à un questionnaire de plan.        | Non                      | response payload               | résultat                   | N/A        |
| IPC event  | `plan:update`                 | Événement de mise à jour de plan.         | Non                      | plan payload                   | événement                  | N/A        |
| IPC event  | `plan:exit`                   | Sortie du mode plan.                      | Non                      | payload                        | événement                  | N/A        |
| IPC event  | `plan:questionnaire`          | Questionnaire demandé par le plan.        | Non                      | questions                      | événement                  | N/A        |

## Système, paramètres, sécurité et debug

| Méthode    | Route                         | Description                                  | Auth                    | Paramètres principaux | Réponse succès / événement | Codes HTTP |
| ---------- | ----------------------------- | -------------------------------------------- | ----------------------- | --------------------- | -------------------------- | ---------- |
| IPC invoke | `get-user-settings`           | Lit les paramètres utilisateur.              | Non                     | `void`                | settings                   | N/A        |
| IPC invoke | `set-user-settings`           | Écrit les paramètres utilisateur.            | Non                     | settings partiels     | settings                   | N/A        |
| IPC invoke | `window:minimize`             | Minimise la fenêtre.                         | Non                     | `void`                | `void`                     | N/A        |
| IPC invoke | `window:maximize`             | Maximise/restaure la fenêtre.                | Non                     | `void`                | `void`                     | N/A        |
| IPC invoke | `window:close`                | Ferme la fenêtre.                            | Non                     | `void`                | `void`                     | N/A        |
| IPC invoke | `get-system-platform`         | Retourne la plateforme OS.                   | Non                     | `void`                | platform                   | N/A        |
| IPC invoke | `get-system-debug-info`       | Retourne infos debug système.                | Non                     | `void`                | debug info                 | N/A        |
| IPC invoke | `get-app-version`             | Retourne la version app.                     | Non                     | `void`                | version                    | N/A        |
| IPC invoke | `nodejs-status`               | Vérifie Node.js.                             | Non                     | `void`                | statut Node                | N/A        |
| IPC invoke | `select-node-folder`          | Sélectionne un dossier Node.                 | Non                     | `void`/default        | chemin                     | N/A        |
| IPC invoke | `get-node-path`               | Retourne le chemin Node configuré.           | Non                     | `void`                | chemin                     | N/A        |
| IPC invoke | `select-app-folder`           | Sélectionne un dossier d'app.                | Non                     | default?              | chemin                     | N/A        |
| IPC invoke | `get-custom-apps-folder`      | Lit le dossier apps custom.                  | Non                     | `void`                | chemin/null                | N/A        |
| IPC invoke | `select-custom-apps-folder`   | Sélectionne le dossier apps custom.          | Non                     | default?              | chemin                     | N/A        |
| IPC invoke | `set-custom-apps-folder`      | Définit le dossier apps custom.              | Non                     | path/null             | `void`                     | N/A        |
| IPC invoke | `open-external-url`           | Ouvre une URL externe.                       | Non                     | url                   | `void`                     | N/A        |
| IPC invoke | `show-item-in-folder`         | Montre un fichier dans l'explorateur.        | Non                     | path                  | `void`                     | N/A        |
| IPC invoke | `open-file-path`              | Ouvre un chemin local.                       | Non                     | path                  | `void`                     | N/A        |
| IPC invoke | `clear-session-data`          | Efface données de session.                   | Non                     | options?              | `void`                     | N/A        |
| IPC invoke | `reset-all`                   | Réinitialise l'application.                  | Non                     | confirmation/options  | `void`                     | N/A        |
| IPC invoke | `reload-env-path`             | Recharge l'environnement PATH.               | Non                     | `void`                | env                        | N/A        |
| IPC invoke | `does-release-note-exist`     | Vérifie une note de release.                 | Non                     | version               | boolean                    | N/A        |
| IPC invoke | `get-user-budget`             | Retourne budget/quota utilisateur.           | Service Pro optionnel   | `void`                | budget                     | N/A        |
| IPC invoke | `upload-to-signed-url`        | Upload vers URL signée.                      | URL signée externe      | file/url              | résultat upload            | N/A        |
| IPC invoke | `take-screenshot`             | Capture une image de l'app/preview.          | Non                     | options               | screenshot path/data       | N/A        |
| IPC invoke | `restart-dyad`                | Redémarre l'application desktop.             | Non                     | `void`                | `void`                     | N/A        |
| IPC invoke | `get-performance-metrics`     | Retourne métriques perf.                     | Non                     | `void`                | metrics                    | N/A        |
| IPC invoke | `telemetry:event`             | Envoie un événement télémétrie.              | Consentement télémétrie | event payload         | `void`                     | N/A        |
| IPC event  | `force-close-detected`        | Signale une fermeture forcée précédente.     | Non                     | payload performance   | événement                  | N/A        |
| IPC invoke | `get-latest-security-review`  | Retourne la dernière revue sécurité.         | Non                     | appId?                | review                     | N/A        |
| IPC invoke | `get-env-vars`                | Lit variables d'environnement globales.      | Non                     | `void`                | env vars filtrées          | N/A        |
| IPC invoke | `get-app-env-vars`            | Lit variables d'environnement d'une app.     | Non                     | appId                 | env vars                   | N/A        |
| IPC invoke | `set-app-env-vars`            | Définit variables d'environnement d'une app. | Non                     | appId/env             | `void`                     | N/A        |
| IPC invoke | `get-session-debug-bundle`    | Génère un bundle debug.                      | Non                     | options?              | bundle                     | N/A        |
| IPC invoke | `add-log`                     | Ajoute une entrée de log.                    | Non                     | level/message         | `void`                     | N/A        |
| IPC invoke | `clear-logs`                  | Efface les logs.                             | Non                     | scope?                | `void`                     | N/A        |
| IPC invoke | `check-problems`              | Lance une analyse de problèmes.              | Non                     | appId                 | problems                   | N/A        |
| IPC invoke | `chat:add-dep`                | Ajoute une dépendance depuis le chat.        | Non                     | appId/package         | résultat                   | N/A        |
| IPC event  | `app:output`                  | Sortie processus app.                        | Non                     | output line           | événement                  | N/A        |
| IPC event  | `app:output-batch`            | Sortie processus app groupée.                | Non                     | output[]              | événement                  | N/A        |
| IPC event  | `deep-link-received`          | Deep link reçu.                              | Non                     | url/payload           | événement                  | N/A        |
| IPC event  | `chat:stream:start`           | Notification début stream.                   | Non                     | chatId                | événement                  | N/A        |
| IPC event  | `chat:stream:end`             | Notification fin stream.                     | Non                     | chatId                | événement                  | N/A        |
| IPC invoke | `free-agent-quota:get-status` | Retourne quota agent gratuit.                | Non/Pro status          | `void`                | quota                      | N/A        |

## Templates, thèmes, médias, versions et analytics

| Méthode    | Route                                 | Description                           | Auth                       | Paramètres principaux | Réponse succès        | Codes HTTP |
| ---------- | ------------------------------------- | ------------------------------------- | -------------------------- | --------------------- | --------------------- | ---------- |
| IPC invoke | `get-templates`                       | Liste templates disponibles.          | Non                        | `void`                | templates             | N/A        |
| IPC invoke | `get-themes`                          | Liste thèmes intégrés.                | Non                        | `void`                | themes                | N/A        |
| IPC invoke | `set-app-theme`                       | Définit thème d'une app.              | Non                        | appId/themeId         | `void`                | N/A        |
| IPC invoke | `get-app-theme`                       | Lit thème d'une app.                  | Non                        | appId                 | theme                 | N/A        |
| IPC invoke | `get-custom-themes`                   | Liste thèmes custom.                  | Non                        | `void`                | themes                | N/A        |
| IPC invoke | `get-theme-generation-model-options`  | Liste modèles utilisables pour thème. | Provider IA                | `void`                | options               | N/A        |
| IPC invoke | `create-custom-theme`                 | Crée un thème custom.                 | Non/provider si génération | thème payload         | theme                 | N/A        |
| IPC invoke | `update-custom-theme`                 | Met à jour un thème custom.           | Non                        | id + champs           | theme                 | N/A        |
| IPC invoke | `delete-custom-theme`                 | Supprime un thème custom.             | Non                        | id                    | `void`                | N/A        |
| IPC invoke | `generate-theme-prompt`               | Génère un prompt de thème.            | Provider IA                | input design          | prompt                | N/A        |
| IPC invoke | `generate-theme-from-url`             | Génère thème depuis URL.              | Provider IA + réseau       | url                   | theme draft           | N/A        |
| IPC invoke | `save-theme-image`                    | Sauvegarde une image de thème.        | Non                        | image data            | path                  | N/A        |
| IPC invoke | `cleanup-theme-images`                | Nettoie les images de thème inutiles. | Non                        | `void`                | résultat              | N/A        |
| IPC invoke | `list-all-media`                      | Liste les médias des apps.            | Non                        | filtres?              | media[]               | N/A        |
| IPC invoke | `rename-media-file`                   | Renomme un média.                     | Non                        | path/newName          | media                 | N/A        |
| IPC invoke | `delete-media-file`                   | Supprime un média.                    | Non                        | path                  | `void`                | N/A        |
| IPC invoke | `move-media-file`                     | Déplace un média.                     | Non                        | source/destination    | media                 | N/A        |
| IPC invoke | `list-versions`                       | Liste versions Git/app.               | Non                        | appId                 | versions              | N/A        |
| IPC invoke | `revert-version`                      | Revert vers une version.              | Non                        | appId/versionId       | résultat              | N/A        |
| IPC invoke | `checkout-version`                    | Checkout une version.                 | Non                        | appId/versionId       | résultat              | N/A        |
| IPC invoke | `get-current-branch`                  | Retourne branche courante.            | Non                        | appId                 | branch                | N/A        |
| IPC invoke | `get-app-upgrades`                    | Liste upgrades applicables.           | Non                        | appId                 | upgrades              | N/A        |
| IPC invoke | `execute-app-upgrade`                 | Exécute une upgrade.                  | Non                        | appId/upgradeId       | résultat              | N/A        |
| IPC invoke | `token-analytics:get-statistics`      | Statistiques globales tokens.         | Non                        | période/filtres       | stats                 | N/A        |
| IPC invoke | `token-analytics:get-top-consumers`   | Top consommateurs tokens.             | Non                        | période/limit         | consumers             | N/A        |
| IPC invoke | `token-analytics:calculate-cost`      | Estime un coût tokens.                | Non                        | tokens/model          | coût                  | N/A        |
| IPC invoke | `token-analytics:export-data`         | Exporte les analytics tokens.         | Non                        | format/filtres        | export                | N/A        |
| IPC invoke | `token-analytics:get-usage-over-time` | Série temporelle d'usage tokens.      | Non                        | période/granularité   | points                | N/A        |
| IPC invoke | `get-context-observability`           | Observabilité contexte pour chat/app. | Non                        | filtres               | données observabilité | N/A        |
| IPC invoke | `get-recent-context-observability`    | Observabilité contexte récente.       | Non                        | limit/filtres         | données               | N/A        |

## Import, Capacitor et édition visuelle

| Méthode    | Route                          | Description                                  | Auth | Paramètres principaux | Réponse succès | Codes HTTP |
| ---------- | ------------------------------ | -------------------------------------------- | ---- | --------------------- | -------------- | ---------- |
| IPC invoke | `import-app`                   | Importe une app existante.                   | Non  | path/name/options     | app            | N/A        |
| IPC invoke | `check-ai-rules`               | Vérifie règles IA lors d'un import.          | Non  | path                  | diagnostic     | N/A        |
| IPC invoke | `is-capacitor`                 | Détecte Capacitor dans une app.              | Non  | appId                 | boolean        | N/A        |
| IPC invoke | `sync-capacitor`               | Synchronise Capacitor.                       | Non  | appId/platform?       | résultat       | N/A        |
| IPC invoke | `open-ios`                     | Ouvre le projet iOS.                         | Non  | appId                 | `void`         | N/A        |
| IPC invoke | `open-android`                 | Ouvre le projet Android.                     | Non  | appId                 | `void`         | N/A        |
| IPC invoke | `apply-visual-editing-changes` | Applique des changements d'édition visuelle. | Non  | appId/changes         | résultat       | N/A        |
| IPC invoke | `analyze-component`            | Analyse un composant pour édition visuelle.  | Non  | appId/component info  | analyse        | N/A        |

## Détail des paramètres courants

| Nom                  | Type                            | Requis                            | Description                                         |
| -------------------- | ------------------------------- | --------------------------------- | --------------------------------------------------- |
| `appId`              | `number`                        | Oui pour les routes app-scoped    | Identifiant local de l'application dans SQLite.     |
| `chatId`             | `number`                        | Oui pour les routes chat-scoped   | Identifiant local du chat.                          |
| `filePath`           | `string`                        | Oui pour lecture/écriture fichier | Chemin relatif au projet, validé côté main process. |
| `query`              | `string`                        | Oui pour recherche                | Terme de recherche.                                 |
| `prompt`             | `string`                        | Oui pour génération IA            | Instruction utilisateur envoyée au modèle.          |
| `attachments`        | `ChatAttachment[]`              | Non                               | Pièces jointes encodées pour le chat.               |
| `selectedComponents` | `ComponentSelection[]`          | Non                               | Sélections visuelles de composants dans la preview. |
| `consent`            | `"ask" \| "always" \| "denied"` | Oui pour consentements            | Politique d'autorisation d'un outil MCP/agent.      |

> ⚠️ À compléter : certains contrats IPC contiennent des schémas Zod complexes non repris champ par champ ici afin de garder une référence publiable. Pour une documentation strictement exhaustive au niveau propriété, générer automatiquement les tableaux depuis `src/ipc/types/*`.
