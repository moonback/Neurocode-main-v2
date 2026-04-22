import { renderHook, act, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import type { PropsWithChildren } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { matchedSkillsAtom, dismissedSkillsAtom } from "@/atoms/chatAtoms";
import { useSkillContextMatcher } from "@/hooks/useSkillContextMatcher";
import type { Skill } from "@/ipc/types/skills";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { listMock } = vi.hoisted(() => ({
  listMock: vi.fn<() => Promise<Skill[]>>(),
}));

vi.mock("@/ipc/types", () => ({
  ipc: {
    skills: {
      list: listMock,
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(Provider, { store }, children);
  };
}

const sampleSkill: Skill = {
  name: "lint",
  description: "Run linting and formatting checks before committing",
  content: "# Lint\nRun checks.",
  scope: "user",
  path: "/skills/lint/SKILL.md",
  namespace: undefined,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSkillContextMatcher", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    listMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resets matchedSkillsAtom to [] immediately on analyzeContext call", async () => {
    // Pre-populate the atom with stale data
    store.set(matchedSkillsAtom, [
      { skill: sampleSkill, relevance: 0.9, reason: "stale" },
    ]);

    listMock.mockResolvedValue([]);

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext("run linting");
    });

    // Should be reset synchronously
    expect(store.get(matchedSkillsAtom)).toEqual([]);
  });

  it("populates matchedSkillsAtom with matched skills after async resolution", async () => {
    listMock.mockResolvedValue([sampleSkill]);

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext(
        "I need to run linting checks before committing",
      );
    });

    await waitFor(() => {
      const matches = store.get(matchedSkillsAtom);
      expect(matches.length).toBeGreaterThan(0);
    });

    const matches = store.get(matchedSkillsAtom);
    expect(matches[0].skill.name).toBe("lint");
    expect(matches[0].relevance).toBeGreaterThan(0);
  });

  it("does nothing when message is empty", async () => {
    listMock.mockResolvedValue([sampleSkill]);

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext("   ");
    });

    // list should not be called for empty messages
    expect(listMock).not.toHaveBeenCalled();
    expect(store.get(matchedSkillsAtom)).toEqual([]);
  });

  it("leaves matchedSkillsAtom empty when no skills are registered", async () => {
    listMock.mockResolvedValue([]);

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext("run linting checks");
    });

    await waitFor(() => {
      expect(listMock).toHaveBeenCalledOnce();
    });

    expect(store.get(matchedSkillsAtom)).toEqual([]);
  });

  it("silently ignores IPC errors and leaves matchedSkillsAtom empty", async () => {
    listMock.mockRejectedValue(new Error("IPC failure"));

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext("run linting checks");
    });

    await waitFor(() => {
      expect(listMock).toHaveBeenCalledOnce();
    });

    // Should not throw and atom should remain empty
    expect(store.get(matchedSkillsAtom)).toEqual([]);
  });

  it("filters out dismissed skills from matched results", async () => {
    const skill1: Skill = {
      ...sampleSkill,
      name: "lint",
      description: "Run linting checks",
    };
    const skill2: Skill = {
      ...sampleSkill,
      name: "format",
      description: "Run formatting checks",
    };

    listMock.mockResolvedValue([skill1, skill2]);

    // Pre-populate dismissedSkills with skill1
    store.set(dismissedSkillsAtom, new Map([["lint", Date.now()]]));

    const wrapper = makeWrapper(store);
    const { result } = renderHook(() => useSkillContextMatcher(), { wrapper });

    act(() => {
      result.current.analyzeContext("run linting and formatting checks");
    });

    await waitFor(() => {
      const matches = store.get(matchedSkillsAtom);
      expect(matches.length).toBeGreaterThan(0);
    });

    const matches = store.get(matchedSkillsAtom);

    // Should only contain skill2 (format), not skill1 (lint) which was dismissed
    expect(matches.some((m) => m.skill.name === "lint")).toBe(false);
    expect(matches.some((m) => m.skill.name === "format")).toBe(true);
  });
});
