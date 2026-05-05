# Créer un ZIP de Skill pour l'importation

Ce guide explique comment créer un fichier ZIP de skill pour l'importation dans NeuroCode.

## Structure recommandée

Un skill peut être simple (un seul fichier SKILL.md) ou complexe (avec des fichiers et dossiers additionnels).

### Skill simple

```
mon-skill.zip
└── mon-skill/
    └── SKILL.md
```

### Skill complexe

```
code-security.zip
└── code-security/
    ├── SKILL.md
    ├── README.md
    ├── metadata.json
    ├── AGENTS.md
    └── rules/
        ├── sql-injection.md
        ├── xss.md
        ├── command-injection.md
        └── ...
```

## Créer un ZIP

### Sous Windows

1. Sélectionnez le dossier du skill (ex: `code-security/`)
2. Clic droit → "Envoyer vers" → "Dossier compressé (zippé)"
3. Renommez le fichier ZIP si nécessaire

### Sous macOS

1. Sélectionnez le dossier du skill
2. Clic droit → "Compresser"
3. Renommez le fichier ZIP si nécessaire

### Sous Linux

```bash
zip -r code-security.zip code-security/
```

### Avec PowerShell

```powershell
Compress-Archive -Path "code-security" -DestinationPath "code-security.zip"
```

## Exemple : Créer un ZIP du skill code-security

Si vous avez le skill dans `userData/skills/code-security/` :

```powershell
# Depuis le dossier userData/skills/
Compress-Archive -Path "code-security" -DestinationPath "code-security.zip"
```

Cela créera un fichier `code-security.zip` contenant :
- Le fichier SKILL.md principal
- Tous les fichiers du dossier `rules/`
- Les fichiers README.md, metadata.json, etc.

## Importer le ZIP

1. Ouvrez NeuroCode
2. Allez dans **Paramètres** → **Skills**
3. Cliquez sur **Importer**
4. Sélectionnez le fichier `.zip`
5. Choisissez la portée (Utilisateur ou Workspace)
6. Cliquez sur **Importer**

Le skill sera extrait avec toute sa structure de dossiers préservée.

## Règles importantes

1. **Le fichier SKILL.md est obligatoire** - C'est le fichier principal du skill
2. **Structure de dossiers préservée** - Tous les sous-dossiers seront recréés
3. **Fichiers supportés** - Tous les types de fichiers sont supportés (.md, .json, .txt, etc.)
4. **Nom du skill** - Le nom est extrait du frontmatter du SKILL.md, pas du nom du dossier

## Partager des skills

Pour partager un skill complexe avec d'autres :

1. Créez un ZIP du dossier du skill
2. Partagez le fichier ZIP
3. L'autre utilisateur peut l'importer directement

Pour les équipes :
- Créez un dépôt Git de skills
- Stockez les ZIPs ou les dossiers sources
- Les membres de l'équipe peuvent cloner et importer
