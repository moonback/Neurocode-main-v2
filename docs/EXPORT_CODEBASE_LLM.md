# Export Codebase pour LLM

## Vue d'ensemble

Cette fonctionnalité permet d'exporter l'intégralité de votre codebase en un seul fichier Markdown optimisé pour les LLM (Large Language Models). Le fichier généré contient tous vos fichiers de code source dans un format structuré et facile à analyser.

## 🎯 Cas d'usage

- **Analyse de code par IA** : Fournir tout votre code à un LLM pour analyse complète
- **Documentation automatique** : Générer de la documentation basée sur l'ensemble du code
- **Revue de code** : Partager facilement tout le code avec un LLM pour revue
- **Migration** : Analyser un projet complet avant migration
- **Apprentissage** : Permettre à un LLM de comprendre l'architecture complète

## 📍 Accès à la fonctionnalité

### Via l'interface

1. Allez dans **Apps** (page d'accueil)
2. Cliquez sur une application
3. Vous verrez le bouton **"Exporter pour LLM"** sous le bouton "Open in Chat"
4. Cliquez sur le bouton

### Dialogue d'export

Le dialogue vous permet de configurer l'export :

#### Options disponibles

- **Inclure les fichiers de tests** : Ajoute les fichiers `*.test.ts`, `*.spec.js`, etc.
- **Inclure les fichiers cachés** : Ajoute `.env.example`, `.gitignore`, etc.

#### Ce qui est inclus automatiquement

✅ Tous les fichiers de code source (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, etc.)  
✅ Fichiers de configuration (`.json`, `.yaml`, `.toml`, etc.)  
✅ Documentation (`.md`, `.txt`)  
✅ Fichiers de build (`Dockerfile`, `Makefile`)  
✅ Structure de dossiers complète

#### Ce qui est exclu automatiquement

🚫 `node_modules/`  
🚫 `.git/`  
🚫 `dist/`, `build/`, `.next/`, `.nuxt/`  
🚫 `coverage/`, `.cache/`  
🚫 Fichiers binaires  
🚫 Fichiers > 1MB (configurable)  
🚫 `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`

## 📄 Format du fichier généré

### Structure

Le fichier Markdown généré contient :

1. **En-tête** : Informations sur l'export (date, chemin, nombre de fichiers, taille totale)
2. **Table des matières** : Liste cliquable de tous les fichiers
3. **Fichiers** : Chaque fichier avec son contenu dans un bloc de code avec coloration syntaxique
4. **Résumé** : Statistiques finales

### Exemple de structure

````markdown
# Codebase Export: Mon Application

**Generated:** 2026-05-06T10:30:00.000Z  
**Path:** `/Users/me/projects/mon-app`  
**Files:** 42  
**Total Size:** 156.78 KB

---

## Table of Contents

1. [src/index.ts](#file-1)
2. [src/components/Button.tsx](#file-2)
   ...

---

## File 1: `src/index.ts` {#file-1}

**Language:** typescript  
**Size:** 1234 bytes

```typescript
import { App } from "./App";

function main() {
  const app = new App();
  app.start();
}

main();
```
````

---

## File 2: `src/components/Button.tsx` {#file-2}

**Language:** tsx  
**Size:** 2345 bytes

```tsx
import React from "react";

export function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

---

...

```

### Coloration syntaxique

Le fichier utilise les blocs de code Markdown avec spécification du langage pour une meilleure lisibilité :

- TypeScript : `typescript`, `tsx`
- JavaScript : `javascript`, `jsx`
- Python : `python`
- CSS : `css`, `scss`, `sass`
- HTML : `html`
- JSON : `json`
- YAML : `yaml`
- Et bien d'autres...

## 🚀 Utilisation

### Étape 1 : Exporter

1. Cliquez sur **"Exporter pour LLM"**
2. Configurez les options selon vos besoins
3. Cliquez sur **"Exporter"**
4. Attendez la fin de l'export (quelques secondes)

### Étape 2 : Localiser le fichier

Le fichier est automatiquement sauvegardé dans le dossier de votre application avec le nom :

```

codebase-export-[timestamp].md

````

Exemple : `codebase-export-1715000000000.md`

Après l'export, le dossier contenant le fichier s'ouvre automatiquement.

### Étape 3 : Utiliser avec un LLM

#### Option 1 : Copier-coller

1. Ouvrez le fichier `.md` dans un éditeur de texte
2. Copiez tout le contenu
3. Collez dans votre LLM préféré (ChatGPT, Claude, etc.)

#### Option 2 : Upload de fichier

Si votre LLM supporte l'upload de fichiers :

1. Uploadez directement le fichier `.md`
2. Le LLM pourra analyser tout le code

#### Option 3 : API

Utilisez le contenu du fichier dans vos appels API :

```typescript
const codebase = await fs.readFile('codebase-export-xxx.md', 'utf-8');

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    {
      role: 'system',
      content: 'You are a code reviewer.',
    },
    {
      role: 'user',
      content: `Review this codebase:\n\n${codebase}`,
    },
  ],
});
````

## 💡 Exemples d'utilisation avec LLM

### Exemple 1 : Analyse d'architecture

```
Prompt : "Voici ma codebase complète. Analyse l'architecture et suggère des améliorations."

[Coller le contenu du fichier exporté]
```

### Exemple 2 : Génération de documentation

```
Prompt : "Génère une documentation complète pour ce projet, incluant :
- Vue d'ensemble de l'architecture
- Guide d'installation
- Documentation de l'API
- Exemples d'utilisation

[Coller le contenu du fichier exporté]
```

### Exemple 3 : Détection de bugs

```
Prompt : "Analyse ce code et identifie les bugs potentiels, les problèmes de sécurité, et les mauvaises pratiques."

[Coller le contenu du fichier exporté]
```

### Exemple 4 : Refactoring

```
Prompt : "Suggère un plan de refactoring pour améliorer la maintenabilité de ce code."

[Coller le contenu du fichier exporté]
```

### Exemple 5 : Migration

```
Prompt : "Je veux migrer ce projet de JavaScript vers TypeScript. Crée un plan de migration détaillé."

[Coller le contenu du fichier exporté]
```

## ⚙️ Configuration avancée

### Taille maximale des fichiers

Par défaut, les fichiers de plus de 1MB sont exclus. Vous pouvez modifier cette limite dans le code :

```typescript
// src/ipc/handlers/codebase_export_handler.ts
const maxFileSize = options.maxFileSize || 1024 * 1024; // 1MB
```

### Patterns d'exclusion personnalisés

Vous pouvez ajouter des patterns d'exclusion supplémentaires :

```typescript
// src/ipc/handlers/codebase_export_handler.ts
const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/.git/**",
  // Ajoutez vos patterns ici
  "**/mon-dossier-a-exclure/**",
];
```

### Extensions de fichiers

Pour ajouter de nouvelles extensions de fichiers :

```typescript
// src/ipc/handlers/codebase_export_handler.ts
const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  // Ajoutez vos extensions ici
  ".vue",
  ".svelte",
];
```

## 📊 Statistiques

Après l'export, vous verrez :

- **Nombre de fichiers** inclus
- **Taille totale** du fichier généré
- **Chemin** du fichier exporté

Exemple :

```
✅ Export réussi: 42 fichiers exportés (156.78 KB)
```

## 🔧 Dépannage

### Problème : Export trop volumineux

**Cause** : Trop de fichiers ou fichiers trop gros

**Solutions** :

1. Décochez "Inclure les fichiers de tests"
2. Réduisez la taille maximale des fichiers
3. Ajoutez des patterns d'exclusion pour les dossiers volumineux

### Problème : Fichiers manquants

**Cause** : Extensions non reconnues ou fichiers trop gros

**Solutions** :

1. Vérifiez que l'extension est dans `CODE_EXTENSIONS`
2. Augmentez `maxFileSize` si nécessaire
3. Vérifiez les logs pour voir quels fichiers sont ignorés

### Problème : Erreur lors de l'export

**Cause** : Permissions de fichiers ou chemin invalide

**Solutions** :

1. Vérifiez que vous avez les permissions de lecture sur tous les fichiers
2. Vérifiez que le chemin de l'application est valide
3. Consultez les logs dans DevTools (F12 → Console)

## 🎨 Personnalisation de l'interface

Le bouton d'export peut être personnalisé :

```tsx
<CodebaseExportButton
  appId={appId}
  variant="outline" // ou "default", "ghost"
  size="lg" // ou "default", "sm", "icon"
  className="w-full py-5" // classes CSS personnalisées
/>
```

## 🔐 Sécurité

### Données sensibles

⚠️ **ATTENTION** : Le fichier exporté contient tout votre code source. Assurez-vous de :

- Ne PAS inclure de fichiers `.env` (ils sont exclus par défaut)
- Vérifier qu'aucune clé API n'est en dur dans le code
- Ne PAS partager le fichier publiquement s'il contient du code propriétaire

### Bonnes pratiques

✅ Utilisez `.env.example` au lieu de `.env`  
✅ Stockez les secrets dans des variables d'environnement  
✅ Ajoutez des patterns d'exclusion pour les fichiers sensibles  
✅ Revoyez le fichier exporté avant de le partager

## 📈 Limites

### Taille des LLM

La plupart des LLM ont des limites de contexte :

- **GPT-4** : ~128K tokens (~300-400 fichiers moyens)
- **Claude 3** : ~200K tokens (~500-600 fichiers moyens)
- **GPT-3.5** : ~16K tokens (~40-50 fichiers moyens)

Si votre export est trop volumineux :

1. Désactivez les tests
2. Exportez seulement certains dossiers
3. Divisez en plusieurs exports

### Performance

L'export est rapide pour la plupart des projets :

- **Petit projet** (< 50 fichiers) : < 1 seconde
- **Projet moyen** (50-200 fichiers) : 1-3 secondes
- **Grand projet** (200-500 fichiers) : 3-10 secondes
- **Très grand projet** (> 500 fichiers) : 10-30 secondes

## 🚀 Roadmap

Fonctionnalités futures possibles :

- [ ] Export sélectif par dossier
- [ ] Export avec filtres personnalisés
- [ ] Compression du fichier
- [ ] Export en d'autres formats (JSON, XML)
- [ ] Intégration directe avec les API LLM
- [ ] Historique des exports
- [ ] Comparaison entre exports

## 💬 Support

Si vous rencontrez des problèmes :

1. Consultez les logs dans DevTools (F12 → Console)
2. Vérifiez la section Dépannage ci-dessus
3. Créez une issue sur GitHub avec :
   - Le message d'erreur
   - Les logs de la console
   - La taille approximative de votre projet

---

**Prêt à exporter ?** Cliquez sur le bouton "Exporter pour LLM" dans la page de détails de votre application !
