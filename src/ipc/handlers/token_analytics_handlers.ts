import log from "electron-log";
import { createLoggedHandler } from "./safe_handle";
import { tokenAnalyticsContracts } from "@/ipc/types/token-analytics";
import { getTokenManager } from "@/token-optimization/integration";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";

const logger = log.scope("token_analytics_handlers");
const handle = createLoggedHandler(logger);

export function registerTokenAnalyticsHandlers() {
  // Get token usage statistics
  handle(tokenAnalyticsContracts.getStatistics.channel, async (_, params) => {
    logger.info("📊 getStatistics called with params:", params);
    const manager = getTokenManager();

    // Build filter object from params
    const filter: Record<string, unknown> = {};
    if (params.conversationId) filter.conversationId = params.conversationId;
    if (params.skillName) filter.skillName = params.skillName;
    if (params.modelType) filter.modelType = params.modelType;
    if (params.startDate) filter.startTime = new Date(params.startDate);
    if (params.endDate) filter.endTime = new Date(params.endDate);

    logger.info("📊 Filter object:", filter);
    const stats = manager.getStatistics(filter);
    logger.info("📊 Raw statistics from DB:", stats);

    // Map UsageStatistics to TokenStatistics schema
    const result = {
      totalTokens: stats.totalTokens || 0,
      inputTokens: stats.totalInputTokens || 0,
      outputTokens: stats.totalOutputTokens || 0,
      requestCount: stats.totalRequests || 0,
      averageTokensPerRequest: stats.averageTokensPerRequest || 0,
      peakTokensPerRequest: stats.totalTokens || 0,
      timeRange: {
        start: params.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000,
        end: params.endDate || Date.now(),
      },
    };
    logger.info("📊 Returning mapped result:", result);
    return result;
  });

  // Get top token consumers
  handle(tokenAnalyticsContracts.getTopConsumers.channel, async (_, params) => {
    logger.info("🔥 getTopConsumers called with params:", params);
    const manager = getTokenManager();

    // Build filter object from params
    const filter: Record<string, unknown> = {};
    if (params.startDate) filter.startTime = new Date(params.startDate);
    if (params.endDate) filter.endTime = new Date(params.endDate);

    logger.info("🔥 Filter object:", filter);
    const limit = params.limit || 10;
    const consumers = manager.getTopConsumers(filter, limit, params.type);
    logger.info(`🔥 Found ${consumers.length} consumers in DB`);

    // Map TopConsumer[] to schema (id -> name)
    return consumers.map((consumer) => ({
      name: consumer.id,
      totalTokens: consumer.totalTokens,
      percentage: consumer.percentage,
      requestCount: consumer.requestCount,
    }));
  });

  // Calculate cost breakdown
  handle(tokenAnalyticsContracts.calculateCost.channel, async (_, params) => {
    logger.info("💰 calculateCost called with params:", params);
    const manager = getTokenManager();

    // Build filter object from params
    const filter: Record<string, unknown> = {};
    if (params.conversationId) filter.conversationId = params.conversationId;
    if (params.startDate) filter.startTime = new Date(params.startDate);
    if (params.endDate) filter.endTime = new Date(params.endDate);

    logger.info("💰 Filter object:", filter);
    const costBreakdownArray = manager.calculateCost(filter);
    logger.info(`💰 Cost breakdown has ${costBreakdownArray.length} models`);

    // Convert CostBreakdown[] to the schema format
    let totalCost = 0;
    const byModel: Record<
      string,
      {
        inputCost: number;
        outputCost: number;
        totalCost: number;
        inputTokens: number;
        outputTokens: number;
      }
    > = {};

    for (const breakdown of costBreakdownArray) {
      totalCost += breakdown.totalCost;
      byModel[breakdown.modelType] = {
        inputCost: breakdown.inputCost,
        outputCost: breakdown.outputCost,
        totalCost: breakdown.totalCost,
        inputTokens: breakdown.inputTokens,
        outputTokens: breakdown.outputTokens,
      };
    }

    return {
      totalCost,
      byModel,
      currency: "USD",
    };
  });

  // Export usage data
  handle(tokenAnalyticsContracts.exportUsageData.channel, async (_, params) => {
    logger.info("📥 exportUsageData called with params:", params);
    const manager = getTokenManager();

    // Build filter object from params
    const filter: Record<string, unknown> = {};
    if (params.conversationId) filter.conversationId = params.conversationId;
    if (params.startDate) filter.startTime = new Date(params.startDate);
    if (params.endDate) filter.endTime = new Date(params.endDate);

    logger.info("📥 Filter object:", filter);
    try {
      const data = await manager.exportData(params.format, filter);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `token-usage-${timestamp}.${params.format}`;

      logger.info(`📥 Export successful: ${filename}`);
      return {
        data,
        filename,
      };
    } catch (error) {
      logger.error("📥 Export failed:", error);
      throw new DyadError(
        `Failed to export usage data: ${error instanceof Error ? error.message : String(error)}`,
        DyadErrorKind.Internal,
      );
    }
  });

  // Get usage over time
  handle(
    tokenAnalyticsContracts.getUsageOverTime.channel,
    async (_, params) => {
      logger.info("📈 getUsageOverTime called with params:", params);
      const manager = getTokenManager();

      // Build filter object from params
      const filter: Record<string, unknown> = {};
      if (params.conversationId) filter.conversationId = params.conversationId;
      if (params.startDate) filter.startTime = new Date(params.startDate);
      if (params.endDate) filter.endTime = new Date(params.endDate);

      logger.info("📈 Filter object:", filter);
      // Get all usage data
      const stats = manager.getStatistics(filter);
      logger.info("📈 Statistics result:", stats);

      // For now, return a simple aggregation
      // In a real implementation, this would query the database with time-based grouping
      const dataPoints = [];

      if (stats.totalRequests > 0) {
        // Create a single data point for the time range
        const startTime =
          params.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000;
        dataPoints.push({
          timestamp: startTime,
          tokens: stats.totalTokens,
          requests: stats.totalRequests,
        });
      }

      return dataPoints;
    },
  );
}
