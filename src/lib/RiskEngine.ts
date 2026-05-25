import type { RiskLevel } from '@/pro/main/ipc/handlers/local_agent/tools/types';
import type { ToolResult } from '@/pro/main/ipc/handlers/local_agent/tools/types';

/**
 * RiskEngine class determines the risk level of a tool execution.
 * Currently focuses on tool executions (no plan steps). It classifies
 * based on the tool's declared risk level and the outcome of the execution.
 */
export class RiskEngine {
  /**
   * Assess risk for a given tool execution result.
   * @param toolName Name of the tool that was executed.
   * @param result Result object from the tool execution.
   * @returns RiskLevel indicating the severity.
   */
  static assessRisk(toolName: string, result: unknown): RiskLevel {
    // If the tool explicitly defines a risk level, use it.
    const declaredRisk = (result as any)?.riskLevel as RiskLevel | undefined;
    if (declaredRisk) {
      return declaredRisk;
    }

    // Default heuristic: failures are higher risk.
    if ((result as any)?.success === false) {
      return 'high';
    }

    // Successful executions are low risk.
    return 'low';
  }
}
