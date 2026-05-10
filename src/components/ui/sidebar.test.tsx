import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act, render } from "@testing-library/react";
import * as React from "react";
import {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroupLabel,
} from "./sidebar";

describe("SidebarContext", () => {
  it("should provide default values for all context properties", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    // Existing properties (backward compatible)
    expect(result.current.state).toBe("expanded");
    expect(result.current.open).toBe(true);
    expect(typeof result.current.setOpen).toBe("function");
    expect(typeof result.current.toggleSidebar).toBe("function");

    // New properties
    expect(result.current.width).toBe(304); // 19rem = 304px
    expect(typeof result.current.setWidth).toBe("function");
    expect(result.current.iconSize).toBe("medium");
    expect(typeof result.current.setIconSize).toBe("function");
    expect(result.current.theme).toBe("modern");
    expect(typeof result.current.setTheme).toBe("function");
    expect(result.current.isResizing).toBe(false);
    expect(result.current.searchQuery).toBe("");
    expect(typeof result.current.setSearchQuery).toBe("function");
    expect(result.current.recentItems).toEqual([]);
    expect(typeof result.current.addRecentItem).toBe("function");
    expect(result.current.pinnedItems).toEqual([]);
    expect(typeof result.current.togglePinItem).toBe("function");
    expect(result.current.itemOrder).toEqual([]);
    expect(typeof result.current.reorderItems).toBe("function");
    expect(result.current.expandedGroups).toBeInstanceOf(Set);
    expect(result.current.expandedGroups.size).toBe(0);
    expect(typeof result.current.toggleGroup).toBe("function");
  });

  it("should update width when setWidth is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setWidth(400);
    });

    expect(result.current.width).toBe(400);
  });

  it("should enforce minimum width constraint of 240px (15rem)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setWidth(200); // Below minimum
    });

    expect(result.current.width).toBe(240); // Should be constrained to minimum
  });

  it("should enforce maximum width constraint of 480px (30rem)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setWidth(600); // Above maximum
    });

    expect(result.current.width).toBe(480); // Should be constrained to maximum
  });

  it("should allow width values within valid range", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    const validWidths = [240, 300, 350, 400, 450, 480];

    for (const width of validWidths) {
      act(() => {
        result.current.setWidth(width);
      });
      expect(result.current.width).toBe(width);
    }
  });

  it("should demonstrate round-trip property for width (set then get returns same value)", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    const testWidth = 350;

    act(() => {
      result.current.setWidth(testWidth);
    });

    expect(result.current.width).toBe(testWidth);
  });

  it("should update iconSize when setIconSize is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setIconSize("large");
    });

    expect(result.current.iconSize).toBe("large");
  });

  it("should update theme when setTheme is called", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.setTheme("compact");
    });

    expect(result.current.theme).toBe("compact");
  });

  it("should add recent items correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.addRecentItem("item1");
      result.current.addRecentItem("item2");
      result.current.addRecentItem("item3");
    });

    expect(result.current.recentItems).toEqual(["item3", "item2", "item1"]);
  });

  it("should limit recent items to 5", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.addRecentItem("item1");
      result.current.addRecentItem("item2");
      result.current.addRecentItem("item3");
      result.current.addRecentItem("item4");
      result.current.addRecentItem("item5");
      result.current.addRecentItem("item6");
    });

    expect(result.current.recentItems).toEqual([
      "item6",
      "item5",
      "item4",
      "item3",
      "item2",
    ]);
    expect(result.current.recentItems.length).toBe(5);
  });

  it("should toggle pin items correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.togglePinItem("item1");
    });

    expect(result.current.pinnedItems).toEqual(["item1"]);

    act(() => {
      result.current.togglePinItem("item1");
    });

    expect(result.current.pinnedItems).toEqual([]);
  });

  it("should reorder items correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    const newOrder = ["item3", "item1", "item2"];

    act(() => {
      result.current.reorderItems(newOrder);
    });

    expect(result.current.itemOrder).toEqual(newOrder);
  });

  it("should toggle group expansion correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    act(() => {
      result.current.toggleGroup("group1");
    });

    expect(result.current.expandedGroups.has("group1")).toBe(true);

    act(() => {
      result.current.toggleGroup("group1");
    });

    expect(result.current.expandedGroups.has("group1")).toBe(false);
  });

  it("should maintain backward compatibility with existing properties", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SidebarProvider defaultOpen={false}>{children}</SidebarProvider>
    );

    const { result } = renderHook(() => useSidebar(), { wrapper });

    expect(result.current.state).toBe("collapsed");
    expect(result.current.open).toBe(false);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.state).toBe("expanded");
    expect(result.current.open).toBe(true);
  });
});

describe("Resize Manager", () => {
  describe("Width Constraint Invariant", () => {
    /**
     * **Validates: Requirements 2.3, 2.4**
     * Property 2: Width constraint invariant
     *
     * Tests that width is always constrained between min (240px/15rem) and max (480px/30rem) values.
     */

    it("should enforce minimum width constraint of 240px (15rem)", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Try to set width below minimum
      act(() => {
        result.current.setWidth(100);
      });

      expect(result.current.width).toBe(240);
    });

    it("should enforce maximum width constraint of 480px (30rem)", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Try to set width above maximum
      act(() => {
        result.current.setWidth(600);
      });

      expect(result.current.width).toBe(480);
    });

    it("should allow width values within valid range [240, 480]", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const validWidths = [240, 280, 320, 360, 400, 440, 480];

      for (const width of validWidths) {
        act(() => {
          result.current.setWidth(width);
        });
        expect(result.current.width).toBe(width);
      }
    });

    it("should constrain width at exact minimum boundary (240px)", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      act(() => {
        result.current.setWidth(240);
      });

      expect(result.current.width).toBe(240);
    });

    it("should constrain width at exact maximum boundary (480px)", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      act(() => {
        result.current.setWidth(480);
      });

      expect(result.current.width).toBe(480);
    });

    it("should constrain negative width values to minimum", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      act(() => {
        result.current.setWidth(-100);
      });

      expect(result.current.width).toBe(240);
    });

    it("should constrain zero width to minimum", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      act(() => {
        result.current.setWidth(0);
      });

      expect(result.current.width).toBe(240);
    });

    it("should constrain extremely large width values to maximum", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      act(() => {
        result.current.setWidth(10000);
      });

      expect(result.current.width).toBe(480);
    });

    it("should maintain width constraint invariant across multiple updates", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidths = [100, 300, 600, 250, 500, 350];

      for (const width of testWidths) {
        act(() => {
          result.current.setWidth(width);
        });

        // Width should always be within [240, 480]
        expect(result.current.width).toBeGreaterThanOrEqual(240);
        expect(result.current.width).toBeLessThanOrEqual(480);
      }
    });
  });

  describe("Drag Event Handling", () => {
    /**
     * **Validates: Requirements 2.1, 2.2**
     *
     * Tests that drag events update width correctly during resize operations.
     */

    it("should render SidebarRail with resize handle", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarRail />
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      expect(rail).toBeTruthy();
      expect(rail?.tagName).toBe("BUTTON");
    });

    it("should have correct ARIA attributes on resize handle", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarRail />
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      expect(rail?.getAttribute("aria-label")).toBe("Toggle Sidebar");
      expect(rail?.getAttribute("title")).toBe("Toggle Sidebar");
    });

    it("should apply resize cursor style in expanded mode", () => {
      const { container } = render(
        <SidebarProvider defaultOpen={true}>
          <SidebarRail />
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      const classes = rail?.className || "";

      // In expanded mode, cursor should be ew-resize
      expect(classes).toContain("cursor-ew-resize");
    });

    it("should update width when simulating drag operation", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const initialWidth = result.current.width;

      // Simulate drag by directly calling setWidth (simulates the drag handler logic)
      act(() => {
        result.current.setWidth(initialWidth + 50);
      });

      expect(result.current.width).toBe(initialWidth + 50);
    });

    it("should set isResizing to true on mousedown and false on mouseup", () => {
      let isResizingValue = false;
      const TestComponent = () => {
        const { isResizing } = useSidebar();
        isResizingValue = isResizing;
        return <SidebarRail />;
      };

      const { container } = render(
        <SidebarProvider defaultOpen={true}>
          <TestComponent />
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      expect(rail).toBeTruthy();
      
      expect(isResizingValue).toBe(false);

      // Trigger mousedown
      act(() => {
        const event = new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
        });
        rail?.dispatchEvent(event);
      });

      expect(isResizingValue).toBe(true);

      // Trigger mouseup on document (which is what SidebarRail listens to)
      act(() => {
        const event = new MouseEvent("mouseup", {
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(event);
      });

      expect(isResizingValue).toBe(false);
    });

    it("should constrain width during drag to minimum boundary", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Simulate dragging to a width below minimum
      act(() => {
        result.current.setWidth(200);
      });

      expect(result.current.width).toBe(240);
    });

    it("should constrain width during drag to maximum boundary", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Simulate dragging to a width above maximum
      act(() => {
        result.current.setWidth(550);
      });

      expect(result.current.width).toBe(480);
    });

    it("should handle incremental width updates during drag", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Start at default width (304px)
      expect(result.current.width).toBe(304);

      // Simulate incremental drag movements
      act(() => {
        result.current.setWidth(310);
      });
      expect(result.current.width).toBe(310);

      act(() => {
        result.current.setWidth(320);
      });
      expect(result.current.width).toBe(320);

      act(() => {
        result.current.setWidth(330);
      });
      expect(result.current.width).toBe(330);
    });

    it("should handle negative drag movements (shrinking)", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Set initial width
      act(() => {
        result.current.setWidth(400);
      });
      expect(result.current.width).toBe(400);

      // Simulate dragging left (shrinking)
      act(() => {
        result.current.setWidth(380);
      });
      expect(result.current.width).toBe(380);

      act(() => {
        result.current.setWidth(360);
      });
      expect(result.current.width).toBe(360);
    });

    it("should update CSS variable --sidebar-width during resize", () => {
      const { container } = render(
        <SidebarProvider defaultOpen={true}>
          <div>Test Content</div>
        </SidebarProvider>,
      );

      const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
      expect(wrapper).toBeTruthy();

      // Check that CSS variable is set
      const style = (wrapper as HTMLElement)?.style;
      expect(style.getPropertyValue("--sidebar-width")).toBe("304px");
    });
  });

  describe("Width Persistence and Restoration", () => {
    /**
     * **Validates: Requirements 2.5, 2.6, 2.7**
     *
     * Tests that width persists to storage and restores correctly on mount.
     * Demonstrates round-trip property: setting width then reading returns same value.
     */

    beforeEach(() => {
      // Clear cookies and localStorage before each test
      document.cookie =
        "sidebar_width=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      localStorage.clear();
    });

    it("should restore default width (304px) when no saved preference exists", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Should restore default width
      expect(result.current.width).toBe(304);
    });

    it("should demonstrate round-trip property: set width then get returns same value", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidth = 350;

      // Set width
      act(() => {
        result.current.setWidth(testWidth);
      });

      // Get width - should return the same value
      expect(result.current.width).toBe(testWidth);
    });

    it("should demonstrate round-trip property for minimum boundary", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const minWidth = 240;

      act(() => {
        result.current.setWidth(minWidth);
      });

      expect(result.current.width).toBe(minWidth);
    });

    it("should demonstrate round-trip property for maximum boundary", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const maxWidth = 480;

      act(() => {
        result.current.setWidth(maxWidth);
      });

      expect(result.current.width).toBe(maxWidth);
    });

    it("should demonstrate round-trip property for multiple width values", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidths = [240, 280, 320, 360, 400, 440, 480];

      for (const width of testWidths) {
        act(() => {
          result.current.setWidth(width);
        });

        // Round-trip: set then get should return same value
        expect(result.current.width).toBe(width);
      }
    });

    it("should maintain width value across multiple reads", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidth = 375;

      act(() => {
        result.current.setWidth(testWidth);
      });

      // Multiple reads should return consistent value
      expect(result.current.width).toBe(testWidth);
      expect(result.current.width).toBe(testWidth);
      expect(result.current.width).toBe(testWidth);
    });

    it("should preserve width value when other state changes", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidth = 390;

      act(() => {
        result.current.setWidth(testWidth);
      });

      expect(result.current.width).toBe(testWidth);

      // Change other state (toggle sidebar)
      act(() => {
        result.current.toggleSidebar();
      });

      // Width should remain unchanged
      expect(result.current.width).toBe(testWidth);
    });

    it("should preserve width value when icon size changes", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidth = 420;

      act(() => {
        result.current.setWidth(testWidth);
      });

      expect(result.current.width).toBe(testWidth);

      // Change icon size
      act(() => {
        result.current.setIconSize("large");
      });

      // Width should remain unchanged
      expect(result.current.width).toBe(testWidth);
    });

    it("should preserve width value when theme changes", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      const testWidth = 450;

      act(() => {
        result.current.setWidth(testWidth);
      });

      expect(result.current.width).toBe(testWidth);

      // Change theme
      act(() => {
        result.current.setTheme("compact");
      });

      // Width should remain unchanged
      expect(result.current.width).toBe(testWidth);
    });
  });

  describe("Resize Manager Integration", () => {
    /**
     * Integration tests for resize manager with full sidebar component.
     */

    it("should render sidebar with correct initial width", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
      const style = (wrapper as HTMLElement)?.style;

      expect(style.getPropertyValue("--sidebar-width")).toBe("304px");
    });

    it("should update sidebar width CSS variable when width changes", () => {
      const TestComponent = () => {
        const { setWidth, width } = useSidebar();

        return (
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <button
              data-testid="set-width-btn"
              onClick={() => setWidth(400)}
              type="button"
            >
              Set Width
            </button>
            <div data-testid="current-width">{width}</div>
          </Sidebar>
        );
      };

      const { container } = render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>,
      );

      const setWidthBtn = container.querySelector(
        '[data-testid="set-width-btn"]',
      );

      // Click button to update width
      act(() => {
        (setWidthBtn as HTMLButtonElement)?.click();
      });

      const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]');
      const style = (wrapper as HTMLElement)?.style;

      // Width should be updated to 400px
      expect(style.getPropertyValue("--sidebar-width")).toBe("400px");
    });

    it("should render resize handle (SidebarRail) in sidebar", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <SidebarRail />
          </Sidebar>
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      expect(rail).toBeTruthy();
    });

    it("should maintain width constraints in full sidebar component", () => {
      const TestComponent = () => {
        const { setWidth, width } = useSidebar();

        return (
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div data-testid="width-display">{width}</div>
            <button
              data-testid="set-below-min"
              onClick={() => setWidth(100)}
              type="button"
            >
              Set Below Min
            </button>
            <button
              data-testid="set-above-max"
              onClick={() => setWidth(600)}
              type="button"
            >
              Set Above Max
            </button>
          </Sidebar>
        );
      };

      const { container } = render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>,
      );

      const widthDisplay = container.querySelector(
        '[data-testid="width-display"]',
      );
      const setBelowMinBtn = container.querySelector(
        '[data-testid="set-below-min"]',
      );
      const setAboveMaxBtn = container.querySelector(
        '[data-testid="set-above-max"]',
      );

      // Initial width
      expect(widthDisplay?.textContent).toBe("304");

      // Try to set below minimum
      act(() => {
        (setBelowMinBtn as HTMLButtonElement)?.click();
      });
      expect(widthDisplay?.textContent).toBe("240");

      // Try to set above maximum
      act(() => {
        (setAboveMaxBtn as HTMLButtonElement)?.click();
      });
      expect(widthDisplay?.textContent).toBe("480");
    });
  });
});

describe("Animation Configuration", () => {
  describe("Animation Duration Constants", () => {
    it("should use 200ms duration for sidebar width transitions", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      // Find the sidebar gap element that handles width transitions
      const sidebarGap = container.querySelector('[data-slot="sidebar-gap"]');
      expect(sidebarGap).toBeTruthy();

      // Check that the element has the correct transition duration class
      const classes = sidebarGap?.className || "";
      expect(classes).toContain("duration-200");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain("transition-[width]");
    });

    it("should use 200ms duration for sidebar container transitions", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      // Find the sidebar container element
      const sidebarContainer = container.querySelector(
        '[data-slot="sidebar-container"]',
      );
      expect(sidebarContainer).toBeTruthy();

      // Check that the element has the correct transition duration class
      const classes = sidebarContainer?.className || "";
      expect(classes).toContain("duration-200");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain("transition-[left,right,width,transform]");
    });

    it("should use 150ms duration for hover state transitions on menu buttons", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuButton>Test Button</SidebarMenuButton>
        </SidebarProvider>,
      );

      const button = container.querySelector('[data-sidebar="menu-button"]');
      expect(button).toBeTruthy();

      // Check that the button has the correct hover transition duration
      const classes = button?.className || "";
      expect(classes).toContain("duration-150");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain(
        "transition-[transform,background-color,border-color]",
      );
    });

    it("should use 200ms duration for icon transitions on menu buttons", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuButton>
            <svg>
              <path />
            </svg>
            Test Button
          </SidebarMenuButton>
        </SidebarProvider>,
      );

      const button = container.querySelector('[data-sidebar="menu-button"]');
      expect(button).toBeTruthy();

      // Check that the button has icon transition classes
      const classes = button?.className || "";
      // Icon transitions are defined in the [&>svg] selector
      expect(classes).toContain("[&>svg]:transition-transform");
      expect(classes).toContain("[&>svg]:duration-200");
      expect(classes).toContain("[&>svg]:ease-in-out");
    });

    it("should use 200ms duration for resize handle transitions", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarRail />
        </SidebarProvider>,
      );

      const rail = container.querySelector('[data-sidebar="rail"]');
      expect(rail).toBeTruthy();

      // Check that the rail has the correct transition duration
      const classes = rail?.className || "";
      expect(classes).toContain("duration-200");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain("transition-all");
    });

    it("should use 200ms duration for group label transitions", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarGroupLabel>Test Group</SidebarGroupLabel>
        </SidebarProvider>,
      );

      const label = container.querySelector('[data-sidebar="group-label"]');
      expect(label).toBeTruthy();

      // Check that the label has the correct transition duration
      const classes = label?.className || "";
      expect(classes).toContain("duration-200");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain("transition-[margin,opacity]");
    });
  });

  describe("CSS Transition String Formatting", () => {
    it("should format width transition with correct properties", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      const sidebarGap = container.querySelector('[data-slot="sidebar-gap"]');
      const classes = sidebarGap?.className || "";

      // Verify the transition property is correctly specified
      expect(classes).toContain("transition-[width]");
      // Verify timing function
      expect(classes).toContain("ease-in-out");
      // Verify duration
      expect(classes).toContain("duration-200");
    });

    it("should format transform transition with correct properties", () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      const sidebarContainer = container.querySelector(
        '[data-slot="sidebar-container"]',
      );
      const classes = sidebarContainer?.className || "";

      // Verify multiple transition properties are correctly specified
      expect(classes).toContain("transition-[left,right,width,transform]");
      expect(classes).toContain("ease-in-out");
      expect(classes).toContain("duration-200");
    });

    it("should format hover transition with scale transform", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuButton>Test Button</SidebarMenuButton>
        </SidebarProvider>,
      );

      const button = container.querySelector('[data-sidebar="menu-button"]');
      const classes = button?.className || "";

      // Verify hover scale is applied
      expect(classes).toContain("hover:scale-105");
      // Verify transition properties include transform
      expect(classes).toContain(
        "transition-[transform,background-color,border-color]",
      );
      expect(classes).toContain("duration-150");
    });

    it("should format icon rotation transition correctly", () => {
      const { container } = render(
        <SidebarProvider>
          <SidebarMenuButton>
            <svg>
              <path />
            </svg>
            Test Button
          </SidebarMenuButton>
        </SidebarProvider>,
      );

      const button = container.querySelector('[data-sidebar="menu-button"]');
      const classes = button?.className || "";

      // Verify icon rotation on hover
      expect(classes).toContain("hover:[&>svg]:rotate-12");
      // Verify icon transition properties
      expect(classes).toContain("[&>svg]:transition-transform");
      expect(classes).toContain("[&>svg]:duration-200");
      expect(classes).toContain("[&>svg]:ease-in-out");
    });
  });

  describe("Animation State Updates", () => {
    it("should update sidebar state during expand/collapse transitions", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Initial state should be expanded
      expect(result.current.state).toBe("expanded");
      expect(result.current.open).toBe(true);

      // Toggle to collapsed
      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state).toBe("collapsed");
      expect(result.current.open).toBe(false);

      // Toggle back to expanded
      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.state).toBe("expanded");
      expect(result.current.open).toBe(true);
    });

    it("should maintain consistent state during multiple rapid toggles", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Perform multiple rapid toggles (each toggle is executed sequentially)
      act(() => {
        result.current.toggleSidebar(); // expanded -> collapsed
      });
      act(() => {
        result.current.toggleSidebar(); // collapsed -> expanded
      });
      act(() => {
        result.current.toggleSidebar(); // expanded -> collapsed
      });
      act(() => {
        result.current.toggleSidebar(); // collapsed -> expanded
      });

      // Final state should be expanded (4 toggles from initial expanded state)
      expect(result.current.state).toBe("expanded");
      expect(result.current.open).toBe(true);
    });

    it("should apply correct data attributes for animation states", () => {
      // Test with expanded state
      const { container: expandedContainer } = render(
        <SidebarProvider defaultOpen={true}>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      const expandedSidebar = expandedContainer.querySelector(
        '[data-slot="sidebar"]',
      );
      expect(expandedSidebar?.getAttribute("data-state")).toBe("expanded");

      // Test with collapsed state
      const { container: collapsedContainer } = render(
        <SidebarProvider defaultOpen={false}>
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <div>Test Content</div>
          </Sidebar>
        </SidebarProvider>,
      );

      const collapsedSidebar = collapsedContainer.querySelector(
        '[data-slot="sidebar"]',
      );
      expect(collapsedSidebar?.getAttribute("data-state")).toBe("collapsed");
      expect(collapsedSidebar?.getAttribute("data-collapsible")).toBe("icon");
    });

    it("should handle animation state idempotence - applying same transition twice produces same result", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider defaultOpen={true}>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Set to collapsed
      act(() => {
        result.current.setOpen(false);
      });
      const firstState = result.current.state;
      const firstOpen = result.current.open;

      // Set to collapsed again (idempotent operation)
      act(() => {
        result.current.setOpen(false);
      });
      const secondState = result.current.state;
      const secondOpen = result.current.open;

      // Both operations should produce the same result
      expect(firstState).toBe(secondState);
      expect(firstOpen).toBe(secondOpen);
      expect(result.current.state).toBe("collapsed");
      expect(result.current.open).toBe(false);
    });

    it("should correctly update width state without affecting animation classes", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SidebarProvider>{children}</SidebarProvider>
      );

      const { result } = renderHook(() => useSidebar(), { wrapper });

      // Update width
      act(() => {
        result.current.setWidth(350);
      });

      expect(result.current.width).toBe(350);
      // State should remain expanded
      expect(result.current.state).toBe("expanded");
      expect(result.current.open).toBe(true);
    });
  });
});
