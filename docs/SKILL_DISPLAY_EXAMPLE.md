# Exemple d'affichage des Skills dans le chat

## Vue d'ensemble

Ce document montre comment les skills apparaissent visuellement dans l'interface de chat de NeuroCode.

## Exemple 1 : Invocation d'un skill par commande slash

### Entrée utilisateur
```
/lint
```

### Affichage dans le chat

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /lint                                      │
│ Run pre-commit checks including formatting, linting...      │
│                                                         [▼]  │
├─────────────────────────────────────────────────────────────┤
│ Description : Run pre-commit checks including formatting,   │
│ linting, and type-checking, and fix any errors.             │
└─────────────────────────────────────────────────────────────┘

Je vais exécuter les vérifications pré-commit pour votre code.

┌─────────────────────────────────────────────────────────────┐
│ ⚡ Running formatting                                        │
│ Exécution de npm run fmt...                                 │
└─────────────────────────────────────────────────────────────┘
```

### Quand on clique pour développer

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /lint                                      │
│ Run pre-commit checks including formatting, linting...      │
│                                                         [▲]  │
├─────────────────────────────────────────────────────────────┤
│ Description : Run pre-commit checks including formatting,   │
│ linting, and type-checking, and fix any errors.             │
├─────────────────────────────────────────────────────────────┤
│ Instructions du skill :                                      │
│                                                              │
│ # Lint                                                       │
│                                                              │
│ Run pre-commit checks including formatting, linting, and    │
│ type-checking, and fix any errors.                          │
│                                                              │
│ ## Instructions                                              │
│                                                              │
│ 1. **Run formatting check and fix:**                        │
│    ```                                                       │
│    npm run fmt                                               │
│    ```                                                       │
│                                                              │
│ 2. **Run linting with auto-fix:**                           │
│    ```                                                       │
│    npm run lint:fix                                          │
│    ```                                                       │
│                                                              │
│ 3. **Fix remaining lint errors manually:**                  │
│    If there are lint errors that could not be auto-fixed,   │
│    read the affected files and fix the errors manually.     │
│                                                              │
│ 4. **Run type-checking:**                                   │
│    ```                                                       │
│    npm run ts                                                │
│    ```                                                       │
│                                                              │
│ 5. **Fix any type errors:**                                 │
│    If there are type errors, read the affected files and    │
│    fix them.                                                 │
│                                                              │
│ 6. **Re-run all checks to verify:**                         │
│    ```                                                       │
│    npm run fmt && npm run lint && npm run ts                │
│    ```                                                       │
│                                                              │
│ 7. **Summarize the results:**                               │
│    - Report which checks passed                             │
│    - List any fixes that were made manually                 │
│    - If all checks pass, confirm the code is ready to       │
│      commit                                                  │
└─────────────────────────────────────────────────────────────┘
```

## Exemple 2 : Chargement automatique d'un skill

### Entrée utilisateur
```
J'ai une erreur dans mon code, peux-tu m'aider à la déboguer ?
```

### Affichage dans le chat

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /examples:debug-error                      │
│ Debug an error or exception by analyzing stack traces...    │
│                                                         [▼]  │
├─────────────────────────────────────────────────────────────┤
│ Description : Debug an error or exception by analyzing      │
│ stack traces, logs, and relevant code.                      │
└─────────────────────────────────────────────────────────────┘

Je vais vous aider à déboguer cette erreur de manière systématique.
Pouvez-vous me fournir le message d'erreur complet et la stack trace ?
```

## Exemple 3 : Skill groupé avec namespace

### Entrée utilisateur
```
/git:commit
```

### Affichage dans le chat

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /git:commit                                │
│ Create a formatted Git commit message                       │
│                                                         [▼]  │
├─────────────────────────────────────────────────────────────┤
│ Description : Create a Git commit with a well-formatted     │
│ message following conventions.                               │
└─────────────────────────────────────────────────────────────┘

Je vais vous aider à créer un commit Git bien formaté.
```

## Exemple 4 : Skill en cours de chargement (streaming)

### Pendant le streaming

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /examples:code-review  ⏳ Chargement...   │
│ Perform thorough code review focusing on correctness...     │
│                                                         [▼]  │
└─────────────────────────────────────────────────────────────┘
```

### Après le chargement

```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /examples:code-review                      │
│ Perform thorough code review focusing on correctness...     │
│                                                         [▼]  │
├─────────────────────────────────────────────────────────────┤
│ Description : Perform a thorough code review focusing on    │
│ correctness, security, and best practices.                   │
└─────────────────────────────────────────────────────────────┘
```

## Caractéristiques visuelles

### Couleurs

- **Accent** : Violet (`purple`)
- **Badge du nom** : Fond violet clair, texte violet foncé
- **Icône** : ✨ Sparkles (violet)
- **Bordure** : Violet lors du survol

### États

1. **Collapsed (réduit)** : Affiche uniquement l'en-tête et la description
2. **Expanded (développé)** : Affiche les instructions complètes du skill
3. **Pending (en cours)** : Indicateur de chargement animé
4. **Finished (terminé)** : État normal, prêt à être consulté
5. **Aborted (interrompu)** : Indicateur "Non chargé"

### Interactions

- **Clic sur la carte** : Développe/réduit le contenu
- **Clic sur [▼]/[▲]** : Développe/réduit le contenu
- **Survol** : Bordure violette et curseur pointer

## Comparaison avec d'autres composants

### DyadWrite (bleu)
```
┌─────────────────────────────────────────────────────────────┐
│ ✏️ file.tsx                                                  │
│ src/components/file.tsx                                      │
│                                                         [▼]  │
└─────────────────────────────────────────────────────────────┘
```

### DyadSkill (violet)
```
┌─────────────────────────────────────────────────────────────┐
│ ✨ Skill utilisé  /lint                                      │
│ Run pre-commit checks...                                     │
│                                                         [▼]  │
└─────────────────────────────────────────────────────────────┘
```

### DyadRead (vert)
```
┌─────────────────────────────────────────────────────────────┐
│ 📖 file.tsx                                                  │
│ src/components/file.tsx                                      │
│                                                         [▼]  │
└─────────────────────────────────────────────────────────────┘
```

## Avantages de l'affichage

1. **Transparence** : L'utilisateur voit clairement quel skill guide l'IA
2. **Traçabilité** : Historique des skills utilisés dans la conversation
3. **Apprentissage** : L'utilisateur peut voir les instructions du skill
4. **Cohérence** : Design uniforme avec les autres composants de chat
5. **Accessibilité** : Contenu développable pour ne pas encombrer le chat

## Notes d'implémentation

- Le composant utilise les primitives `DyadCard` pour la cohérence
- Le contenu est rendu avec `CodeHighlight` pour la coloration Markdown
- L'état est géré automatiquement par le parser Markdown
- Le tag est compatible avec le streaming de réponses

---

**Note** : Les exemples ci-dessus sont des représentations textuelles. L'interface réelle utilise des composants React avec styling Tailwind CSS.
