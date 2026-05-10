# 📊 Notice d'Utilisation - Dashboard Analytics des Tokens

## 🎯 Vue d'ensemble

Le Dashboard Analytics des Tokens est une interface graphique complète qui vous permet de visualiser et d'analyser votre consommation de tokens en temps réel. Il offre des graphiques interactifs, des tableaux détaillés et des fonctionnalités d'export pour vous aider à optimiser vos coûts.

---

## 🚀 Accès au Dashboard

### Méthode 1 : Via les Paramètres (Recommandé)

1. Ouvrez les **Paramètres** (`Ctrl/Cmd + ,`)
2. Allez dans la section **AI Settings**
3. Trouvez l'option **Enable Token Optimization**
4. Cliquez sur le lien **📊 View Token Analytics Dashboard**

### Méthode 2 : URL Directe

Naviguez directement vers : `http://localhost:PORT/token-analytics`

---

## 📋 Prérequis

### ✅ Activation Requise

Pour que les données s'affichent dans le dashboard, vous devez **activer l'optimisation des tokens** :

1. Allez dans **Paramètres** > **AI Settings**
2. Activez les options suivantes :
   - ☑️ **Enable Token Optimization**
   - ☑️ **Enable Skill Caching** (optionnel)
   - ☑️ **Enable Skill Preloading** (optionnel)

### 📊 Collecte des Données

Les données sont collectées automatiquement lorsque :

- Vous utilisez le **Mode Agent Local** avec l'optimisation activée
- Vous envoyez des messages dans les conversations
- Vous utilisez des skills avec l'optimisation activée

**⚠️ Important** : Si vous venez d'activer l'optimisation, le dashboard sera vide jusqu'à ce que vous utilisiez l'application et génériez des données.

---

## 🎨 Interface du Dashboard

### 1. Cartes de Statistiques (En haut)

Quatre cartes affichent les métriques clés :

#### 📊 Total Tokens
- **Description** : Nombre total de tokens consommés
- **Calcul** : Somme de tous les tokens (entrée + sortie)
- **Utilité** : Vue d'ensemble de votre consommation globale

#### 📈 Requêtes
- **Description** : Nombre total de requêtes effectuées
- **Calcul** : Compte de toutes les interactions avec l'IA
- **Utilité** : Mesure de l'activité

#### 📊 Moyenne/Requête
- **Description** : Nombre moyen de tokens par requête
- **Calcul** : Total tokens ÷ Nombre de requêtes
- **Utilité** : Identifier les requêtes coûteuses

#### 💰 Coût Total
- **Description** : Coût estimé en USD
- **Calcul** : Basé sur les tarifs des modèles utilisés
- **Utilité** : Suivi budgétaire

---

### 2. Filtres de Période

Quatre boutons pour filtrer les données par période :

- **7 jours** : Dernière semaine
- **30 jours** : Dernier mois (par défaut)
- **90 jours** : Dernier trimestre
- **1 an** : Dernière année

**💡 Astuce** : Utilisez des périodes courtes pour des analyses détaillées, et des périodes longues pour les tendances.

---

### 3. Graphiques Interactifs

#### 🔥 Top 5 Conversations (Graphique à Barres)

**Affiche** :
- Les 5 conversations qui consomment le plus de tokens
- Nombre de tokens par conversation (barres bleues)
- Nombre de requêtes par conversation (barres violettes)

**Utilisation** :
- Identifiez les conversations coûteuses
- Optimisez les conversations fréquentes
- Comparez l'activité entre conversations

**Interactivité** :
- Survolez les barres pour voir les valeurs exactes
- Les noms de conversations sont tronqués à 20 caractères

---

#### 🤖 Distribution par Modèle (Graphique Circulaire)

**Affiche** :
- Répartition des tokens par modèle d'IA
- Pourcentage de consommation par modèle
- Couleurs distinctes pour chaque modèle

**Utilisation** :
- Identifiez les modèles les plus utilisés
- Comparez les coûts entre modèles
- Optimisez le choix de modèle

**Interactivité** :
- Les labels affichent le nom et le pourcentage
- Survolez pour voir le nombre exact de tokens

---

#### 💰 Coûts par Modèle (Graphique à Barres Empilées)

**Affiche** :
- Coût d'entrée (vert) : Tokens envoyés au modèle
- Coût de sortie (orange) : Tokens générés par le modèle
- Total empilé pour chaque modèle

**Utilisation** :
- Comparez les coûts réels entre modèles
- Identifiez les modèles les plus chers
- Planifiez votre budget

**Tarifs par défaut** (USD par 1M tokens) :
| Modèle | Entrée | Sortie |
|--------|--------|--------|
| Claude 3.5 Sonnet | $3.00 | $15.00 |
| Claude 3.5 Haiku | $1.00 | $5.00 |
| Claude 3 Opus | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| GPT-4o Mini | $0.15 | $0.60 |
| GPT-4 Turbo | $10.00 | $30.00 |

---

#### ⚡ Top 10 Skills (Liste Déroulante)

**Affiche** :
- Les 10 skills les plus utilisés
- Nombre de tokens par skill
- Nombre d'utilisations
- Pourcentage de la consommation totale

**Utilisation** :
- Identifiez les skills coûteux
- Optimisez les skills fréquemment utilisés
- Détectez les skills inefficaces

**Format** :
```
#1 /examples:code-review
   45 utilisations
   120,000 tokens (8.0%)
```

---

### 4. Tableaux Détaillés

#### 📋 Détail des Conversations

**Colonnes** :
- **#** : Rang par consommation
- **Conversation** : ID de la conversation
- **Tokens** : Nombre total de tokens
- **%** : Pourcentage du total
- **Requêtes** : Nombre de requêtes

**Fonctionnalités** :
- Tri par consommation décroissante
- Survol pour mettre en évidence
- Affiche jusqu'à 10 conversations

---

#### 💵 Détail des Coûts par Modèle

**Colonnes** :
- **Modèle** : Nom du modèle
- **Tokens Entrée** : Tokens envoyés
- **Coût Entrée** : Coût des tokens d'entrée
- **Tokens Sortie** : Tokens générés
- **Coût Sortie** : Coût des tokens de sortie
- **Total** : Coût total (en gras)

**Fonctionnalités** :
- Tri par coût total décroissant
- Formatage monétaire automatique
- Affiche tous les modèles utilisés

---

## 📥 Export des Données

### Formats Disponibles

#### CSV (Recommandé pour Excel)
- Compatible avec Excel, Google Sheets, Numbers
- Facile à analyser avec des outils externes
- Format tabulaire standard

#### JSON (Recommandé pour Développeurs)
- Format structuré pour traitement programmatique
- Compatible avec tous les langages de programmation
- Idéal pour l'intégration dans d'autres outils

### Procédure d'Export

1. **Sélectionnez le format** dans le menu déroulant (CSV ou JSON)
2. **Cliquez sur "📥 Exporter"**
3. Le fichier se télécharge automatiquement
4. **Nom du fichier** : `token-usage-[timestamp].csv` ou `.json`

### Contenu du Fichier CSV

```csv
requestId,conversationId,skillName,modelType,inputTokens,outputTokens,totalTokens,timestamp
req-1234567890,conv-abc123,/code-review,claude-3-5-sonnet,5000,2000,7000,1705334400000
req-1234567891,conv-abc123,,claude-3-5-sonnet,3000,1500,4500,1705334500000
...
```

**Colonnes** :
- `requestId` : Identifiant unique de la requête
- `conversationId` : ID de la conversation
- `skillName` : Nom du skill utilisé (vide si aucun)
- `modelType` : Modèle d'IA utilisé
- `inputTokens` : Tokens d'entrée
- `outputTokens` : Tokens de sortie
- `totalTokens` : Total des tokens
- `timestamp` : Horodatage Unix (millisecondes)

---

## 🔍 Cas d'Usage

### 1. Optimisation des Coûts

**Objectif** : Réduire les dépenses mensuelles

**Étapes** :
1. Consultez la carte **Coût Total**
2. Identifiez les modèles les plus chers dans **Coûts par Modèle**
3. Vérifiez les **Top Conversations** pour trouver les plus coûteuses
4. **Actions** :
   - Passez à des modèles moins chers pour les tâches simples
   - Optimisez les conversations fréquentes
   - Réduisez le contexte envoyé

**Résultat attendu** : 30-50% de réduction des coûts

---

### 2. Analyse de Performance

**Objectif** : Identifier les goulots d'étranglement

**Étapes** :
1. Consultez **Moyenne/Requête**
2. Comparez avec les **Top Conversations**
3. Identifiez les conversations avec une moyenne élevée
4. **Actions** :
   - Réduire le contexte inutile
   - Utiliser la compression intelligente
   - Activer le cache des skills

**Résultat attendu** : 40-60% de réduction du temps de réponse

---

### 3. Audit d'Utilisation

**Objectif** : Comprendre les patterns d'utilisation

**Étapes** :
1. Sélectionnez une période (ex: 30 jours)
2. Consultez **Distribution par Modèle**
3. Analysez les **Top Skills**
4. Exportez les données en CSV
5. **Actions** :
   - Créer des rapports mensuels
   - Identifier les tendances
   - Planifier le budget

**Résultat attendu** : Visibilité complète sur l'utilisation

---

### 4. Optimisation des Skills

**Objectif** : Améliorer l'efficacité des skills

**Étapes** :
1. Consultez **Top 10 Skills**
2. Identifiez les skills avec un ratio tokens/utilisation élevé
3. Analysez le contenu des skills coûteux
4. **Actions** :
   - Réduire la taille des prompts
   - Supprimer les instructions redondantes
   - Utiliser le cache pour les skills fréquents

**Résultat attendu** : 50-70% de réduction des tokens par skill

---

## 🐛 Dépannage

### Problème : Dashboard Vide

**Symptômes** :
- Toutes les cartes affichent "0"
- Aucun graphique ne s'affiche
- Message "Chargement des analytics..." qui persiste

**Causes possibles** :
1. ✅ **Optimisation non activée**
   - Solution : Activez "Enable Token Optimization" dans les paramètres
   
2. ✅ **Aucune donnée collectée**
   - Solution : Utilisez l'application en mode Agent Local pour générer des données
   
3. ✅ **Base de données vide**
   - Solution : Attendez d'avoir au moins une conversation avec l'IA

**Vérification** :
```javascript
// Dans la console développeur (F12)
const { ipc } = await import('@/ipc/types');
const stats = await ipc.tokenAnalytics.getStatistics({});
console.log(stats);
// Si totalRequests = 0, aucune donnée n'est collectée
```

---

### Problème : Données Incorrectes

**Symptômes** :
- Les chiffres semblent trop élevés ou trop bas
- Les coûts ne correspondent pas aux attentes

**Causes possibles** :
1. ✅ **Période de filtre incorrecte**
   - Solution : Vérifiez la période sélectionnée (7j, 30j, 90j, 1an)
   
2. ✅ **Tarifs de modèle obsolètes**
   - Solution : Les tarifs sont codés en dur, vérifiez les tarifs actuels des fournisseurs
   
3. ✅ **Estimation input/output**
   - Solution : Les ratios 70/30 sont des estimations, les vrais ratios peuvent varier

---

### Problème : Export Échoue

**Symptômes** :
- Le bouton "Exporter" ne fait rien
- Erreur dans la console

**Causes possibles** :
1. ✅ **Bloqueur de téléchargements**
   - Solution : Autorisez les téléchargements dans votre navigateur
   
2. ✅ **Données trop volumineuses**
   - Solution : Réduisez la période de filtre
   
3. ✅ **Erreur de permission**
   - Solution : Vérifiez les permissions d'écriture dans le dossier de téléchargement

---

### Problème : Graphiques ne s'affichent pas

**Symptômes** :
- Les cartes s'affichent mais pas les graphiques
- Espaces vides à la place des graphiques

**Causes possibles** :
1. ✅ **Recharts non installé**
   - Solution : `npm install recharts`
   
2. ✅ **Erreur JavaScript**
   - Solution : Ouvrez la console (F12) et vérifiez les erreurs
   
3. ✅ **Données insuffisantes**
   - Solution : Générez plus de données en utilisant l'application

---

## 💡 Conseils et Bonnes Pratiques

### 1. Surveillance Régulière

- ✅ Consultez le dashboard **une fois par semaine**
- ✅ Exportez les données **mensuellement** pour archivage
- ✅ Comparez les périodes pour identifier les tendances

### 2. Optimisation Continue

- ✅ Identifiez les **top 3 consommateurs** chaque semaine
- ✅ Optimisez **un skill par semaine**
- ✅ Testez différents modèles pour les tâches répétitives

### 3. Gestion du Budget

- ✅ Définissez un **budget mensuel**
- ✅ Surveillez le **coût total** régulièrement
- ✅ Activez des **alertes** si le coût dépasse un seuil

### 4. Documentation

- ✅ Documentez les **optimisations effectuées**
- ✅ Notez les **économies réalisées**
- ✅ Partagez les **bonnes pratiques** avec l'équipe

---

## 📚 Ressources Complémentaires

### Documentation Technique

- [Documentation Complète](TOKEN_OPTIMIZATION.md) - Détails techniques du système
- [Guide d'Utilisation](GUIDE_UTILISATION_TOKEN_OPTIMIZATION.md) - Guide pratique
- [Accès aux Analytics](ACCES_ANALYTICS.md) - Méthodes alternatives d'accès
- [Spec Technique](../.kiro/specs/token-optimization-skills/) - Spécifications détaillées

### Support

- **Console Développeur** : Accès direct aux données via IPC
- **Export CSV** : Analyse externe avec Excel/Google Sheets
- **Export JSON** : Intégration programmatique

---

## 🎯 Objectifs de Performance

### Métriques Cibles

| Métrique | Objectif | Excellent |
|----------|----------|-----------|
| Réduction de tokens | 30-50% | >50% |
| Temps de chargement skills | -60% | -80% |
| Taux de cache hit | 70-85% | >85% |
| Précision de prédiction | 60-75% | >75% |
| Économies mensuelles | 30-40% | >40% |

### Suivi des Objectifs

1. **Baseline** : Notez vos métriques actuelles
2. **Objectif** : Définissez vos cibles
3. **Mesure** : Suivez l'évolution hebdomadaire
4. **Ajustement** : Optimisez en continu

---

## 🔄 Mises à Jour

### Version 1.0.0 (Actuelle)

**Fonctionnalités** :
- ✅ Dashboard complet avec graphiques interactifs
- ✅ Export CSV et JSON
- ✅ Filtres par période
- ✅ Calcul automatique des coûts
- ✅ Top consommateurs (conversations, skills, modèles)

**Améliorations Prévues** :
- 🔄 Graphiques de tendances temporelles
- 🔄 Alertes automatiques sur seuils
- 🔄 Comparaison entre périodes
- 🔄 Recommandations d'optimisation automatiques
- 🔄 Export PDF avec rapports

---

## ❓ FAQ

### Q1 : Pourquoi mon dashboard est vide ?

**R** : Le dashboard affiche uniquement les données collectées après l'activation de l'optimisation des tokens. Utilisez l'application en mode Agent Local pour générer des données.

### Q2 : Les coûts affichés sont-ils exacts ?

**R** : Les coûts sont des estimations basées sur les tarifs publics des fournisseurs. Les tarifs réels peuvent varier selon votre contrat.

### Q3 : Puis-je supprimer les anciennes données ?

**R** : Actuellement, il n'y a pas d'interface pour supprimer les données. Elles sont stockées dans la base de données SQLite locale.

### Q4 : Les données sont-elles partagées ?

**R** : Non, toutes les données restent locales sur votre machine. Aucune donnée n'est envoyée à des serveurs externes.

### Q5 : Puis-je personnaliser les tarifs des modèles ?

**R** : Actuellement, les tarifs sont codés en dur. Une future version permettra de personnaliser les tarifs.

---

**Dernière mise à jour** : 10 mai 2026  
**Version** : 1.0.0  
**Auteur** : NeuroCode Team
