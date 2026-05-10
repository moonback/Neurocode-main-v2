# Implementation Plan: Sidebar Improvements

## Overview

This implementation plan breaks down the sidebar improvements feature into discrete, incremental coding tasks. The approach prioritizes backward compatibility, implements core infrastructure first, then adds enhanced features layer by layer. Each task builds on previous work and includes validation through tests.

**Technology Stack:**

- React with TypeScript (strict mode)
- Tailwind CSS for styling
- class-variance-authority for variant management
- Jotai for state management
- TanStack Router for navigation
- Lucide React for icons
- Vitest for unit tests
- Playwright for E2E tests

**Implementation Strategy:**

1. Extend existing context with new state management
2. Implement core visual enhancements (animations, borders, gradients)
3. Add user customization features (resize, icon size, themes)
4. Implement advanced features (search, keyboard nav, badges)
5. Add accessibility and performance optimizations
6. Comprehensive testing and documentation

## Tasks

- [x] 1. Extend SidebarContext with new state properties
  - Update `SidebarContextProps` interface to include new properties: `width`, `iconSize`, `theme`, `isResizing`, `searchQuery`, `recentItems`, `pinnedItems`, `itemOrder`, `expandedGroups`
  - Add TypeScript types: `IconSize`, `ThemeVariant`, `SidebarPreferences`
  - Update `SidebarProvider` to initialize new state with default values
  - Maintain backward compatibility with existing `state`, `open`, `setOpen`, `toggleSidebar` properties
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 12.1, 12.2_

- [x] 1.1 Write unit tests for extended context
  - Test that new context properties are initialized with correct defaults
  - Test that existing context properties remain unchanged (backward compatibility)
  - Test that context updates trigger re-renders correctly
  - _Requirements: 19.2, 12.1_

- [x] 2. Implement preference persistence layer
  - Create `PreferenceStore` utility module with functions to save/load preferences
  - Implement cookie storage for simple preferences (width, iconSize, theme) using existing cookie pattern
  - Implement localStorage for complex data (itemOrder, pinnedItems, expandedGroups, recentItems)
  - Add serialization/deserialization functions for preference data
  - Define `PREFERENCE_KEYS` constants for all storage keys
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 12.3_

- [x] 2.1 Write unit tests for preference persistence
  - **Property 1: Round-trip consistency for preferences**
  - **Validates: Requirements 16.8, 2.7, 6.7, 8.6, 15.7**
  - Test that saving then loading preferences returns the same values
  - Test cookie max-age is set to 7 days (604800 seconds)
  - Test localStorage serialization/deserialization
  - _Requirements: 19.5, 16.8_

- [x] 3. Implement smooth animation system
  - Add CSS transition properties to Sidebar component for width changes (200ms, ease-in-out)
  - Add CSS transitions for hover states on SidebarMenuButton (150ms scale transform)
  - Add CSS transitions for icon hover animations (200ms rotation/bounce)
  - Update existing transition duration from 200ms to match design spec
  - Use CSS transforms instead of layout properties for performance
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.6_

- [x] 3.1 Write unit tests for animation configuration
  - Test that animation duration constants are correctly defined
  - Test that CSS transition strings are properly formatted
  - Test that animation state updates correctly during transitions
  - _Requirements: 19.1, 1.7_

- [x] 4. Implement enhanced visual feedback
  - Add left border accent color to active SidebarMenuButton using `data-active` attribute
  - Add hover background color with 0.9 opacity to SidebarMenuButton
  - Update active item font weight to medium
  - Add gradient backgrounds to SidebarHeader for expanded mode
  - Add 2px focus ring with accent color using `focus-visible:ring-2`
  - Ensure tooltips display with 0ms delay (already configured in TooltipProvider)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 5. Checkpoint - Verify core enhancements
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement resizable sidebar width
  - Update SidebarRail component to handle drag events for resizing
  - Add `onMouseDown`, `onMouseMove`, `onMouseUp` handlers to SidebarRail
  - Implement width constraints: minimum 15rem (240px), maximum 30rem (480px)
  - Update CSS variable `--sidebar-width` dynamically during resize
  - Add `isResizing` state to context to track drag operation
  - Persist width changes to PreferenceStore on drag end
  - Restore saved width from PreferenceStore on mount
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [~] 6.1 Write unit tests for resize manager
  - **Property 2: Width constraint invariant**
  - **Validates: Requirements 2.3, 2.4**
  - Test that width is always constrained between min and max values
  - Test that drag events update width correctly
  - Test that width persists and restores correctly
  - _Requirements: 19.1, 2.7_

- [x] 7. Implement icon size customization
  - Add `iconSize` state to SidebarProvider with options: small (16px), medium (20px), large (24px)
  - Create `setIconSize` function in context
  - Update SidebarMenuButton to apply icon size classes based on context value
  - Adjust spacing proportionally when icon size changes
  - Persist icon size selection to PreferenceStore
  - Restore saved icon size on mount (default to medium for new users)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Write unit tests for icon size customization
  - Test that icon size changes apply correct CSS classes
  - Test that icon size persists and restores correctly
  - Test that default icon size is medium for new users
  - _Requirements: 19.1, 4.5_

- [x] 8. Implement theme variants
  - Create theme variant system using class-variance-authority
  - Define three theme variants: minimal (flat colors, no shadows), modern (gradients, subtle shadows), compact (reduced padding by 25%)
  - Add `theme` state to SidebarProvider
  - Create `setTheme` function in context
  - Apply theme-specific classes to Sidebar component based on context value
  - Persist theme selection to PreferenceStore
  - Restore saved theme on mount (default to modern for new users)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 8.1 Write unit tests for theme variants
  - Test that each theme variant applies correct CSS classes
  - Test that theme persists and restores correctly
  - Test that default theme is modern for new users
  - _Requirements: 19.1, 5.7_

- [x] 9. Checkpoint - Verify customization features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement search and filter functionality
  - Add `searchQuery` state to SidebarProvider
  - Create SearchFilter component with Input field
  - Add SearchFilter to SidebarHeader (visible only in expanded mode)
  - Implement debounced search with 150ms delay
  - Create filter function that performs case-insensitive matching on Navigation_Item titles
  - Update SidebarMenu to display only filtered items when search query is active
  - Add clear button to SearchFilter that resets search query
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10.1 Write unit tests for search filter
  - **Property 3: Filtered items subset invariant**
  - **Validates: Requirements 6.7**
  - Test that filtered items are always a subset of all items
  - Test case-insensitive matching
  - Test debounce delay (150ms)
  - Test that empty query shows all items
  - _Requirements: 19.3, 6.7_

- [x] 11. Implement keyboard navigation
  - Add keyboard event handlers to Sidebar component
  - Implement Tab/Shift+Tab navigation to move focus between Navigation_Item elements
  - Implement Arrow Down/Arrow Up navigation to move focus between items
  - Implement Enter key to activate focused Navigation_Item
  - Implement Escape key in SearchFilter to clear search text
  - Maintain existing Cmd/Ctrl+B keyboard shortcut for toggle
  - Add focus management state to track currently focused item index
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 11.1 Write unit tests for keyboard navigation
  - Test that Tab/Shift+Tab moves focus correctly
  - Test that Arrow keys move focus correctly
  - Test that Enter activates focused item
  - Test that Escape clears search filter
  - Test that Cmd/Ctrl+B still toggles sidebar
  - _Requirements: 19.4, 7.7_

- [x] 12. Implement badge notification system
  - Enhance SidebarMenuBadge component to accept count and variant props
  - Add badge display logic: show count if < 100, show "99+" if >= 100
  - Add badge positioning for both collapsed and expanded modes
  - Create badge variant styles: default, accent, warning
  - Add optional pulse animation for badges
  - Update SidebarMenuButton to conditionally render badge based on item data
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12.1 Write unit tests for badge system
  - Test that badge displays correct count
  - Test that badge shows "99+" for counts >= 100
  - Test that badge is visible in both collapsed and expanded modes
  - Test badge variant styles
  - _Requirements: 19.1, 9.6_

- [x] 13. Implement collapsible nested groups
  - Add `expandedGroups` state to SidebarProvider (Set of group IDs)
  - Create `toggleGroup` function in context
  - Update SidebarGroup to support collapsible prop
  - Add chevron icon to SidebarGroupLabel (right when collapsed, down when expanded)
  - Implement click handler on SidebarGroupLabel to toggle group state
  - Update SidebarGroupContent to conditionally render based on expanded state
  - Hide nested groups when sidebar is in collapsed mode
  - Persist expanded group states to PreferenceStore
  - Restore expanded groups on mount
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 13.1 Write unit tests for nested groups
  - Test that clicking group header toggles visibility
  - Test that chevron icon rotates correctly
  - Test that nested groups are hidden in collapsed sidebar mode
  - Test that expanded states persist and restore correctly
  - _Requirements: 19.1, 13.6_

- [x] 14. Checkpoint - Verify advanced features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement recent items tracking
  - Add `recentItems` state to SidebarProvider (array of item IDs, max 5)
  - Create `addRecentItem` function that adds item to front of list and removes oldest if > 5
  - Create RecentItemsSection component to display recent items
  - Add RecentItemsSection to top of SidebarContent
  - Update navigation handlers to call addRecentItem when user navigates
  - Persist recent items list to PreferenceStore
  - Restore recent items on mount
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 15.1 Write unit tests for recent items
  - **Property 4: Recent items list size invariant**
  - **Validates: Requirements 14.6**
  - Test that recent items list never exceeds 5 items
  - Test that newest item is added to front of list
  - Test that oldest item is removed when list exceeds 5
  - Test that recent items persist and restore correctly
  - _Requirements: 19.1, 14.6_

- [x] 16. Implement pin/unpin favorites
  - Add `pinnedItems` state to SidebarProvider (array of item IDs)
  - Create `togglePinItem` function in context
  - Create PinnedItemsSection component to display pinned items
  - Add PinnedItemsSection to top of SidebarContent (above recent items)
  - Add context menu to SidebarMenuItem with Pin/Unpin option
  - Add pin icon indicator to pinned items
  - Persist pinned items to PreferenceStore
  - Restore pinned items on mount
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 16.1 Write unit tests for pin/unpin
  - **Property 5: Pin/unpin round-trip**
  - **Validates: Requirements 15.7**
  - Test that pinning then unpinning returns item to original section
  - Test that pinned items display in correct section
  - Test that pin icon indicator is visible
  - Test that pinned items persist and restore correctly
  - _Requirements: 19.1, 15.7_

- [~] 17. Implement drag-and-drop reordering infrastructure
  - Add `itemOrder` state to SidebarProvider (array of item IDs)
  - Create `reorderItems` function in context
  - Add `draggable` attribute to SidebarMenuItem
  - Implement `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` handlers
  - Add visual indicator during drag operation (opacity, border)
  - Update item order in state when drop occurs
  - Persist item order to PreferenceStore
  - Restore item order on mount
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [~] 17.1 Write unit tests for drag-and-drop
  - **Property 6: Reorder round-trip**
  - **Validates: Requirements 8.6**
  - Test that reordering then restoring returns to original order
  - Test that drag events update item order correctly
  - Test that visual indicators appear during drag
  - Test that item order persists and restores correctly
  - _Requirements: 19.1, 8.6_

- [~] 18. Implement accessibility enhancements
  - Add `role="navigation"` to Sidebar component
  - Add `aria-label` attributes to all SidebarMenuButton components
  - Add `aria-expanded` attribute to Sidebar based on state
  - Add `aria-current="page"` to active SidebarMenuButton
  - Ensure focus indicators are visible with 2px ring (already implemented in task 4)
  - Add `aria-live="polite"` region for state change announcements
  - Test high contrast mode with 4.5:1 minimum contrast ratio
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [~] 18.1 Write unit tests for accessibility
  - Test that ARIA attributes are correctly applied
  - Test that focus indicators are visible
  - Test that state changes are announced to screen readers
  - _Requirements: 19.1, 10.7_

- [~] 19. Implement performance optimizations
  - Wrap SidebarMenuItem with React.memo to prevent unnecessary re-renders
  - Wrap SidebarMenuButton with React.memo
  - Add debounce (50ms) to hover handlers on SidebarMenuButton
  - Implement lazy loading for nested content (only render when parent is expanded)
  - Add virtualized rendering for lists with > 20 items (use react-window or similar)
  - Verify animations use CSS transforms (already implemented in task 3)
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [~] 19.1 Write unit tests for performance optimizations
  - Test that React.memo prevents unnecessary re-renders
  - Test that debounce delays hover handlers by 50ms
  - Test that nested content is not rendered until parent is expanded
  - _Requirements: 19.1, 11.5_

- [~] 20. Checkpoint - Verify accessibility and performance
  - Ensure all tests pass, ask the user if questions arise.

- [~] 21. Update AppSidebar integration
  - Verify AppSidebar component works with enhanced sidebar
  - Test hover-to-expand behavior still functions correctly
  - Test integration with dropdownOpenAtom from Jotai
  - Test TanStack Router Link components work correctly
  - Verify backward compatibility with existing navigation items
  - Test auto-collapse on screens < 480px still works
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [~] 21.1 Write integration tests for AppSidebar
  - Test that AppSidebar renders with new sidebar features
  - Test that existing hover behavior is preserved
  - Test that Jotai atom integration works
  - Test that TanStack Router navigation works
  - _Requirements: 19.1, 12.7_

- [~] 22. Write E2E tests for core functionality
  - Write E2E test for expand/collapse functionality
  - Write E2E test for keyboard shortcut (Cmd/Ctrl+B)
  - Write E2E test for hover-to-expand behavior
  - Write E2E test for navigation item clicks
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [~] 23. Write E2E tests for new features
  - Write E2E test for search filtering
  - Write E2E test for preference persistence across page reloads
  - Write E2E test for keyboard navigation (Tab, Arrow keys, Enter)
  - _Requirements: 20.5, 20.6, 20.7_

- [~] 24. Create Storybook documentation
  - Create Storybook story for default sidebar configuration
  - Create Storybook story for each theme variant (minimal, modern, compact)
  - Create Storybook story for each icon size (small, medium, large)
  - Create Storybook story demonstrating resizable width feature
  - Create Storybook story demonstrating keyboard navigation
  - Add interactive controls for all customization options
  - _Requirements: 18.2, 18.3, 18.4, 18.5, 18.6_

- [~] 25. Add JSDoc comments and TypeScript documentation
  - Add JSDoc comments to all exported components (Sidebar, SidebarProvider, etc.)
  - Add JSDoc comments to all exported functions (useSidebar, etc.)
  - Add JSDoc comments to all TypeScript interfaces and types
  - Document all props with descriptions and examples
  - Ensure TypeScript strict mode passes without errors
  - Verify autocomplete suggestions work in IDEs
  - _Requirements: 18.1, 17.5, 17.6, 17.7_

- [~] 26. Create README documentation
  - Create README.md file with overview of sidebar features
  - Document all customization options (width, icon size, themes)
  - Provide usage examples for common scenarios
  - Document keyboard shortcuts
  - Document accessibility features
  - Include migration guide from old sidebar to new sidebar
  - Document API reference for all exported components and hooks
  - _Requirements: 18.7_

- [~] 27. Final checkpoint - Complete verification
  - Run all unit tests and verify 80% coverage target is met
  - Run all E2E tests and verify they pass
  - Run `npm run fmt` to format code
  - Run `npm run lint` and fix any issues
  - Run `npm run ts` to verify TypeScript compilation
  - Verify all requirements are implemented
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties (round-trip consistency, invariants)
- Unit tests validate specific examples and edge cases
- Integration and E2E tests verify end-to-end functionality
- All tasks build incrementally on previous work
- Backward compatibility is maintained throughout (Requirements 12.1-12.7)
- TypeScript strict mode is enforced (Requirement 17.5)
- Performance targets: 60fps animations, 80% test coverage
