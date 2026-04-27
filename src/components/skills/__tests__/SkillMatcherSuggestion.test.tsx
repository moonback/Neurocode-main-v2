import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure logic extracted from SkillMatcherSuggestion for unit testing
// ---------------------------------------------------------------------------

function calculateRelevancePercentage(relevance: number): number {
  return Math.round(relevance * 100);
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SkillMatcherSuggestion Logic", () => {
  it("calculates correct relevance percentage", () => {
    expect(calculateRelevancePercentage(0.85)).toBe(85);
    expect(calculateRelevancePercentage(0.123)).toBe(12);
    expect(calculateRelevancePercentage(1)).toBe(100);
    expect(calculateRelevancePercentage(0)).toBe(0);
  });

  it("handles very small relevance values", () => {
    expect(calculateRelevancePercentage(0.004)).toBe(0);
    expect(calculateRelevancePercentage(0.006)).toBe(1);
  });
});
