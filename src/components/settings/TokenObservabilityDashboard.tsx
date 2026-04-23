import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  DollarSign,
  Cpu,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export function TokenObservabilityDashboard() {
  const [days, setDays] = useState(30);

  const {
    data: dashboard,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: [queryKeys.settings.all, "token-dashboard", days],
    queryFn: () => ipc.chat.getTokenUsageDashboard({ days }),
  });

  const { data: recentUsage } = useQuery({
    queryKey: [queryKeys.settings.all, "token-recent", days],
    queryFn: () => ipc.chat.getTokenUsage({ days }),
  });

  const formatTokens = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(cost);
  };

  if (isLoading && !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading usage data...
        </p>
      </div>
    );
  }

  const maxDailyTokens = dashboard?.usageByDay?.length
    ? Math.max(...dashboard.usageByDay.map((d) => d.inputTokens + d.outputTokens))
    : 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Token Usage Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            Visualizing AI consumption and expenditure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted p-1 rounded-lg flex gap-1">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center justify-between">
              Total Tokens
              <Layers className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(dashboard?.totalTokens || 0)}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500" />
              Accumulated usage
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-green-500/10 to-green-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center justify-between">
              Total Cost
              <DollarSign className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCost(dashboard?.totalCost || 0)}
            </div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <Badge
                variant="outline"
                className="text-[8px] h-4 py-0 border-green-200 text-green-600"
              >
                USD
              </Badge>
              Estimated expense
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-amber-500/10 to-amber-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center justify-between">
              Avg. Per Day
              <Calendar className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(
                Math.round(
                  (dashboard?.totalTokens || 0) /
                    (dashboard?.usageByDay?.length || 1),
                ),
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Daily consumption rate
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-purple-500/10 to-purple-600/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center justify-between">
              Primary Model
              <Cpu className="h-4 w-4 opacity-50" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {dashboard?.usageByModel?.[0]?.model || "None"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Most used LLM
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
          <TabsTrigger value="overview">Daily Activity</TabsTrigger>
          <TabsTrigger value="history">Recent Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Simple Chart */}
          <Card className="p-6">
            <div className="h-64 w-full flex items-end gap-1 px-2">
              {dashboard?.usageByDay?.map((day, idx) => {
                const total = day.inputTokens + day.outputTokens;
                const height = (total / maxDailyTokens) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 group relative flex flex-col items-center justify-end h-full"
                  >
                    <AnimatePresence>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(height, 2)}%` }}
                        className="w-full bg-primary/40 group-hover:bg-primary/60 rounded-t-sm transition-colors"
                      />
                    </AnimatePresence>
                    {idx % Math.ceil(dashboard.usageByDay.length / 7) === 0 && (
                      <span className="absolute -bottom-6 text-[8px] text-muted-foreground rotate-45 md:rotate-0">
                        {format(new Date(day.date), "MMM d")}
                      </span>
                    )}
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                      <div className="bg-popover border text-popover-foreground text-[10px] p-2 rounded shadow-xl whitespace-nowrap">
                        <div className="font-bold border-b pb-1 mb-1">
                          {day.date}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Input:</span>
                          <span>{formatTokens(day.inputTokens)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Output:</span>
                          <span>{formatTokens(day.outputTokens)}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-primary font-bold pt-1 border-t mt-1">
                          <span>Cost:</span>
                          <span>{formatCost(day.cost)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                Total Tokens
              </div>
              <div className="flex items-center gap-1.5 italic">
                (Hover bars for details)
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Usage by Model</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.usageByModel?.map((m) => (
                    <div key={m.model} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[150px]">
                          {m.model}
                        </span>
                        <span className="text-muted-foreground">
                          {formatTokens(m.tokens)} tokens
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60"
                          style={{
                            width: `${(m.tokens / (dashboard?.totalTokens || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-[9px] text-right text-muted-foreground">
                        {formatCost(m.cost)}
                      </div>
                    </div>
                  ))}
                  {(!dashboard?.usageByModel ||
                    dashboard.usageByModel.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                      No model usage data found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Budget Progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={
                        251.2 -
                        (Math.min(
                          (dashboard?.totalCost || 0) / (dashboard?.totalCost ? 1.0 : 1), // This should be vs a real budget
                          1.2,
                        ) *
                          251.2) /
                          1.2
                      }
                      className="text-primary transition-all duration-1000"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold">
                      {formatCost(dashboard?.totalCost || 0)}
                    </span>
                    <span className="text-[8px] text-muted-foreground uppercase">
                      Total
                    </span>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-center text-muted-foreground max-w-[150px]">
                  Usage status based on current session activity.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs text-right">Tokens</TableHead>
                    <TableHead className="text-xs text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsage?.map((r, i) => (
                    <TableRow key={`${r.timestamp}-${i}`} className="h-10">
                      <TableCell className="text-[10px]">
                        {format(new Date(r.timestamp), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-[10px] font-mono truncate max-w-[100px]">
                        {r.model}
                      </TableCell>
                      <TableCell className="text-[10px] text-right">
                        {formatTokens(r.inputTokens + r.outputTokens)}
                      </TableCell>
                      <TableCell className="text-[10px] text-right font-medium">
                        {formatCost(r.cost || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!recentUsage || recentUsage.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-10 text-muted-foreground text-xs italic"
                      >
                        No recent usage records.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
