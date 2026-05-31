# Roadmap — NeuroCode

Cette roadmap est déduite du code, des tests, des scripts et des documents existants. Elle ne remplace pas un planning produit officiel.

## V0 — Fonctionnalités déjà livrées

| Statut  | Domaine            | Élément                                                                                                           | Notes                                        |
| ------- | ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| ✅ Fait | Desktop            | Application Electron multi-process avec main, preload et renderer React.                                          | Packaging via Electron Forge.                |
| ✅ Fait | Apps locales       | Création, import, copie, renommage, suppression, lancement, arrêt et redémarrage d'applications.                  | Gestion fichiers et previews locales.        |
| ✅ Fait | Chat IA            | Chat streaming, historique, titres, suppression, recherche, annulation et comptage tokens.                        | Modes build/ask/local-agent/plan détectés.   |
| ✅ Fait | Génération de code | Écriture/édition/lecture de fichiers, ajout de dépendances, recherche codebase et traitement de réponses IA.      | Handlers et processeurs dédiés.              |
| ✅ Fait | Providers IA       | Support OpenAI, Anthropic, Google, Vertex, OpenRouter, Ollama, LM Studio, Azure, xAI, Bedrock, Minimax et NVIDIA. | Via AI SDK et settings providers.            |
| ✅ Fait | Modèles custom     | Providers et modèles IA personnalisés.                                                                            | Persistés en SQLite.                         |
| ✅ Fait | Git / GitHub       | Branches, commits, push/pull/fetch/rebase/merge, collaborateurs, clone et connexion repo.                         | GitHub OAuth/token.                          |
| ✅ Fait | Supabase           | Organisations, projets, branches, logs Edge et association à une app.                                             | Credentials par organisation.                |
| ✅ Fait | Neon               | Projets, branches, association app, active branch et configuration email/password.                                | Intégration DB externe.                      |
| ✅ Fait | Vercel             | Token, projets, disponibilité, connexion et déploiements.                                                         | Intégration déploiement.                     |
| ✅ Fait | MCP                | Serveurs MCP, outils et consentements.                                                                            | Tables `mcp_servers` et `mcp_tool_consents`. |
| ✅ Fait | Skills             | Création, import, validation, exécution, découverte et analytics de skills.                                       | Registry au démarrage.                       |
| ✅ Fait | Prompts            | CRUD prompts, optimisation et suggestions.                                                                        | Table `prompts`.                             |
| ✅ Fait | Thèmes             | Thèmes intégrés/custom, génération de prompts, images de thèmes.                                                  | Table `custom_themes`.                       |
| ✅ Fait | Médias             | Liste, renommage, suppression et déplacement de médias.                                                           | Nettoyage au démarrage.                      |
| ✅ Fait | Analytics tokens   | Statistiques, coûts, top consommateurs, export et usage over time.                                                | Table `token_analytics`.                     |
| ✅ Fait | Qualité            | Vitest, Playwright, Storybook, oxlint, oxfmt et typecheck.                                                        | Scripts npm disponibles.                     |

## V1 — Priorités court terme (< 3 mois)

| Statut      | Domaine       | Élément                                                                                 | Objectif                                                |
| ----------- | ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 📋 Planifié | Documentation | Générer automatiquement une référence IPC exhaustive depuis les contrats Zod.           | Éviter la dérive entre code et docs.                    |
| 📋 Planifié | DX            | Ajouter un script `docs:check` pour valider README/API/DB schema.                       | Sécuriser les PR documentation.                         |
| 📋 Planifié | Tests         | Couvrir les handlers IPC critiques avec tests d'intégration main process.               | Réduire les régressions sur Git, fichiers et providers. |
| 📋 Planifié | Sécurité      | Documenter et tester systématiquement les garde-fous path traversal et commandes shell. | Durcir les opérations locales.                          |
| 📋 Planifié | Observabilité | Harmoniser logs, debug bundle et métriques performance.                                 | Faciliter le support utilisateur.                       |
| 📋 Planifié | DB            | Ajouter une politique de migration documentée par version applicative.                  | Clarifier upgrades/downgrades.                          |
| 📋 Planifié | Onboarding    | Simplifier le setup provider IA et la détection Node/Ollama/LM Studio.                  | Réduire le temps avant première génération.             |
| 📋 Planifié | Accessibilité | Auditer les composants UI critiques.                                                    | Améliorer navigation clavier et lecteurs d'écran.       |

## V2+ — Vision long terme

| Statut  | Domaine       | Élément                                                                   | Objectif                                      |
| ------- | ------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| 💡 Idée | Collaboration | Workflows multi-utilisateurs autour des apps et branches.                 | Collaboration temps différé via Git/cloud.    |
| 💡 Idée | Marketplace   | Distribution de skills, prompts, thèmes et templates vérifiés.            | Étendre l'écosystème NeuroCode.               |
| 💡 Idée | Plugins       | API de plugins stable pour nouvelles intégrations.                        | Découpler les intégrations externes du core.  |
| 💡 Idée | Audit IA      | Traçabilité complète des actions agent, coûts et décisions.               | Conformité et debugging avancé.               |
| 💡 Idée | Sandboxes     | Isolation renforcée des previews et commandes générées.                   | Sécurité pour projets non fiables.            |
| 💡 Idée | Sync          | Sauvegarde/synchronisation chiffrée optionnelle des settings et metadata. | Portabilité entre machines.                   |
| 💡 Idée | Mobile        | Workflows Capacitor plus guidés et build mobile automatisé.               | Améliorer la sortie mobile des apps générées. |

## Backlog

| Statut  | Idée                                                   | Bénéfice                         |
| ------- | ------------------------------------------------------ | -------------------------------- |
| 💡 Idée | Export/import complet d'un workspace NeuroCode.        | Migration facile entre postes.   |
| 💡 Idée | Mode offline explicite avec modèles locaux uniquement. | Usage sans services cloud.       |
| 💡 Idée | Assistant de résolution de conflits Git.               | Réduction de friction GitHub.    |
| 💡 Idée | Profilage de prompts et recommandations de modèles.    | Optimiser coûts/latence/qualité. |
| 💡 Idée | Catalogue de tests générés pour les apps créées.       | Qualité des projets générés.     |
| 💡 Idée | Tableau de bord santé des intégrations externes.       | Support et diagnostic rapides.   |

> ⚠️ À compléter : aucun jalon produit officiel n'a été détecté dans le dépôt. Les items V1/V2+ sont proposés à partir des capacités existantes et des risques techniques observables.
