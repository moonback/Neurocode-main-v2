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
  const { 
    data: statistics, 
    isLoading: statsLoading, 
    error: statsError,
    refetch: refetchStats 
  } = useQuery({
    queryKey: queryKeys.tokenAnalytics.statistics(filters.dateRange),
    queryFn: async () => {
      try {
        console.log('📡 Calling getStatistics with:', filters.dateRange);
        const res = await ipc.tokenAnalytics.getStatistics(filters.dateRange);
        console.log('✅ Statistics result:', res);
        return res;
      } catch (err) {
        console.error('❌ IPC Error (Statistics):', err);
        throw err;
      }
    },
    staleTime: 0,
    retry: false,
  });

  const { 
    data: topModels, 
    isLoading: modelsLoading,
    refetch: refetchModels
  } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'model', limit: 5, ...filters.dateRange }),
    queryFn: async () => {
      const res = await ipc.tokenAnalytics.getTopConsumers({ type: 'model', limit: 5, ...filters.dateRange });
      console.log('🔥 Top Models IPC Result:', res);
      return res;
    },
    staleTime: 0,
  });

  const { 
    data: topConversations, 
    isLoading: convLoading,
    refetch: refetchConv
  } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'conversation', limit: 5, ...filters.dateRange }),
    queryFn: () => ipc.tokenAnalytics.getTopConsumers({ type: 'conversation', limit: 5, ...filters.dateRange }),
    staleTime: 0,
  });

  const { 
    data: topSkills, 
    isLoading: skillsLoading,
    refetch: refetchSkills
  } = useQuery({
    queryKey: queryKeys.tokenAnalytics.topConsumers({ type: 'skill', limit: 10, ...filters.dateRange }),
    queryFn: () => ipc.tokenAnalytics.getTopConsumers({ type: 'skill', limit: 10, ...filters.dateRange }),
    staleTime: 0,
  });

  const { 
    data: costs, 
    isLoading: costsLoading,
    refetch: refetchCosts
  } = useQuery({
    queryKey: queryKeys.tokenAnalytics.cost(filters.dateRange),
    queryFn: () => ipc.tokenAnalytics.calculateCost(filters.dateRange),
    staleTime: 0,
  });

  const {
    data: performanceMetrics,
  } = useQuery({
    queryKey: ['performanceMetrics'],
    queryFn: () => ipc.system.getPerformanceMetrics(),
    refetchInterval: 5000,
  });

  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    try {
      await Promise.all([
        refetchStats(),
        refetchConv(),
        refetchSkills(),
        refetchModels(),
        refetchCosts(),
      ]);
      console.log('✨ All queries refetched');
    } catch (err) {
      console.error('❌ Refresh failed:', err);
      alert('Erreur lors du rafraîchissement : ' + (err instanceof Error ? err.message : String(err)));
    }
  };

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
    <div className="min-h-screen bg-background relative overflow-hidden animate-in fade-in duration-500">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#6c55dc]/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      <div className="relative z-10 p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.navigate({ to: '/settings' })}
              className="group mb-4 -ml-2 text-muted-foreground hover:text-foreground transition-all hover:bg-muted/50"
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Retour aux réglages
            </Button>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#6c55dc] to-[#9b7eff] rounded-2xl shadow-lg shadow-[#6c55dc]/20">
                <Activity className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  Token Analytics
                </h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-lg">
                  Analyse détaillée de la consommation d'IA et optimisation des coûts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/40 backdrop-blur-sm">
              {(['week', 'month', 'quarter'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={cn(
                    "px-5 py-2 text-xs font-bold rounded-xl transition-all duration-300",
                    activeRange === range
                      ? "bg-background text-[#6c55dc] shadow-md border border-border/40 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  {range === 'week' ? '7 Jours' : range === 'month' ? '30 Jours' : '90 Jours'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="rounded-xl border-border/50 hover:bg-muted/50 font-bold text-xs h-10 px-4"
              >
                <Activity className="mr-2 h-4 w-4 text-[#6c55dc]" />
                Rafraîchir
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="rounded-xl border-border/50 hover:bg-muted/50 font-bold text-xs h-10 px-4"
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 lg:grid-cols-3 gap-6 mb-12">
          <StatCard
            title="Temps de démarrage"
            value={performanceMetrics?.startupTimeMs ? `${(performanceMetrics.startupTimeMs / 1000).toFixed(2)}s` : '...'}
            icon={<Zap className="h-5 w-5" />}
            color="yellow"
          />
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

        {/* Empty State / Main Content */}
        {!statistics?.totalTokens ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card/30 backdrop-blur-sm rounded-3xl border border-dashed border-border/60">
            <div className="p-4 bg-muted/20 rounded-full mb-4">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/70">Aucune donnée disponible</h3>
            <p className="text-sm text-muted-foreground mt-2">Commencez à utiliser l'assistant pour voir vos statistiques.</p>
          </div>
        ) : (
          <>
            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <ChartCard title="Top 5 Conversations">
                <ResponsiveContainer width="100%" height={320}>
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
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
                      cursor={{ fill: 'rgba(108, 85, 220, 0.05)' }}
                    />
                    <Bar dataKey="tokens" fill={COLORS.primary} radius={[6, 6, 0, 0]} name="Tokens" barSize={32} />
                    <Bar dataKey="requests" fill={COLORS.secondary} name="Requêtes" barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribution par Modèle">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Costs Chart */}
            <div className="grid grid-cols-1 gap-8 mb-8">
              <ChartCard title="Coûts par Modèle (USD)">
                <ResponsiveContainer width="100%" height={380}>
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
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="inputCost" stackId="a" fill={COLORS.success} name="Entrée" barSize={40} />
                    <Bar dataKey="outputCost" stackId="a" fill={COLORS.primary} name="Sortie" radius={[6, 6, 0, 0]} barSize={40} />
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
                      <th className="px-6 py-4 font-bold">Nom</th>
                      <th className="px-6 py-4 font-bold text-right">Tokens</th>
                      <th className="px-6 py-4 font-bold text-right">Requêtes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {topConversations?.map((conv) => (
                      <tr key={conv.name} className="hover:bg-[#6c55dc]/5 transition-colors group">
                        <td className="px-6 py-5 font-medium max-w-[240px] truncate group-hover:text-[#6c55dc] transition-colors">{conv.name}</td>
                        <td className="px-6 py-5 text-right font-mono text-xs">{conv.totalTokens.toLocaleString()}</td>
                        <td className="px-6 py-5 text-right font-medium">{conv.requestCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>

              <TableCard title="Détail des Coûts par Modèle">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                    <tr>
                      <th className="px-6 py-4 font-bold">Modèle</th>
                      <th className="px-6 py-4 font-bold text-right">Usage (Tokens)</th>
                      <th className="px-6 py-4 font-bold text-right">Coût Estimé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {costsByModelData.map((m) => (
                      <tr key={m.name} className="hover:bg-[#6c55dc]/5 transition-colors group">
                        <td className="px-6 py-5 font-medium group-hover:text-[#6c55dc] transition-colors">{m.name}</td>
                        <td className="px-6 py-5 text-right font-mono text-xs">
                          {(m.inputTokens + m.outputTokens).toLocaleString()}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-[#6c55dc]">
                          ${m.totalCost.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>

            {/* Actions */}
            <div className="mt-12 flex items-center justify-between p-8 bg-gradient-to-r from-[#6c55dc]/5 to-purple-500/5 rounded-3xl border border-[#6c55dc]/10 shadow-inner">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-background rounded-xl shadow-sm border border-border/50">
                  <Download className="h-5 w-5 text-[#6c55dc]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Exporter les données</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Téléchargez l'historique complet en format CSV ou JSON.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={exportFormat} 
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="bg-background border border-border/50 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-[#6c55dc]/20 outline-none shadow-sm cursor-pointer hover:border-[#6c55dc]/30 transition-all"
                >
                  <option value="csv">CSV Format</option>
                  <option value="json">JSON Format</option>
                </select>
                <Button 
                  onClick={handleExport} 
                  size="default" 
                  className="bg-gradient-to-r from-[#6c55dc] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#6c55dc] text-white shadow-lg shadow-[#6c55dc]/20 rounded-xl font-bold px-6 py-2 transition-all duration-300 hover:scale-105"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
