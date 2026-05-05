---
name: example-skill
description: Un exemple de skill pour démontrer le format et les fonctionnalités
---

# Example Skill

Ce skill est un exemple qui montre comment créer et structurer un skill pour NeuroCode.

## Objectif

Ce skill démontre :

- La structure du frontmatter YAML
- L'utilisation de Markdown pour le contenu
- Les bonnes pratiques de documentation

## Instructions

Lorsque ce skill est invoqué, l'IA doit :

1. Analyser le contexte actuel du projet
2. Identifier les fichiers pertinents
3. Proposer des améliorations ou des solutions

## Utilisation

Pour utiliser ce skill, tapez simplement `/example-skill` dans le chat.

Vous pouvez également passer des arguments : `/example-skill mon argument`

Les arguments sont accessibles via la variable `{{args}}` dans le contenu du skill.

## Exemples

### Exemple 1 : Utilisation basique

```
/example-skill
```

### Exemple 2 : Avec arguments

```
/example-skill analyser le fichier src/main.ts
```

## Notes

- Les skills peuvent être au niveau utilisateur (`~/.neurocode/skills/`) ou workspace (`.neurocode/skills/`)
- Le nom du skill doit être en kebab-case
- Vous pouvez utiliser des namespaces : `namespace:skill-name`
