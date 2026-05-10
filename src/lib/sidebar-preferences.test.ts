import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  saveWidth,
  loadWidth,
  saveIconSize,
  loadIconSize,
  saveTheme,
  loadTheme,
  saveItemOrder,
  loadItemOrder,
  savePinnedItems,
  loadPinnedItems,
  saveExpandedGroups,
  loadExpandedGroups,
  saveRecentItems,
  loadRecentItems,
  saveAllPreferences,
  loadAllPreferences,
  clearAllPreferences,
  PREFERENCE_KEYS,
  type IconSize,
  type ThemeVariant,
  type SidebarPreferences,
} from "./sidebar-preferences";

describe("sidebar-preferences", () => {
  // Clean up before and after each test
  beforeEach(() => {
    clearAllPreferences();
  });

  afterEach(() => {
    clearAllPreferences();
  });

  describe("width persistence", () => {
    it("saves and loads width correctly", () => {
      const testWidth = 350;
      saveWidth(testWidth);
      expect(loadWidth()).toBe(testWidth);
    });

    it("returns default width (304) when not set", () => {
      expect(loadWidth()).toBe(304);
    });

    it("round-trip: saving then loading returns the same value", () => {
      const widths = [240, 304, 400, 480];
      for (const width of widths) {
        saveWidth(width);
        expect(loadWidth()).toBe(width);
      }
    });
  });

  describe("icon size persistence", () => {
    it("saves and loads icon size correctly", () => {
      const sizes: IconSize[] = ["small", "medium", "large"];
      for (const size of sizes) {
        saveIconSize(size);
        expect(loadIconSize()).toBe(size);
      }
    });

    it("returns default icon size (medium) when not set", () => {
      expect(loadIconSize()).toBe("medium");
    });

    it("round-trip: saving then loading returns the same value", () => {
      const sizes: IconSize[] = ["small", "medium", "large"];
      for (const size of sizes) {
        saveIconSize(size);
        expect(loadIconSize()).toBe(size);
      }
    });
  });

  describe("theme persistence", () => {
    it("saves and loads theme correctly", () => {
      const themes: ThemeVariant[] = ["minimal", "modern", "compact"];
      for (const theme of themes) {
        saveTheme(theme);
        expect(loadTheme()).toBe(theme);
      }
    });

    it("returns default theme (modern) when not set", () => {
      expect(loadTheme()).toBe("modern");
    });

    it("round-trip: saving then loading returns the same value", () => {
      const themes: ThemeVariant[] = ["minimal", "modern", "compact"];
      for (const theme of themes) {
        saveTheme(theme);
        expect(loadTheme()).toBe(theme);
      }
    });
  });

  describe("item order persistence", () => {
    it("saves and loads item order correctly", () => {
      const order = ["item1", "item2", "item3"];
      saveItemOrder(order);
      expect(loadItemOrder()).toEqual(order);
    });

    it("returns empty array when not set", () => {
      expect(loadItemOrder()).toEqual([]);
    });

    it("round-trip: saving then loading returns the same value", () => {
      const order = ["apps", "chat", "config", "library", "hub"];
      saveItemOrder(order);
      expect(loadItemOrder()).toEqual(order);
    });
  });

  describe("pinned items persistence", () => {
    it("saves and loads pinned items correctly", () => {
      const pinned = ["item1", "item3"];
      savePinnedItems(pinned);
      expect(loadPinnedItems()).toEqual(pinned);
    });

    it("returns empty array when not set", () => {
      expect(loadPinnedItems()).toEqual([]);
    });

    it("round-trip: saving then loading returns the same value", () => {
      const pinned = ["chat", "library"];
      savePinnedItems(pinned);
      expect(loadPinnedItems()).toEqual(pinned);
    });
  });

  describe("expanded groups persistence", () => {
    it("saves and loads expanded groups correctly", () => {
      const expanded = ["group1", "group2"];
      saveExpandedGroups(expanded);
      expect(loadExpandedGroups()).toEqual(expanded);
    });

    it("returns empty array when not set", () => {
      expect(loadExpandedGroups()).toEqual([]);
    });

    it("round-trip: saving then loading returns the same value", () => {
      const expanded = ["settings", "tools"];
      saveExpandedGroups(expanded);
      expect(loadExpandedGroups()).toEqual(expanded);
    });
  });

  describe("recent items persistence", () => {
    it("saves and loads recent items correctly", () => {
      const recent = ["item1", "item2", "item3"];
      saveRecentItems(recent);
      expect(loadRecentItems()).toEqual(recent);
    });

    it("returns empty array when not set", () => {
      expect(loadRecentItems()).toEqual([]);
    });

    it("round-trip: saving then loading returns the same value", () => {
      const recent = ["chat", "apps", "config"];
      saveRecentItems(recent);
      expect(loadRecentItems()).toEqual(recent);
    });
  });

  describe("bulk operations", () => {
    it("saves and loads all preferences correctly", () => {
      const preferences: SidebarPreferences = {
        width: 350,
        iconSize: "large",
        theme: "compact",
        itemOrder: ["item1", "item2"],
        pinnedItems: ["item1"],
        expandedGroups: ["group1"],
        recentItems: ["item2", "item1"],
      };

      saveAllPreferences(preferences);
      const loaded = loadAllPreferences();

      expect(loaded).toEqual(preferences);
    });

    it("returns defaults when no preferences are set", () => {
      const loaded = loadAllPreferences();

      expect(loaded).toEqual({
        width: 304,
        iconSize: "medium",
        theme: "modern",
        itemOrder: [],
        pinnedItems: [],
        expandedGroups: [],
        recentItems: [],
      });
    });

    it("round-trip: saving then loading all preferences returns the same values", () => {
      const preferences: SidebarPreferences = {
        width: 400,
        iconSize: "small",
        theme: "minimal",
        itemOrder: ["apps", "chat", "config"],
        pinnedItems: ["chat"],
        expandedGroups: ["settings"],
        recentItems: ["apps", "chat"],
      };

      saveAllPreferences(preferences);
      const loaded = loadAllPreferences();

      expect(loaded).toEqual(preferences);
    });
  });

  describe("clearAllPreferences", () => {
    it("clears all preferences and returns to defaults", () => {
      // Set some preferences
      const preferences: SidebarPreferences = {
        width: 400,
        iconSize: "large",
        theme: "compact",
        itemOrder: ["item1"],
        pinnedItems: ["item1"],
        expandedGroups: ["group1"],
        recentItems: ["item1"],
      };
      saveAllPreferences(preferences);

      // Clear all preferences
      clearAllPreferences();

      // Verify defaults are returned
      const loaded = loadAllPreferences();
      expect(loaded).toEqual({
        width: 304,
        iconSize: "medium",
        theme: "modern",
        itemOrder: [],
        pinnedItems: [],
        expandedGroups: [],
        recentItems: [],
      });
    });
  });

  describe("PREFERENCE_KEYS constants", () => {
    it("defines all required localStorage keys", () => {
      expect(PREFERENCE_KEYS.ITEM_ORDER).toBe("sidebar_item_order");
      expect(PREFERENCE_KEYS.PINNED_ITEMS).toBe("sidebar_pinned_items");
      expect(PREFERENCE_KEYS.EXPANDED_GROUPS).toBe("sidebar_expanded_groups");
      expect(PREFERENCE_KEYS.RECENT_ITEMS).toBe("sidebar_recent_items");
    });
  });
});
