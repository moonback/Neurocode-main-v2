import React from "react";
import { useTokenBudget } from "@/hooks/useTokenBudget";
import { useCostEstimation } from "@/hooks/useCostEstimation";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Coins, 
  TrendingUp, 
  AlertTriangle, 
  Info,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TokenUsageIndicatorProps {
  chatId?: number;
  input: string;
}

export function TokenUsageIndicator({ chatId, input }: TokenUsageIndicatorProps) {
  const { 
    budgetLimit, 
    currentCost, 
    usagePercentage, 
    isWarning,
    summary 
  } = useTokenBudget();
  
  const { data: estimation } = useCostEstimation(chatId ?? null, input);

  if (budgetLimit === 0 && !estimation) return null;

  const remainingBudget = Math.max(0, budgetLimit - currentCost);
  const totalWithNext = currentCost + (estimation?.estimatedTotalCost ?? 0);
  const nextUsagePercent = (totalWithNext / budgetLimit) * 100;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-background/50 backdrop-blur-md border border-border/50 text-[11px] font-medium transition-all hover:bg-background/80 shadow-sm">
        {/* Budget Circle Indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center w-5 h-5 cursor-help">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted/20"
                />
                <circle
                  cx="10"
                  cy="10"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${(usagePercentage / 100) * 50.2} 50.2`}
                  className={cn(
                    "transition-all duration-500",
                    isWarning ? "text-amber-500" : "text-blue-500"
                  )}
                />
                {estimation && (
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${((estimation.estimatedTotalCost / budgetLimit) * 100 / 100) * 50.2} 50.2`}
                    strokeDashoffset={-((usagePercentage / 100) * 50.2)}
                    className="text-blue-300 dark:text-blue-700 animate-pulse"
                  />
                )}
              </svg>
              {isWarning && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="p-3 w-56 space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
              <span className="font-semibold text-xs">Monthly Budget</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                isWarning ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              )}>
                {usagePercentage.toFixed(1)}% used
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Limit:</span>
                <span className="font-mono">${budgetLimit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spent:</span>
                <span className="font-mono">${currentCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={cn("font-mono font-bold", remainingBudget < 1 ? "text-red-500" : "text-green-500")}>
                  ${remainingBudget.toFixed(4)}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Cost Estimation */}
        <div className="flex items-center gap-2 border-l border-border/50 pl-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <Coins className="w-3.5 h-3.5 text-blue-500/80" />
                <span className="text-muted-foreground">Est. Cost:</span>
                <span className="font-mono text-foreground">
                  {estimation ? `$${estimation.estimatedTotalCost.toFixed(5)}` : "$0.00000"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-3 w-64 space-y-2">
              <div className="font-semibold text-xs border-b border-border pb-1 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                Next Message Estimate
              </div>
              {estimation ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Input ({estimation.inputTokens.toLocaleString()} tkn):</span>
                    <span>~${(estimation.estimatedTotalCost * 0.4).toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Output ({estimation.estimatedOutputTokens.toLocaleString()} tkn):</span>
                    <span>~${(estimation.estimatedTotalCost * 0.6).toFixed(5)}</span>
                  </div>
                  <div className="pt-1 border-t border-border mt-1 flex justify-between font-bold">
                    <span>Total Estimated:</span>
                    <span className="text-blue-500">${estimation.estimatedTotalCost.toFixed(5)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1 italic">
                    <Info className="w-2.5 h-2.5" />
                    Based on {estimation.model} pricing
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-center py-2">
                  Start typing to see cost estimate
                </div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Warning Indicator */}
        {isWarning && (
          <div className="flex items-center gap-1 text-amber-500 animate-pulse border-l border-border/50 pl-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Near Budget</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
