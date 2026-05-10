/**
 * PreloaderPredictor - Analyzes usage patterns and predicts which skills will be needed
 *
 * This class is responsible for:
 * - Tracking skill usage patterns over time
 * - Predicting which skills are likely to be needed next
 * - Measuring prediction accuracy
 * - Adjusting prediction algorithms based on accuracy
 *
 * Requirements: 9.1, 9.6
 */

import { db } from "@/db";
import { skillAnalytics } from "@/db/schema";
import { and, gte, sql } from "drizzle-orm";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Usage pattern for a skill
 */
export interface UsagePattern {
  skillName: string;
  totalUsages: number;
  recentUsages: number; // Last 7 days
  averageUsagePerDay: number;
  lastUsedAt: Date | null;
  usageFrequency: number; // 0-1 score
  contextualScore: number; // 0-1 score based on recent context
}

/**
 * Prediction result for a skill
 */
export interface SkillPrediction {
  skillName: string;
  probability: number; // 0-1 probability of being needed
  confidence: number; // 0-1 confidence in the prediction
  reason: string; // Human-readable explanation
  priority: number; // 1-10 priority for preloading
}

/**
 * Prediction accuracy metrics
 */
export interface PredictionAccuracy {
  totalPredictions: number;
  correctPredictions: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number; // 0-1
  precision: number; // 0-1
  recall: number; // 0-1
}

/**
 * Configuration for prediction algorithm
 */
export interface PredictionConfig {
  lookbackDays: number; // How many days to look back for patterns
  minUsageThreshold: number; // Minimum usages to consider
  recencyWeight: number; // Weight for recent usage (0-1)
  frequencyWeight: number; // Weight for overall frequency (0-1)
  contextWeight: number; // Weight for contextual similarity (0-1)
  predictionThreshold: number; // Minimum probability to predict (0-1)
}

/**
 * Usage event for tracking
 */
export interface UsageEvent {
  skillName: string;
  timestamp: Date;
  conversationId?: string;
  context?: string; // Brief context description
  wasPreloaded: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: PredictionConfig = {
  lookbackDays: 30,
  minUsageThreshold: 2,
  recencyWeight: 0.4,
  frequencyWeight: 0.3,
  contextWeight: 0.3,
  predictionThreshold: 0.3,
};

const RECENT_DAYS = 7;
const MAX_PREDICTIONS = 10;

// =============================================================================
// PreloaderPredictor Class
// =============================================================================

export class PreloaderPredictor {
  private config: PredictionConfig;
  private usageHistory: UsageEvent[] = [];
  private predictionHistory: Map<
    string,
    { predicted: boolean; actual: boolean }
  > = new Map();

  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Track a skill usage event
   *
   * @param event - The usage event to track
   *
   * Requirements: 9.1
   */
  trackUsage(event: UsageEvent): void {
    try {
      // Add to in-memory history
      this.usageHistory.push(event);

      // Keep only recent history in memory (last 1000 events)
      if (this.usageHistory.length > 1000) {
        this.usageHistory = this.usageHistory.slice(-1000);
      }

      // Note: Database persistence is handled by SkillEngine when updating skill_analytics
      // This method focuses on in-memory tracking for prediction

      // Update prediction accuracy if this was predicted
      const predictionKey = `${event.skillName}-${event.timestamp.getTime()}`;
      const prediction = this.predictionHistory.get(predictionKey);
      if (prediction) {
        prediction.actual = true;
        this.predictionHistory.set(predictionKey, prediction);
      }
    } catch (error) {
      console.error("Failed to track skill usage:", error);
    }
  }

  /**
   * Analyze usage patterns for all skills
   *
   * @returns Array of usage patterns sorted by relevance
   *
   * Requirements: 9.1
   */
  analyzePatterns(): UsagePattern[] {
    try {
      const now = new Date();
      const lookbackDate = new Date(
        now.getTime() - this.config.lookbackDays * 24 * 60 * 60 * 1000,
      );

      // Query database for usage patterns using skill_analytics table
      const patterns = db
        .select({
          skillName: skillAnalytics.skillName,
          totalUsages: skillAnalytics.executionCount,
          lastUsedAt: skillAnalytics.lastUsed,
        })
        .from(skillAnalytics)
        .where(
          and(
            gte(skillAnalytics.executionCount, this.config.minUsageThreshold),
            // Only include skills used within lookback period
            skillAnalytics.lastUsed !== null
              ? gte(skillAnalytics.lastUsed, lookbackDate)
              : sql`1=1`,
          ),
        )
        .all();

      // Calculate scores for each pattern
      const usagePatterns: UsagePattern[] = patterns.map((pattern) => {
        const totalUsages = Number(pattern.totalUsages);
        
        // Estimate recent usages based on total and recency
        const daysSinceLastUse = pattern.lastUsedAt
          ? (now.getTime() - new Date(pattern.lastUsedAt).getTime()) / (24 * 60 * 60 * 1000)
          : this.config.lookbackDays;
        
        // If used recently, assume higher recent usage
        const recentUsages = daysSinceLastUse < RECENT_DAYS
          ? Math.ceil(totalUsages * 0.3) // Assume 30% of usage is recent
          : 0;

        const averageUsagePerDay = totalUsages / this.config.lookbackDays;

        // Calculate usage frequency score (0-1)
        const maxUsages = Math.max(
          ...patterns.map((p) => Number(p.totalUsages)),
          1,
        );
        const usageFrequency = totalUsages / maxUsages;

        // Calculate contextual score based on recent activity
        const contextualScore = Math.min(recentUsages / RECENT_DAYS, 1);

        return {
          skillName: pattern.skillName,
          totalUsages,
          recentUsages,
          averageUsagePerDay,
          lastUsedAt: pattern.lastUsedAt ? new Date(pattern.lastUsedAt) : null,
          usageFrequency,
          contextualScore,
        };
      });

      // Filter by minimum usage threshold and sort by weighted score
      return usagePatterns
        .filter((p) => p.totalUsages >= this.config.minUsageThreshold)
        .sort((a, b) => {
          // Sort by weighted score
          const scoreA =
            a.usageFrequency * this.config.frequencyWeight +
            a.contextualScore * this.config.contextWeight;
          const scoreB =
            b.usageFrequency * this.config.frequencyWeight +
            b.contextualScore * this.config.contextWeight;
          return scoreB - scoreA;
        });
    } catch (error) {
      console.error("Failed to analyze usage patterns:", error);
      return [];
    }
  }

  /**
   * Predict which skills are likely to be needed next
   *
   * @param currentContext - Optional context information for better predictions
   * @returns Array of skill predictions sorted by priority
   *
   * Requirements: 9.1
   */
  predictSkills(currentContext?: string): SkillPrediction[] {
    try {
      const patterns = this.analyzePatterns();
      const predictions: SkillPrediction[] = [];

      for (const pattern of patterns) {
        // Calculate recency score
        const recencyScore = this.calculateRecencyScore(pattern.lastUsedAt);

        // Calculate frequency score (already normalized 0-1)
        const frequencyScore = pattern.usageFrequency;

        // Calculate context score
        const contextScore = currentContext
          ? this.calculateContextScore(pattern.skillName, currentContext)
          : pattern.contextualScore;

        // Calculate weighted probability
        const probability =
          recencyScore * this.config.recencyWeight +
          frequencyScore * this.config.frequencyWeight +
          contextScore * this.config.contextWeight;

        // Only include predictions above threshold
        if (probability >= this.config.predictionThreshold) {
          // Calculate confidence based on data quality
          const confidence = this.calculateConfidence(pattern);

          // Calculate priority (1-10)
          const priority = Math.ceil(probability * 10);

          // Generate reason
          const reason = this.generatePredictionReason(
            pattern,
            recencyScore,
            frequencyScore,
            contextScore,
          );

          predictions.push({
            skillName: pattern.skillName,
            probability,
            confidence,
            reason,
            priority,
          });

          // Track this prediction
          const predictionKey = `${pattern.skillName}-${Date.now()}`;
          this.predictionHistory.set(predictionKey, {
            predicted: true,
            actual: false,
          });
        }
      }

      // Sort by priority (descending) and limit to max predictions
      return predictions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, MAX_PREDICTIONS);
    } catch (error) {
      console.error("Failed to predict skills:", error);
      return [];
    }
  }

  /**
   * Calculate recency score based on last usage time
   *
   * @param lastUsedAt - Last usage timestamp
   * @returns Recency score (0-1)
   *
   * @private
   */
  private calculateRecencyScore(lastUsedAt: Date | null): number {
    if (!lastUsedAt) return 0;

    const now = Date.now();
    const lastUsed = lastUsedAt.getTime();
    const daysSinceLastUse = (now - lastUsed) / (24 * 60 * 60 * 1000);

    // Exponential decay: score decreases as time passes
    // After 7 days, score is ~0.5; after 30 days, score is ~0.1
    return Math.exp(-daysSinceLastUse / 10);
  }

  /**
   * Calculate context similarity score
   *
   * @param skillName - Name of the skill
   * @param currentContext - Current context description
   * @returns Context score (0-1)
   *
   * @private
   */
  private calculateContextScore(
    skillName: string,
    currentContext: string,
  ): number {
    // Simple keyword-based similarity
    // In a production system, this could use embeddings or more sophisticated NLP

    const skillKeywords = skillName.toLowerCase().split(/[-_]/);
    const contextWords = currentContext.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const keyword of skillKeywords) {
      if (contextWords.some((word) => word.includes(keyword))) {
        matches++;
      }
    }

    return skillKeywords.length > 0 ? matches / skillKeywords.length : 0;
  }

  /**
   * Calculate confidence in prediction based on data quality
   *
   * @param pattern - Usage pattern
   * @returns Confidence score (0-1)
   *
   * @private
   */
  private calculateConfidence(pattern: UsagePattern): number {
    // Confidence increases with:
    // 1. More total usages
    // 2. More consistent usage (recent vs total)
    // 3. More recent usage

    const usageConfidence = Math.min(pattern.totalUsages / 20, 1); // Max at 20 usages
    const consistencyConfidence =
      pattern.totalUsages > 0
        ? pattern.recentUsages / (pattern.totalUsages / 4)
        : 0; // Expect 25% in recent period
    const recencyConfidence = pattern.lastUsedAt
      ? this.calculateRecencyScore(pattern.lastUsedAt)
      : 0;

    return (usageConfidence + consistencyConfidence + recencyConfidence) / 3;
  }

  /**
   * Generate human-readable prediction reason
   *
   * @param pattern - Usage pattern
   * @param recencyScore - Recency score
   * @param frequencyScore - Frequency score
   * @param contextScore - Context score
   * @returns Reason string
   *
   * @private
   */
  private generatePredictionReason(
    pattern: UsagePattern,
    recencyScore: number,
    frequencyScore: number,
    contextScore: number,
  ): string {
    const reasons: string[] = [];

    if (frequencyScore > 0.7) {
      reasons.push("frequently used");
    }

    if (recencyScore > 0.7) {
      reasons.push("recently used");
    }

    if (contextScore > 0.5) {
      reasons.push("contextually relevant");
    }

    if (pattern.recentUsages > 3) {
      reasons.push(`used ${pattern.recentUsages} times in last ${RECENT_DAYS} days`);
    }

    return reasons.length > 0
      ? reasons.join(", ")
      : "based on usage patterns";
  }

  /**
   * Measure prediction accuracy
   *
   * @returns Accuracy metrics
   *
   * Requirements: 9.6
   */
  measureAccuracy(): PredictionAccuracy {
    let totalPredictions = 0;
    let correctPredictions = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    // Analyze prediction history
    for (const [_key, prediction] of this.predictionHistory) {
      if (prediction.predicted) {
        totalPredictions++;

        if (prediction.actual) {
          correctPredictions++;
        } else {
          falsePositives++;
        }
      } else if (prediction.actual) {
        falseNegatives++;
      }
    }

    // Calculate metrics
    const accuracy =
      totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    const precision =
      correctPredictions + falsePositives > 0
        ? correctPredictions / (correctPredictions + falsePositives)
        : 0;
    const recall =
      correctPredictions + falseNegatives > 0
        ? correctPredictions / (correctPredictions + falseNegatives)
        : 0;

    return {
      totalPredictions,
      correctPredictions,
      falsePositives,
      falseNegatives,
      accuracy,
      precision,
      recall,
    };
  }

  /**
   * Adjust prediction algorithm based on accuracy
   *
   * @param accuracy - Current accuracy metrics
   *
   * Requirements: 9.6
   */
  adjustAlgorithm(accuracy: PredictionAccuracy): void {
    // If accuracy is low, adjust weights
    if (accuracy.accuracy < 0.5 && accuracy.totalPredictions > 20) {
      // Increase recency weight if we're missing recent patterns
      if (accuracy.recall < 0.5) {
        this.config.recencyWeight = Math.min(
          this.config.recencyWeight + 0.05,
          0.6,
        );
        this.config.frequencyWeight = Math.max(
          this.config.frequencyWeight - 0.05,
          0.2,
        );
      }

      // Increase threshold if we have too many false positives
      if (accuracy.precision < 0.5) {
        this.config.predictionThreshold = Math.min(
          this.config.predictionThreshold + 0.05,
          0.5,
        );
      }

      // Decrease threshold if we have too many false negatives
      if (accuracy.recall < 0.5 && accuracy.precision > 0.7) {
        this.config.predictionThreshold = Math.max(
          this.config.predictionThreshold - 0.05,
          0.2,
        );
      }
    }
  }

  /**
   * Get current prediction configuration
   *
   * @returns Current configuration
   */
  getConfig(): PredictionConfig {
    return { ...this.config };
  }

  /**
   * Update prediction configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<PredictionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear prediction history
   */
  clearHistory(): void {
    this.predictionHistory.clear();
    this.usageHistory = [];
  }
}
