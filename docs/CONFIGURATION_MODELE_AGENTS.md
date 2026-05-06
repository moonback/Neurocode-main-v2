# Configuration du Modèle pour les Agents

## Vue d'ensemble

Les agents multi-agents utilisent automatiquement le modèle sélectionné dans vos paramètres. Vous n'avez pas besoin de configurer séparément le modèle pour chaque agent.

## Comment ça fonctionne

### 1. Sélection du modèle

Les agents utilisent le modèle configuré dans **Paramètres → Modèle** :

```
Settings → Model → Selected Model
```

Le système lit automatiquement :

- Le **provider** (ex: OpenRouter, OpenAI, Anthropic, etc.)
- Le **nom du modèle** (ex: deepseek/deepseek-chat, gpt-4, claude-3-5-sonnet)
- La **clé API** associée au provider

### 2. Flux d'exécution

Quand un agent est lancé :

1. **Lecture des paramètres** : Le système lit `settings.selectedModel`
2. **Création du client** : `getModelClient()` crée un client pour le provider sélectionné
3. **Exécution** : L'agent utilise ce client pour communiquer avec le LLM

```typescript
// Dans agent_executor.ts
const settings = readSettings();
// settings.selectedModel contient votre configuration

// Dans local_agent_handler.ts
const { modelClient } = await getModelClient(settings.selectedModel, settings);
// modelClient est maintenant configuré pour votre modèle
```

## Configuration OpenRouter

### Étape 1 : Obtenir une clé API

1. Allez sur [OpenRouter](https://openrouter.ai/)
2. Créez un compte ou connectez-vous
3. Allez dans **Keys** pour créer une clé API
4. Copiez votre clé API

### Étape 2 : Configurer dans l'application

1. Ouvrez **Paramètres** (Settings)
2. Allez dans **Model**
3. Sélectionnez **OpenRouter** comme provider
4. Collez votre clé API dans le champ **API Key**
5. Sélectionnez un modèle (ex: `deepseek/deepseek-chat`)
6. Cliquez sur **Save**

### Étape 3 : Vérifier la configuration

Après avoir configuré OpenRouter, vous pouvez vérifier que tout fonctionne :

1. Allez dans l'onglet **Chat**
2. Envoyez un message simple
3. Si vous recevez une réponse, la configuration est correcte

## Logs de débogage

Avec les nouveaux logs ajoutés, vous pouvez maintenant voir exactement quel modèle est utilisé :

### Dans la console (DevTools)

Quand un agent démarre, vous verrez :

```
🔧 Reading settings for model configuration
📊 Model configuration
  - selectedModel: { provider: "openrouter", name: "deepseek/deepseek-chat" }
  - provider: "openrouter"
  - modelName: "deepseek/deepseek-chat"
  - hasOpenRouterKey: true

🔧 Getting model client
  - selectedModel: { provider: "openrouter", name: "deepseek/deepseek-chat" }
  - provider: "openrouter"
  - modelName: "deepseek/deepseek-chat"

✅ Model client obtained
  - builtinProviderId: "openrouter"
```

Ces logs confirment que :

- ✅ Le modèle OpenRouter est bien sélectionné
- ✅ La clé API est présente
- ✅ Le client a été créé avec succès

## Résolution des problèmes

### Erreur : "terminated_stream_retries_exhausted"

Cette erreur signifie que la connexion au LLM a échoué après plusieurs tentatives. Causes possibles :

#### 1. Clé API invalide ou expirée

**Solution** :

1. Vérifiez votre clé API dans **Paramètres → Model**
2. Assurez-vous qu'elle est valide sur le site du provider
3. Générez une nouvelle clé si nécessaire

#### 2. Quota dépassé

**Solution** :

1. Vérifiez votre compte sur le site du provider
2. Vérifiez que vous avez des crédits disponibles
3. Ajoutez des crédits si nécessaire

#### 3. Modèle non disponible

**Solution** :

1. Vérifiez que le modèle existe toujours
2. Essayez un autre modèle du même provider
3. Pour OpenRouter, consultez la liste des modèles disponibles : https://openrouter.ai/models

#### 4. Problème de connexion réseau

**Solution** :

1. Vérifiez votre connexion Internet
2. Vérifiez que votre firewall n'bloque pas les requêtes
3. Si vous utilisez un proxy, configurez-le correctement

#### 5. Rate limiting (trop de requêtes)

**Solution** :

1. Attendez quelques minutes avant de réessayer
2. Réduisez le nombre d'agents exécutés en parallèle
3. Vérifiez les limites de votre plan sur le site du provider

### Erreur : "No API keys available"

**Solution** :

1. Allez dans **Paramètres → Model**
2. Sélectionnez un provider
3. Entrez votre clé API
4. Sauvegardez

### Erreur : "Configuration not found for provider"

**Solution** :

1. Le provider sélectionné n'est pas supporté
2. Sélectionnez un provider supporté :
   - OpenRouter
   - OpenAI
   - Anthropic
   - Google
   - Azure
   - Vertex
   - Ollama (local)
   - LM Studio (local)

## Modèles recommandés pour les agents

### Pour OpenRouter

Les modèles suivants fonctionnent bien avec les agents :

1. **DeepSeek Chat** (`deepseek/deepseek-chat`)
   - Excellent rapport qualité/prix
   - Bon pour le code
   - Rapide

2. **Claude 3.5 Sonnet** (`anthropic/claude-3.5-sonnet`)
   - Très performant
   - Excellent pour le code
   - Plus cher

3. **GPT-4 Turbo** (`openai/gpt-4-turbo`)
   - Très performant
   - Polyvalent
   - Prix moyen

4. **Llama 3.1 70B** (`meta-llama/llama-3.1-70b-instruct`)
   - Gratuit sur OpenRouter
   - Bon pour les tâches simples
   - Moins performant pour le code complexe

### Pour OpenAI

- `gpt-4-turbo` : Recommandé pour les agents
- `gpt-4` : Très bon mais plus lent
- `gpt-3.5-turbo` : Économique mais moins performant

### Pour Anthropic

- `claude-3-5-sonnet-20241022` : Meilleur choix
- `claude-3-opus-20240229` : Très performant mais cher
- `claude-3-sonnet-20240229` : Bon compromis

## Vérification de la configuration

### Méthode 1 : Via les logs

1. Ouvrez DevTools (F12)
2. Allez dans l'onglet **Console**
3. Lancez un agent
4. Cherchez les logs avec 🔧 et 📊
5. Vérifiez que le modèle affiché est correct

### Méthode 2 : Via un test simple

1. Allez dans l'onglet **Chat**
2. Envoyez un message simple : "Bonjour"
3. Si vous recevez une réponse, le modèle fonctionne
4. Ensuite, testez avec un agent

### Méthode 3 : Via les paramètres

1. Ouvrez **Paramètres → Model**
2. Vérifiez que :
   - Un provider est sélectionné
   - Un modèle est sélectionné
   - Une clé API est présente (affichée comme `••••••••`)

## Exemples de configuration

### Configuration OpenRouter complète

```json
{
  "selectedModel": {
    "provider": "openrouter",
    "name": "deepseek/deepseek-chat"
  },
  "providerSettings": {
    "openrouter": {
      "apiKey": {
        "value": "sk-or-v1-...",
        "encryptionType": "electron-safe-storage"
      }
    }
  }
}
```

### Configuration OpenAI complète

```json
{
  "selectedModel": {
    "provider": "openai",
    "name": "gpt-4-turbo"
  },
  "providerSettings": {
    "openai": {
      "apiKey": {
        "value": "sk-...",
        "encryptionType": "electron-safe-storage"
      }
    }
  }
}
```

### Configuration Anthropic complète

```json
{
  "selectedModel": {
    "provider": "anthropic",
    "name": "claude-3-5-sonnet-20241022"
  },
  "providerSettings": {
    "anthropic": {
      "apiKey": {
        "value": "sk-ant-...",
        "encryptionType": "electron-safe-storage"
      }
    }
  }
}
```

## Support

Si vous rencontrez toujours des problèmes après avoir suivi ce guide :

1. Vérifiez les logs dans DevTools (F12 → Console)
2. Cherchez les messages d'erreur spécifiques
3. Vérifiez que votre clé API fonctionne sur le site du provider
4. Essayez un autre modèle du même provider
5. Essayez un autre provider pour isoler le problème

## Résumé

✅ **Les agents utilisent automatiquement le modèle sélectionné dans les paramètres**

✅ **Vous n'avez pas besoin de configurer chaque agent séparément**

✅ **Les nouveaux logs vous permettent de vérifier quelle configuration est utilisée**

✅ **L'erreur "terminated_stream_retries_exhausted" est généralement liée à la clé API ou au quota**
