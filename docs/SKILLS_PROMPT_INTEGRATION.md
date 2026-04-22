# Intégration des Skills dans les Prompts Système

## Vue d'ensemble

Les instructions sur l'utilisation des skills ont été intégrées dans tous les prompts système de NeuroCode pour que l'IA sache comment et quand utiliser les skills.

## Fichiers modifiés

### 1. `src/prompts/system_prompt.ts`

**Section ajoutée** : `# Skills System`

**Emplacement** : Après la section "App Preview / Commands", avant "Guidelines"

**Contenu** :
- Instructions sur quand utiliser les skills
- Format du tag `<dyad-skill>`
- Placement du tag (au début de la réponse)
- Liste des skills d'exemple disponibles
- Règles importantes pour l'utilisation des skills

**Modes concernés** :
- ✅ Build mode
- ✅ Ask mode (via ASK_MODE_SYSTEM_PROMPT)

### 2. `src/prompts/local_agent_prompt.ts`

**Bloc ajouté** : `SKILLS_BLOCK`

**Emplacement** : Après `APP_COMMANDS_BLOCK`, avant `GENERAL_GUIDELINES_BLOCK`

**Contenu** :
- Version condensée des instructions sur les skills
- Format du tag avec exemple
- Liste des skills d'exemple
- Règle de placement du tag

**Modes concernés** :
- ✅ Local Agent Pro mode
- ✅ Local Agent Basic mode (free tier)
- ✅ Local Agent Ask mode (read-only)

## Instructions ajoutées

### Quand utiliser les skills

L'IA doit utiliser les skills dans deux situations :

1. **Invocation explicite** : Quand l'utilisateur tape `/skill-name`
2. **Chargement automatique** : Quand le contexte suggère qu'un skill serait utile

### Format du tag dyad-skill

```xml
<dyad-skill name="skill-name" description="Brief description">
[Complete skill instructions in Markdown, without frontmatter]
</dyad-skill>
```

### Règles importantes

1. **Toujours afficher le skill** quand invoqué
2. **Placer le tag au début** de la réponse
3. **Inclure les instructions complètes** du skill
4. **Suivre le workflow du skill** exactement
5. **Ne pas modifier** le contenu du skill
6. **Fermer le tag correctement**

### Skills d'exemple disponibles

Les prompts mentionnent les 6 skills d'exemple :

- `/examples:code-review` - Revue de code approfondie
- `/examples:debug-error` - Débogage systématique
- `/examples:write-tests` - Écriture de tests complets
- `/examples:refactor-code` - Refactorisation sécurisée
- `/examples:add-feature` - Ajout de fonctionnalités
- `/examples:optimize-performance` - Optimisation des performances

## Exemple d'utilisation

### Entrée utilisateur
```
/lint
```

### Réponse attendue de l'IA

```xml
<dyad-skill name="lint" description="Run pre-commit checks including formatting, linting, and type-checking">
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

<dyad-status title="Running formatting">
Exécution de npm run fmt...
</dyad-status>

[... suite des actions selon les instructions du skill ...]
```

## Comportement par mode

### Build Mode

- ✅ Peut utiliser les skills
- ✅ Peut modifier le code selon les instructions du skill
- ✅ Affiche le tag `<dyad-skill>` au début
- ✅ Suit le workflow du skill

### Ask Mode

- ✅ Peut utiliser les skills
- ❌ Ne peut PAS modifier le code (read-only)
- ✅ Affiche le tag `<dyad-skill>` au début
- ✅ Explique ce que le skill ferait sans l'exécuter

### Local Agent Mode (Pro/Basic)

- ✅ Peut utiliser les skills
- ✅ Peut utiliser les outils pour suivre le skill
- ✅ Affiche le tag `<dyad-skill>` au début
- ✅ Suit le workflow du skill avec les outils disponibles

### Plan Mode

- ⚠️ Skills non explicitement mentionnés dans le prompt Plan
- 💡 Pourrait être ajouté dans une future mise à jour

## Découverte des skills

Les prompts mentionnent que les skills sont découverts depuis :

- **Niveau utilisateur** : `~/.neurocode/skills/`
- **Niveau workspace** : `.neurocode/skills/`

Les skills workspace ont priorité sur les skills utilisateur avec le même nom.

## Validation

### Checklist pour l'IA

Quand un skill est invoqué, l'IA doit :

- [ ] Afficher le tag `<dyad-skill>` au DÉBUT de la réponse
- [ ] Inclure le nom du skill dans l'attribut `name`
- [ ] Inclure la description dans l'attribut `description`
- [ ] Inclure les instructions COMPLÈTES du skill (sans frontmatter)
- [ ] Fermer le tag avec `</dyad-skill>`
- [ ] Suivre les instructions du skill dans l'ordre
- [ ] Utiliser les outils appropriés selon le mode

### Erreurs courantes à éviter

❌ **Placer le tag au milieu ou à la fin**
```
Je vais faire un lint.
<dyad-skill name="lint">...</dyad-skill>  ← INCORRECT
```

✅ **Placer le tag au début**
```
<dyad-skill name="lint">...</dyad-skill>
Je vais faire un lint.  ← CORRECT
```

❌ **Omettre le contenu du skill**
```
<dyad-skill name="lint" description="Run checks"></dyad-skill>  ← INCORRECT
```

✅ **Inclure le contenu complet**
```
<dyad-skill name="lint" description="Run checks">
# Lint
[... instructions complètes ...]
</dyad-skill>  ← CORRECT
```

❌ **Modifier les instructions du skill**
```
<dyad-skill name="lint">
# Lint (version modifiée)  ← INCORRECT
...
</dyad-skill>
```

✅ **Garder les instructions originales**
```
<dyad-skill name="lint">
# Lint  ← CORRECT (tel quel du fichier SKILL.md)
...
</dyad-skill>
```

## Tests recommandés

Pour vérifier que l'intégration fonctionne :

1. **Test d'invocation explicite**
   - Taper `/lint` dans le chat
   - Vérifier que le tag `<dyad-skill>` apparaît au début
   - Vérifier que les instructions sont complètes
   - Vérifier que l'IA suit le workflow

2. **Test de chargement automatique**
   - Demander "Peux-tu m'aider à déboguer cette erreur ?"
   - Vérifier si l'IA suggère ou charge `/examples:debug-error`
   - Vérifier l'affichage du tag

3. **Test par mode**
   - Tester dans Build mode (doit exécuter)
   - Tester dans Ask mode (doit expliquer)
   - Tester dans Local Agent mode (doit utiliser les outils)

4. **Test des skills groupés**
   - Taper `/examples:code-review`
   - Vérifier le namespace dans le nom

## Maintenance

### Ajout de nouveaux skills

Quand de nouveaux skills d'exemple sont ajoutés :

1. Mettre à jour la liste dans `SKILLS_BLOCK` (local_agent_prompt.ts)
2. Mettre à jour la liste dans `BUILD_SYSTEM_PREFIX` (system_prompt.ts)
3. Documenter le nouveau skill dans `docs/SKILLS.md`

### Modification du format

Si le format du tag `<dyad-skill>` change :

1. Mettre à jour les exemples dans les prompts
2. Mettre à jour `DyadMarkdownParser.tsx`
3. Mettre à jour `DyadSkill.tsx`
4. Mettre à jour la documentation

## Conclusion

L'intégration des skills dans les prompts système est complète et couvre tous les modes de chat de NeuroCode. L'IA dispose maintenant de toutes les instructions nécessaires pour :

- Reconnaître les invocations de skills
- Afficher les skills correctement avec le tag `<dyad-skill>`
- Suivre les workflows des skills
- Utiliser les skills d'exemple disponibles

Cette intégration permet une expérience utilisateur cohérente où les skills sont clairement visibles et leur utilisation est transparente.

---

**Date de mise à jour** : Avril 2026
**Version** : 0.45.0-beta.1
**Statut** : ✅ Intégration complète
