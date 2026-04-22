import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import {
  selectCandidateFiles,
  matchesByKeyword,
} from "../context_manager/file_selector";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/main/settings", () => ({
  readSettings: vi.fn(),
}));

vi.mock("../utils/codebase", () => ({
  collectFilesNativeGit: vi.fn(),
  collectFilesIsoGit: vi.fn(),
  readFileWithCache: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi.fn(),
  },
}));

import { readSettings } from "@/main/settings";
import {
  collectFilesNativeGit,
  collectFilesIsoGit,
  readFileWithCache,
} from "../utils/codebase";
import fsAsync from "node:fs/promises";

const APP_PATH = "/workspace";
const NOW_MS = 1_700_000_000_000;

function mockSettings(enableNativeGit = false) {
  vi.mocked(readSettings).mockReturnValue({
    enableNativeGit,
  } as ReturnType<typeof readSettings>);
}

function mockFiles(files: Record<string, { content: string; mtime?: number }>) {
  const absolutePaths = Object.keys(files).map((rel) =>
    path.join(APP_PATH, rel).split(path.sep).join("/"),
  );

  vi.mocked(collectFilesIsoGit).mockResolvedValue(absolutePaths);
  vi.mocked(collectFilesNativeGit).mockResolvedValue(absolutePaths);

  vi.mocked(fsAsync.stat).mockImplementation(async (p) => {
    const rel = path
      .relative(APP_PATH, p as string)
      .split(path.sep)
      .join("/");
    const file = files[rel];
    return { mtimeMs: file?.mtime ?? NOW_MS } as never;
  });

  vi.mocked(readFileWithCache).mockImplementation(async (p) => {
    const rel = path
      .relative(APP_PATH, p as string)
      .split(path.sep)
      .join("/");
    const file = files[rel];
    if (!file) return undefined;
    return file.content;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings(false);
});

// ─── matchesByKeyword (pure helper) ─────────────────────────────────────────

describe("matchesByKeyword", () => {
  it("matches when keyword equals the basename (no extension)", () => {
    expect(matchesByKeyword("src/auth.ts", "", new Set(["auth"]))).toBe(true);
  });

  it("matches when keyword is a substring of the basename", () => {
    expect(matchesByKeyword("src/authUtils.ts", "", new Set(["auth"]))).toBe(
      true,
    );
  });

  it("matches when keyword appears in a directory segment", () => {
    expect(matchesByKeyword("src/auth/index.ts", "", new Set(["auth"]))).toBe(
      true,
    );
  });

  it("matches when keyword matches an exported symbol", () => {
    const content = "export function authenticate() {}";
    expect(
      matchesByKeyword("src/unrelated.ts", content, new Set(["authenticate"])),
    ).toBe(true);
  });

  it("does NOT match when keyword is absent from path and exports", () => {
    const content = "export function doSomething() {}";
    expect(
      matchesByKeyword("src/unrelated.ts", content, new Set(["auth"])),
    ).toBe(false);
  });

  it("returns false for empty keyword set", () => {
    expect(
      matchesByKeyword("src/auth.ts", "export function auth() {}", new Set()),
    ).toBe(false);
  });

  it("is case-insensitive for exported symbols", () => {
    const content = "export class AuthService {}";
    expect(
      matchesByKeyword("src/x.ts", content, new Set(["authservice"])),
    ).toBe(true);
  });
});

// ─── selectCandidateFiles — basic collection ─────────────────────────────────

describe("selectCandidateFiles — basic collection", () => {
  it("returns CandidateFile[] with relative paths, content, mtime, sizeTokens", async () => {
    mockFiles({
      "src/foo.ts": { content: "export const x = 1;", mtime: NOW_MS },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "foo",
      chatContext: {} as never,
    });

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/foo.ts");
    expect(result[0].content).toBe("export const x = 1;");
    expect(result[0].mtime).toBe(NOW_MS);
    expect(result[0].sizeTokens).toBeGreaterThan(0);
  });

  it("uses collectFilesNativeGit when enableNativeGit is true", async () => {
    mockSettings(true);
    mockFiles({ "src/a.ts": { content: "// a" } });

    await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "a",
      chatContext: {} as never,
    });

    expect(collectFilesNativeGit).toHaveBeenCalledWith(APP_PATH);
    expect(collectFilesIsoGit).not.toHaveBeenCalled();
  });

  it("uses collectFilesIsoGit when enableNativeGit is false", async () => {
    mockSettings(false);
    mockFiles({ "src/a.ts": { content: "// a" } });

    await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "a",
      chatContext: {} as never,
    });

    expect(collectFilesIsoGit).toHaveBeenCalledWith(APP_PATH, APP_PATH);
    expect(collectFilesNativeGit).not.toHaveBeenCalled();
  });
});

// ─── selectCandidateFiles — import graph traversal ───────────────────────────

describe("selectCandidateFiles — import graph traversal", () => {
  it("includes files imported by the active file", async () => {
    mockFiles({
      "src/active.ts": {
        content: `import { helper } from './utils/helper';`,
        mtime: NOW_MS,
      },
      "src/utils/helper.ts": {
        content: "export function helper() {}",
        mtime: NOW_MS,
      },
      "src/unrelated.ts": {
        content: "export const x = 1;",
        mtime: NOW_MS,
      },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/active.ts",
      requestText: "",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/utils/helper.ts");
    // unrelated is still returned (all files are candidates when active file is set)
    expect(paths).toContain("src/unrelated.ts");
  });

  it("handles require() statements for import detection", async () => {
    mockFiles({
      "src/active.ts": {
        content: `const lib = require('./lib/utils');`,
        mtime: NOW_MS,
      },
      "src/lib/utils.ts": {
        content: "module.exports = {};",
        mtime: NOW_MS,
      },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/active.ts",
      requestText: "",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/lib/utils.ts");
  });

  it("returns all workspace files when active file is set (no keyword filtering)", async () => {
    mockFiles({
      "src/active.ts": { content: "// no imports", mtime: NOW_MS },
      "src/totally_unrelated.ts": {
        content: "export const z = 99;",
        mtime: NOW_MS,
      },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/active.ts",
      requestText: "something completely different",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/totally_unrelated.ts");
  });
});

// ─── selectCandidateFiles — keyword fallback (no active file) ────────────────

describe("selectCandidateFiles — keyword fallback", () => {
  it("includes files whose basename matches a request keyword", async () => {
    mockFiles({
      "src/auth.ts": { content: "export function login() {}", mtime: NOW_MS },
      "src/database.ts": {
        content: "export function query() {}",
        mtime: NOW_MS,
      },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "auth login",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/auth.ts");
    expect(paths).not.toContain("src/database.ts");
  });

  it("includes files whose exported symbol matches a request keyword", async () => {
    mockFiles({
      "src/services.ts": {
        content: "export function authenticate(user: string) {}",
        mtime: NOW_MS,
      },
      "src/models.ts": {
        content: "export class UserModel {}",
        mtime: NOW_MS,
      },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "authenticate",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/services.ts");
    expect(paths).not.toContain("src/models.ts");
  });

  it("returns empty array when no files match keywords", async () => {
    mockFiles({
      "src/foo.ts": { content: "export const bar = 1;", mtime: NOW_MS },
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "zzznomatchzzz",
      chatContext: {} as never,
    });

    expect(result).toHaveLength(0);
  });
});

// ─── selectCandidateFiles — unreadable file skipping ─────────────────────────

describe("selectCandidateFiles — unreadable file skipping", () => {
  it("skips files that readFileWithCache returns undefined for", async () => {
    const absoluteA = path
      .join(APP_PATH, "src/readable.ts")
      .split(path.sep)
      .join("/");
    const absoluteB = path
      .join(APP_PATH, "src/binary.bin")
      .split(path.sep)
      .join("/");

    vi.mocked(collectFilesIsoGit).mockResolvedValue([absoluteA, absoluteB]);
    vi.mocked(fsAsync.stat).mockResolvedValue({ mtimeMs: NOW_MS } as never);

    vi.mocked(readFileWithCache).mockImplementation(async (p) => {
      if ((p as string).endsWith("readable.ts")) return "export const x = 1;";
      return undefined;
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/readable.ts",
      requestText: "",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/readable.ts");
    expect(paths).not.toContain("src/binary.bin");
  });

  it("skips files where stat throws (permission denied)", async () => {
    const absoluteA = path
      .join(APP_PATH, "src/ok.ts")
      .split(path.sep)
      .join("/");
    const absoluteB = path
      .join(APP_PATH, "src/noperm.ts")
      .split(path.sep)
      .join("/");

    vi.mocked(collectFilesIsoGit).mockResolvedValue([absoluteA, absoluteB]);

    vi.mocked(fsAsync.stat).mockImplementation(async (p) => {
      if ((p as string).endsWith("noperm.ts"))
        throw new Error("EACCES: permission denied");
      return { mtimeMs: NOW_MS } as never;
    });

    vi.mocked(readFileWithCache).mockImplementation(async (p) => {
      if ((p as string).endsWith("ok.ts")) return "export const ok = true;";
      return undefined;
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/ok.ts",
      requestText: "",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/ok.ts");
    expect(paths).not.toContain("src/noperm.ts");
  });

  it("continues processing remaining files after encountering an unreadable file", async () => {
    const files = ["src/a.ts", "src/bad.ts", "src/c.ts"].map((rel) =>
      path.join(APP_PATH, rel).split(path.sep).join("/"),
    );

    vi.mocked(collectFilesIsoGit).mockResolvedValue(files);
    vi.mocked(fsAsync.stat).mockResolvedValue({ mtimeMs: NOW_MS } as never);

    vi.mocked(readFileWithCache).mockImplementation(async (p) => {
      if ((p as string).endsWith("bad.ts")) return undefined;
      return "export const x = 1;";
    });

    const result = await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: "src/a.ts",
      requestText: "",
      chatContext: {} as never,
    });

    const paths = result.map((f) => f.path);
    expect(paths).toContain("src/a.ts");
    expect(paths).toContain("src/c.ts");
    expect(paths).not.toContain("src/bad.ts");
  });
});

// ─── selectCandidateFiles — 500ms performance constraint ─────────────────────

describe("selectCandidateFiles — performance constraint (Req 1.4)", () => {
  it("completes within 500ms for a workspace of 1000 files", async () => {
    // Build 1000 mock files
    const fileMap: Record<string, { content: string; mtime: number }> = {};
    for (let i = 0; i < 1000; i++) {
      fileMap[`src/file${i}.ts`] = {
        content: `export const value${i} = ${i};`,
        mtime: NOW_MS - i * 1000,
      };
    }
    mockFiles(fileMap);

    const start = Date.now();
    await selectCandidateFiles({
      appPath: APP_PATH,
      activeFilePath: null,
      requestText: "value0",
      chatContext: {} as never,
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
  });
});
