import { describe, expect, it } from "vitest";
import { scoreFile } from "../context_manager/scorer";
import type { CandidateFile, ScorerInput } from "../context_manager/types";

const NOW = 1_700_000_000_000; // fixed timestamp for deterministic tests

function makeCandidate(overrides: Partial<CandidateFile> = {}): CandidateFile {
  return {
    path: "src/foo.ts",
    content: "",
    mtime: NOW,
    sizeTokens: 100,
    ...overrides,
  };
}

function makeInput(overrides: Partial<ScorerInput> = {}): ScorerInput {
  return {
    candidate: makeCandidate(),
    activeFilePath: "src/active.ts",
    requestText: "",
    importedPaths: new Set(),
    importingPaths: new Set(),
    now: NOW,
    ...overrides,
  };
}

describe("scoreFile — import factor", () => {
  it("adds 0.40 when candidate is in importedPaths", () => {
    // Use a candidate in a different directory to isolate the import factor
    const input = makeInput({
      candidate: makeCandidate({
        path: "lib/foo.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      importedPaths: new Set(["lib/foo.ts"]),
      now: NOW,
    });
    const result = scoreFile(input);
    // import=1.0*0.40, symbol=0, proximity=0 (different dir), recency=0 (30 days old)
    expect(result.relevanceScore).toBeCloseTo(0.4, 5);
  });

  it("adds 0.40 when candidate is in importingPaths", () => {
    const input = makeInput({
      candidate: makeCandidate({
        path: "lib/foo.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      importingPaths: new Set(["lib/foo.ts"]),
      now: NOW,
    });
    const result = scoreFile(input);
    // import=1.0*0.40, symbol=0, proximity=0 (different dir), recency=0 (30 days old)
    expect(result.relevanceScore).toBeCloseTo(0.4, 5);
  });

  it("import factor is 0.0 when no active file", () => {
    const input = makeInput({
      activeFilePath: null,
      candidate: makeCandidate({
        path: "src/foo.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      importedPaths: new Set(["src/foo.ts"]),
      now: NOW,
    });
    const result = scoreFile(input);
    // import=0 (no active file), symbol=0, proximity=0 (no active file), recency=0
    expect(result.relevanceScore).toBeCloseTo(0.0, 5);
  });
});

describe("scoreFile — symbol overlap factor", () => {
  it("scores higher when exported symbols match request tokens", () => {
    const content = "export function myFunction() {}";
    const input = makeInput({
      candidate: makeCandidate({
        content,
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      requestText: "myFunction",
      now: NOW,
    });
    const result = scoreFile(input);
    // Jaccard({myfunction}, {myfunction}) = 1.0 → symbol=1.0*0.30=0.30
    // proximity: src/foo.ts vs src/active.ts → same dir → 1.0*0.20=0.20
    // import=0, recency=0
    expect(result.relevanceScore).toBeCloseTo(0.5, 5);
  });

  it("scores 0 symbol factor when content has no exports", () => {
    const input = makeInput({
      candidate: makeCandidate({
        content: "const x = 1;",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      requestText: "something",
      now: NOW,
    });
    const result = scoreFile(input);
    // symbol=0, proximity=same dir=0.20, import=0, recency=0
    expect(result.relevanceScore).toBeCloseTo(0.2, 5);
  });

  it("empty content gives 0 symbol factor", () => {
    const input = makeInput({
      candidate: makeCandidate({
        content: "",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      requestText: "foo bar",
      now: NOW,
    });
    const result = scoreFile(input);
    // symbol=0, proximity=same dir=0.20, import=0, recency=0
    expect(result.relevanceScore).toBeCloseTo(0.2, 5);
  });
});

describe("scoreFile — path proximity factor", () => {
  it("gives 1.0 proximity for same directory", () => {
    const input = makeInput({
      candidate: makeCandidate({
        path: "src/foo.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      activeFilePath: "src/active.ts",
      now: NOW,
    });
    const result = scoreFile(input);
    // proximity=1.0*0.20=0.20, others=0
    expect(result.relevanceScore).toBeCloseTo(0.2, 5);
  });

  it("gives 0.5 proximity for sibling directory", () => {
    const input = makeInput({
      candidate: makeCandidate({
        path: "src/utils/helper.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      activeFilePath: "src/components/Button.ts",
      now: NOW,
    });
    const result = scoreFile(input);
    // proximity=0.5*0.20=0.10, others=0
    expect(result.relevanceScore).toBeCloseTo(0.1, 5);
  });

  it("gives 0.0 proximity for unrelated directories", () => {
    const input = makeInput({
      candidate: makeCandidate({
        path: "lib/deep/nested/file.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      activeFilePath: "src/active.ts",
      now: NOW,
    });
    const result = scoreFile(input);
    // proximity=0, others=0
    expect(result.relevanceScore).toBeCloseTo(0.0, 5);
  });

  it("gives 0.0 proximity when no active file", () => {
    const input = makeInput({
      candidate: makeCandidate({
        path: "src/foo.ts",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      activeFilePath: null,
      now: NOW,
    });
    const result = scoreFile(input);
    expect(result.relevanceScore).toBeCloseTo(0.0, 5);
  });
});

describe("scoreFile — recency factor", () => {
  it("gives 1.0 recency for a file modified right now (age=0)", () => {
    const input = makeInput({
      candidate: makeCandidate({ path: "lib/other.ts", mtime: NOW }),
      activeFilePath: null,
      now: NOW,
    });
    const result = scoreFile(input);
    // recency=1.0*0.10=0.10, others=0
    expect(result.relevanceScore).toBeCloseTo(0.1, 5);
  });

  it("gives 0.0 recency for a file 30+ days old", () => {
    const thirtyDaysAgo = NOW - 1000 * 60 * 60 * 24 * 30;
    const input = makeInput({
      candidate: makeCandidate({ path: "lib/other.ts", mtime: thirtyDaysAgo }),
      activeFilePath: null,
      now: NOW,
    });
    const result = scoreFile(input);
    // recency=0, others=0
    expect(result.relevanceScore).toBeCloseTo(0.0, 5);
  });

  it("clamps recency to 0 for files older than 30 days", () => {
    const sixtyDaysAgo = NOW - 1000 * 60 * 60 * 24 * 60;
    const input = makeInput({
      candidate: makeCandidate({ path: "lib/other.ts", mtime: sixtyDaysAgo }),
      activeFilePath: null,
      now: NOW,
    });
    const result = scoreFile(input);
    expect(result.relevanceScore).toBeCloseTo(0.0, 5);
  });
});

describe("scoreFile — edge cases", () => {
  it("returns 0.0 for a file with no content, no active file, and old mtime", () => {
    const input = makeInput({
      candidate: makeCandidate({
        content: "",
        mtime: NOW - 1000 * 60 * 60 * 24 * 30,
      }),
      activeFilePath: null,
      requestText: "",
      now: NOW,
    });
    const result = scoreFile(input);
    expect(result.relevanceScore).toBe(0.0);
  });

  it("clamps score to 1.0 even if all factors are maxed", () => {
    // All factors at max: import=1.0, symbol=1.0, proximity=1.0, recency=1.0
    const content = "export function foo() {}";
    const input: ScorerInput = {
      candidate: { path: "src/foo.ts", content, mtime: NOW, sizeTokens: 10 },
      activeFilePath: "src/active.ts",
      requestText: "foo",
      importedPaths: new Set(["src/foo.ts"]),
      importingPaths: new Set(),
      now: NOW,
    };
    const result = scoreFile(input);
    expect(result.relevanceScore).toBeLessThanOrEqual(1.0);
    expect(result.relevanceScore).toBeGreaterThanOrEqual(0.0);
  });

  it("preserves all CandidateFile fields in the returned ScoredFile", () => {
    const candidate = makeCandidate({
      path: "src/x.ts",
      content: "// hello",
      mtime: NOW - 5000,
      sizeTokens: 42,
    });
    const input = makeInput({ candidate });
    const result = scoreFile(input);
    expect(result.path).toBe(candidate.path);
    expect(result.content).toBe(candidate.content);
    expect(result.mtime).toBe(candidate.mtime);
    expect(result.sizeTokens).toBe(candidate.sizeTokens);
  });

  it("is deterministic — same input produces same score", () => {
    const input = makeInput({
      candidate: makeCandidate({
        content: "export class MyClass {}",
        mtime: NOW - 5000,
      }),
      requestText: "MyClass usage",
      importedPaths: new Set(["src/foo.ts"]),
    });
    const r1 = scoreFile(input);
    const r2 = scoreFile(input);
    expect(r1.relevanceScore).toBe(r2.relevanceScore);
  });
});
