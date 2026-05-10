# Guide de Vérification du Système d'Optimisation des Tokens

Ce guide vous aide à vérifier que le système d'optimisation des tokens fonctionne correctement et enregistre les données dans le dashboard.

## Prérequis

Avant de commencer, assurez-vous que :

1. ✅ L'application est compilée avec les dernières modifications
2. ✅ Le système d'optimisation des tokens est activé dans les paramètres
3. ✅ Vous utilisez le mode **Agent Local** (pas le mode Chat simple)

## Étape 1 : Vérifier les Paramètres

1. Ouvrez **Settings** (Paramètres)
2. Allez dans la section **AI Settings**
3. Vérifiez que les options suivantes sont **activées** :
   - ✅ **Token Optimization** (Optimisation des tokens)
   - ✅ **Skill Caching** (Cache des compétences)
   - ✅ **Skill Preloading** (Préchargement des compétences)

## Étape 2 : Compiler l'Application

**IMPORTANT** : Vous devez compiler l'application pour que les modifications prennent effet.

```bash
npm run build
```

Attendez que la compilation se termine complètement avant de continuer.

## Étape 3 : Démarrer l'Application en Mode Développement

```bash
npm start
```

## Étape 4 : Ouvrir la Console de Développement

1. Dans l'application, appuyez sur **F12** ou **Ctrl+Shift+I** (Windows/Linux) ou **Cmd+Option+I** (Mac)
2. Allez dans l'onglet **Console**
3. Gardez cette console ouverte pour voir les logs

## Étape 5 : Utiliser le Mode Agent Local

**CRITIQUE** : Le système de tracking des tokens ne fonctionne QUE en mode **Agent Local**, pas en mode Chat simple.

### Comment activer le mode Agent Local :

1. Créez une nouvelle conversation ou ouvrez une conversation existante
2. Assurez-vous que vous êtes en mode **Agent** (pas en mode Chat)
3. Le mode Agent est celui qui permet à l'IA d'utiliser des outils (tools) pour exécuter des actions

### Envoyez une requête qui nécessite des outils :

Exemples de requêtes qui activeront le système :

```
"Lis le fichier README.md et résume-le"
"Crée un nouveau fichier test.js avec une fonction hello world"
"Liste les fichiers dans le dossier src/"
"Exécute npm test"
```

## Étape 6 : Vérifier les Logs dans la Console

Après avoir envoyé une requête en mode Agent Local, vous devriez voir les logs suivants dans la console :

### Logs d'Activation (au démarrage de la requête) :

```
🚀 Token Optimization System: ACTIVATING...
✅ Token Optimization System: ACTIVE and ready to track usage
📊 Token Budget Allocated: [nombre] tokens for chat [id] ([complexity] task complexity)
```

### Logs de Tracking (pendant/après la requête) :

```
📊 Tracking token usage: [nombre] tokens for conversation [id] (request: [requestId])
💾 TokenManager.trackUsage: Saving [nombre] tokens to database for conversation [id]
✅ TokenManager.trackUsage: Successfully saved token usage to database (requestId: [requestId])
✅ Token usage tracked successfully: [nombre] tokens saved to database
```

### Logs de Compétences (si des skills sont utilisés) :

```
📖 SkillLoader.loadMetadata: Loading metadata for skill [nom]
✅ Successfully loaded metadata
📚 SkillLoader.loadSkill: Loading full skill [nom]
✅ Successfully loaded skill
```

## Étape 7 : Vérifier le Dashboard

1. Allez dans **Settings** (Paramètres)
2. Cliquez sur le lien **"View Token Analytics Dashboard"** en bas de la section Token Optimization
3. Ou naviguez directement vers `/token-analytics` dans l'application

### Ce que vous devriez voir :

- **Statistiques** : Total des tokens, nombre de requêtes, moyenne par requête, coût estimé
- **Graphiques** :
  - Top Conversations (graphique à barres)
  - Distribution par modèle (graphique circulaire)
  - Coûts par modèle (graphique à barres empilées)
  - Top 10 Skills (liste)
- **Tableaux détaillés** :
  - Détails des conversations
  - Coûts par modèle

## Étape 8 : Dépannage

### Problème : Aucun log n'apparaît dans la console

**Solutions** :

1. Vérifiez que vous êtes bien en mode **Agent Local** (pas en mode Chat)
2. Recompilez l'application : `npm run build`
3. Redémarrez l'application complètement
4. Vérifiez que la console affiche bien les logs (pas de filtre actif)

### Problème : Les logs apparaissent mais le dashboard est vide

**Solutions** :

1. Vérifiez que les logs montrent bien "Successfully saved token usage to database"
2. Vérifiez qu'il n'y a pas d'erreur dans les logs (messages commençant par ❌)
3. Essayez de rafraîchir le dashboard (F5)
4. Vérifiez la base de données directement (voir section suivante)

### Problème : Erreur "Failed to track token usage"

**Solutions** :

1. Vérifiez que la base de données est accessible
2. Vérifiez qu'il n'y a pas de problème de migration de schéma
3. Consultez les logs d'erreur complets dans la console

## Étape 9 : Vérifier la Base de Données Directement

Si vous voulez vérifier que les données sont bien enregistrées dans la base de données :

1. Localisez le fichier de base de données SQLite (généralement dans le dossier de données de l'application)
2. Ouvrez-le avec un outil comme DB Browser for SQLite
3. Vérifiez la table `token_analytics`
4. Vous devriez voir des enregistrements avec :
   - `request_id` : ID de la requête
   - `conversation_id` : ID de la conversation
   - `timestamp` : Date/heure de l'enregistrement
   - `input_tokens` : Nombre de tokens d'entrée
   - `output_tokens` : Nombre de tokens de sortie
   - `total_tokens` : Total des tokens
   - `model_type` : Type de modèle utilisé

## Étape 10 : Exporter les Données

Si le dashboard fonctionne, vous pouvez exporter les données :

1. Dans le dashboard, cliquez sur le bouton **"Export"**
2. Choisissez le format (CSV ou JSON)
3. Les données seront téléchargées

## Logs Attendus - Exemple Complet

Voici un exemple de ce que vous devriez voir dans la console lors d'une requête réussie :

```
🚀 Token Optimization System: ACTIVATING...
✅ TokenManager initialized successfully
✅ ContextOptimizer initialized successfully
🚀 Token Optimization System is ready
✅ Token Optimization System: ACTIVE and ready to track usage
📊 Token Budget Allocated: 76800 tokens for chat 123 (medium task complexity)

[... exécution de la requête ...]

📊 Tracking token usage: 1234 tokens for conversation 123 (request: req-1234567890)
💾 TokenManager.trackUsage: Saving 1234 tokens to database for conversation 123
✅ TokenManager.trackUsage: Successfully saved token usage to database (requestId: req-1234567890)
✅ Token usage tracked successfully: 1234 tokens saved to database
Tracked 1234 tokens for chat 123 (total: 1234)
```

## Support

Si après avoir suivi toutes ces étapes, le système ne fonctionne toujours pas :

1. Vérifiez les logs d'erreur complets dans la console
2. Vérifiez les logs du processus principal (main process) si disponibles
3. Vérifiez qu'il n'y a pas de problème de migration de base de données
4. Consultez la documentation technique dans `docs/TOKEN_OPTIMIZATION.md`

## Résumé des Points Critiques

✅ **Mode Agent Local** : Le tracking ne fonctionne QUE en mode Agent Local
✅ **Compilation** : Vous devez compiler avec `npm run build` avant de tester
✅ **Console ouverte** : Gardez la console de développement ouverte pour voir les logs
✅ **Requêtes avec outils** : Utilisez des requêtes qui nécessitent des outils (lecture de fichiers, exécution de commandes, etc.)
✅ **Vérification des logs** : Les logs doivent montrer "Successfully saved token usage to database"
✅ **Dashboard** : Accessible via Settings → "View Token Analytics Dashboard" ou `/token-analytics`
