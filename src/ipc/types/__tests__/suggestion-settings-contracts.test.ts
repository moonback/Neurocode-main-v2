import { describe, it, expect } from "vitest";
import { suggestionContracts } from "../suggestions";

describe("Suggestion Settings Contracts", () => {
  describe("getSuggestionSettings", () => {
    it("should validate empty input", () => {
      const result = suggestionContracts.getSuggestionSettings.input.safeParse(
        {},
      );
      expect(result.success).toBe(true);
    });

    it("should validate output with all required fields", () => {
      const result =
        suggestionContracts.getSuggestionSettings.output.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 5,
        });
      expect(result.success).toBe(true);
    });

    it("should reject output with maxSuggestionsPerTask below minimum", () => {
      const result =
        suggestionContracts.getSuggestionSettings.output.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 0,
        });
      expect(result.success).toBe(false);
    });

    it("should reject output with maxSuggestionsPerTask above maximum", () => {
      const result =
        suggestionContracts.getSuggestionSettings.output.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 11,
        });
      expect(result.success).toBe(false);
    });

    it("should accept output with maxSuggestionsPerTask at boundaries", () => {
      const result1 =
        suggestionContracts.getSuggestionSettings.output.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 1,
        });
      expect(result1.success).toBe(true);

      const result2 =
        suggestionContracts.getSuggestionSettings.output.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 10,
        });
      expect(result2.success).toBe(true);
    });
  });

  describe("updateSuggestionSettings", () => {
    it("should validate input with all optional fields", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          enabled: true,
          displayEnabled: false,
          maxSuggestionsPerTask: 7,
        });
      expect(result.success).toBe(true);
    });

    it("should validate input with only enabled field", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          enabled: false,
        });
      expect(result.success).toBe(true);
    });

    it("should validate input with only displayEnabled field", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          displayEnabled: true,
        });
      expect(result.success).toBe(true);
    });

    it("should validate input with only maxSuggestionsPerTask field", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          maxSuggestionsPerTask: 3,
        });
      expect(result.success).toBe(true);
    });

    it("should validate empty input (all fields optional)", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject input with maxSuggestionsPerTask below minimum", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          maxSuggestionsPerTask: 0,
        });
      expect(result.success).toBe(false);
    });

    it("should reject input with maxSuggestionsPerTask above maximum", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          maxSuggestionsPerTask: 11,
        });
      expect(result.success).toBe(false);
    });

    it("should accept input with maxSuggestionsPerTask at boundaries", () => {
      const result1 =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          maxSuggestionsPerTask: 1,
        });
      expect(result1.success).toBe(true);

      const result2 =
        suggestionContracts.updateSuggestionSettings.input.safeParse({
          maxSuggestionsPerTask: 10,
        });
      expect(result2.success).toBe(true);
    });

    it("should validate output with success field", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.output.safeParse({
          success: true,
        });
      expect(result.success).toBe(true);
    });

    it("should reject output without success field", () => {
      const result =
        suggestionContracts.updateSuggestionSettings.output.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
