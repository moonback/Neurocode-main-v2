# 🚀 Guide d'Utilisation - Optimisation des Tokens

## Guide Rapide de Démarrage

Ce guide vous explique comment utiliser le système d'optimisation des tokens de NeuroCode pour réduire vos coûts et améliorer les performances.

---

## 📋 Table des Matières

1. [Activation du Système](#1-activation-du-système)
2. [Configuration de Base](#2-configuration-de-base)
3. [Utilisation Quotidienne](#3-utilisation-quotidienne)
4. [Surveillance et Analytics](#4-surveillance-et-analytics)
5. [Optimisation des Skills](#5-optimisation-des-skills)
6. [Cas d'Usage Courants](#6-cas-dusage-courants)
7. [Résolution de Problèmes](#7-résolution-de-problèmes)

---

## 1. Activation du Système

### Étape 1 : Ouvrir les Paramètres

1. Lancez NeuroCode
2. Cliquez sur l'icône ⚙️ (Paramètres) ou appuyez sur `Ctrl/Cmd + ,`
3. Naviguez vers la section **"AI Settings"**

### Étape 2 : Activer les Optimisations

Activez les trois options suivantes :

- ☑️ **Enable Token Optimization** - Active le système complet
- ☑️ **Enable Skill Caching** - Active le cache des skills
- ☑️ **Enable Skill Preloading** - Active le préchargement prédictif

### Étape 3 : Ajuster les Paramètres (Optionnel)

Paramètres par défaut recommandés :

- **Skill Cache Size** : `50` (augmentez si vous utilisez beaucoup de skills)
- **Skill Preloading Memory Limit** : `10` (réduisez si vous manquez de mémoire)

### ✅ Vérification

Une fois activé, vous devriez voir :

- Réduction immédiate de la consommation de tokens
- Chargement plus rapide des skills
- Réponses IA plus rapides

---

## 2. Configuration de Base

### Configuration Recommandée par Profil

#### 👤 Utilisateur Occasionnel

```
✅ Enable Token Optimization: ON
✅ Enable Skill Caching: ON
✅ Enable Skill Preloading: ON
📊 Skill Cache Size: 30
📊 Preloading Memory Limit: 5
```

**Pourquoi ?** Configuration légère, économies de tokens maximales.

#### 💼 Développeur Professionnel

```
✅ Enable Token Optimization: ON
✅ Enable Skill Caching: ON
✅ Enable Skill Preloading: ON
📊 Skill Cache Size: 50
📊 Preloading Memory Limit: 10
```

**Pourquoi ?** Équilibre optimal entre performance et utilisation mémoire.

#### 🏢 Équipe / Entreprise

```
✅ Enable Token Optimization: ON
✅ Enable Skill Caching: ON
✅ Enable Skill Preloading: ON
📊 Skill Cache Size: 100
📊 Preloading Memory Limit: 15
```

**Pourquoi ?** Performance maximale, nombreux skills partagés.

---

## 3. Utilisation Quotidienne

### Workflow Typique

#### 1. Démarrage d'une Conversation

```
Vous : "Crée un composant React pour un formulaire de contact"
```

**Ce qui se passe en arrière-plan :**

- ✅ Budget de tokens alloué automatiquement (tâche moyenne = 60%)
- ✅ Contexte optimisé (fichiers pertinents sélectionnés)
- ✅ Skills pertinents préchargés
- ✅ Duplicatas et logs supprimés du contexte

#### 2. Continuation de la Conversation

```
Vous : "Ajoute la validation des champs"
```

**Ce qui se passe en arrière-plan :**

- ✅ Tours de conversation récents priorisés
- ✅ Fichiers déjà mentionnés gardés en cache
- ✅ Compression automatique des longs fichiers
- ✅ Budget ajusté selon la complexité

#### 3. Utilisation de Skills

```
Vous : "/examples:code-review"
```

**Ce qui se passe en arrière-plan :**

- ✅ Skill chargé depuis le cache (si déjà utilisé)
- ✅ Dépendances résolues automatiquement
- ✅ Résultat mis en cache (si déterministe)
- ✅ Skill suivant préchargé (si prédit)

### Indicateurs Visuels

Surveillez ces indicateurs pendant l'utilisation :

- **TokenBar** : Affiche la consommation en temps réel
- **Temps de réponse** : Devrait être plus rapide avec l'optimisation
- **Qualité des réponses** : Devrait rester identique ou s'améliorer

---

## 4. Surveillance et Analytics

### Accéder aux Statistiques

#### Via l'Interface (À venir)

Un dashboard d'analytics sera bientôt disponible dans l'interface.

#### Via l'API (Développeurs)

```typescript
import { ipc } from "@/ipc/types";

// Statistiques globales
const stats = await ipc.tokenAnalytics.getStatistics({
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 derniers jours
  endDate: Date.now(),
});

console.log(`Total tokens: ${stats.totalTokens}`);
console.log(`Requêtes: ${stats.requestCount}`);
console.log(`Moyenne par requête: ${stats.averageTokensPerRequest}`);
```

### Métriques Clés à Surveiller

#### 1. Consommation Totale

```typescript
const stats = await ipc.tokenAnalytics.getStatistics({});
console.log(`Tokens utilisés: ${stats.totalTokens.toLocaleString()}`);
```

**Objectif :** Suivre l'évolution mensuelle, identifier les pics.

#### 2. Top Consommateurs

```typescript
const topConversations = await ipc.tokenAnalytics.getTopConsumers({
  type: "conversation",
  limit: 5,
});

topConversations.forEach((conv, i) => {
  console.log(
    `${i + 1}. ${conv.name}: ${conv.totalTokens.toLocaleString()} tokens (${conv.percentage.toFixed(1)}%)`,
  );
});
```

**Objectif :** Identifier les conversations coûteuses à optimiser.

#### 3. Coûts Estimés

```typescript
const costs = await ipc.tokenAnalytics.calculateCost({
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
});

console.log(`Coût total: $${costs.totalCost.toFixed(2)}`);
Object.entries(costs.byModel).forEach(([model, cost]) => {
  console.log(`  ${model}: $${cost.totalCost.toFixed(2)}`);
});
```

**Objectif :** Suivre les dépenses, budgétiser.

### Export des Données

#### Export CSV pour Excel

```typescript
const csvExport = await ipc.tokenAnalytics.exportUsageData({
  format: "csv",
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
});

// Sauvegarder le fichier
const fs = require("fs");
fs.writeFileSync(csvExport.filename, csvExport.data);
```

**Utilisation :** Analyse dans Excel, rapports mensuels.

#### Export JSON pour Analyse

```typescript
const jsonExport = await ipc.tokenAnalytics.exportUsageData({
  format: "json",
});

const data = JSON.parse(jsonExport.data);
// Analyse personnalisée...
```

**Utilisation :** Scripts d'analyse, intégration avec d'autres outils.

---

## 5. Optimisation des Skills

### Analyser un Skill Existant

```typescript
import { SkillAnalyzer } from "@/token-optimization";

const analyzer = new SkillAnalyzer();
const skillContent = fs.readFileSync("mon-skill.md", "utf-8");
const analysis = analyzer.analyzeSkill(skillContent);

// Afficher les résultats
console.log(`Tokens estimés: ${analysis.tokenEstimate.total}`);
console.log(`Score de qualité: ${analysis.qualityScore}/100`);

// Afficher les avertissements
analysis.warnings.forEach((warning) => {
  console.log(`⚠️ ${warning.type}: ${warning.message}`);
});

// Afficher les suggestions
analysis.suggestions.forEach((suggestion) => {
  console.log(
    `💡 ${suggestion.message} (économie: ${suggestion.estimatedSavings} tokens)`,
  );
});
```

### Créer un Skill Optimisé

#### ✅ Bonnes Pratiques

```markdown
---
name: mon-skill-optimise
description: Description concise en une ligne
---

# Mon Skill Optimisé

## Objectif

Décrivez l'objectif en 1-2 phrases.

## Instructions

1. Étape claire et concise
2. Évitez les répétitions
3. Utilisez des listes à puces

## Exemples

Un seul exemple représentatif suffit.

## Notes

Notes essentielles uniquement.
```

**Résultat :** ~800 tokens, score de qualité 90+

#### ❌ À Éviter

```markdown
---
name: mon-skill-verbose
description: Une très longue description qui explique tout en détail et répète les mêmes informations plusieurs fois...
---

# Mon Skill Verbose

## Description Détaillée

Longue description qui répète ce qui est déjà dans le frontmatter...

## Instructions Très Détaillées

1. Première étape avec beaucoup de détails inutiles et répétitions
2. Deuxième étape qui répète les mêmes concepts
3. Troisième étape avec encore plus de verbosité
   ...

## Nombreux Exemples

Exemple 1: ...
Exemple 2: (similaire à l'exemple 1)
Exemple 3: (encore similaire)
...

## Notes Très Longues

Beaucoup de notes qui auraient pu être condensées...
```

**Résultat :** >2000 tokens, score de qualité <60

### Valider un Skill

```typescript
import { SkillParser } from "@/token-optimization";

const parser = new SkillParser();
const skill = parser.parseSkill(skillContent);
const validation = parser.validateSkill(skill);

if (!validation.valid) {
  console.error("❌ Skill invalide:");
  validation.errors.forEach((error) => {
    console.error(`  - ${error.field}: ${error.message}`);
  });
} else {
  console.log("✅ Skill valide!");
  if (validation.warnings.length > 0) {
    console.log("⚠️ Avertissements:");
    validation.warnings.forEach((warning) => {
      console.log(`  - ${warning.field}: ${warning.message}`);
    });
  }
}
```

---

## 6. Cas d'Usage Courants

### Cas 1 : Réduire les Coûts Mensuels

**Objectif :** Réduire la facture mensuelle de 50%

**Actions :**

1. ✅ Activer toutes les optimisations
2. 📊 Identifier les top 5 conversations coûteuses
3. 🔍 Analyser pourquoi elles consomment beaucoup
4. ⚡ Optimiser les skills utilisés dans ces conversations
5. 📈 Surveiller l'évolution sur 2 semaines

**Résultat attendu :** 40-60% de réduction

### Cas 2 : Améliorer les Performances

**Objectif :** Réduire le temps de réponse de 30%

**Actions :**

1. ✅ Activer le cache et le préchargement
2. 📊 Augmenter la taille du cache à 100
3. 🔍 Identifier les skills lents (>5 secondes)
4. ⚡ Optimiser ou diviser ces skills
5. 📈 Mesurer l'amélioration

**Résultat attendu :** 30-50% plus rapide

### Cas 3 : Optimiser pour un Projet Spécifique

**Objectif :** Optimiser l'utilisation pour un gros projet

**Actions :**

1. 📊 Analyser les patterns d'utilisation du projet
2. 🔍 Identifier les fichiers fréquemment inclus
3. ⚡ Créer des skills spécifiques au projet
4. 📝 Documenter les conventions du projet
5. 🎯 Utiliser la stratégie "conservative" pour ce projet

**Résultat attendu :** Contexte plus pertinent, moins de tokens

### Cas 4 : Partage en Équipe

**Objectif :** Optimiser l'utilisation pour toute l'équipe

**Actions :**

1. 📝 Créer des skills partagés dans `.neurocode/skills/`
2. 📊 Configurer les paramètres recommandés pour l'équipe
3. 🔍 Former l'équipe aux bonnes pratiques
4. 📈 Surveiller les métriques d'équipe
5. 🎯 Ajuster selon les retours

**Résultat attendu :** Cohérence, économies d'échelle

---

## 7. Résolution de Problèmes

### Problème 1 : Consommation Élevée Malgré l'Optimisation

**Symptômes :**

- Consommation de tokens toujours élevée
- Pas de réduction visible

**Diagnostic :**

```typescript
// Vérifier si l'optimisation est active
const settings = await ipc.settings.getUserSettings();
console.log("Token optimization:", settings.enableTokenOptimization);
console.log("Skill caching:", settings.enableSkillCaching);
console.log("Skill preloading:", settings.enableSkillPreloading);
```

**Solutions :**

1. ✅ Vérifier que toutes les optimisations sont activées
2. 📊 Analyser les top consommateurs
3. 🔍 Vérifier les logs pour les erreurs
4. ⚡ Redémarrer l'application
5. 📝 Contacter le support si le problème persiste

### Problème 2 : Skills Lents à Charger

**Symptômes :**

- Délai avant l'exécution des skills
- Timeouts occasionnels

**Diagnostic :**

```typescript
// Vérifier les stats du cache
import { getSkillCacheStats } from "@/token-optimization";

const stats = getSkillCacheStats();
console.log("Cache hits:", stats.hits);
console.log("Cache misses:", stats.misses);
console.log(
  "Hit rate:",
  ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) + "%",
);
```

**Solutions :**

1. ✅ Augmenter la taille du cache
2. 📊 Activer le préchargement
3. 🔍 Vérifier les dépendances des skills
4. ⚡ Optimiser les skills lourds
5. 📝 Diviser les gros skills en plus petits

### Problème 3 : Utilisation Mémoire Élevée

**Symptômes :**

- Application lente
- Utilisation RAM élevée

**Diagnostic :**

```typescript
// Vérifier les paramètres de préchargement
const settings = await ipc.settings.getUserSettings();
console.log("Preloading limit:", settings.skillPreloadingMemoryLimit);
console.log("Cache size:", settings.skillCacheSize);
```

**Solutions :**

1. ✅ Réduire la limite de préchargement à 5
2. 📊 Réduire la taille du cache à 30
3. 🔍 Désactiver temporairement le préchargement
4. ⚡ Redémarrer l'application
5. 📝 Ajuster selon votre RAM disponible

### Problème 4 : Analytics Incorrectes

**Symptômes :**

- Statistiques incohérentes
- Données manquantes

**Diagnostic :**

```typescript
// Vérifier les données brutes
const rawData = await ipc.tokenAnalytics.exportUsageData({
  format: "json",
  startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
});

const data = JSON.parse(rawData.data);
console.log("Nombre d'entrées:", data.length);
console.log("Première entrée:", data[0]);
```

**Solutions :**

1. ✅ Vérifier que l'optimisation est activée
2. 📊 Exporter et vérifier les données manuellement
3. 🔍 Consulter les logs de l'application
4. ⚡ Réinitialiser la base de données analytics (dernier recours)
5. 📝 Contacter le support avec les logs

---

## 📞 Support et Ressources

### Documentation

- [Documentation Complète](TOKEN_OPTIMIZATION.md) - Guide technique détaillé
- [Spec Technique](../.kiro/specs/token-optimization-skills/) - Spécifications complètes

### Communauté

- **GitHub Issues** : Rapporter des bugs ou demander des fonctionnalités
- **Discord** : Poser des questions à la communauté
- **Email Support** : support@neurocode.dev

### Ressources Additionnelles

- [Exemples de Skills Optimisés](../examples/skills/) - Bibliothèque d'exemples
- [Tutoriels Vidéo](https://youtube.com/@neurocode) - Guides visuels
- [Blog](https://blog.neurocode.dev) - Articles et bonnes pratiques

---

## 🎓 Formation

### Niveau Débutant

1. ✅ Activer les optimisations de base
2. 📊 Comprendre les métriques principales
3. 🔍 Créer votre premier skill optimisé

**Durée estimée :** 30 minutes

### Niveau Intermédiaire

1. ✅ Maîtriser les analytics
2. 📊 Optimiser les skills existants
3. 🔍 Configurer pour votre workflow

**Durée estimée :** 2 heures

### Niveau Avancé

1. ✅ Intégration API programmatique
2. 📊 Création de dashboards personnalisés
3. 🔍 Optimisation avancée des skills

**Durée estimée :** 1 journée

---

## ✅ Checklist de Démarrage

Utilisez cette checklist pour vous assurer que tout est configuré correctement :

### Configuration Initiale

- [ ] Ouvrir les Paramètres (Ctrl/Cmd + ,)
- [ ] Activer "Enable Token Optimization"
- [ ] Activer "Enable Skill Caching"
- [ ] Activer "Enable Skill Preloading"
- [ ] Ajuster la taille du cache (recommandé: 50)
- [ ] Ajuster la limite de préchargement (recommandé: 10)

### Première Utilisation

- [ ] Créer une nouvelle conversation
- [ ] Observer la TokenBar
- [ ] Utiliser un skill (ex: `/examples:code-review`)
- [ ] Vérifier que le skill se charge rapidement

### Vérification

- [ ] Consulter les statistiques (si API disponible)
- [ ] Vérifier que la consommation est réduite
- [ ] Confirmer que les performances sont améliorées
- [ ] Tester plusieurs skills pour remplir le cache

### Optimisation Continue

- [ ] Analyser les top consommateurs chaque semaine
- [ ] Optimiser les skills lourds identifiés
- [ ] Exporter les données mensuellement
- [ ] Ajuster les paramètres selon l'utilisation

---

## 🎉 Félicitations !

Vous êtes maintenant prêt à utiliser le système d'optimisation des tokens de NeuroCode. Profitez de vos économies et de vos performances améliorées !

**Prochaines étapes suggérées :**

1. 📊 Créer votre premier skill optimisé
2. 🔍 Analyser vos patterns d'utilisation
3. ⚡ Partager vos skills avec votre équipe
4. 📈 Surveiller vos économies mensuelles

**Besoin d'aide ?** Consultez la [documentation complète](TOKEN_OPTIMIZATION.md) ou contactez le support.

---

**Dernière mise à jour :** 15 janvier 2024  
**Version :** 1.0.0
