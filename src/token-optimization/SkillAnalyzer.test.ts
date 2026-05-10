/**
 * Unit tests for SkillAnalyzer
 */

import { describe, it, expect } from 'vitest';
import { SkillAnalyzer } from './SkillAnalyzer';
import type { Skill } from '@/skills/types';

describe('SkillAnalyzer', () => {
  const analyzer = new SkillAnalyzer();

  // Helper to create test skills
  const createSkill = (overrides: Partial<Skill>): Skill => ({
    name: 'test-skill',
    description: 'Test skill',
    content: '',
    scope: 'user',
    path: '/test/path',
    ...overrides,
  });

  describe('estimateTokens', () => {
    it('should estimate tokens using 4-char-per-token heuristic', () => {
      const skill = createSkill({
        content: 'a'.repeat(400), // 400 chars = ~100 tokens
      });

      const estimate = analyzer.estimateTokens(skill);

      expect(estimate.skillName).toBe('test-skill');
      expect(estimate.estimatedTokens).toBeGreaterThan(0);
      expect(estimate.accuracy).toBe('approximate');
      expect(estimate.breakdown.instructions).toBeGreaterThan(0);
    });

    it('should provide breakdown by section', () => {
      const skill = createSkill({
        content: `
Instructions here.

## Examples
Example 1
Example 2
        `,
      });

      const estimate = analyzer.estimateTokens(skill);

      expect(estimate.breakdown).toHaveProperty('instructions');
      expect(estimate.breakdown).toHaveProperty('examples');
      expect(estimate.breakdown).toHaveProperty('metadata');
      expect(
        estimate.breakdown.instructions +
          estimate.breakdown.examples +
          estimate.breakdown.metadata
      ).toBe(estimate.estimatedTokens);
    });

    it('should handle skills without content', () => {
      const skill = createSkill({
        name: 'empty-skill',
        description: 'Empty skill',
        content: '',
      });

      const estimate = analyzer.estimateTokens(skill);

      expect(estimate.estimatedTokens).toBeGreaterThanOrEqual(0);
      expect(estimate.breakdown.instructions).toBe(0);
    });

    it('should handle skills with large content', () => {
      const skill = createSkill({
        name: 'large-skill',
        description: 'Large skill',
        content: 'a'.repeat(10000), // 10000 chars = ~2500 tokens
      });

      const estimate = analyzer.estimateTokens(skill);

      expect(estimate.estimatedTokens).toBeGreaterThan(2000);
    });
  });

  describe('generateWarnings', () => {
    it('should generate error warning for skills exceeding critical limit', () => {
      const skill = createSkill({
        name: 'huge-skill',
        description: 'Huge skill',
        content: 'a'.repeat(8000), // ~2000 tokens (critical)
      });

      const warnings = analyzer.generateWarnings(skill);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].severity).toBe('error');
      expect(warnings[0].message).toContain('critical');
      expect(warnings[0].exceedsBy).toBeGreaterThan(0);
    });

    it('should generate warning for skills approaching limit', () => {
      const skill = createSkill({
        name: 'large-skill',
        description: 'Large skill',
        content: 'a'.repeat(6000), // ~1500 tokens (warning)
      });

      const warnings = analyzer.generateWarnings(skill);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].severity).toBe('warning');
      expect(warnings[0].message).toContain('approaching');
    });

    it('should generate info for skills above recommended but below warning', () => {
      const skill = createSkill({
        name: 'medium-skill',
        description: 'Medium skill',
        content: 'a'.repeat(4500), // ~1125 tokens (above recommended)
      });

      const warnings = analyzer.generateWarnings(skill);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].severity).toBe('info');
    });

    it('should not generate warnings for small skills', () => {
      const skill = createSkill({
        name: 'small-skill',
        description: 'Small skill',
        content: 'a'.repeat(1000), // ~250 tokens (well below limit)
      });

      const warnings = analyzer.generateWarnings(skill);

      expect(warnings.length).toBe(0);
    });

    it('should include current and recommended token counts in warnings', () => {
      const skill = createSkill({
        content: 'a'.repeat(6000),
      });

      const warnings = analyzer.generateWarnings(skill);

      expect(warnings[0].currentTokens).toBeGreaterThan(0);
      expect(warnings[0].recommendedLimit).toBe(1000);
    });
  });

  describe('detectRedundancy', () => {
    it('should detect repeated phrases', () => {
      const skill = createSkill({
        name: 'redundant-skill',
        description: 'Redundant skill',
        content: `
This is a repeated phrase that appears multiple times.
This is a repeated phrase that appears multiple times.
This is a repeated phrase that appears multiple times.
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.hasRedundancy).toBe(true);
      expect(report.redundancies.length).toBeGreaterThan(0);
      expect(report.redundancies[0].type).toBe('repeated_phrase');
      expect(report.redundancies[0].occurrences).toBeGreaterThanOrEqual(3);
    });

    it('should detect duplicate examples', () => {
      const skill = createSkill({
        name: 'duplicate-examples',
        description: 'Skill with duplicate examples',
        content: `
## Examples

\`\`\`
const x = 1;
\`\`\`

\`\`\`
const x = 1;
\`\`\`
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.hasRedundancy).toBe(true);
      const duplicateExample = report.redundancies.find(
        (r) => r.type === 'duplicate_example'
      );
      expect(duplicateExample).toBeDefined();
      expect(duplicateExample?.occurrences).toBeGreaterThanOrEqual(2);
    });

    it('should detect verbose instructions', () => {
      const skill = createSkill({
        name: 'verbose-skill',
        description: 'Verbose skill',
        content: `
This is a very long and verbose instruction that contains more than thirty words and should be flagged as verbose because it could be simplified and made more concise for better readability and token efficiency.
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.hasRedundancy).toBe(true);
      const verboseInstruction = report.redundancies.find(
        (r) => r.type === 'verbose_instruction'
      );
      expect(verboseInstruction).toBeDefined();
    });

    it('should not detect redundancy in concise content', () => {
      const skill = createSkill({
        name: 'concise-skill',
        description: 'Concise skill',
        content: `
Clear instructions.
Different example.
Unique content.
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.hasRedundancy).toBe(false);
      expect(report.redundancies.length).toBe(0);
      expect(report.totalRedundantTokens).toBe(0);
    });

    it('should calculate total redundant tokens', () => {
      const skill = createSkill({
        name: 'redundant-skill',
        description: 'Redundant skill',
        content: `
This is a repeated phrase.
This is a repeated phrase.
This is a repeated phrase.
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.totalRedundantTokens).toBeGreaterThan(0);
    });

    it('should provide suggestions for each redundancy', () => {
      const skill = createSkill({
        name: 'redundant-skill',
        description: 'Redundant skill',
        content: `
This is a repeated phrase.
This is a repeated phrase.
This is a repeated phrase.
        `,
      });

      const report = analyzer.detectRedundancy(skill);

      expect(report.redundancies[0].suggestion).toBeDefined();
      expect(report.redundancies[0].suggestion.length).toBeGreaterThan(0);
    });
  });

  describe('generateSuggestions', () => {
    it('should suggest removing redundancy when detected', () => {
      const skill = createSkill({
        name: 'redundant-skill',
        description: 'Redundant skill',
        content: `
This is a repeated phrase.
This is a repeated phrase.
This is a repeated phrase.
        `,
      });

      const suggestions = analyzer.generateSuggestions(skill);

      const redundancySuggestion = suggestions.find(
        (s) => s.type === 'remove_redundancy'
      );
      expect(redundancySuggestion).toBeDefined();
      expect(redundancySuggestion?.priority).toBe('high');
      expect(redundancySuggestion?.estimatedSavings).toBeGreaterThan(0);
    });

    it('should suggest simplifying verbose instructions', () => {
      const skill = createSkill({
        name: 'verbose-skill',
        description: 'Verbose skill',
        content: `
This is a very long and verbose instruction that contains more than thirty words and should be flagged as verbose because it could be simplified and made more concise for better readability and token efficiency.
        `,
      });

      const suggestions = analyzer.generateSuggestions(skill);

      const simplifySuggestion = suggestions.find(
        (s) => s.type === 'simplify_instructions'
      );
      expect(simplifySuggestion).toBeDefined();
      expect(simplifySuggestion?.priority).toBe('medium');
    });

    it('should suggest reducing examples when there are many', () => {
      const skill = createSkill({
        name: 'many-examples',
        description: 'Skill with many examples',
        content: `
Instructions here.

## Examples
${'Example content. '.repeat(200)}
        `,
      });

      const suggestions = analyzer.generateSuggestions(skill);

      const reduceExamplesSuggestion = suggestions.find(
        (s) => s.type === 'reduce_examples'
      );
      expect(reduceExamplesSuggestion).toBeDefined();
      expect(reduceExamplesSuggestion?.priority).toBe('medium');
    });

    it('should sort suggestions by priority and savings', () => {
      const skill = createSkill({
        name: 'complex-skill',
        description: 'Complex skill',
        content: `
This is a repeated phrase.
This is a repeated phrase.
This is a repeated phrase.

## Examples
${'Example content. '.repeat(200)}
        `,
      });

      const suggestions = analyzer.generateSuggestions(skill);

      // High priority should come first
      if (suggestions.length > 1) {
        const priorities = suggestions.map((s) => s.priority);
        const highIndex = priorities.indexOf('high');
        const mediumIndex = priorities.indexOf('medium');

        if (highIndex !== -1 && mediumIndex !== -1) {
          expect(highIndex).toBeLessThan(mediumIndex);
        }
      }
    });

    it('should not generate suggestions for optimized skills', () => {
      const skill = createSkill({
        name: 'optimized-skill',
        description: 'Optimized skill',
        content: 'Clear and concise instructions.',
      });

      const suggestions = analyzer.generateSuggestions(skill);

      expect(suggestions.length).toBe(0);
    });
  });

  describe('analyzeSkill', () => {
    it('should generate complete analysis report', () => {
      const skill = createSkill({
        content: 'Test content',
      });

      const report = analyzer.analyzeSkill(skill);

      expect(report.skillName).toBe('test-skill');
      expect(report.tokenEstimate).toBeDefined();
      expect(report.warnings).toBeDefined();
      expect(report.redundancyReport).toBeDefined();
      expect(report.suggestions).toBeDefined();
      expect(report.overallScore).toBeDefined();
    });

    it('should rate excellent skills correctly', () => {
      const skill = createSkill({
        name: 'excellent-skill',
        description: 'Excellent skill',
        content: 'Clear and concise instructions.',
      });

      const report = analyzer.analyzeSkill(skill);

      expect(report.overallScore).toBe('excellent');
    });

    it('should rate good skills correctly', () => {
      const skill = createSkill({
        name: 'good-skill',
        description: 'Good skill',
        content: 'a'.repeat(4500), // ~1125 tokens, some redundancy
      });

      const report = analyzer.analyzeSkill(skill);

      expect(['good', 'excellent']).toContain(report.overallScore);
    });

    it('should rate skills needing improvement correctly', () => {
      const skill = createSkill({
        name: 'needs-improvement',
        description: 'Needs improvement',
        content: `
${'This is a repeated phrase. '.repeat(50)}
        `,
      });

      const report = analyzer.analyzeSkill(skill);

      expect(['needs_improvement', 'good']).toContain(report.overallScore);
    });

    it('should rate poor skills correctly', () => {
      const skill = createSkill({
        name: 'poor-skill',
        description: 'Poor skill',
        content: 'a'.repeat(10000), // ~2500 tokens (exceeds critical)
      });

      const report = analyzer.analyzeSkill(skill);

      expect(report.overallScore).toBe('poor');
    });

    it('should include all report sections', () => {
      const skill = createSkill({
        content: 'Test content',
      });

      const report = analyzer.analyzeSkill(skill);

      expect(report).toHaveProperty('skillName');
      expect(report).toHaveProperty('tokenEstimate');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('redundancyReport');
      expect(report).toHaveProperty('suggestions');
      expect(report).toHaveProperty('overallScore');
    });
  });

  describe('edge cases', () => {
    it('should handle skills with special characters', () => {
      const skill = createSkill({
        name: 'special-chars',
        description: 'Special characters',
        content: '!@#$%^&*()_+-=[]{}|;:,.<>?',
      });

      const estimate = analyzer.estimateTokens(skill);
      expect(estimate.estimatedTokens).toBeGreaterThan(0);
    });

    it('should handle skills with unicode characters', () => {
      const skill = createSkill({
        name: 'unicode-skill',
        description: 'Unicode skill',
        content: '你好世界 🌍 Привет мир',
      });

      const estimate = analyzer.estimateTokens(skill);
      expect(estimate.estimatedTokens).toBeGreaterThan(0);
    });

    it('should handle skills with mixed content types', () => {
      const skill = createSkill({
        name: 'mixed-content',
        description: 'Mixed content',
        content: `
# Title
Instructions here.

\`\`\`javascript
const x = 1;
\`\`\`

## Examples
Example 1
Example 2
        `,
      });

      const report = analyzer.analyzeSkill(skill);
      expect(report.tokenEstimate.estimatedTokens).toBeGreaterThan(0);
    });

    it('should handle skills without name', () => {
      const skill = createSkill({
        name: '',
        description: 'No name',
        content: 'Content',
      });

      const estimate = analyzer.estimateTokens(skill);
      expect(estimate.skillName).toBe('unknown');
    });
  });
});
