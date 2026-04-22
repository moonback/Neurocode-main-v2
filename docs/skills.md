# Guide des Skills NeuroCode

Les **Skills** sont des instructions réutilisables qui étendent les capacités de l'IA dans NeuroCode. Ils permettent de créer des workflows personnalisés et de standardiser les processus de développement.

## Table des matières

- [Qu'est-ce qu'un Skill ?](#quest-ce-quun-skill-)
- [Utilisation des Skills](#utilisation-des-skills)
- [Création de Skills](#création-de-skills)
- [Emplacements des Skills](#emplacements-des-skills)
- [Skills d'exemple](#skills-dexemple)
- [Format SKILL.md](#format-skillmd)
- [Bonnes pratiques](#bonnes-pratiques)

## Qu'est-ce qu'un Skill ?

Un skill est un ensemble d'instructions structurées stockées dans un fichier `SKILL.md`. Il peut être :

- **Invoqué manuellement** via une commande slash (ex: `/lint`)
- **Chargé automatiquement** par l'IA selon le contexte de la conversation
- **Partagé** au niveau utilisateur ou workspace

## Utilisation des Skills

### Invocation par commande slash

Dans le chat, tapez `/` suivi du nom du skill :

```
/examples:code-review
```

L'IA chargera automatiquement les instructions du skill et les appliquera à votre demande.

### Chargement automatique

L'IA peut suggérer automatiquement des skills pertinents selon le contexte de votre message. Par exemple, si vous mentionnez "déboguer une erreur", l'IA pourrait suggérer le skill `examples:debug-error`.

### Gestion via l'interface

1. Ouvrez **Paramètres** (Settings)
2. Naviguez vers la section **Skills**
3. Vous pouvez :
   - Voir tous les skills disponibles
   - Créer de nouveaux skills
   - Modifier des skills existants
   - Supprimer des skills
   - Découvrir les skills installés

## Création de Skills

### Via l'interface

1. Allez dans **Paramètres > Skills**
2. Cliquez sur **Nouveau Skill**
3. Remplissez le formulaire :
   - **Nom** : Identifiant unique (kebab-case)
   - **Description** : Brève description pour le chargement automatique
   - **Contenu** : Instructions détaillées en Markdown
   - **Scope** : Utilisateur ou Workspace

### Manuellement

Créez un fichier `SKILL.md` dans l'un des emplacements suivants :

**Niveau utilisateur :**

```
~/.neurocode/skills/mon-skill/SKILL.md
```

**Niveau workspace :**

```
.neurocode/skills/mon-skill/SKILL.md
```

## Emplacements des Skills

### Niveau utilisateur

- **Chemin :** `~/.neurocode/skills/`
- **Visibilité :** Disponible uniquement pour vous
- **Usage :** Skills personnels, workflows spécifiques

### Niveau workspace

- **Chemin :** `.neurocode/skills/`
- **Visibilité :** Partagé avec toute l'équipe
- **Usage :** Standards d'équipe, workflows communs
- **Versioning :** Peut être ajouté au contrôle de version (Git)

### Priorité

Si un skill existe aux deux niveaux avec le même nom, le skill **workspace** a la priorité sur le skill **utilisateur**.

## Skills d'exemple

NeuroCode inclut 6 skills d'exemple prêts à l'emploi :

### `/examples:code-review`

Effectue une revue de code approfondie en vérifiant :

- Correction du code
- Sécurité
- Bonnes pratiques
- Performance

### `/examples:debug-error`

Guide systématique pour déboguer une erreur :

- Analyse de la stack trace
- Identification de la cause racine
- Proposition de solutions
- Implémentation du correctif

### `/examples:write-tests`

Aide à écrire des tests complets :

- Tests unitaires
- Tests d'intégration
- Couverture des cas limites
- Bonnes pratiques de test

### `/examples:refactor-code`

Refactorisation sécurisée du code :

- Identification des opportunités
- Planification des changements
- Préservation du comportement
- Vérification par tests

### `/examples:add-feature`

Ajout de nouvelles fonctionnalités :

- Compréhension des besoins
- Conception de l'implémentation
- Développement
- Tests et documentation

### `/examples:optimize-performance`

Optimisation des performances :

- Identification des goulots d'étranglement
- Profilage et mesure
- Proposition d'optimisations
- Vérification des améliorations

## Format SKILL.md

### Structure de base

```markdown
---
name: mon-skill
description: Description brève pour le chargement automatique
---

# Mon Skill

Description détaillée du skill et de son utilisation.

## Instructions

1. Première étape
2. Deuxième étape
3. Troisième étape

## Exemples

Exemples d'utilisation si nécessaire.
```

### Frontmatter (YAML)

Le frontmatter contient les métadonnées du skill :

- **name** (requis) : Identifiant unique en kebab-case
  - Format : `[a-z0-9-]+` ou `[a-z0-9-]+:[a-z0-9-]+` (avec namespace)
  - Exemples : `lint`, `examples:code-review`

- **description** (recommandé) : Description pour le chargement automatique
  - Utilisée par l'IA pour déterminer la pertinence du skill
  - Doit être claire et concise

### Contenu (Markdown)

Le contenu après le frontmatter contient les instructions détaillées :

- Utilisez des titres pour structurer
- Numérotez les étapes pour la clarté
- Ajoutez des exemples si nécessaire
- Incluez des cas limites et erreurs courantes

### Skills groupés

Vous pouvez organiser des skills connexes sous un namespace :

```
.neurocode/skills/
├── git/
│   ├── commit/SKILL.md      → /git:commit
│   ├── rebase/SKILL.md      → /git:rebase
│   └── merge/SKILL.md       → /git:merge
```

## Bonnes pratiques

### Nommage

- Utilisez des noms descriptifs en kebab-case
- Préférez des noms courts mais clairs
- Utilisez des namespaces pour grouper des skills connexes

### Description

- Écrivez une description claire et concise
- Incluez des mots-clés pour le chargement automatique
- Décrivez quand utiliser le skill

### Instructions

- Soyez précis et actionnable
- Numérotez les étapes dans l'ordre
- Incluez des exemples concrets
- Mentionnez les cas limites

### Organisation

- Un skill = une responsabilité
- Groupez les skills connexes avec des namespaces
- Partagez les skills d'équipe au niveau workspace
- Gardez les skills personnels au niveau utilisateur

### Maintenance

- Mettez à jour les skills régulièrement
- Supprimez les skills obsolètes
- Documentez les changements importants
- Testez les skills après modification

## Exemples de Skills personnalisés

### Skill de commit Git

```markdown
---
name: git-commit
description: Créer un commit Git avec un message formaté selon les conventions
---

# Git Commit

Créer un commit Git avec un message bien formaté.

## Instructions

1. Vérifier les fichiers modifiés avec `git status`
2. Ajouter les fichiers avec `git add`
3. Créer un commit avec le format :
```

type(scope): description courte

Description détaillée si nécessaire

```
4. Types valides : feat, fix, docs, style, refactor, test, chore
```

### Skill de revue de PR

```markdown
---
name: pr-review
description: Effectuer une revue de Pull Request complète
---

# Revue de Pull Request

Revue systématique d'une Pull Request.

## Instructions

1. **Lire la description** : Comprendre l'objectif du PR
2. **Vérifier les tests** : S'assurer que les tests passent
3. **Revue du code** :
   - Logique correcte
   - Pas de bugs évidents
   - Respect des conventions
4. **Vérifier la documentation** : README, commentaires
5. **Tester localement** si nécessaire
6. **Laisser des commentaires constructifs**
```

## Dépannage

### Le skill n'apparaît pas

1. Vérifiez l'emplacement du fichier SKILL.md
2. Vérifiez le format du frontmatter (YAML valide)
3. Cliquez sur "Découvrir les skills" dans les paramètres
4. Redémarrez l'application si nécessaire

### Le skill ne se charge pas automatiquement

1. Vérifiez que la description contient des mots-clés pertinents
2. Assurez-vous que le contexte de votre message correspond
3. Le chargement automatique peut être désactivé dans certains modes

### Erreur de validation

1. Vérifiez que le nom est en kebab-case
2. Assurez-vous que le frontmatter est valide (YAML)
3. Vérifiez que les champs requis sont présents

## Ressources

- [Documentation officielle](https://docs.neurocode.dev/skills)
- [Exemples de skills](../.claude/skills/examples/)
- [Spécification complète](.kiro/specs/neurocode-skills/)

---

**Besoin d'aide ?** Ouvrez un ticket sur [GitHub Issues](https://github.com/dyad-sh/dyad/issues)
