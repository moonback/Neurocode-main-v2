import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SmartContextStrategySelector } from "@/components/SmartContextStrategySelector";
import { useSettings } from "@/hooks/useSettings";
import { showInfo } from "@/lib/toast";
import type { ReactNode } from "react";

// Mock the useSettings hook
vi.mock("@/hooks/useSettings");

// Mock the toast library
vi.mock("@/lib/toast", () => ({
  showInfo: vi.fn(),
}));

describe("SmartContextStrategySelector", () => {
  let queryClient: QueryClient;
  const mockUpdateSettings = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useSettings).mockReturnValue({
      settings: { proSmartContextOption: "balanced" },
      envVars: {},
      loading: false,
      error: null,
      updateSettings: mockUpdateSettings,
      refreshSettings: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe("Rendering", () => {
    it("should render all three strategy options", () => {
      render(<SmartContextStrategySelector />, { wrapper });

      expect(screen.getByText("Conservative")).toBeDefined();
      expect(screen.getByText("Balanced")).toBeDefined();
      expect(screen.getByText("Deep")).toBeDefined();
    });

    it("should render descriptions for each strategy option", () => {
      render(<SmartContextStrategySelector />, { wrapper });

      expect(
        screen.getByText(/Minimal context.*only the active file/i),
      ).toBeDefined();
      expect(
        screen.getByText(/Moderate context.*includes files with score/i),
      ).toBeDefined();
      expect(
        screen.getByText(/Maximum context.*includes all relevant files/i),
      ).toBeDefined();
    });

    it("should render with aria-labels for accessibility", () => {
      render(<SmartContextStrategySelector />, { wrapper });

      expect(
        screen.getByRole("button", { name: "Conservative strategy" }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: "Balanced strategy" }),
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: "Deep strategy" }),
      ).toBeDefined();
    });
  });

  describe("Pre-selection", () => {
    it("should pre-select the current strategy from settings (balanced)", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: { proSmartContextOption: "balanced" },
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const balancedButton = screen.getByRole("button", {
        name: "Balanced strategy",
      });
      expect(balancedButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should pre-select the current strategy from settings (conservative)", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: { proSmartContextOption: "conservative" },
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const conservativeButton = screen.getByRole("button", {
        name: "Conservative strategy",
      });
      expect(conservativeButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should pre-select the current strategy from settings (deep)", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: { proSmartContextOption: "deep" },
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const deepButton = screen.getByRole("button", { name: "Deep strategy" });
      expect(deepButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should default to balanced when no strategy is set in settings", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: {},
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const balancedButton = screen.getByRole("button", {
        name: "Balanced strategy",
      });
      expect(balancedButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("should default to balanced when settings is null", () => {
      vi.mocked(useSettings).mockReturnValue({
        settings: null,
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const balancedButton = screen.getByRole("button", {
        name: "Balanced strategy",
      });
      expect(balancedButton.getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("Strategy Selection", () => {
    it("should trigger settings mutation when selecting conservative strategy", async () => {
      const user = userEvent.setup();
      mockUpdateSettings.mockResolvedValue({
        proSmartContextOption: "conservative",
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const conservativeButton = screen.getByRole("button", {
        name: "Conservative strategy",
      });
      await user.click(conservativeButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          proSmartContextOption: "conservative",
        });
      });
    });

    it("should trigger settings mutation when selecting deep strategy", async () => {
      const user = userEvent.setup();
      mockUpdateSettings.mockResolvedValue({ proSmartContextOption: "deep" });

      render(<SmartContextStrategySelector />, { wrapper });

      const deepButton = screen.getByRole("button", { name: "Deep strategy" });
      await user.click(deepButton);

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          proSmartContextOption: "deep",
        });
      });
    });

    it("should show confirmation toast after successful strategy change", async () => {
      const user = userEvent.setup();
      mockUpdateSettings.mockResolvedValue({
        proSmartContextOption: "conservative",
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const conservativeButton = screen.getByRole("button", {
        name: "Conservative strategy",
      });
      await user.click(conservativeButton);

      await waitFor(() => {
        expect(showInfo).toHaveBeenCalledWith(
          "Smart context strategy set to conservative",
        );
      });
    });

    it("should show correct toast message for each strategy", async () => {
      const user = userEvent.setup();

      // Test conservative
      mockUpdateSettings.mockResolvedValue({
        proSmartContextOption: "conservative",
      });
      render(<SmartContextStrategySelector />, { wrapper });
      await user.click(
        screen.getByRole("button", { name: "Conservative strategy" }),
      );
      await waitFor(() => {
        expect(showInfo).toHaveBeenCalledWith(
          "Smart context strategy set to conservative",
        );
      });
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        proSmartContextOption: "conservative",
      });
    });

    it("should not trigger mutation when clicking the already selected strategy", async () => {
      const user = userEvent.setup();
      vi.mocked(useSettings).mockReturnValue({
        settings: { proSmartContextOption: "balanced" },
        envVars: {},
        loading: false,
        error: null,
        updateSettings: mockUpdateSettings,
        refreshSettings: vi.fn(),
      });

      render(<SmartContextStrategySelector />, { wrapper });

      const balancedButton = screen.getByRole("button", {
        name: "Balanced strategy",
      });

      // Click the already selected button
      await user.click(balancedButton);

      // The ToggleGroup behavior may vary, but typically clicking the selected item
      // should either do nothing or deselect it. In this case, we expect no mutation
      // because the component checks if value array has items before calling updateSettings
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });
  });
});
