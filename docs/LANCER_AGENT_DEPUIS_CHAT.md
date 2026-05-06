# Lancer un Agent depuis le Chat

## 🎯 Vue d'ensemble

Vous pouvez maintenant déléguer des tâches à des agents spécialisés directement depuis l'interface de chat, sans avoir à naviguer vers la page Agents dédiée.

## 🚀 Comment utiliser

### Méthode 1 : Bouton "Déléguer à un Agent"

1. **Tapez votre tâche** dans le champ de chat comme d'habitude

   ```
   Exemple : "Créer une fonction de validation d'email dans src/utils.ts"
   ```

2. **Cliquez sur l'icône 🤖** à côté du bouton d'envoi
   - Le bouton "Déléguer à un Agent" apparaît juste avant le bouton d'envoi
   - Il est désactivé si le champ de texte est vide

3. **Sélectionnez un agent** dans le dialog qui s'ouvre
   - **Auto (recommandé)** : L'orchestrateur choisira automatiquement le meilleur agent
   - **Manuel** : Sélectionnez un agent spécifique dans la liste déroulante

4. **Cliquez sur "Déléguer"**
   - L'agent commencera à exécuter la tâche
   - Vous recevrez une notification de succès
   - Le champ de texte sera vidé automatiquement

### Méthode 2 : Page Agents dédiée

Si vous préférez une interface complète avec historique et suivi détaillé :

1. Cliquez sur l'icône **🤖 Agents** dans la barre latérale
2. Utilisez l'interface complète avec :
   - Sélection d'agent
   - Description de tâche
   - Historique des exécutions
   - Détails des messages et outils utilisés

## 📋 Fonctionnalités

### Dialog de délégation

Le dialog affiche :

- **Aperçu de la tâche** : Votre message sera utilisé comme description de tâche
- **Sélecteur d'agent** : Choisissez entre sélection automatique ou manuelle
- **Informations sur l'agent** : Description et rôle de l'agent sélectionné
- **Boutons d'action** : Annuler ou Déléguer

### Sélection automatique (recommandée)

Lorsque vous laissez la sélection sur "Auto" :

1. L'**orchestrateur** analyse votre tâche
2. Il utilise un **LLM** pour comprendre :
   - La nature de la tâche
   - Les compétences requises
   - Les outils nécessaires
3. Il sélectionne le **meilleur agent** pour la tâche
4. L'agent choisi exécute la tâche de manière autonome

### Sélection manuelle

Si vous connaissez l'agent dont vous avez besoin :

1. Ouvrez le menu déroulant
2. Sélectionnez l'agent souhaité
3. Voyez sa description et son rôle
4. Déléguez directement à cet agent

## 🤖 Agents disponibles

### 1. **Orchestrator** 🎯

- **Rôle** : Coordination et délégation
- **Quand l'utiliser** : Tâches complexes nécessitant plusieurs agents

### 2. **Code Specialist** 💻

- **Rôle** : Développement et refactoring
- **Quand l'utiliser** : Écriture, modification de code

### 3. **Test Specialist** 🧪

- **Rôle** : Tests et validation
- **Quand l'utiliser** : Création de tests unitaires/E2E

### 4. **Documentation Specialist** 📚

- **Rôle** : Documentation technique
- **Quand l'utiliser** : README, guides, documentation API

### 5. **Research Specialist** 🔍

- **Rôle** : Recherche et analyse
- **Quand l'utiliser** : Recherche de solutions, analyse de dépendances

### 6. **Database Specialist** 🗄️

- **Rôle** : Gestion de base de données
- **Quand l'utiliser** : Schémas, migrations, requêtes SQL

## 💡 Exemples d'utilisation

### Exemple 1 : Développement de fonctionnalité

**Tâche** :

```
Créer une fonction de validation d'email avec tests unitaires dans src/utils/validation.ts
```

**Agent recommandé** : Auto (l'orchestrateur déléguera au Code Specialist puis au Test Specialist)

**Résultat attendu** :

- Fonction de validation créée
- Tests unitaires ajoutés
- Code formaté et documenté

### Exemple 2 : Documentation

**Tâche** :

```
Créer un README.md pour le module d'authentification dans src/auth/
```

**Agent recommandé** : Documentation Specialist

**Résultat attendu** :

- README.md créé avec structure complète
- Exemples d'utilisation
- Documentation des fonctions principales

### Exemple 3 : Recherche de solution

**Tâche** :

```
Trouver la meilleure bibliothèque pour gérer les dates en TypeScript et expliquer pourquoi
```

**Agent recommandé** : Research Specialist

**Résultat attendu** :

- Comparaison de bibliothèques (date-fns, dayjs, luxon)
- Recommandation justifiée
- Exemples d'utilisation

### Exemple 4 : Base de données

**Tâche** :

```
Créer une migration pour ajouter une table 'users' avec colonnes id, email, name, created_at
```

**Agent recommandé** : Database Specialist

**Résultat attendu** :

- Fichier de migration créé
- Schéma défini avec types appropriés
- Migration testée

## 🔄 Workflow typique

```
1. Utilisateur tape une tâche dans le chat
   ↓
2. Clique sur l'icône 🤖 "Déléguer à un Agent"
   ↓
3. Dialog s'ouvre avec aperçu de la tâche
   ↓
4. Sélectionne un agent (ou laisse sur Auto)
   ↓
5. Clique sur "Déléguer"
   ↓
6. Agent commence l'exécution en arrière-plan
   ↓
7. Notification de succès
   ↓
8. Utilisateur peut continuer à utiliser le chat normalement
   ↓
9. Consulter les résultats dans la page Agents
```

## 📊 Suivi de l'exécution

Après avoir délégué une tâche :

1. **Notification immédiate** : Confirmation que la tâche a été déléguée
2. **Exécution en arrière-plan** : L'agent travaille de manière autonome
3. **Consultation des résultats** :
   - Allez dans la page **🤖 Agents**
   - Consultez la section **"Exécutions Récentes"**
   - Voyez le statut en temps réel (pending → running → completed/failed)
   - Consultez les détails : messages, outils utilisés, résultat final

## ⚙️ Configuration

### Prérequis

1. **Application créée** : Vous devez avoir au moins une application dans le projet
2. **Base de données initialisée** : Les tables d'agents doivent exister
3. **Chat actif** : Vous devez être dans un chat associé à une application

### Vérification

Si le bouton 🤖 est désactivé :

- Vérifiez que vous avez tapé du texte dans le champ
- Vérifiez que vous êtes dans un chat valide (pas sur la page d'accueil)
- Vérifiez que votre application est correctement configurée

## 🐛 Dépannage

### Le bouton 🤖 n'apparaît pas

**Cause** : Vous n'êtes pas dans un chat valide

**Solution** :

1. Créez ou ouvrez un chat existant
2. Assurez-vous d'être sur la route `/chat?id=X`

### Le bouton est désactivé

**Cause** : Le champ de texte est vide

**Solution** : Tapez une description de tâche avant de cliquer

### Erreur "Chat has no associated app"

**Cause** : Le chat n'est pas associé à une application

**Solution** :

1. Créez un nouveau chat depuis une application
2. Ou utilisez la page Agents dédiée qui crée automatiquement un chat valide

### Erreur "Aucune application"

**Cause** : Aucune application n'existe dans le projet

**Solution** :

1. Allez dans la section **Applications**
2. Créez une nouvelle application ou importez-en une
3. Retournez sur la page Agents

### L'agent ne démarre pas

**Cause** : Problème de configuration ou de base de données

**Solution** :

1. Ouvrez la console (F12)
2. Cherchez les logs avec emoji 🚀, ✅, ❌
3. Vérifiez les messages d'erreur
4. Si nécessaire, réinitialisez la base de données :
   ```bash
   # Fermez l'application
   npm run db:reset
   # Redémarrez l'application
   ```

## 🎨 Interface utilisateur

### Bouton de délégation

- **Position** : Juste avant le bouton d'envoi (icône ✉️)
- **Icône** : 🤖 (Bot)
- **Tooltip** : "Déléguer à un agent"
- **État désactivé** : Grisé quand le champ est vide ou pas de chat

### Dialog de délégation

- **Titre** : "Déléguer à un Agent"
- **Sections** :
  1. Aperçu de la tâche (max 4 lignes)
  2. Sélecteur d'agent avec descriptions
  3. Informations sur l'agent sélectionné
  4. Boutons Annuler / Déléguer

### Notifications

- **Succès** : "Tâche déléguée à l'agent avec succès"
- **Erreur** : Message d'erreur spécifique avec détails

## 📚 Ressources supplémentaires

- [Guide d'utilisation des agents](./GUIDE_UTILISATION_AGENTS.md)
- [Système multi-agent complet](./MULTI_AGENT_SYSTEM.md)
- [Intégration UI des agents](./INTEGRATION_UI_AGENTS.md)
- [Logs des agents](./LOGS_AGENTS.md)

## 🎉 Résumé des changements

### Fichiers créés

1. **`src/components/chat/DelegateToAgentDialog.tsx`**
   - Dialog de sélection d'agent
   - Aperçu de la tâche
   - Sélection auto/manuelle
   - Gestion de la délégation

2. **`docs/LANCER_AGENT_DEPUIS_CHAT.md`** (ce fichier)
   - Documentation complète
   - Exemples d'utilisation
   - Guide de dépannage

### Fichiers modifiés

1. **`src/components/chat/ChatInput.tsx`**
   - Ajout de l'import `DelegateToAgentDialog`
   - Ajout de l'import de l'icône `Bot`
   - Ajout de l'état `delegateDialogOpen`
   - Ajout du handler `handleOpenDelegateDialog`
   - Ajout du bouton 🤖 avant le bouton d'envoi
   - Ajout du dialog en bas du composant

2. **`src/pages/agents.tsx`**
   - Utilisation de `useLoadApps` au lieu de query manuelle
   - Ajout de logs de debug
   - Amélioration des messages d'erreur

### Résultat

✅ Bouton de délégation dans le chat
✅ Dialog de sélection d'agent
✅ Intégration transparente avec le système multi-agent
✅ Notifications de succès/erreur
✅ Nettoyage automatique du champ après délégation
✅ Documentation complète
