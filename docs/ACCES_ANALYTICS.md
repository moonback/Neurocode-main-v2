# 📊 Comment Accéder aux Analytics - Système d'Optimisation des Tokens

## 🎯 État Actuel

### ✅ Ce qui est Implémenté

- **API IPC Complète** : Tous les endpoints analytics sont fonctionnels
- **Backend** : Collecte et stockage des données en base de données
- **Calculs** : Statistiques, top consommateurs, coûts, export
- **Tests** : 41 tests unitaires validant toutes les fonctionnalités
- **Dashboard UI** : Interface graphique React avec Recharts pour visualiser les analytics
- **Bug Fix** : Correction du problème de données vides dans le dashboard (voir [BUGFIX_DASHBOARD_EMPTY_DATA.md](BUGFIX_DASHBOARD_EMPTY_DATA.md))

### ⚠️ Note Importante

**Si le dashboard affiche des données vides** malgré l'utilisation en mode Agent Local, consultez [BUGFIX_DASHBOARD_EMPTY_DATA.md](BUGFIX_DASHBOARD_EMPTY_DATA.md) pour la solution. Le problème était lié à la conversion des timestamps en objets Date dans les handlers IPC.

---

## 🔧 Comment Accéder aux Analytics Actuellement

### Option 1 : Via la Console Développeur (Recommandé)

#### Étape 1 : Ouvrir la Console

1. Dans NeuroCode, appuyez sur `F12` ou `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
2. Allez dans l'onglet **Console**

#### Étape 2 : Utiliser l'API IPC

```javascript
// Importer le client IPC
const { ipc } = await import("@/ipc/types");

// 1. Obtenir les statistiques globales
const stats = await ipc.tokenAnalytics.getStatistics({
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 derniers jours
  endDate: Date.now(),
});

console.log("📊 Statistiques des 30 derniers jours:");
console.log(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
console.log(`Tokens d'entrée: ${stats.inputTokens.toLocaleString()}`);
console.log(`Tokens de sortie: ${stats.outputTokens.toLocaleString()}`);
console.log(`Nombre de requêtes: ${stats.requestCount}`);
console.log(
  `Moyenne par requête: ${Math.round(stats.averageTokensPerRequest).toLocaleString()}`,
);
console.log(`Pic par requête: ${stats.peakTokensPerRequest.toLocaleString()}`);

// 2. Top 5 conversations les plus coûteuses
const topConversations = await ipc.tokenAnalytics.getTopConsumers({
  type: "conversation",
  limit: 5,
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
});

console.log("\n🔥 Top 5 Conversations:");
topConversations.forEach((conv, i) => {
  console.log(`${i + 1}. ${conv.name}`);
  console.log(
    `   Tokens: ${conv.totalTokens.toLocaleString()} (${conv.percentage.toFixed(1)}%)`,
  );
  console.log(`   Requêtes: ${conv.requestCount}`);
});

// 3. Top 5 skills les plus utilisés
const topSkills = await ipc.tokenAnalytics.getTopConsumers({
  type: "skill",
  limit: 5,
});

console.log("\n⚡ Top 5 Skills:");
topSkills.forEach((skill, i) => {
  console.log(`${i + 1}. ${skill.name}`);
  console.log(
    `   Tokens: ${skill.totalTokens.toLocaleString()} (${skill.percentage.toFixed(1)}%)`,
  );
  console.log(`   Utilisations: ${skill.requestCount}`);
});

// 4. Calcul des coûts
const costs = await ipc.tokenAnalytics.calculateCost({
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
});

console.log("\n💰 Coûts Estimés (30 jours):");
console.log(`Total: $${costs.totalCost.toFixed(2)} ${costs.currency}`);
console.log("\nPar modèle:");
Object.entries(costs.byModel).forEach(([model, cost]) => {
  console.log(`  ${model}:`);
  console.log(
    `    Entrée: $${cost.inputCost.toFixed(2)} (${cost.inputTokens.toLocaleString()} tokens)`,
  );
  console.log(
    `    Sortie: $${cost.outputCost.toFixed(2)} (${cost.outputTokens.toLocaleString()} tokens)`,
  );
  console.log(`    Total: $${cost.totalCost.toFixed(2)}`);
});

// 5. Export des données (optionnel)
const csvExport = await ipc.tokenAnalytics.exportUsageData({
  format: "csv",
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
});

console.log("\n📥 Export CSV disponible:");
console.log(`Nom du fichier: ${csvExport.filename}`);
console.log(`Taille: ${csvExport.data.length} caractères`);
// Pour sauvegarder: copier csvExport.data dans un fichier
```

#### Résultat Attendu

Vous devriez voir dans la console :

```
📊 Statistiques des 30 derniers jours:
Total tokens: 1,500,000
Tokens d'entrée: 1,000,000
Tokens de sortie: 500,000
Nombre de requêtes: 150
Moyenne par requête: 10,000
Pic par requête: 50,000

🔥 Top 5 Conversations:
1. conversation-abc123
   Tokens: 250,000 (16.7%)
   Requêtes: 25
2. conversation-def456
   Tokens: 180,000 (12.0%)
   Requêtes: 18
...

⚡ Top 5 Skills:
1. /examples:code-review
   Tokens: 120,000 (8.0%)
   Utilisations: 45
...

💰 Coûts Estimés (30 jours):
Total: $45.50 USD

Par modèle:
  claude-3-5-sonnet-20241022:
    Entrée: $15.00 (500,000 tokens)
    Sortie: $22.50 (150,000 tokens)
    Total: $37.50
...
```

---

### Option 2 : Créer un Script Personnalisé

Créez un fichier `scripts/analytics.ts` :

```typescript
import { ipc } from "@/ipc/types";

async function showAnalytics() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Statistiques globales
  const stats = await ipc.tokenAnalytics.getStatistics({
    startDate: thirtyDaysAgo,
    endDate: Date.now(),
  });

  console.log("=".repeat(60));
  console.log("📊 ANALYTICS - 30 DERNIERS JOURS");
  console.log("=".repeat(60));

  console.log("\n📈 STATISTIQUES GLOBALES");
  console.log("-".repeat(60));
  console.log(
    `Total tokens utilisés    : ${stats.totalTokens.toLocaleString()}`,
  );
  console.log(
    `  - Entrée               : ${stats.inputTokens.toLocaleString()}`,
  );
  console.log(
    `  - Sortie               : ${stats.outputTokens.toLocaleString()}`,
  );
  console.log(`Nombre de requêtes       : ${stats.requestCount}`);
  console.log(
    `Moyenne par requête      : ${Math.round(stats.averageTokensPerRequest).toLocaleString()}`,
  );
  console.log(
    `Pic par requête          : ${stats.peakTokensPerRequest.toLocaleString()}`,
  );

  // Top conversations
  const topConv = await ipc.tokenAnalytics.getTopConsumers({
    type: "conversation",
    limit: 10,
    startDate: thirtyDaysAgo,
  });

  console.log("\n🔥 TOP 10 CONVERSATIONS");
  console.log("-".repeat(60));
  topConv.forEach((conv, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${conv.name.substring(0, 40).padEnd(40)} ${conv.totalTokens.toLocaleString().padStart(12)} tokens (${conv.percentage.toFixed(1)}%)`,
    );
  });

  // Top skills
  const topSkills = await ipc.tokenAnalytics.getTopConsumers({
    type: "skill",
    limit: 10,
    startDate: thirtyDaysAgo,
  });

  console.log("\n⚡ TOP 10 SKILLS");
  console.log("-".repeat(60));
  topSkills.forEach((skill, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${skill.name.substring(0, 40).padEnd(40)} ${skill.totalTokens.toLocaleString().padStart(12)} tokens (${skill.percentage.toFixed(1)}%)`,
    );
  });

  // Top modèles
  const topModels = await ipc.tokenAnalytics.getTopConsumers({
    type: "model",
    limit: 5,
    startDate: thirtyDaysAgo,
  });

  console.log("\n🤖 TOP 5 MODÈLES");
  console.log("-".repeat(60));
  topModels.forEach((model, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${model.name.substring(0, 40).padEnd(40)} ${model.totalTokens.toLocaleString().padStart(12)} tokens (${model.percentage.toFixed(1)}%)`,
    );
  });

  // Coûts
  const costs = await ipc.tokenAnalytics.calculateCost({
    startDate: thirtyDaysAgo,
  });

  console.log("\n💰 COÛTS ESTIMÉS");
  console.log("-".repeat(60));
  console.log(`Total: $${costs.totalCost.toFixed(2)} ${costs.currency}`);
  console.log("\nDétail par modèle:");
  Object.entries(costs.byModel).forEach(([model, cost]) => {
    console.log(`  ${model}:`);
    console.log(
      `    Entrée : $${cost.inputCost.toFixed(2).padStart(8)} (${cost.inputTokens.toLocaleString().padStart(10)} tokens)`,
    );
    console.log(
      `    Sortie : $${cost.outputCost.toFixed(2).padStart(8)} (${cost.outputTokens.toLocaleString().padStart(10)} tokens)`,
    );
    console.log(`    Total  : $${cost.totalCost.toFixed(2).padStart(8)}`);
  });

  console.log("\n" + "=".repeat(60));
}

// Exécuter
showAnalytics().catch(console.error);
```

Puis exécutez :

```bash
npx tsx scripts/analytics.ts
```

---

### Option 3 : Export CSV pour Excel

```javascript
// Dans la console développeur
const { ipc } = await import("@/ipc/types");

// Export CSV
const csvExport = await ipc.tokenAnalytics.exportUsageData({
  format: "csv",
  startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
  endDate: Date.now(),
});

// Copier les données
console.log(csvExport.data);

// Puis:
// 1. Copier le contenu affiché
// 2. Créer un fichier token-usage.csv
// 3. Coller le contenu
// 4. Ouvrir dans Excel ou Google Sheets
```

Le CSV contient :

```csv
timestamp,conversation_id,skill_name,model_type,input_tokens,output_tokens,total_tokens
1705334400000,conv-123,/code-review,claude-3-5-sonnet,5000,2000,7000
1705334500000,conv-123,,claude-3-5-sonnet,3000,1500,4500
...
```

---

## 🎨 Solution Temporaire : Dashboard Simple

En attendant le dashboard UI officiel, vous pouvez créer un dashboard HTML simple :

### Créer `analytics-dashboard.html`

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Analytics - Token Optimization</title>
    <style>
      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background: #f5f5f5;
      }
      .card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
      }
      h2 {
        color: #666;
        margin-top: 0;
      }
      .stat {
        display: inline-block;
        margin-right: 30px;
        margin-bottom: 10px;
      }
      .stat-label {
        font-size: 12px;
        color: #999;
        text-transform: uppercase;
      }
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        color: #333;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #eee;
      }
      th {
        background: #f9f9f9;
        font-weight: 600;
      }
      .percentage {
        color: #666;
        font-size: 14px;
      }
      button {
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      button:hover {
        background: #0056b3;
      }
      #loading {
        text-align: center;
        padding: 40px;
        color: #999;
      }
    </style>
  </head>
  <body>
    <h1>📊 Analytics - Token Optimization</h1>

    <div id="loading">Chargement des données...</div>

    <div id="content" style="display: none;">
      <div class="card">
        <h2>📈 Statistiques Globales (30 derniers jours)</h2>
        <div class="stat">
          <div class="stat-label">Total Tokens</div>
          <div class="stat-value" id="totalTokens">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Requêtes</div>
          <div class="stat-value" id="requestCount">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Moyenne/Requête</div>
          <div class="stat-value" id="avgTokens">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Coût Estimé</div>
          <div class="stat-value" id="totalCost">-</div>
        </div>
      </div>

      <div class="card">
        <h2>🔥 Top 10 Conversations</h2>
        <table id="topConversations">
          <thead>
            <tr>
              <th>#</th>
              <th>Conversation</th>
              <th>Tokens</th>
              <th>%</th>
              <th>Requêtes</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <h2>⚡ Top 10 Skills</h2>
        <table id="topSkills">
          <thead>
            <tr>
              <th>#</th>
              <th>Skill</th>
              <th>Tokens</th>
              <th>%</th>
              <th>Utilisations</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <h2>💰 Coûts par Modèle</h2>
        <table id="costsByModel">
          <thead>
            <tr>
              <th>Modèle</th>
              <th>Tokens Entrée</th>
              <th>Tokens Sortie</th>
              <th>Coût Total</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="card">
        <button onclick="exportCSV()">📥 Exporter en CSV</button>
        <button onclick="refreshData()">🔄 Actualiser</button>
      </div>
    </div>

    <script>
      // Note: Ce script doit être adapté pour fonctionner dans le contexte Electron
      // Il s'agit d'un exemple de structure

      async function loadAnalytics() {
        try {
          // Importer l'API IPC (à adapter selon votre contexte)
          const { ipc } = await import("@/ipc/types");

          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

          // Charger les statistiques
          const stats = await ipc.tokenAnalytics.getStatistics({
            startDate: thirtyDaysAgo,
            endDate: Date.now(),
          });

          document.getElementById("totalTokens").textContent =
            stats.totalTokens.toLocaleString();
          document.getElementById("requestCount").textContent =
            stats.requestCount.toLocaleString();
          document.getElementById("avgTokens").textContent = Math.round(
            stats.averageTokensPerRequest,
          ).toLocaleString();

          // Charger les coûts
          const costs = await ipc.tokenAnalytics.calculateCost({
            startDate: thirtyDaysAgo,
          });

          document.getElementById("totalCost").textContent =
            `$${costs.totalCost.toFixed(2)}`;

          // Charger top conversations
          const topConv = await ipc.tokenAnalytics.getTopConsumers({
            type: "conversation",
            limit: 10,
            startDate: thirtyDaysAgo,
          });

          const convTable = document.querySelector("#topConversations tbody");
          convTable.innerHTML = topConv
            .map(
              (conv, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${conv.name}</td>
                        <td>${conv.totalTokens.toLocaleString()}</td>
                        <td class="percentage">${conv.percentage.toFixed(1)}%</td>
                        <td>${conv.requestCount}</td>
                    </tr>
                `,
            )
            .join("");

          // Charger top skills
          const topSkills = await ipc.tokenAnalytics.getTopConsumers({
            type: "skill",
            limit: 10,
            startDate: thirtyDaysAgo,
          });

          const skillsTable = document.querySelector("#topSkills tbody");
          skillsTable.innerHTML = topSkills
            .map(
              (skill, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${skill.name}</td>
                        <td>${skill.totalTokens.toLocaleString()}</td>
                        <td class="percentage">${skill.percentage.toFixed(1)}%</td>
                        <td>${skill.requestCount}</td>
                    </tr>
                `,
            )
            .join("");

          // Charger coûts par modèle
          const costsTable = document.querySelector("#costsByModel tbody");
          costsTable.innerHTML = Object.entries(costs.byModel)
            .map(
              ([model, cost]) => `
                    <tr>
                        <td>${model}</td>
                        <td>${cost.inputTokens.toLocaleString()}</td>
                        <td>${cost.outputTokens.toLocaleString()}</td>
                        <td>$${cost.totalCost.toFixed(2)}</td>
                    </tr>
                `,
            )
            .join("");

          document.getElementById("loading").style.display = "none";
          document.getElementById("content").style.display = "block";
        } catch (error) {
          console.error("Erreur lors du chargement des analytics:", error);
          document.getElementById("loading").textContent =
            "Erreur lors du chargement des données";
        }
      }

      async function exportCSV() {
        const { ipc } = await import("@/ipc/types");
        const csvExport = await ipc.tokenAnalytics.exportUsageData({
          format: "csv",
          startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
        });

        const blob = new Blob([csvExport.data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = csvExport.filename;
        a.click();
      }

      function refreshData() {
        document.getElementById("loading").style.display = "block";
        document.getElementById("content").style.display = "none";
        loadAnalytics();
      }

      // Charger au démarrage
      loadAnalytics();
    </script>
  </body>
</html>
```

---

## 🚀 Prochaines Étapes

### Pour Avoir un Dashboard UI Complet

La Task 15.1 (optionnelle) consiste à créer un dashboard React intégré dans NeuroCode avec :

- ✅ Composant React `TokenAnalyticsDashboard.tsx`
- ✅ Graphiques avec Chart.js ou Recharts
- ✅ Intégration TanStack Query
- ✅ Filtres par période
- ✅ Export intégré
- ✅ Actualisation automatique

**Temps estimé :** 4-6 heures de développement

### Voulez-vous que je l'implémente ?

Si vous souhaitez avoir le dashboard UI complet, je peux :

1. Créer le composant React `TokenAnalyticsDashboard.tsx`
2. Ajouter les graphiques avec Recharts
3. Intégrer dans la page Settings ou créer une page dédiée
4. Ajouter les filtres et l'export
5. Écrire les tests E2E

**Dites-moi si vous voulez que je continue avec le dashboard UI !**

---

## 📝 Résumé

### ✅ Disponible Maintenant

- API IPC complète et fonctionnelle
- Accès via console développeur
- Export CSV pour Excel
- Scripts personnalisés possibles

### ⏳ À Venir (Optionnel)

- Dashboard UI intégré dans NeuroCode
- Graphiques et visualisations
- Interface utilisateur intuitive

### 💡 Recommandation

En attendant le dashboard UI, utilisez la **console développeur** (Option 1) pour accéder rapidement à vos analytics. C'est la méthode la plus simple et la plus rapide !

---

**Besoin d'aide ?** Consultez les exemples de code ci-dessus ou demandez-moi d'implémenter le dashboard UI complet !
