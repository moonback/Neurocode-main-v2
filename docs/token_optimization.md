# Optimisation des Tokens et Gestion des Coûts

Ce document détaille le fonctionnement du système d'optimisation des tokens et de suivi des coûts de NeuroCode. Ces fonctionnalités permettent de gérer efficacement le contexte envoyé à l'IA tout en maîtrisant les dépenses associées aux modèles de langage.

## 📊 Observabilité et Suivi des Coûts

NeuroCode intègre un moteur d'analyse complet pour suivre l'utilisation des tokens en temps réel.

### Fonctionnalités Clés
- **Tableau de Bord :** Visualisez votre consommation totale, le coût par fournisseur et par modèle.
- **Répartition détaillée :** Suivez l'utilisation des tokens d'entrée, de sortie et des outils.
- **Indicateur de budget :** Un indicateur visuel dans l'interface de chat vous informe de l'état de votre budget mensuel.
- **Estimation en temps réel :** Avant d'envoyer un message, NeuroCode estime son coût potentiel en se basant sur le contexte actuel et le prix du modèle sélectionné.

### Configuration du Budget
Vous pouvez définir un budget mensuel (en USD) dans les **Paramètres > Token Optimization**.
- **Seuil d'alerte :** Recevez une notification visuelle lorsque vous atteignez 80% ou 95% de votre budget.
- **Exportation :** Exportez vos données de consommation au format JSON pour une analyse plus poussée.

---

## 🧠 Stratégies d'Élagage (Pruning)

Pour éviter de saturer la fenêtre de contexte des modèles et réduire les coûts, NeuroCode utilise des algorithmes d'élagage intelligents.

### Modes d'Élagage
1. **Conservative (Conservateur) :** Élimine uniquement les messages les plus anciens et les moins pertinents. Priorise la conservation de l'historique complet.
2. **Balanced (Équilibré - Par défaut) :** Trouve un compromis entre la conservation du contexte et la réduction des tokens.
3. **Aggressive (Agressif) :** Réduit drastiquement le contexte en ne gardant que les informations essentielles et les messages récents. Idéal pour économiser des tokens sur de longues conversations.

### Algorithme de Priorité
Chaque message reçoit un score de priorité basé sur :
- **Récence :** Les messages récents sont plus importants.
- **Interaction :** Les messages édités ou approuvés par l'utilisateur reçoivent un bonus.
- **Relevance Sémantique :** Analyse de la pertinence par rapport au sujet actuel.
- **Épinglage :** Les messages épinglés manuellement ne sont jamais supprimés par l'élagage.

---

## 📌 Épinglage de Messages (Message Pinning)

L'épinglage permet de "protéger" des messages spécifiques pour qu'ils restent toujours dans le contexte envoyé à l'IA, quel que soit l'élagage effectué.

### Cas d'utilisation
- Conserver des instructions complexes données en début de chat.
- Garder une structure de données ou un exemple de code crucial comme référence.
- S'assurer que l'IA n'oublie pas une contrainte métier importante.

### Comment épingler ?
Cliquez sur l'icône **Épingle (Pin)** en haut à droite de n'importe quel message dans la conversation. Une icône bleue indique que le message est désormais protégé.

---

## 🛠️ Configuration pour les Développeurs

Le système est extensible et permet d'ajouter de nouveaux fournisseurs ou de modifier les tarifs.

### Schéma de Configuration (`TokenOptimizationConfig`)
Les paramètres sont stockés dans le profil utilisateur et incluent :
- `pruningStrategy`: Choix de la stratégie.
- `costBudget`: Montant et période du budget.
- `tokenAllocation`: Ratios cibles pour l'entrée, les instructions système et la génération.

### Ajout de tarifs modèles
Les tarifs sont gérés via la table `provider_pricing` dans la base de données SQLite interne. Les tarifs par défaut sont :
- Entrée : ~10$ / million de tokens
- Sortie : ~30$ / million de tokens
*(Ces valeurs varient selon le modèle réel utilisé via les contrats IPC).*

---

## ❓ FAQ et Dépannage

**Pourquoi mon estimation de coût change-t-elle brusquement ?**
L'estimation dépend de la taille totale du contexte (codebase + historique). Si vous ajoutez des fichiers au contexte ou mentionnez d'autres applications, l'estimation augmentera proportionnellement.

**Est-ce que l'élagage supprime mes messages de la base de données ?**
Non. L'élagage affecte uniquement ce qui est **envoyé** à l'IA pour la requête actuelle. Votre historique complet reste visible dans l'interface de NeuroCode.

**Comment réinitialiser mes statistiques de coût ?**
Actuellement, les statistiques sont persistantes. Vous pouvez cependant filtrer par période dans le tableau de bord pour voir votre consommation récente.
