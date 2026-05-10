/**
 * Sidebar Preference Store
 *
 * This module provides utilities for persisting and loading sidebar preferences.
 * Simple preferences (width, iconSize, theme) are stored in cookies.
 * Complex data structures (itemOrder, pinnedItems, expandedGroups, recentItems) are stored in localStorage.
 *
 * Cookie max-age is set to 7 days (604800 seconds) as per requirement 16.7.
 */

// Cookie configuration
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

// Cookie keys for simple preferences
const COOKIE_KEYS = {
  WIDTH: "sidebar_width",
  ICON_SIZE: "sidebar_icon_size",
  THEME: "sidebar_theme",
} as const;

// LocalStorage keys for complex data
export const PREFERENCE_KEYS = {
  ITEM_ORDER: "sidebar_item_order",
  PINNED_ITEMS: "sidebar_pinned_items",
  EXPANDED_GROUPS: "sidebar_expanded_groups",
  RECENT_ITEMS: "sidebar_recent_items",
} as const;

// Type definitions
export type IconSize = "small" | "medium" | "large";
export type ThemeVariant = "minimal" | "modern" | "compact";

export interface SidebarPreferences {
  width: number;
  iconSize: IconSize;
  theme: ThemeVariant;
  itemOrder: string[];
  pinnedItems: string[];
  expandedGroups: string[];
  recentItems: string[];
}

// Default values
const DEFAULTS = {
  WIDTH: 304, // 19rem = 304px
  ICON_SIZE: "medium" as IconSize,
  THEME: "modern" as ThemeVariant,
  ITEM_ORDER: [] as string[],
  PINNED_ITEMS: [] as string[],
  EXPANDED_GROUPS: [] as string[],
  RECENT_ITEMS: [] as string[],
} as const;

/**
 * Cookie utility functions
 */

/**
 * Sets a cookie with the specified name, value, and max-age.
 */
function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

/**
 * Gets a cookie value by name.
 * Returns null if the cookie doesn't exist.
 */
function getCookie(name: string): string | null {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) {
      return value;
    }
  }
  return null;
}

/**
 * LocalStorage utility functions
 */

/**
 * Saves a value to localStorage with JSON serialization.
 */
function setLocalStorage<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error(`Failed to save to localStorage: ${key}`, error);
  }
}

/**
 * Gets a value from localStorage with JSON deserialization.
 * Returns null if the key doesn't exist or deserialization fails.
 */
function getLocalStorage<T>(key: string): T | null {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return null;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error(`Failed to load from localStorage: ${key}`, error);
    return null;
  }
}

/**
 * Preference-specific save functions
 */

/**
 * Saves sidebar width to cookies.
 * Requirement 16.1: Persist sidebar width to browser cookies
 */
export function saveWidth(width: number): void {
  setCookie(COOKIE_KEYS.WIDTH, width.toString());
}

/**
 * Saves icon size to cookies.
 * Requirement 16.2: Persist icon size to browser cookies
 */
export function saveIconSize(iconSize: IconSize): void {
  setCookie(COOKIE_KEYS.ICON_SIZE, iconSize);
}

/**
 * Saves theme variant to cookies.
 * Requirement 16.3: Persist Theme_Variant to browser cookies
 */
export function saveTheme(theme: ThemeVariant): void {
  setCookie(COOKIE_KEYS.THEME, theme);
}

/**
 * Saves navigation item order to localStorage.
 * Requirement 16.4: Persist Navigation_Item order to browser cookies (using localStorage for complex data)
 */
export function saveItemOrder(itemOrder: string[]): void {
  setLocalStorage(PREFERENCE_KEYS.ITEM_ORDER, itemOrder);
}

/**
 * Saves pinned items to localStorage.
 * Requirement 16.5: Persist pinned items to browser cookies (using localStorage for complex data)
 */
export function savePinnedItems(pinnedItems: string[]): void {
  setLocalStorage(PREFERENCE_KEYS.PINNED_ITEMS, pinnedItems);
}

/**
 * Saves expanded group states to localStorage.
 * Requirement 16.6: Persist nested group states to browser cookies (using localStorage for complex data)
 */
export function saveExpandedGroups(expandedGroups: string[]): void {
  setLocalStorage(PREFERENCE_KEYS.EXPANDED_GROUPS, expandedGroups);
}

/**
 * Saves recent items to localStorage.
 */
export function saveRecentItems(recentItems: string[]): void {
  setLocalStorage(PREFERENCE_KEYS.RECENT_ITEMS, recentItems);
}

/**
 * Preference-specific load functions
 */

/**
 * Loads sidebar width from cookies.
 * Returns default value (304px) if not found.
 */
export function loadWidth(): number {
  const value = getCookie(COOKIE_KEYS.WIDTH);
  if (value === null) {
    return DEFAULTS.WIDTH;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? DEFAULTS.WIDTH : parsed;
}

/**
 * Loads icon size from cookies.
 * Returns default value ("medium") if not found or invalid.
 */
export function loadIconSize(): IconSize {
  const value = getCookie(COOKIE_KEYS.ICON_SIZE);
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return DEFAULTS.ICON_SIZE;
}

/**
 * Loads theme variant from cookies.
 * Returns default value ("modern") if not found or invalid.
 */
export function loadTheme(): ThemeVariant {
  const value = getCookie(COOKIE_KEYS.THEME);
  if (value === "minimal" || value === "modern" || value === "compact") {
    return value;
  }
  return DEFAULTS.THEME;
}

/**
 * Loads navigation item order from localStorage.
 * Returns empty array if not found.
 */
export function loadItemOrder(): string[] {
  const value = getLocalStorage<string[]>(PREFERENCE_KEYS.ITEM_ORDER);
  return value ?? DEFAULTS.ITEM_ORDER;
}

/**
 * Loads pinned items from localStorage.
 * Returns empty array if not found.
 */
export function loadPinnedItems(): string[] {
  const value = getLocalStorage<string[]>(PREFERENCE_KEYS.PINNED_ITEMS);
  return value ?? DEFAULTS.PINNED_ITEMS;
}

/**
 * Loads expanded group states from localStorage.
 * Returns empty array if not found.
 */
export function loadExpandedGroups(): string[] {
  const value = getLocalStorage<string[]>(PREFERENCE_KEYS.EXPANDED_GROUPS);
  return value ?? DEFAULTS.EXPANDED_GROUPS;
}

/**
 * Loads recent items from localStorage.
 * Returns empty array if not found.
 */
export function loadRecentItems(): string[] {
  const value = getLocalStorage<string[]>(PREFERENCE_KEYS.RECENT_ITEMS);
  return value ?? DEFAULTS.RECENT_ITEMS;
}

/**
 * Bulk operations
 */

/**
 * Loads all sidebar preferences from cookies and localStorage.
 * Returns a complete SidebarPreferences object with defaults for missing values.
 */
export function loadAllPreferences(): SidebarPreferences {
  return {
    width: loadWidth(),
    iconSize: loadIconSize(),
    theme: loadTheme(),
    itemOrder: loadItemOrder(),
    pinnedItems: loadPinnedItems(),
    expandedGroups: loadExpandedGroups(),
    recentItems: loadRecentItems(),
  };
}

/**
 * Saves all sidebar preferences to cookies and localStorage.
 */
export function saveAllPreferences(preferences: SidebarPreferences): void {
  saveWidth(preferences.width);
  saveIconSize(preferences.iconSize);
  saveTheme(preferences.theme);
  saveItemOrder(preferences.itemOrder);
  savePinnedItems(preferences.pinnedItems);
  saveExpandedGroups(preferences.expandedGroups);
  saveRecentItems(preferences.recentItems);
}

/**
 * Clears all sidebar preferences from cookies and localStorage.
 * Useful for testing or resetting to defaults.
 */
export function clearAllPreferences(): void {
  // Clear cookies by setting max-age to 0
  document.cookie = `${COOKIE_KEYS.WIDTH}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_KEYS.ICON_SIZE}=; path=/; max-age=0`;
  document.cookie = `${COOKIE_KEYS.THEME}=; path=/; max-age=0`;

  // Clear localStorage
  localStorage.removeItem(PREFERENCE_KEYS.ITEM_ORDER);
  localStorage.removeItem(PREFERENCE_KEYS.PINNED_ITEMS);
  localStorage.removeItem(PREFERENCE_KEYS.EXPANDED_GROUPS);
  localStorage.removeItem(PREFERENCE_KEYS.RECENT_ITEMS);
}
