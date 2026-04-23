import { describe, it, expect } from "vitest";
import { ipc, suggestionClient, suggestionContracts } from "../index";

describe("Suggestion IPC Integration", () => {
  it("should export suggestionClient from index", () => {
    expect(suggestionClient).toBeDefined();
    expect(suggestionClient.generateSuggestions).toBeDefined();
    expect(typeof suggestionClient.generateSuggestions).toBe("function");
  });

  it("should export suggestionContracts from index", () => {
    expect(suggestionContracts).toBeDefined();
    expect(suggestionContracts.generateSuggestions).toBeDefined();
    expect(suggestionContracts.generateSuggestions.channel).toBe(
      "suggestions:generate",
    );
  });

  it("should include suggestions in unified ipc namespace", () => {
    expect(ipc.suggestions).toBeDefined();
    expect(ipc.suggestions.generateSuggestions).toBeDefined();
    expect(typeof ipc.suggestions.generateSuggestions).toBe("function");
  });

  it("should have the same client in both exports", () => {
    expect(ipc.suggestions).toBe(suggestionClient);
  });

  it("should export getSuggestionSettings contract", () => {
    expect(suggestionContracts.getSuggestionSettings).toBeDefined();
    expect(suggestionContracts.getSuggestionSettings.channel).toBe(
      "suggestions:getSettings",
    );
    expect(suggestionClient.getSuggestionSettings).toBeDefined();
    expect(typeof suggestionClient.getSuggestionSettings).toBe("function");
  });

  it("should export updateSuggestionSettings contract", () => {
    expect(suggestionContracts.updateSuggestionSettings).toBeDefined();
    expect(suggestionContracts.updateSuggestionSettings.channel).toBe(
      "suggestions:updateSettings",
    );
    expect(suggestionClient.updateSuggestionSettings).toBeDefined();
    expect(typeof suggestionClient.updateSuggestionSettings).toBe("function");
  });
});
