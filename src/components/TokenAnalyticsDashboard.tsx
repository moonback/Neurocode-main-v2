import { useState, useMemo } from 'react';
import {
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
} from 'recharts';
import { queryKeys } from '@/lib/queryKeys';
import { useRouter } from '@tanstack/react-router';
import { ArrowLeft, Download, TrendingUp, DollarSign, Zap, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/ipc/types';
import { cn } from '@/lib/utils';

// Types
interface DateRange {
  startDate: number;
  endDate: number;
}

interface FilterOptions {
  dateRange: DateRange;
  groupBy: 'day' | 'week' | 'month';
}

// Color palette - keeping it consistent with the app's brand
const COLORS = {
  primary: '#6c55dc',
  secondary: '#9b7eff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  chart: ['#6c55dc', '#9b7eff', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
};

/* ─────────────────────────────────────────────────────────────────────────────
   Helper Components
───────────────────────────────────────────────────────────────────────────── */

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'yellow';
  trend?: string;
}

function StatCard({ title, value, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-[#6c55dc]/10 text-[#6c55dc] border-[#6c55dc]/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    yellow: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  const glowClasses = {
    blue: 'bg-[#6c55dc]',
    purple: 'bg-purple-500',
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
  };

  return (
    <div className="relative group overflow-hidden bg-card rounded-2xl p-5 border border-border/50 shadow-sm transition-all hover:shadow-md hover:border-[#6c55dc]/30">
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md inline-block">
              {trend}
            </p>
          )}
        </div>
        <div className={cn("p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-110 duration-300", colorClasses[color])}>
          {icon}
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className={cn("absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.06] transition-opacity", glowClasses[color])} />
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-border/30 bg-muted/[0.03]">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <div className="p-6 flex-grow">{children}</div>
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border/30 bg-muted/[0.03]">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto p-2">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────────────────────────── */

export function TokenAnalyticsDashboard() {
  const router = useRouter();
  
  // State
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      endDate: Date.now(),
    },
    groupBy: 'day',
  });

  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  // Queries
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.statistics(filters.dateRange),
    queryFn: () => ipc.tokenAnalytics.getStatistics(filters.dateRange),
  });

  const { data: topConversations, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: 'conversation',
      limit: 10,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: 'conversation',
        limit: 10,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  const { data: topSkills, isLoading: skillsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: 'skill',
      limit: 10,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: 'skill',
        limit: 10,
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      }),
  });

  const { data: topModels, isLoading: modelsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({
      type: 'model',
      limit: 5,
      startDate: filters.dateRange.startDate,
      endDate: filters.dateRange.endDate,
    }),
    queryFn: () =>
      ipc.tokenAnalytics.getTopConsumers({
        type: 'model',
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
  const isLoading = statsLoading || convLoading || skillsLoading || modelsLoading || costsLoading;

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
      name: conv.name.substring(0, 20) + (conv.name.length > 20 ? '...' : ''),
      tokens: conv.totalTokens,
      requests: conv.requestCount,
    }));
  }, [topConversations]);

  const costsByModelData = useMemo(() => {
    if (!costs) return [];
    return Object.entries(costs.byModel).map(([model, cost]) => ({
      model: model.substring(0, 20) + (model.length > 20 ? '...' : ''),
      inputCost: cost.inputCost,
      outputCost: cost.outputCost,
      totalCost: cost.totalCost,
    }));
  }, [costs]);

  const [activeRange, setActiveRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Handlers
  const handleDateRangeChange = (range: 'week' | 'month' | 'quarter') => {
    const now = Date.now();
    const ranges = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      quarter: 90 * 24 * 60 * 60 * 1000,
    };

    setActiveRange(range);
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
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="text-center animate-in fade-in duration-500">
          <div className="relative h-16 w-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-t-2 border-[#6c55dc] animate-spin" />
            <div className="absolute inset-2 rounded-full border-b-2 border-[#9b7eff] animate-spin-reverse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Préparation de vos données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-[#6c55dc]/20">
      {/* Header Sticky */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.history.back()}
              className="rounded-full hover:bg-muted/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#6c55dc]/12 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-[#6c55dc]" />
                </div>
                <h1 className="text-xl font-bold tracking-tight">Token Analytics</h1>
              </div>
              <p className="text-xs text-muted-foreground font-medium ml-10">Optimisation & Coûts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center bg-muted/40 rounded-lg p-1 border border-border/40">
              {(['week', 'month', 'quarter'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={cn(
                    "px-3 py-1 text-[11px] font-semibold rounded-md transition-all",
                    (activeRange === range)
                      ? "bg-background text-[#6c55dc] shadow-sm border border-border/40"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {range === 'week' ? '7J' : range === 'month' ? '30J' : '90J'}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-border/40 mx-1" />

            <div className="flex items-center gap-2">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
                className="bg-muted/40 border border-border/40 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#6c55dc]/40"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExport}
                className="gap-2 text-xs font-semibold bg-background shadow-sm border-border/60 hover:bg-[#6c55dc]/5 hover:text-[#6c55dc] hover:border-[#6c55dc]/30"
              >
                <Download className="h-3.5 w-3.5" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Consommation Totale"
            value={formatNumber(statistics?.totalTokens || 0)}
            icon={<Zap className="h-5 w-5" />}
            color="blue"
            trend="+12% vs mois dernier"
          />
          <StatCard
            title="Volume d'Appels"
            value={formatNumber(statistics?.requestCount || 0)}
            icon={<MessageSquare className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title="Efficacité (avg)"
            value={formatNumber(Math.round(statistics?.averageTokensPerRequest || 0))}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Estimation Coûts"
            value={formatCurrency(costs?.totalCost || 0, costs?.currency || 'USD')}
            icon={<DollarSign className="h-5 w-5" />}
            color="yellow"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="🔥 Top 5 Conversations">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="tokens" fill={COLORS.primary} name="Tokens" />
                <Bar dataKey="requests" fill={COLORS.secondary} name="Requêtes" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="🤖 Distribution par Modèle">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.name}: ${entry.percentage.toFixed(1)}%`}
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
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="💰 Coûts par Modèle">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costsByModelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="model" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="inputCost" stackId="a" fill={COLORS.success} name="Entrée" />
                <Bar dataKey="outputCost" stackId="a" fill={COLORS.warning} name="Sortie" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="⚡ Top 10 Skills">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {topSkills?.map((skill, index) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground/30">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-foreground">{skill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {skill.requestCount} utilisations
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      {formatNumber(skill.totalTokens)}
                    </p>
                    <p className="text-sm text-muted-foreground">
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
          <TableCard title="📋 Détail des Conversations">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    #
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Conversation
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tokens
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    %
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Requêtes
                  </th>
                </tr>
              </thead>
              <tbody>
                {topConversations?.map((conv, index) => (
                  <tr
                    key={conv.name}
                    className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-muted-foreground">{index + 1}</td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {conv.name}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                      {formatNumber(conv.totalTokens)}
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                      {conv.percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-sm text-muted-foreground">
                      {conv.requestCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>

          <TableCard title="💵 Détail des Coûts par Modèle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Modèle
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tokens Entrée
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Coût Entrée
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tokens Sortie
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Coût Sortie
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {costs &&
                  Object.entries(costs.byModel).map(([model, cost]) => (
                    <tr
                      key={model}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-foreground">
                        {model}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground tabular-nums">
                        {formatNumber(cost.inputTokens)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(cost.inputCost, costs.currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground tabular-nums">
                        {formatNumber(cost.outputTokens)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-muted-foreground tabular-nums">
                        {formatCurrency(cost.outputCost, costs.currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-bold text-foreground tabular-nums">
                        {formatCurrency(cost.totalCost, costs.currency)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </div>
  );
}
