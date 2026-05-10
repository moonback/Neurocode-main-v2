/**
 * SkillAnalyzer - Token-aware skill design tools
 *
 * Provides utilities for analyzing skills and providing token optimization
 * suggestions during skill development.
 *
 * Requirements: 10.1, 10.2, 10.5
 */

import type { Skill } from '@/skills/types';

export interface TokenEstimate {
  skillName: string;
  estimatedTokens: number;
  breakdown: {
    instructions: number;
    examples: number;
    metadata: number;
  };
  accuracy: 'approximate'; // Using 4-char-per-token heuristic
}

export interface TokenWarning {
  severity: 'info' | 'warning' | 'error';
  message: string;
  currentTokens: number;
  recommendedLimit: number;
  exceedsBy?: number;
}

export interface RedundancyReport {
  hasRedundancy: boolean;
  redundancies: RedundancyItem[];
  totalRedundantTokens: number;
}

export interface RedundancyItem {
  type: 'repeated_phrase' | 'duplicate_example' | 'verbose_instruction';
  location: string;
  content: string;
  occurrences: number;
  estimatedTokens: number;
  suggestion: string;
}

export interface OptimizationSuggestion {
  type:
    | 'remove_redundancy'
    | 'simplify_instructions'
    | 'reduce_examples'
    | 'compress_metadata';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number; // tokens
  example?: string;
}

export interface AnalysisReport {
  skillName: string;
  tokenEstimate: TokenEstimate;
  warnings: TokenWarning[];
  redundancyReport: RedundancyReport;
  suggestions: OptimizationSuggestion[];
  overallScore: 'excellent' | 'good' | 'needs_improvement' | 'poor';
}

// Token limits based on best practices
const TOKEN_LIMITS = {
  RECOMMENDED: 1000, // Recommended max for a single skill
  WARNING: 1500, // Warning threshold
  CRITICAL: 2000, // Critical threshold
};

// Minimum occurrences to consider something redundant
const REDUNDANCY_THRESHOLD = 3;

export class SkillAnalyzer {
  /**
   * Estimate token count for a skill using 4-char-per-token heuristic
   * @param skill Skill object to analyze
   * @returns Token estimate with breakdown
   *
   * Requirements: 10.1
   */
  estimateTokens(skill: Skill): TokenEstimate {
    const skillName = skill.name || 'unknown';

    // Extract skill content sections
    const instructions = skill.content || '';
    const examples = this.extractExamples(instructions);
    const metadata = JSON.stringify({
      name: skill.name,
      description: skill.description,
      scope: skill.scope,
    });

    // Estimate tokens using 4-char-per-token heuristic
    const instructionsTokens = Math.ceil(instructions.length / 4);
    const examplesTokens = Math.ceil(examples.length / 4);
    const metadataTokens = Math.ceil(metadata.length / 4);

    const totalTokens = instructionsTokens + examplesTokens + metadataTokens;

    return {
      skillName,
      estimatedTokens: totalTokens,
      breakdown: {
        instructions: instructionsTokens,
        examples: examplesTokens,
        metadata: metadataTokens,
      },
      accuracy: 'approximate',
    };
  }

  /**
   * Generate token limit warnings for a skill
   * @param skill Skill object to analyze
   * @returns Array of warnings
   *
   * Requirements: 10.2
   */
  generateWarnings(skill: Skill): TokenWarning[] {
    const estimate = this.estimateTokens(skill);
    const warnings: TokenWarning[] = [];

    if (estimate.estimatedTokens >= TOKEN_LIMITS.CRITICAL) {
      warnings.push({
        severity: 'error',
        message: `Skill exceeds critical token limit. Consider splitting into multiple skills or removing unnecessary content.`,
        currentTokens: estimate.estimatedTokens,
        recommendedLimit: TOKEN_LIMITS.RECOMMENDED,
        exceedsBy: estimate.estimatedTokens - TOKEN_LIMITS.CRITICAL,
      });
    } else if (estimate.estimatedTokens >= TOKEN_LIMITS.WARNING) {
      warnings.push({
        severity: 'warning',
        message: `Skill is approaching token limit. Consider optimizing content to reduce token usage.`,
        currentTokens: estimate.estimatedTokens,
        recommendedLimit: TOKEN_LIMITS.RECOMMENDED,
        exceedsBy: estimate.estimatedTokens - TOKEN_LIMITS.WARNING,
      });
    } else if (estimate.estimatedTokens >= TOKEN_LIMITS.RECOMMENDED) {
      warnings.push({
        severity: 'info',
        message: `Skill is above recommended token limit but within acceptable range.`,
        currentTokens: estimate.estimatedTokens,
        recommendedLimit: TOKEN_LIMITS.RECOMMENDED,
      });
    }

    return warnings;
  }

  /**
   * Detect redundancy in skill content
   * @param skill Skill object to analyze
   * @returns Redundancy report
   *
   * Requirements: 10.5
   */
  detectRedundancy(skill: Skill): RedundancyReport {
    const content = skill.content || '';
    const redundancies: RedundancyItem[] = [];

    // Detect repeated phrases (3+ words repeated multiple times)
    const repeatedPhrases = this.findRepeatedPhrases(content);
    for (const phrase of repeatedPhrases) {
      if (phrase.occurrences >= REDUNDANCY_THRESHOLD) {
        redundancies.push({
          type: 'repeated_phrase',
          location: 'skill content',
          content: phrase.text,
          occurrences: phrase.occurrences,
          estimatedTokens: Math.ceil(
            (phrase.text.length * phrase.occurrences) / 4
          ),
          suggestion: `Consider using a reference or variable instead of repeating "${phrase.text}"`,
        });
      }
    }

    // Detect duplicate examples
    const examples = this.extractExampleBlocks(content);
    const exampleMap = new Map<string, number>();
    for (const example of examples) {
      const normalized = this.normalizeText(example);
      exampleMap.set(normalized, (exampleMap.get(normalized) || 0) + 1);
    }

    for (const [example, count] of exampleMap.entries()) {
      if (count >= 2) {
        redundancies.push({
          type: 'duplicate_example',
          location: 'examples section',
          content: example.substring(0, 100) + '...',
          occurrences: count,
          estimatedTokens: Math.ceil((example.length * count) / 4),
          suggestion: `Remove duplicate example or consolidate similar examples`,
        });
      }
    }

    // Detect verbose instructions (sentences with >30 words)
    const verboseInstructions = this.findVerboseInstructions(content);
    for (const instruction of verboseInstructions) {
      redundancies.push({
        type: 'verbose_instruction',
        location: 'instructions',
        content: instruction.text.substring(0, 100) + '...',
        occurrences: 1,
        estimatedTokens: Math.ceil(instruction.text.length / 4),
        suggestion: `Simplify instruction: "${instruction.text.substring(0, 50)}..." (${instruction.wordCount} words)`,
      });
    }

    const totalRedundantTokens = redundancies.reduce(
      (sum, item) => sum + item.estimatedTokens,
      0
    );

    return {
      hasRedundancy: redundancies.length > 0,
      redundancies,
      totalRedundantTokens,
    };
  }

  /**
   * Generate optimization suggestions for a skill
   * @param skill Skill object to analyze
   * @returns Array of optimization suggestions
   *
   * Requirements: 10.5
   */
  generateSuggestions(skill: Skill): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const estimate = this.estimateTokens(skill);
    const redundancyReport = this.detectRedundancy(skill);

    // Suggest removing redundancy if found
    if (redundancyReport.hasRedundancy) {
      suggestions.push({
        type: 'remove_redundancy',
        priority: 'high',
        description: `Remove redundant content to save approximately ${redundancyReport.totalRedundantTokens} tokens`,
        estimatedSavings: redundancyReport.totalRedundantTokens,
        example: redundancyReport.redundancies[0]?.suggestion,
      });
    }

    // Suggest simplifying instructions if they're verbose
    const verboseCount = redundancyReport.redundancies.filter(
      (r) => r.type === 'verbose_instruction'
    ).length;
    if (verboseCount > 0) {
      const verboseTokens = redundancyReport.redundancies
        .filter((r) => r.type === 'verbose_instruction')
        .reduce((sum, r) => sum + r.estimatedTokens, 0);

      suggestions.push({
        type: 'simplify_instructions',
        priority: 'medium',
        description: `Simplify ${verboseCount} verbose instruction(s) to reduce token usage`,
        estimatedSavings: Math.floor(verboseTokens * 0.3), // Assume 30% reduction
      });
    }

    // Suggest reducing examples if there are many
    const exampleTokens = estimate.breakdown.examples;
    if (exampleTokens > 500) {
      suggestions.push({
        type: 'reduce_examples',
        priority: 'medium',
        description: `Consider reducing the number of examples or making them more concise`,
        estimatedSavings: Math.floor(exampleTokens * 0.2), // Assume 20% reduction
      });
    }

    // Suggest compressing metadata if it's large
    const metadataTokens = estimate.breakdown.metadata;
    if (metadataTokens > 100) {
      suggestions.push({
        type: 'compress_metadata',
        priority: 'low',
        description: `Metadata is unusually large. Consider removing unnecessary fields.`,
        estimatedSavings: Math.floor(metadataTokens * 0.5), // Assume 50% reduction
      });
    }

    // Sort by priority and estimated savings
    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedSavings - a.estimatedSavings;
    });

    return suggestions;
  }

  /**
   * Generate a complete analysis report for a skill
   * @param skill Skill object to analyze
   * @returns Complete analysis report
   */
  analyzeSkill(skill: Skill): AnalysisReport {
    const tokenEstimate = this.estimateTokens(skill);
    const warnings = this.generateWarnings(skill);
    const redundancyReport = this.detectRedundancy(skill);
    const suggestions = this.generateSuggestions(skill);

    // Calculate overall score
    let overallScore: AnalysisReport['overallScore'];
    if (
      tokenEstimate.estimatedTokens <= TOKEN_LIMITS.RECOMMENDED &&
      !redundancyReport.hasRedundancy
    ) {
      overallScore = 'excellent';
    } else if (
      tokenEstimate.estimatedTokens <= TOKEN_LIMITS.WARNING &&
      redundancyReport.totalRedundantTokens < 100
    ) {
      overallScore = 'good';
    } else if (tokenEstimate.estimatedTokens <= TOKEN_LIMITS.CRITICAL) {
      overallScore = 'needs_improvement';
    } else {
      overallScore = 'poor';
    }

    return {
      skillName: skill.name || 'unknown',
      tokenEstimate,
      warnings,
      redundancyReport,
      suggestions,
      overallScore,
    };
  }

  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * Extract examples from skill content
   */
  private extractExamples(content: string): string {
    // Look for common example markers
    const exampleMarkers = [
      /## Examples?[\s\S]*?(?=##|$)/gi,
      /### Examples?[\s\S]*?(?=###|$)/gi,
      /Example:[\s\S]*?(?=\n\n|$)/gi,
    ];

    let examples = '';
    for (const marker of exampleMarkers) {
      const matches = content.match(marker);
      if (matches) {
        examples += matches.join('\n');
      }
    }

    return examples;
  }

  /**
   * Extract example blocks from content
   */
  private extractExampleBlocks(content: string): string[] {
    const blocks: string[] = [];

    // Extract code blocks
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = content.match(codeBlockRegex);
    if (codeBlocks) {
      blocks.push(...codeBlocks);
    }

    // Extract example sections
    const exampleSections = content.split(/##+ Example/i);
    for (let i = 1; i < exampleSections.length; i++) {
      const section = exampleSections[i].split(/##+ /)[0];
      blocks.push(section.trim());
    }

    return blocks;
  }

  /**
   * Find repeated phrases in content
   */
  private findRepeatedPhrases(
    content: string
  ): Array<{ text: string; occurrences: number }> {
    const phrases: Map<string, number> = new Map();

    // Split into sentences
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);

      // Look for 3-5 word phrases
      for (let len = 3; len <= 5; len++) {
        for (let i = 0; i <= words.length - len; i++) {
          const phrase = words.slice(i, i + len).join(' ').toLowerCase();

          // Skip if too short or contains only common words
          if (phrase.length < 15 || this.isCommonPhrase(phrase)) {
            continue;
          }

          phrases.set(phrase, (phrases.get(phrase) || 0) + 1);
        }
      }
    }

    // Filter to only repeated phrases
    const repeated: Array<{ text: string; occurrences: number }> = [];
    for (const [text, occurrences] of phrases.entries()) {
      if (occurrences >= 2) {
        repeated.push({ text, occurrences });
      }
    }

    // Sort by occurrences
    repeated.sort((a, b) => b.occurrences - a.occurrences);

    return repeated;
  }

  /**
   * Find verbose instructions (sentences with >30 words)
   */
  private findVerboseInstructions(
    content: string
  ): Array<{ text: string; wordCount: number }> {
    const verbose: Array<{ text: string; wordCount: number }> = [];

    // Split into sentences
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length === 0) continue;

      const wordCount = trimmed.split(/\s+/).length;

      if (wordCount > 30) {
        verbose.push({
          text: trimmed,
          wordCount,
        });
      }
    }

    return verbose;
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * Check if a phrase is common/generic
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'should',
      'could',
      'may',
      'might',
      'must',
      'can',
      'this',
      'that',
      'these',
      'those',
    ]);

    const words = phrase.split(/\s+/);
    const commonCount = words.filter((w) => commonWords.has(w)).length;

    // If more than 60% of words are common, consider it a common phrase
    return commonCount / words.length > 0.6;
  }
}
