# Utilisation du tag dyad-skill

## Vue d'ensemble

Le tag `<dyad-skill>` permet d'afficher visuellement dans le chat quand un skill est chargé et utilisé par l'IA. Cela améliore la transparence et permet à l'utilisateur de comprendre quel skill guide les actions de l'IA.

## Format du tag

```xml
<dyad-skill name="skill-name" description="Brief description">
Contenu complet du skill en Markdown
</dyad-skill>
```

### Attributs

- **name** (requis) : Le nom du skill (ex: `lint`, `examples:code-review`)
- **description** (optionnel) : Description brève du skill
- **state** (automatique) : État du chargement (`pending`, `finished`, `aborted`)

### Contenu

Le contenu du tag doit contenir les instructions complètes du skill en Markdown, telles qu'elles apparaissent dans le fichier SKILL.md (sans le frontmatter).

## Quand utiliser ce tag

L'IA doit utiliser ce tag dans les situations suivantes :

### 1. Invocation explicite par commande slash

Quand l'utilisateur invoque un skill avec `/skill-name` :

```xml
<dyad-skill name="lint" description="Run pre-commit checks">
# Lint

Run pre-commit checks including formatting, linting, and type-checking.

## Instructions

1. Run formatting check and fix:
```

npm run fmt

```
...
</dyad-skill>
```

### 2. Chargement automatique suggéré

Quand l'IA détecte qu'un skill est pertinent et le charge automatiquement :

```xml
<dyad-skill name="examples:debug-error" description="Debug an error systematically">
# Debug Error

Debug an error or exception by analyzing stack traces, logs, and relevant code.

## Instructions

1. **Gather information:**
   - Ask the user to provide the error message and stack trace
...
</dyad-skill>
```

### 3. Skill groupé

Pour les skills avec namespace :

```xml
<dyad-skill name="git:commit" description="Create a formatted Git commit">
# Git Commit

Create a Git commit with a well-formatted message.

## Instructions

1. Check modified files with `git status`
2. Add files with `git add`
...
</dyad-skill>
```

## Placement dans la réponse

Le tag `<dyad-skill>` doit être placé **au début de la réponse** de l'IA, avant toute autre action, explication ou même tag `<think>` :

```xml
<dyad-skill name="examples:code-review" description="Perform thorough code review">
# Code Review

Perform a thorough code review focusing on correctness, security, and best practices.
...
</dyad-skill>

<think>
[Processus de réflexion sur la revue de code]
</think>

Je vais maintenant effectuer une revue de code approfondie de votre fichier.

<dyad-read path="src/components/MyComponent.tsx">
...
</dyad-read>
```

## Exemples complets

### Exemple 1 : Skill de linting

```xml
<dyad-skill name="lint" description="Run pre-commit checks">
# Lint

Run pre-commit checks including formatting, linting, and type-checking, and fix any errors.

## Instructions

1. **Run formatting check and fix:**
```

npm run fmt

```

2. **Run linting with auto-fix:**
```

npm run lint:fix

```

3. **Fix remaining lint errors manually:**
If there are lint errors that could not be auto-fixed, read the affected files and fix the errors manually.

4. **Run type-checking:**
```

npm run ts

```

5. **Fix any type errors:**
If there are type errors, read the affected files and fix them.

6. **Re-run all checks to verify:**
```

npm run fmt && npm run lint && npm run ts

```

7. **Summarize the results:**
- Report which checks passed
- List any fixes that were made manually
- If all checks pass, confirm the code is ready to commit
</dyad-skill>

Je vais exécuter les vérifications pré-commit pour votre code.
```

### Exemple 2 : Skill de revue de code

```xml
<dyad-skill name="examples:code-review" description="Perform thorough code review">
# Code Review

Perform a thorough code review focusing on correctness, security, and best practices.

## Instructions

1. **Understand the context:**
   - Ask the user which files or PR to review
   - Read the relevant files or diff
   - Understand the purpose of the changes

2. **Check correctness:**
   - Verify logic is sound and handles edge cases
   - Check for potential bugs or race conditions
   - Ensure error handling is appropriate

3. **Check security:**
   - Look for potential security vulnerabilities
   - Verify authentication and authorization checks
   - Check for sensitive data exposure

4. **Check best practices:**
   - Verify code follows project conventions
   - Check for code duplication
   - Ensure proper naming and documentation

5. **Provide feedback:**
   - Summarize findings in categories
   - Provide specific line references
   - Suggest concrete improvements
</dyad-skill>

Je vais effectuer une revue de code complète. Quels fichiers souhaitez-vous que je révise ?
```

### Exemple 3 : Skill de débogage

```xml
<dyad-skill name="examples:debug-error" description="Debug an error systematically">
# Debug Error

Debug an error or exception by analyzing stack traces, logs, and relevant code.

## Instructions

1. **Gather information:**
   - Ask the user to provide the error message and stack trace
   - Request any relevant logs or console output
   - Understand when and how the error occurs

2. **Analyze the stack trace:**
   - Identify the exact line where the error occurred
   - Trace the call stack to understand the execution path
   - Read the relevant source files

3. **Identify the root cause:**
   - Examine the code at the error location
   - Check variable values and state at the point of failure
   - Look for common issues

4. **Propose a fix:**
   - Explain the root cause clearly
   - Suggest one or more solutions
   - Recommend the best solution with reasoning

5. **Implement the fix:**
   - Make the necessary code changes
   - Add error handling if needed
   - Verify the fix resolves the issue
</dyad-skill>

Je vais vous aider à déboguer cette erreur de manière systématique. Pouvez-vous me fournir le message d'erreur complet et la stack trace ?
```

## Bonnes pratiques

### ✅ À faire

1. **Toujours inclure le nom du skill** dans l'attribut `name`
2. **Placer le tag au début** de la réponse
3. **Inclure le contenu complet** du skill (sans frontmatter)
4. **Ajouter une description** pour clarifier l'objectif
5. **Suivre les instructions** du skill après l'avoir affiché

### ❌ À éviter

1. **Ne pas omettre le tag** quand un skill est utilisé
2. **Ne pas placer le tag au milieu** de la réponse
3. **Ne pas modifier** le contenu du skill
4. **Ne pas utiliser le tag** pour du contenu qui n'est pas un skill
5. **Ne pas oublier** de fermer le tag correctement

## Affichage dans l'interface

Le composant `DyadSkill` affiche :

- **En-tête** : Icône ✨ + "Skill utilisé" + nom du skill en badge
- **Description** : Sous-titre avec la description du skill
- **État** : Indicateur de chargement si en cours
- **Contenu** : Instructions complètes du skill (expandable)
- **Couleur** : Accent violet pour distinguer des autres actions

### États possibles

- **pending** : Chargement en cours (pendant le streaming)
- **finished** : Chargement terminé avec succès
- **aborted** : Chargement interrompu

## Intégration avec le système de skills

Le tag `<dyad-skill>` est complémentaire au système de skills :

1. **Découverte** : Les skills sont découverts via `SkillRegistry`
2. **Invocation** : L'utilisateur tape `/skill-name` ou l'IA charge automatiquement
3. **Affichage** : L'IA utilise `<dyad-skill>` pour montrer quel skill est actif
4. **Exécution** : L'IA suit les instructions du skill
5. **Résultat** : Les actions sont affichées avec les autres tags (`<dyad-write>`, etc.)

## Exemple de workflow complet

```
Utilisateur : /lint

IA :
<dyad-skill name="lint" description="Run pre-commit checks">
[Contenu complet du skill]
</dyad-skill>

Je vais exécuter les vérifications pré-commit.

<dyad-status title="Running formatting">
Exécution de npm run fmt...
</dyad-status>

<dyad-output type="success" message="Formatting completed">
Tous les fichiers sont correctement formatés.
</dyad-output>

<dyad-status title="Running linting">
Exécution de npm run lint...
</dyad-status>

[... autres actions ...]

Toutes les vérifications sont passées avec succès ! Votre code est prêt à être commité.
```

## Notes techniques

### Parsing

Le tag est parsé par `DyadMarkdownParser.tsx` qui :

1. Détecte le tag `<dyad-skill>`
2. Extrait les attributs (`name`, `description`)
3. Extrait le contenu (instructions du skill)
4. Passe les données au composant `DyadSkill`

### Composant

Le composant `DyadSkill.tsx` :

- Affiche l'en-tête avec icône et badge
- Gère l'état d'expansion/collapse
- Affiche le contenu avec coloration syntaxique Markdown
- Utilise les primitives `DyadCard` pour la cohérence visuelle

### Styling

- **Couleur d'accent** : Violet (`purple`)
- **Icône** : Sparkles (✨)
- **Badge** : Fond violet clair avec texte violet foncé
- **Contenu** : Fond gris avec bordure pour distinguer du reste

---

**Note** : Cette documentation est destinée aux développeurs et à l'IA pour comprendre comment utiliser correctement le tag `<dyad-skill>` dans les réponses.
