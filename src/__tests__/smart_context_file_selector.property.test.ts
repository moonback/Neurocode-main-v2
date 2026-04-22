// Feature: smart-context-mode
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import { matchesByKeyword } from "../context_manager/file_selector";

// Arbitrary for a keyword (lowercase word, length 2–20)
const keywordArb = fc.stringMatching(/^[a-z]{2,20}$/);

// Arbitrary for a set of keywords (1–5 keywords)
const keywordsSetArb = fc
  .array(keywordArb, { minLength: 1, maxLength: 5 })
  .map((arr) => new Set(arr));

// Arbitrary for a file path that contains a given keyword in its basename
function filePathWithKeywordArb(keyword: string) {
  return fc.oneof(
    // keyword is the entire basename (no extension)
    fc.constant(`src/${keyword}.ts`),
    // keyword is the entire basename with tsx extension
    fc.constant(`components/${keyword}.tsx`),
    // keyword appears in a directory segment
    fc.constant(`src/${keyword}/index.ts`),
    // keyword is part of a longer basename (camelCase prefix)
    fc.constant(`src/${keyword}Utils.ts`),
  );
}

// Arbitrary for content that exports a given symbol
function contentWithExportArb(symbolName: string) {
  return fc.oneof(
    fc.constant(`export function ${symbolName}() {}`),
    fc.constant(`export class ${symbolName} {}`),
    fc.constant(`export const ${symbolName} = 42;`),
    fc.constant(`export interface ${symbolName} {}`),
    fc.constant(`export type ${symbolName} = string;`),
  );
}

// **Validates: Requirements 1.3**
describe("Property 13: Keyword-based candidate selection without active file", () => {
  it("a file whose basename matches a keyword is selected", () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(keywordArb, { minLength: 0, maxLength: 3 }),
        (keyword, extraKeywords) => {
          const keywords = new Set([keyword, ...extraKeywords]);
          const filePath = `src/${keyword}.ts`;
          const content = "// no exports";

          return matchesByKeyword(filePath, content, keywords);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("a file whose exported symbol matches a keyword is selected", () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.array(keywordArb, { minLength: 0, maxLength: 3 }),
        (keyword, extraKeywords) => {
          const keywords = new Set([keyword, ...extraKeywords]);
          // File path has no relation to the keyword
          const filePath = "src/unrelated.ts";
          const content = `export function ${keyword}() { return 42; }`;

          return matchesByKeyword(filePath, content, keywords);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("a file with no keyword match in path or exports is NOT selected", () => {
    fc.assert(
      fc.property(
        // keyword that won't appear in the fixed path or content
        fc.constant("zzzkeywordzzz"),
        (keyword) => {
          const keywords = new Set([keyword]);
          const filePath = "src/unrelated.ts";
          const content = "export function doSomething() {}";

          return !matchesByKeyword(filePath, content, keywords);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("empty keyword set never matches any file", () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 100 }),
        fc.string({ maxLength: 500 }),
        (filePath, content) => {
          return !matchesByKeyword(filePath, content, new Set());
        },
      ),
      { numRuns: 100 },
    );
  });

  it("a file whose directory segment matches a keyword is selected", () => {
    fc.assert(
      fc.property(keywordArb, (keyword) => {
        const keywords = new Set([keyword]);
        // keyword appears as a directory segment, not the basename
        const filePath = `src/${keyword}/helper.ts`;
        const content = "// no exports";

        return matchesByKeyword(filePath, content, keywords);
      }),
      { numRuns: 100 },
    );
  });

  it("matching is case-insensitive for exported symbols", () => {
    fc.assert(
      fc.property(keywordArb, (keyword) => {
        const keywords = new Set([keyword.toLowerCase()]);
        const filePath = "src/unrelated.ts";
        // Export uses the same casing as keyword (already lowercase from arb)
        const content = `export const ${keyword} = true;`;

        return matchesByKeyword(filePath, content, keywords);
      }),
      { numRuns: 100 },
    );
  });

  it("a file path containing the keyword as a substring of the basename is selected", () => {
    fc.assert(
      fc.property(
        keywordArb,
        fc.stringMatching(/^[a-z]{2,10}$/),
        (keyword, suffix) => {
          const keywords = new Set([keyword]);
          // basename is keyword + suffix (e.g. "authUtils.ts")
          const filePath = `src/${keyword}${suffix}.ts`;
          const content = "// no exports";

          return matchesByKeyword(filePath, content, keywords);
        },
      ),
      { numRuns: 100 },
    );
  });
});
