import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";

// Types
interface DateRange {
  startDate: number;
  endDate: number;
}

interface FilterOptions {
  dateRange: DateRange;
  groupBy: "day" | "week" | "month";
}

// Color palette
const COLORS = {
  primary: "#3b82f6",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  chart: [
    "#3b82f6",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
  ],
};

export function TokenAnalyticsDashboard() {
  // State
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      endDate: Date.now(),
    },
    groupBy: "day",
  });

  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Queries
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.statistics(filters.dateRange),
    queryFn: () => ipc.tokenAnalytics.getStatistics(filters.dateRange),
  });

  const { data: topConversations, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: "conversation",
      limit: 10,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: "conversation",
        limit: 10,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  const { data: topSkills, isLoading: skillsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: "skill",
      limit: 10,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: "skill",
        limit: 10,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  const { data: topModels, isLoading: modelsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: "model",
      limit: 5,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: "model",
        limit: 5,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.cost(filters.dateRange),
    queryFn: () =>
      ipc.tokenAnalytics.calculateCost({
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  // Loading state
  const isLoading =
    statsLoading ||
    convLoading ||
    skillsLoading ||
    modelsLoading ||
    costsLoading;

  // Prepare chart data
  const pieChartData = useMemo(() => {
    if (!topModels) return [];
    return topModels.map((model, index) => ({
      name: model.name,
      value: model.totalTokens,
      percentage: model.percentage,
      color: COLORS.chart[index % COLORS.chart.length],
    }));
  }, [topModels]);

  const barChartData = useMemo(() => {
    if (!topConversations) return [];
    return topConversations.slice(0, 5).map((conv) => ({
      name: conv.name.substring(0, 20) + (conv.name.length > 20 ? "..." : ""),
      tokens: conv.totalTokens,
      requests: conv.requestCount,
    }));
  }, [topConversations]);

  const costsByModelData = useMemo(() => {
    if (!costs) return [];
    return Object.entries(costs.byModel).map(([model, cost]) => ({
      model: model.substring(0, 20) + (model.length > 20 ? "..." : ""),
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
    }));
  }, [costs]);

  // Handlers
  const handleDateRangeChange = (
    range: "week" | "month" | "quarter" | "year",
  ) => {
    const now = Date.now();
    const ranges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    setFilters({
      ...filters,
      dateRange: {
        startDate: now - ranges[range],
        endDate: now,
      },
    });
  };

  const handleExport = async () => {
    try {
      const result = await ipc.tokenAnalytics.exportUsageData({
        format: exportFormat,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });

      // Create blob and download
      const blob = new Blob([result.data], {
        type: exportFormat === "csv" ? "text/csv" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Chargement des analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 Analytics des Tokens
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Suivez votre consommation de tokens et optimisez vos coûts
          </p>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as "csv" | "json")}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            📥 Exporter
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => handleDateRangeChange("week")}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          7 jours
        </button>
        <button
          onClick={() => handleDateRangeChange("month")}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium"
        >
          30 jours
        </button>
        <button
          onClick={() => handleDateRangeChange("quarter")}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          90 jours
        </button>
        <button
          onClick={() => handleDateRangeChange("year")}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
        >
          1 an
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tokens"
          value={formatNumber(statistics?.totalTokens || 0)}
          icon="🎯"
          color="blue"
        />
        <StatCard
          title="Requêtes"
          value={formatNumber(statistics?.requestCount || 0)}
          icon="📊"
          color="purple"
        />
        <StatCard
          title="Moyenne/Requête"
          value={formatNumber(
            Math.round(statistics?.averageTokensPerRequest || 0),
          )}
          icon="📈"
          color="green"
        />
        <StatCard
          title="Coût Total"
          value={formatCurrency(
            costs?.totalCost || 0,
            costs?.currency || "USD",
          )}
          icon="💰"
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Conversations Bar Chart */}
        <ChartCard title="🔥 Top 5 Conversations">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar dataKey="tokens" fill={COLORS.primary} name="Tokens" />
              <Bar dataKey="requests" fill={COLORS.secondary} name="Requêtes" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Models Distribution Pie Chart */}
        <ChartCard title="🤖 Distribution par Modèle">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) =>
                  `${entry.name}: ${entry.percentage.toFixed(1)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Costs by Model */}
        <ChartCard title="💰 Coûts par Modèle">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costsByModelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="model" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Legend />
              <Bar
                dataKey="inputCost"
                stackId="a"
                fill={COLORS.success}
                name="Entrée"
              />
              <Bar
                dataKey="outputCost"
                stackId="a"
                fill={COLORS.warning}
                name="Sortie"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Skills */}
        <ChartCard title="⚡ Top 10 Skills">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {topSkills?.map((skill, index) => (
              <div
                key={skill.name}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">
                    #{index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {skill.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {skill.requestCount} utilisations
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {formatNumber(skill.totalTokens)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {skill.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Conversations Table */}
        <TableCard title="📋 Détail des Conversations">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  #
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Conversation
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Tokens
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  %
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Requêtes
                </th>
              </tr>
            </thead>
            <tbody>
              {topConversations?.map((conv, index) => (
                <tr
                  key={conv.name}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {conv.name}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                    {formatNumber(conv.totalTokens)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {conv.percentage.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {conv.requestCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        {/* Costs Detail Table */}
        <TableCard title="💵 Détail des Coûts par Modèle">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Modèle
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Tokens Entrée
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Coût Entrée
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Tokens Sortie
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Coût Sortie
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {costs &&
                Object.entries(costs.byModel).map(([model, cost]) => (
                  <tr
                    key={model}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      {model}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {formatNumber(cost.inputTokens)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(cost.inputCost, costs.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {formatNumber(cost.outputTokens)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {formatCurrency(cost.outputCost, costs.currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white font-bold">
                      {formatCurrency(cost.totalCost, costs.currency)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  );
}

// Helper Components
interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: "blue" | "purple" | "green" | "yellow";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    purple:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    green:
      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`text-3xl ${colorClasses[color]} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface TableCardProps {
  title: string;
  children: React.ReactNode;
}

function TableCard({ title, children }: TableCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
