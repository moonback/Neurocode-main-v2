import { describe, expect, it } from "vitest";
import { assembleContext } from "../context_manager/assembler";
import type { AssemblerOptions, ScoredFile } from "../context_manager/types";

const LARGE_BUDGET = 100_000;

function makeFile(
  path: string,
  relevanceScore: number,
  content = "export const x = 1;",
  mtime = 1_700_000_000_000,
): ScoredFile {
  return {
    path,
    content,
    mtime,
    sizeTokens: Math.ceil(content.length / 4),
    relevanceScore,
  };
}

function makeOptions(
  overrides: Partial<AssemblerOptions> = {},
): AssemblerOptions {
  return {
    scoredFiles: [],
    strategy: "balanced",
    tokenBudget: LARGE_BUDGET,
    activeFilePath: null,
    ...overrides,
  };
}

// ─── Strategy thresholds ────────────────────────────────────────────────────

describe("strategy thresholds — conservative (>= 0.7)", () => {
  it("includes files with score >= 0.7", () => {
    const files = [
      makeFile("a.ts", 0.9),
      makeFile("b.ts", 0.7),
      makeFile("c.ts", 0.69),
    ];
    const result = assembleContext(
      makeOptions({ scoredFiles: files, strategy: "conservative" }),
    );
    const paths = result.includedFiles.map((f) => f.path);
    expect(paths).toContain("a.ts");
    expect(paths).toContain("b.ts");
    expect(paths).not.toContain("c.ts");
  });

  it("always includes the active file regardless of score", () => {
    const files = [makeFile("active.ts", 0.1), makeFile("other.ts", 0.9)];
    const result = assembleContext(
      makeOptions({
        scoredFiles: files,
        strategy: "conservative",
        activeFilePath: "active.ts",
      }),
    );
    const paths = result.includedFiles.map((f) => f.path);
    expect(paths).toContain("active.ts");
  });

  it("caps token usage at 25% of budget", () => {
    const budget = 10_000;
    const files = Array.from({ length: 20 }, (_, i) =>
      makeFile(`f${i}.ts`, 0.9, "x".repeat(400)),
    );
    const result = assembleContext(
      makeOptions({
        scoredFiles: files,
        strategy: "conservative",
        tokenBudget: budget,
      }),
    );
    expect(result.totalTokensUsed).toBeLessThanOrEqual(
      Math.floor(budget * 0.25),
    );
  });
});

describe("strategy thresholds — balanced (>= 0.4)", () => {
  it("includes files with score >= 0.4", () => {
    const files = [
      makeFile("a.ts", 0.8),
      makeFile("b.ts", 0.4),
      makeFile("c.ts", 0.39),
    ];
    const result = assembleContext(
      makeOptions({ scoredFiles: files, strategy: "balanced" }),
    );
    const paths = result.includedFiles.map((f) => f.path);
    expect(paths).toContain("a.ts");
    expect(paths).toContain("b.ts");
    expect(paths).not.toContain("c.ts");
  });

  it("caps token usage at 50% of budget", () => {
    const budget = 10_000;
    const files = Array.from({ length: 20 }, (_, i) =>
      makeFile(`f${i}.ts`, 0.9, "x".repeat(400)),
    );
    const result = assembleContext(
      makeOptions({
        scoredFiles: files,
        strategy: "balanced",
        tokenBudget: budget,
      }),
    );
    expect(result.totalTokensUsed).toBeLessThanOrEqual(
      Math.floor(budget * 0.5),
    );
  });
});

describe("strategy thresholds — deep (> 0.1)", () => {
  it("includes files with score > 0.1", () => {
    const files = [
      makeFile("a.ts", 0.5),
      makeFile("b.ts", 0.15),
      makeFile("c.ts", 0.05), // clearly below 0.1 — excluded
    ];
    const result = assembleContext(
      makeOptions({ scoredFiles: files, strategy: "deep" }),
    );
    const paths = result.includedFiles.map((f) => f.path);
    expect(paths).toContain("a.ts");
    expect(paths).toContain("b.ts");
    expect(paths).not.toContain("c.ts");
  });

  it("caps token usage at 80% of budget", () => {
    const budget = 10_000;
    const files = Array.from({ length: 20 }, (_, i) =>
      makeFile(`f${i}.ts`, 0.9, "x".repeat(400)),
    );
    const result = assembleContext(
      makeOptions({
        scoredFiles: files,
        strategy: "deep",
        tokenBudget: budget,
      }),
    );
    expect(result.totalTokensUsed).toBeLessThanOrEqual(
      Math.floor(budget * 0.8),
    );
  });
});

// ─── Truncation boundary at score 0.3 ───────────────────────────────────────

describe("truncation boundary at score 0.3", () => {
  const multiLineContent = [
    "export function greet(name: string) {",
    "  const msg = `Hello, ${name}!`;",
    "  console.log(msg);",
    "  return msg;",
    "}",
    "export class Greeter {",
    "  private prefix = 'Hi';",
    "  greet(name: string) {",
    "    return `${this.prefix}, ${name}`;",
    "  }",
    "}",
  ].join("\n");

  it("file with score < 0.3 is truncated (wasTruncated = true)", () => {
    const file = makeFile("src/low.ts", 0.29, multiLineContent);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "deep" }),
    );
    const included = result.includedFiles.find((f) => f.path === "src/low.ts");
    expect(included).toBeDefined();
    expect(included!.wasTruncated).toBe(true);
  });

  it("file with score >= 0.3 is NOT truncated due to score", () => {
    // Use score 0.5 so it passes the balanced threshold (>= 0.4) and is above truncation threshold (>= 0.3)
    const file = makeFile("src/high.ts", 0.5, multiLineContent);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "balanced" }),
    );
    const included = result.includedFiles.find((f) => f.path === "src/high.ts");
    expect(included).toBeDefined();
    expect(included!.wasTruncated).toBe(false);
  });

  it("truncated file output does not contain implementation body lines", () => {
    const file = makeFile("src/low.ts", 0.15, multiLineContent);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "deep" }),
    );
    expect(result.formattedOutput).not.toContain("console.log(msg)");
    expect(result.formattedOutput).not.toContain("const msg =");
    expect(result.formattedOutput).not.toContain("private prefix");
  });

  it("truncated file output retains top-level declaration lines", () => {
    const file = makeFile("src/low.ts", 0.15, multiLineContent);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "deep" }),
    );
    expect(result.formattedOutput).toContain("export function greet");
    expect(result.formattedOutput).toContain("export class Greeter");
  });
});

// ─── Omission marker format ──────────────────────────────────────────────────

describe("omission marker format", () => {
  it("inserts '// [dyad: content omitted — N lines]' for truncated sections", () => {
    const content = [
      "export function foo() {",
      "  const a = 1;",
      "  const b = 2;",
      "  return a + b;",
      "}",
    ].join("\n");
    const file = makeFile("src/foo.ts", 0.2, content);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "deep" }),
    );
    expect(result.formattedOutput).toMatch(
      /\/\/ \[dyad: content omitted — \d+ lines\]/,
    );
  });

  it("omission marker includes the correct line count", () => {
    // 3 body lines will be omitted: "  const a = 1;", "  const b = 2;", "  return a + b;"
    const content = [
      "export function foo() {",
      "  const a = 1;",
      "  const b = 2;",
      "  return a + b;",
      "}",
    ].join("\n");
    const file = makeFile("src/foo.ts", 0.2, content);
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], strategy: "deep" }),
    );
    // The 3 body lines should be omitted
    expect(result.formattedOutput).toContain(
      "// [dyad: content omitted — 3 lines]",
    );
  });
});

// ─── Sorting and tie-breaking ────────────────────────────────────────────────

describe("file ordering — descending score", () => {
  it("files are included in descending relevanceScore order", () => {
    const files = [
      makeFile("c.ts", 0.5),
      makeFile("a.ts", 0.9),
      makeFile("b.ts", 0.7),
    ];
    const result = assembleContext(makeOptions({ scoredFiles: files }));
    const scores = result.includedFiles.map((f) => f.relevanceScore);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});

describe("file ordering — mtime tie-breaking", () => {
  it("when scores are equal, more recent mtime comes first", () => {
    const older = makeFile("old.ts", 0.6, "export const x = 1;", 1_000_000);
    const newer = makeFile("new.ts", 0.6, "export const y = 2;", 2_000_000);
    const result = assembleContext(
      makeOptions({ scoredFiles: [older, newer] }),
    );
    expect(result.includedFiles[0].path).toBe("new.ts");
    expect(result.includedFiles[1].path).toBe("old.ts");
  });

  it("tie-breaking works regardless of input order", () => {
    const older = makeFile("old.ts", 0.6, "export const x = 1;", 1_000_000);
    const newer = makeFile("new.ts", 0.6, "export const y = 2;", 2_000_000);
    // Reversed input order
    const result = assembleContext(
      makeOptions({ scoredFiles: [newer, older] }),
    );
    expect(result.includedFiles[0].path).toBe("new.ts");
  });
});

// ─── Token budget enforcement ────────────────────────────────────────────────

describe("token budget enforcement", () => {
  it("returns empty context when budget is too small for any file", () => {
    const file = makeFile("a.ts", 0.9, "x".repeat(1000));
    const result = assembleContext(
      makeOptions({ scoredFiles: [file], tokenBudget: 1 }),
    );
    expect(result.includedFiles).toHaveLength(0);
    expect(result.totalTokensUsed).toBe(0);
  });

  it("stops including files once budget is exhausted", () => {
    const budget = 200;
    const files = Array.from({ length: 10 }, (_, i) =>
      makeFile(`f${i}.ts`, 0.9, "x".repeat(200)),
    );
    const result = assembleContext(
      makeOptions({ scoredFiles: files, tokenBudget: budget }),
    );
    expect(result.totalTokensUsed).toBeLessThanOrEqual(
      Math.floor(budget * 0.5), // balanced default
    );
  });

  it("returns empty context for empty scoredFiles", () => {
    const result = assembleContext(makeOptions({ scoredFiles: [] }));
    expect(result.includedFiles).toHaveLength(0);
    expect(result.formattedOutput).toBe("");
    expect(result.totalTokensUsed).toBe(0);
  });
});

// ─── Formatted output structure ──────────────────────────────────────────────

describe("formatted output structure", () => {
  it("wraps each file in <dyad-file path='...'> tags", () => {
    const file = makeFile("src/hello.ts", 0.8, "export const hi = 'hello';");
    const result = assembleContext(makeOptions({ scoredFiles: [file] }));
    expect(result.formattedOutput).toContain('<dyad-file path="src/hello.ts">');
    expect(result.formattedOutput).toContain("</dyad-file>");
  });

  it("includes file content inside the tags", () => {
    const content = "export const greeting = 'hi';";
    const file = makeFile("src/greet.ts", 0.8, content);
    const result = assembleContext(makeOptions({ scoredFiles: [file] }));
    expect(result.formattedOutput).toContain(content);
  });
});
