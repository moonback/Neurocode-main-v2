import React from "react";
import { useSettings } from "@/hooks/useSettings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumberInput } from "@/components/ui/NumberInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { Shield, Zap, TrendingDown } from "lucide-react";

export function TokenOptimizationSettings() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation("settings");

  const handleUpdate = (updates: any) => {
    updateSettings(updates);
  };

  const applyPreset = (preset: "quality" | "balanced" | "savings") => {
    switch (preset) {
      case "quality":
        updateSettings({
          tokenOptimizationPruningStrategy: "conservative",
          tokenOptimizationPruningThreshold: 0.9,
          tokenOptimizationInputContextRatio: 0.7,
          tokenOptimizationSystemInstructionsRatio: 0.1,
          tokenOptimizationOutputGenerationRatio: 0.2,
          enableTokenOptimizationAutoPruning: true,
          enableTokenOptimizationMessagePinning: true,
        });
        break;
      case "balanced":
        updateSettings({
          tokenOptimizationPruningStrategy: "balanced",
          tokenOptimizationPruningThreshold: 0.8,
          tokenOptimizationInputContextRatio: 0.6,
          tokenOptimizationSystemInstructionsRatio: 0.2,
          tokenOptimizationOutputGenerationRatio: 0.2,
          enableTokenOptimizationAutoPruning: true,
          enableTokenOptimizationMessagePinning: true,
        });
        break;
      case "savings":
        updateSettings({
          tokenOptimizationPruningStrategy: "aggressive",
          tokenOptimizationPruningThreshold: 0.6,
          tokenOptimizationInputContextRatio: 0.5,
          tokenOptimizationSystemInstructionsRatio: 0.2,
          tokenOptimizationOutputGenerationRatio: 0.3,
          enableTokenOptimizationAutoPruning: true,
          enableTokenOptimizationMessagePinning: false,
        });
        break;
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Token Optimization
          </h2>
          <p className="text-muted-foreground">
            Intelligently manage token usage and context window efficiency.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-optimization"
            checked={settings.enableTokenOptimization}
            onCheckedChange={(checked) =>
              handleUpdate({ enableTokenOptimization: checked })
            }
          />
          <Label htmlFor="enable-optimization" className="font-semibold">
            {settings.enableTokenOptimization ? "Enabled" : "Disabled"}
          </Label>
        </div>
      </div>

      {settings.enableTokenOptimization && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary transition-all group"
              onClick={() => applyPreset("quality")}
            >
              <Shield className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-sm">Maximum Quality</div>
                <div className="text-[10px] text-muted-foreground">
                  Rich context, low pruning
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary transition-all group"
              onClick={() => applyPreset("balanced")}
            >
              <Zap className="h-6 w-6 text-amber-500 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-sm">Balanced</div>
                <div className="text-[10px] text-muted-foreground">
                  Optimal performance
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary transition-all group"
              onClick={() => applyPreset("savings")}
            >
              <TrendingDown className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <div className="font-bold text-sm">Maximum Savings</div>
                <div className="text-[10px] text-muted-foreground">
                  Minimized token usage
                </div>
              </div>
            </Button>
          </div>

          <Card className="border-muted/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg">
                Pruning & Context Retention
              </CardTitle>
              <CardDescription>
                Configure how the system decides which messages to keep or
                remove.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Pruning Strategy
                  </Label>
                  <Select
                    value={settings.tokenOptimizationPruningStrategy}
                    onValueChange={(val) =>
                      handleUpdate({ tokenOptimizationPruningStrategy: val })
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">
                        Conservative (Keep most)
                      </SelectItem>
                      <SelectItem value="balanced">
                        Balanced (Smart removal)
                      </SelectItem>
                      <SelectItem value="aggressive">
                        Aggressive (Prune frequently)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic leading-tight">
                    Conservative keeps more context but hits limits faster.
                    Aggressive saves more tokens but may lose older context.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label
                        htmlFor="auto-pruning"
                        className="text-sm font-semibold"
                      >
                        Enable Auto-Pruning
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Trigger pruning when context usage reaches threshold
                      </p>
                    </div>
                    <Switch
                      id="auto-pruning"
                      checked={settings.enableTokenOptimizationAutoPruning}
                      onCheckedChange={(checked) =>
                        handleUpdate({
                          enableTokenOptimizationAutoPruning: checked,
                        })
                      }
                    />
                  </div>
                  {settings.enableTokenOptimizationAutoPruning && (
                    <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                      <NumberInput
                        id="pruning-threshold"
                        label={`Threshold: ${Math.round((settings.tokenOptimizationPruningThreshold ?? 0.8) * 100)}% Usage`}
                        value={String(settings.tokenOptimizationPruningThreshold)}
                        onChange={(val) =>
                          handleUpdate({
                            tokenOptimizationPruningThreshold: parseFloat(val),
                          })
                        }
                        min="0.1"
                        max="0.95"
                        step="0.05"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg">Token Allocation Ratios</CardTitle>
              <CardDescription>
                Define how much of the context window is reserved for different
                parts of the conversation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <NumberInput
                  id="ratio-input"
                  label={`Input Context (${Math.round((settings.tokenOptimizationInputContextRatio ?? 0.6) * 100)}%)`}
                  value={String(settings.tokenOptimizationInputContextRatio)}
                  onChange={(val) =>
                    handleUpdate({
                      tokenOptimizationInputContextRatio: parseFloat(val),
                    })
                  }
                  min="0.1"
                  max="0.8"
                  step="0.05"
                />
                <NumberInput
                  id="ratio-system"
                  label={`System Instructions (${Math.round((settings.tokenOptimizationSystemInstructionsRatio ?? 0.2) * 100)}%)`}
                  value={String(settings.tokenOptimizationSystemInstructionsRatio)}
                  onChange={(val) =>
                    handleUpdate({
                      tokenOptimizationSystemInstructionsRatio: parseFloat(val),
                    })
                  }
                  min="0.05"
                  max="0.4"
                  step="0.05"
                />
                <NumberInput
                  id="ratio-output"
                  label={`Output Generation (${Math.round((settings.tokenOptimizationOutputGenerationRatio ?? 0.2) * 100)}%)`}
                  value={String(settings.tokenOptimizationOutputGenerationRatio)}
                  onChange={(val) =>
                    handleUpdate({
                      tokenOptimizationOutputGenerationRatio: parseFloat(val),
                    })
                  }
                  min="0.1"
                  max="0.5"
                  step="0.05"
                />
              </div>
              <div className="bg-muted/30 p-3 rounded-md border border-dashed border-muted">
                <p className="text-[10px] text-muted-foreground text-center italic">
                  Note: Values are relative weights. The system automatically
                  normalizes these to sum to 100% of the available context
                  window.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg">Cost & Budget Tracking</CardTitle>
              <CardDescription>
                Monitor AI expenditure and set limits to avoid unexpected costs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <Label
                    htmlFor="cost-tracking"
                    className="text-sm font-semibold"
                  >
                    Enable Cost Tracking
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Logs input/output costs for every message sent and received
                  </p>
                </div>
                <Switch
                  id="cost-tracking"
                  checked={settings.enableTokenOptimizationCostTracking}
                  onCheckedChange={(checked) =>
                    handleUpdate({
                      enableTokenOptimizationCostTracking: checked,
                    })
                  }
                />
              </div>

              {settings.enableTokenOptimizationCostTracking && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      Budget Amount (USD)
                    </Label>
                    <NumberInput
                      id="budget-amount"
                      label=""
                      value={String(settings.tokenOptimizationCostAmount)}
                      onChange={(val) =>
                        handleUpdate({
                          tokenOptimizationCostAmount: parseFloat(val),
                        })
                      }
                      min="1"
                      step="1"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      Reset Period
                    </Label>
                    <Select
                      value={settings.tokenOptimizationCostPeriod}
                      onValueChange={(val) =>
                        handleUpdate({ tokenOptimizationCostPeriod: val })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">
                      Warning Threshold
                    </Label>
                    <NumberInput
                      id="budget-warning"
                      label={`${Math.round((settings.tokenOptimizationCostWarningThreshold ?? 0.8) * 100)}%`}
                      value={String(settings.tokenOptimizationCostWarningThreshold)}
                      onChange={(val) =>
                        handleUpdate({
                          tokenOptimizationCostWarningThreshold: parseFloat(val),
                        })
                      }
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      className="h-10"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-muted/40 shadow-sm">
            <CardHeader className="pb-3 bg-muted/20">
              <CardTitle className="text-lg font-semibold">
                Advanced Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label
                    htmlFor="message-pinning"
                    className="text-sm font-semibold"
                  >
                    Allow Message Pinning
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Protect critical messages from being pruned even if context
                    is full
                  </p>
                </div>
                <Switch
                  id="message-pinning"
                  checked={settings.enableTokenOptimizationMessagePinning}
                  onCheckedChange={(checked) =>
                    handleUpdate({
                      enableTokenOptimizationMessagePinning: checked,
                    })
                  }
                />
              </div>
              <Separator className="opacity-30" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label
                    htmlFor="coordinate-compaction"
                    className="text-sm font-semibold"
                  >
                    Coordinate with Context Compaction
                  </Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Defer expensive context compaction if token optimization
                    already satisfies limits
                  </p>
                </div>
                <Switch
                  id="coordinate-compaction"
                  checked={settings.tokenOptimizationCoordinateWithCompaction}
                  onCheckedChange={(checked) =>
                    handleUpdate({
                      tokenOptimizationCoordinateWithCompaction: checked,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
