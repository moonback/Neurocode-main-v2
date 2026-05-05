# Importation de Skills

Ce guide explique comment importer des skills dans NeuroCode.

## Vue d'ensemble

La fonctionnalité d'importation permet aux utilisateurs d'importer des fichiers de skills existants (au format `.md`) dans leur environnement NeuroCode. Cela facilite le partage et la réutilisation de skills entre utilisateurs et équipes.

## Comment importer un skill

### Via l'interface utilisateur

1. Ouvrez les **Paramètres** (Settings)
2. Naviguez vers la section **Skills**
3. Cliquez sur le bouton **Importer**
4. Sélectionnez un ou plusieurs fichiers :
   - Fichiers `.md` individuels (skills simples)
   - Fichier `.zip` contenant un ou plusieurs skills (skills complexes)
5. Choisissez la portée (Utilisateur ou Workspace)
6. Cliquez sur **Importer**

### Types de skills supportés

#### Skills simples
Un seul fichier `.md` avec le frontmatter et le contenu.

#### Skills complexes
Un fichier ZIP contenant :
- Un fichier `SKILL.md` principal (obligatoire)
- Des fichiers et dossiers additionnels (optionnel)
- Toute la structure de dossiers est préservée

**Exemple de skill complexe :**
```
code-security.zip
└── code-security/
    ├── SKILL.md          (obligatoire)
    ├── README.md         (optionnel)
    ├── metadata.json     (optionnel)
    └── rules/            (optionnel)
        ├── sql-injection.md
        ├── xss.md
        └── ...
```

### Format du fichier

Le fichier de skill doit respecter le format suivant :

```markdown
---
name: mon-skill
description: Description du skill
---

# Contenu du skill

Instructions et contenu en Markdown...
```

#### Frontmatter requis

- `name` : Le nom du skill (kebab-case, peut inclure un namespace avec `:`)
- `description` : Une description brève du skill

#### Contenu

Le contenu après le frontmatter peut contenir :

- Markdown formaté
- Instructions pour l'IA
- Exemples d'utilisation
- Variables comme `{{args}}` pour les arguments

## Validation

Lors de l'importation, le fichier est automatiquement validé :

- ✅ Vérification du format du frontmatter
- ✅ Validation du nom du skill
- ✅ Vérification de la présence des champs requis
- ✅ Validation de la syntaxe Markdown

Si le fichier n'est pas valide, un message d'erreur détaillé s'affiche.

## Portée (Scope)

Vous pouvez choisir entre deux portées lors de l'importation :

### Utilisateur (User)

- Stocké dans `~/.neurocode/skills/`
- Disponible uniquement pour vous
- Idéal pour les skills personnels

### Workspace

- Stocké dans `.neurocode/skills/` du projet
- Partagé avec l'équipe via le contrôle de version
- Idéal pour les skills d'équipe

## Exemples

### Exemple de skill simple

```markdown
---
name: lint
description: Exécute le linter sur le projet
---

# Lint

Exécute les commandes de linting sur le projet :

1. `npm run lint`
2. Corrige automatiquement les erreurs avec `npm run lint:fix`
3. Affiche un résumé des problèmes restants
```

### Exemple de skill complexe (ZIP)

Structure du ZIP :
```
code-security.zip
└── code-security/
    ├── SKILL.md
    ├── README.md
    └── rules/
        ├── sql-injection.md
        ├── xss.md
        └── command-injection.md
```

Le fichier `SKILL.md` peut référencer les autres fichiers :
```markdown
---
name: code-security
description: Security guidelines for writing secure code
---

# Code Security Guidelines

Voir les règles détaillées dans le dossier `rules/` :

- SQL Injection : `rules/sql-injection.md`
- XSS : `rules/xss.md`
- Command Injection : `rules/command-injection.md`
```

### Exemple de skill avec namespace

```markdown
---
name: git:commit
description: Aide à créer un message de commit conventionnel
---

# Git Commit Helper

Analyse les changements et génère un message de commit suivant la convention :

- `feat:` pour les nouvelles fonctionnalités
- `fix:` pour les corrections de bugs
- `docs:` pour la documentation
- `refactor:` pour le refactoring
- `test:` pour les tests
```

### Exemple de skill avec arguments

```markdown
---
name: analyze
description: Analyse un fichier spécifique
---

# Analyze File

Analyse le fichier : `{{args}}`

1. Lit le contenu du fichier
2. Identifie les problèmes potentiels
3. Propose des améliorations
```

## Import multiple

Vous pouvez importer plusieurs skills en une seule fois :

1. **Sélection multiple de fichiers .md** : Maintenez Ctrl (Windows/Linux) ou Cmd (macOS) pour sélectionner plusieurs fichiers
2. **Fichier ZIP avec plusieurs skills** : Créez un ZIP contenant plusieurs dossiers de skills

Exemple de ZIP avec plusieurs skills :
```
mes-skills.zip
├── skill1/
│   └── SKILL.md
├── skill2/
│   └── SKILL.md
└── skill3/
    ├── SKILL.md
    └── data/
        └── examples.md
```

## Dépannage

### Le fichier n'est pas accepté

- Vérifiez que le fichier a l'extension `.md`
- Assurez-vous que le frontmatter YAML est correctement formaté
- Vérifiez que les champs `name` et `description` sont présents

### Erreur de validation

- Le nom doit être en kebab-case (lettres minuscules, chiffres et tirets)
- Le frontmatter doit être délimité par `---`
- Le contenu ne doit pas être vide

### Le skill existe déjà

Si un skill avec le même nom existe déjà, l'importation échouera. Vous devez :

- Supprimer l'ancien skill d'abord
- Ou renommer le skill dans le fichier avant l'importation

## Partage de skills

Pour partager un skill avec d'autres :

1. Exportez le fichier depuis `.neurocode/skills/` ou `~/.neurocode/skills/`
2. Partagez le fichier `.md`
3. L'autre utilisateur peut l'importer via l'interface

Pour les équipes, il est recommandé de :

- Créer un dépôt de skills partagés
- Utiliser la portée "Workspace"
- Versionner les skills avec Git
