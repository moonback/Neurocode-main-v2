# Configuration de la Génération d'Images

## 🎯 Solutions Supportées

Le code essaie maintenant les fournisseurs dans cet ordre :

1. **OpenAI DALL-E 3** (Recommandé) ✅
   - Utilise l'API OpenAI directement
   - Endpoint: `https://api.openai.com/v1/images/generations`
   - Modèle: `dall-e-3`
   - Qualité: standard, taille: 1024x1024
   - **Le plus fiable et de meilleure qualité**

2. **OpenRouter** (Alternative) ✅
   - Utilise l'endpoint `/api/v1/chat/completions` avec le paramètre `modalities: ["image", "text"]`
   - Modèles recommandés:
     - `google/gemini-2.5-flash-image` (par défaut)
     - `black-forest-labs/flux.2-pro`
     - `black-forest-labs/flux.2-flex`
   - Fonctionne avec les modèles qui supportent la génération d'images

## 📝 Configuration Recommandée

### Option 1: OpenAI (Recommandé)

1. Aller dans **Paramètres** → **Fournisseurs d'IA** → **OpenAI**
2. Configurer une clé API OpenAI
3. La génération d'images utilisera automatiquement DALL-E 3

### Option 2: OpenRouter (Alternative)

1. Aller dans **Paramètres** → **Fournisseurs d'IA** → **OpenRouter**
2. Configurer une clé API OpenRouter
3. Dans la section **"Modèle de Génération d'Images"**, saisir un des modèles suivants:
   - `google/gemini-2.5-flash-image` (recommandé, par défaut)
   - `black-forest-labs/flux.2-pro` (haute qualité)
   - `black-forest-labs/flux.2-flex` (flexible)
4. Cliquer sur **"Enregistrer"**

## 🔧 Fichiers Modifiés

### 1. `src/pro/main/ipc/handlers/local_agent/tools/generate_image.ts`
- ✅ Priorité à OpenAI si une clé est configurée
- ✅ Fallback vers OpenRouter avec le modèle configuré
- ✅ Utilise l'endpoint `/chat/completions` avec `modalities: ["image", "text"]`
- ✅ Extrait l'image depuis `message.images[0].image_url.url`
- ✅ Supporte les URLs base64 et les URLs régulières
- ✅ Messages d'erreur clairs en français
- ✅ Modèle par défaut OpenRouter: `google/gemini-2.5-flash-image`

### 2. `src/components/settings/ApiKeyConfiguration.tsx`
- ✅ Section "Modèle de Génération d'Images" pour OpenRouter
- ✅ Interface en français

### 3. `src/components/settings/ProviderSettingsPage.tsx`
- ✅ Gestion de l'état et sauvegarde du modèle d'image

### 4. `src/lib/schemas.ts`
- ✅ Champ `imageModel` dans le schéma

## 🎨 Modèles Supportés

### Via OpenAI (Recommandé)
- ✅ `dall-e-3` (automatique, haute qualité)

### Via OpenRouter
- ✅ `google/gemini-2.5-flash-image` (recommandé, rapide)
- ✅ `google/gemini-3.1-flash-image-preview` (avec options avancées)
- ✅ `black-forest-labs/flux.2-pro` (haute qualité)
- ✅ `black-forest-labs/flux.2-flex` (flexible)
- ✅ `sourceful/riverflow-v2-fast` (rapide)
- ✅ `sourceful/riverflow-v2-pro` (professionnel)

**Note**: Vérifiez que le modèle a "image" dans ses `output_modalities` sur https://openrouter.ai/models

## 💡 Comparaison des Fournisseurs

### OpenAI DALL-E 3
**Avantages:**
- API dédiée `/images/generations`
- Qualité d'image excellente et cohérente
- Très fiable
- Documentation claire

**Inconvénients:**
- Nécessite une clé API OpenAI séparée
- Coût potentiellement plus élevé

### OpenRouter
**Avantages:**
- Accès à plusieurs modèles de génération d'images
- Une seule clé API pour chat et images
- Flexibilité dans le choix du modèle
- Modèles comme Gemini et Flux disponibles

**Inconvénients:**
- Qualité variable selon le modèle
- Nécessite de spécifier le bon modèle
- Certains modèles peuvent être indisponibles temporairement

## ⚙️ Fonctionnement

```
1. Vérifier si clé OpenAI existe
   ├─ OUI → Utiliser OpenAI DALL-E 3
   └─ NON → Vérifier si clé OpenRouter existe
              ├─ OUI → Essayer OpenRouter avec modèle configuré
              └─ NON → Erreur: Aucune clé configurée
```

## 🐛 Dépannage

### Logs de Débogage

Les logs détaillés sont affichés dans le **terminal où l'application est lancée** (pas dans la console du navigateur). Vous y verrez:
- Quel fournisseur est utilisé (OpenAI ou OpenRouter)
- Le modèle utilisé pour OpenRouter
- La structure complète de la réponse de l'API
- Les détails de l'extraction de l'image

**Pour voir les logs:**
1. Lancez l'application depuis un terminal avec `npm run build && npm start`
2. Demandez à l'agent de générer une image
3. Regardez les logs dans le terminal pour voir les détails

### "Aucune clé API configurée"
**Solution**: Configurez une clé API OpenAI dans Paramètres > Fournisseurs d'IA > OpenAI

### "Le modèle ne supporte pas la génération d'images"
**Solution**: 
- Vérifiez que le modèle a "image" dans ses `output_modalities` sur https://openrouter.ai/models
- Essayez un des modèles recommandés: `google/gemini-2.5-flash-image`, `black-forest-labs/flux.2-pro`
- Ou configurez une clé OpenAI pour utiliser DALL-E directement

### "Could not extract image from OpenRouter response"
**Cause**: Le modèle n'a pas retourné d'image dans le format attendu
**Solution**: 
- Vérifiez les logs dans le terminal pour voir la réponse complète
- Essayez un autre modèle de la liste des modèles supportés
- Assurez-vous que votre clé OpenRouter a accès au modèle choisi

## 📊 Comparaison Technique

| Fournisseur | Endpoint | Paramètres | Format Réponse | Status |
|-------------|----------|------------|----------------|--------|
| OpenAI | `/images/generations` | `model`, `prompt`, `size` | `data[0].url` ou `data[0].b64_json` | ✅ Fonctionne |
| OpenRouter | `/chat/completions` | `model`, `messages`, `modalities: ["image", "text"]` | `choices[0].message.images[0].image_url.url` | ✅ Fonctionne |

## 🎯 Recommandation Finale

### Pour la meilleure qualité et fiabilité
**Utilisez OpenAI avec DALL-E 3** - C'est la solution la plus fiable et de meilleure qualité.

### Pour plus de flexibilité
**Utilisez OpenRouter** avec un des modèles recommandés:
- `google/gemini-2.5-flash-image` - Bon équilibre qualité/vitesse
- `black-forest-labs/flux.2-pro` - Haute qualité artistique
- `sourceful/riverflow-v2-pro` - Images professionnelles

### Comment Tester
1. Configurez votre clé API (OpenAI ou OpenRouter)
2. Si OpenRouter, définissez le modèle dans les paramètres
3. Demandez à l'agent de générer une image
4. Vérifiez les logs dans le terminal pour voir les détails de la requête/réponse
5. Si erreur, essayez un autre modèle de la liste

## 🧪 Tests Manuels

### Test avec OpenAI
```bash
# 1. Configurez une clé OpenAI dans Paramètres > Fournisseurs d'IA > OpenAI
# 2. Dans le chat, demandez:
"Génère une image d'un coucher de soleil sur la mer"

# 3. Vérifiez dans le terminal:
# - "Using OpenAI DALL-E for image generation"
# - "Image generation completed, saved to: .dyad/media/generated-..."
```

### Test avec OpenRouter
```bash
# 1. Configurez une clé OpenRouter dans Paramètres > Fournisseurs d'IA > OpenRouter
# 2. Définissez le modèle: "google/gemini-2.5-flash-image"
# 3. Dans le chat, demandez:
"Génère une image d'une montagne enneigée"

# 4. Vérifiez dans le terminal:
# - "Using OpenRouter with model: google/gemini-2.5-flash-image"
# - "OpenRouter response received. Full response structure: ..."
# - "Found images array with X image(s)"
# - "Found image URL: ..."
# - "Image generation completed, saved to: .dyad/media/generated-..."
```

### Si Erreur
Si vous voyez une erreur, les logs détaillés dans le terminal vous indiqueront:
- La structure de la réponse de l'API
- Si des images ont été trouvées
- Le format de l'image (base64 ou URL)
- Pourquoi l'extraction a échoué

Utilisez ces informations pour:
1. Vérifier que le modèle supporte bien la génération d'images
2. Essayer un autre modèle de la liste recommandée
3. Vérifier que votre clé API a accès au modèle choisi
