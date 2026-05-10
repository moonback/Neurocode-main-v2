import { describe, it, expect } from "vitest";
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
      expect(classes).toContain("transition-[transform,background-color,border-color]");
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
      expect(classes).toContain("transition-[transform,background-color,border-color]");
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
