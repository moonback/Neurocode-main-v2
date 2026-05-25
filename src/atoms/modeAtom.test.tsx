import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useAtom } from "jotai";
import { createStore, Provider } from "jotai";
import React from "react";
import { ideModeAtom } from "./modeAtom";

describe("modeAtom", () => {
  function makeWrapper() {
    const store = createStore();
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return <Provider store={store}>{children}</Provider>;
    };
  }

  it("should default to 'build'", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useAtom(ideModeAtom), { wrapper });

    const [mode] = result.current;
    expect(mode).toBe("build");
  });

  it("should allow changing mode to 'inspect'", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useAtom(ideModeAtom), { wrapper });

    act(() => {
      const [, setMode] = result.current;
      setMode("inspect");
    });

    const [mode] = result.current;
    expect(mode).toBe("inspect");
  });

  it("should persist state across unmount and remount in same store", () => {
    const wrapper = makeWrapper();
    const first = renderHook(() => useAtom(ideModeAtom), { wrapper });

    act(() => {
      const [, setMode] = first.result.current;
      setMode("automate");
    });

    first.unmount();

    const second = renderHook(() => useAtom(ideModeAtom), { wrapper });
    const [mode] = second.result.current;
    
    expect(mode).toBe("automate");
  });
});
