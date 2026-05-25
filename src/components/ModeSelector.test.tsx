import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ModeSelector } from "./ModeSelector";
import { createStore, Provider } from "jotai";
import React from "react";

describe("ModeSelector", () => {
  function renderWithStore(ui: React.ReactElement) {
    const store = createStore();
    return {
      ...render(<Provider store={store}>{ui}</Provider>),
      store,
    };
  }

  it("renders all three mode buttons", () => {
    renderWithStore(<ModeSelector />);
    expect(screen.getByRole("tab", { name: /Build:/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Inspect:/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Automate:/i })).toBeInTheDocument();
  });

  it("defaults to 'build' mode as active", () => {
    renderWithStore(<ModeSelector />);
    const buildTab = screen.getByRole("tab", { name: /Build:/i });
    expect(buildTab).toHaveAttribute("aria-selected", "true");
  });

  it("switches to 'inspect' when clicked", () => {
    renderWithStore(<ModeSelector />);
    const inspectTab = screen.getByRole("tab", { name: /Inspect:/i });
    const buildTab = screen.getByRole("tab", { name: /Build:/i });
    
    fireEvent.click(inspectTab);
    
    expect(inspectTab).toHaveAttribute("aria-selected", "true");
    expect(buildTab).toHaveAttribute("aria-selected", "false");
  });
});
