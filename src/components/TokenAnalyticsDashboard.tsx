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
import { ArrowLeft, Download, TrendingUp, DollarSign, Zap, MessageSquare, BarChart3, PieChart as PieIcon, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/ipc/types';
import { cn } from '@/lib/utils';

// --- Types ---
interface DateRange {
  startDate: number;
  endDate: number;
}

interface FilterOptions {
  dateRange: DateRange;
  groupBy: 'day' | 'week' | 'month';
}

// --- Colors ---
const COLORS = {
  primary: '#6c55dc',
  secondary: '#9b7eff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  chart: ['#6c55dc', '#9b7eff', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
};

// --- Helper Components ---

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
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// --- Main Dashboard ---

export function TokenAnalyticsDashboard() {
  const router = useRouter();
  
  // State
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: {
      startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
      endDate: Date.now(),
    },
    groupBy: 'day',
  });

  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [activeRange, setActiveRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Queries
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.statistics(filters.dateRange),
    queryFn: () => ipc.tokenAnalytics.getStatistics(filters.dateRange),
  });

  const { data: topConversations, isLoading: convLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'conversation', limit: 5, ...filters.dateRange }),
    queryFn: () => ipc.tokenAnalytics.getTopConsumers({ type: 'conversation', limit: 5, ...filters.dateRange }),
  });

  const { data: topSkills, isLoading: skillsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'skill', limit: 10, ...filters.dateRange }),
    queryFn: () => ipc.tokenAnalytics.getTopConsumers({ type: 'skill', limit: 10, ...filters.dateRange }),
  });

  const { data: topModels, isLoading: modelsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'model', limit: 5, ...filters.dateRange }),
    queryFn: () => ipc.tokenAnalytics.getTopConsumers({ type: 'model', limit: 5, ...filters.dateRange }),
  });

  const { data: costs, isLoading: costsLoading } = useQuery({
    queryKey: queryKeys.tokenAnalytics.cost(filters.dateRange),
    queryFn: () => ipc.tokenAnalytics.calculateCost(filters.dateRange),
  });

  const isLoading = statsLoading || convLoading || skillsLoading || modelsLoading || costsLoading;

  // Prepare chart data
  const pieChartData = useMemo(() => {
    if (!topModels) return [];
    return topModels.map(m => ({
      name: m.name,
      value: m.totalTokens
    }));
  }, [topModels]);

  const barChartData = useMemo(() => {
    if (!topConversations) return [];
    return topConversations.map(c => ({
      name: c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name,
      tokens: c.totalTokens,
      requests: c.requestCount || 0
    }));
  }, [topConversations]);

  const costsByModelData = useMemo(() => {
    if (!costs) return [];
    return Object.entries(costs.byModel).map(([modelName, data]) => ({
      name: modelName,
      inputCost: data.inputCost,
      outputCost: data.outputCost,
      totalCost: data.totalCost,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
    }));
  }, [costs]);

  // Handlers
  const handleDateRangeChange = (range: 'week' | 'month' | 'quarter') => {
    setActiveRange(range);
    const now = Date.now();
    let startDate = now;
    
    if (range === 'week') startDate = now - 7 * 24 * 60 * 60 * 1000;
    else if (range === 'month') startDate = now - 30 * 24 * 60 * 60 * 1000;
    else if (range === 'quarter') startDate = now - 90 * 24 * 60 * 60 * 1000;
    
    setFilters(prev => ({ ...prev, dateRange: { startDate, endDate: now } }));
  };

  const handleExport = async () => {
    try {
      const result = await ipc.tokenAnalytics.exportUsageData({
        ...filters.dateRange,
        format: exportFormat,
      });
      console.log('Export success:', result);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-[#6c55dc]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-[#6c55dc] border-t-transparent animate-spin" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">Chargement des analytiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.history.back()}
            className="group mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Retour aux réglages
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#6c55dc]/10 rounded-xl">
              <Activity className="h-6 w-6 text-[#6c55dc]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Token Analytics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Consultez les statistiques d'utilisation des tokens, les performances des modèles et l'analyse détaillée des coûts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-1.5 rounded-xl border border-border/40 self-start">
          {(['week', 'month', 'quarter'] as const).map((range) => (
            <button
              key={range}
              onClick={() => handleDateRangeChange(range)}
              className={cn(
                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeRange === range
                  ? "bg-background text-[#6c55dc] shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range === 'week' ? '7 Jours' : range === 'month' ? '30 Jours' : '90 Jours'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="Total Tokens"
          value={statistics?.totalTokens?.toLocaleString() || '0'}
          icon={<Zap className="h-5 w-5" />}
          color="blue"
          trend="+12% vs last period"
        />
        <StatCard
          title="Total Requêtes"
          value={statistics?.requestCount?.toLocaleString() || '0'}
          icon={<MessageSquare className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Moyenne / Req"
          value={statistics?.averageTokensPerRequest?.toFixed(0) || '0'}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Coût Estimé"
          value={`$${costs?.totalCost?.toFixed(2) || '0.00'}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartCard title="Top 5 Conversations">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="tokens" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Tokens" barSize={30} />
              <Bar dataKey="requests" fill={COLORS.secondary} name="Requêtes" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribution par Modèle">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Costs Chart */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <ChartCard title="Coûts par Modèle">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={costsByModelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.6 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip 
                formatter={(val: any) => [`$${Number(val || 0).toFixed(4)}`, '']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend />
              <Bar dataKey="inputCost" stackId="a" fill={COLORS.success} name="Entrée" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outputCost" stackId="a" fill={COLORS.primary} name="Sortie" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TableCard title="Détail des Conversations">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
              <tr>
                <th className="px-6 py-3 font-bold">Nom</th>
                <th className="px-6 py-3 font-bold text-right">Tokens</th>
                <th className="px-6 py-3 font-bold text-right">Requêtes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {topConversations?.map((conv) => (
                <tr key={conv.name} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium max-w-[200px] truncate">{conv.name}</td>
                  <td className="px-6 py-4 text-right font-mono">{conv.totalTokens.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">{conv.requestCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Détail des Coûts par Modèle">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
              <tr>
                <th className="px-6 py-3 font-bold">Modèle</th>
                <th className="px-6 py-3 font-bold text-right">Total Tokens</th>
                <th className="px-6 py-3 font-bold text-right">Coût ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {costsByModelData.map((m) => (
                <tr key={m.name} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-medium">{m.name}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {(m.inputTokens + m.outputTokens).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-[#6c55dc]">
                    ${m.totalCost.toFixed(4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {/* Actions */}
      <div className="mt-12 flex items-center justify-between p-6 bg-[#6c55dc]/5 rounded-2xl border border-[#6c55dc]/10">
        <div>
          <h3 className="font-bold text-foreground">Exporter les données</h3>
          <p className="text-sm text-muted-foreground">Téléchargez l'historique complet pour votre propre analyse.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={exportFormat} 
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-[#6c55dc] outline-none"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <Button onClick={handleExport} size="sm" className="bg-[#6c55dc] hover:bg-[#6c55dc]/90">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>
    </div>
  );
}
