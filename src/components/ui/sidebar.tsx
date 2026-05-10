import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type IconSize,
  type ThemeVariant,
  loadWidth,
  saveWidth,
  loadIconSize,
  saveIconSize,
  loadTheme,
  saveTheme,
} from "@/lib/sidebar-preferences";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH_ICON = "4.5rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  // Existing properties (backward compatible)
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // New properties
  width: number;
  setWidth: (width: number) => void;
  iconSize: IconSize;
  setIconSize: (size: IconSize) => void;
  theme: ThemeVariant;
  setTheme: (theme: ThemeVariant) => void;
  isResizing: boolean;
  setIsResizing: (isResizing: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  recentItems: string[];
  addRecentItem: (itemId: string) => void;
  pinnedItems: string[];
  togglePinItem: (itemId: string) => void;
  itemOrder: string[];
  reorderItems: (newOrder: string[]) => void;
  expandedGroups: Set<string>;
  toggleGroup: (groupId: string) => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    setOpen((open) => !open);
  }, [setOpen]);

  // New state properties with default values
  const [width, _setWidth] = React.useState<number>(304); // 19rem = 304px
  const [iconSize, _setIconSize] = React.useState<IconSize>("medium");
  const [theme, _setTheme] = React.useState<ThemeVariant>("modern");
  const [isResizing, setIsResizing] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [recentItems, setRecentItems] = React.useState<string[]>([]);
  const [pinnedItems, setPinnedItems] = React.useState<string[]>([]);
  const [itemOrder, setItemOrder] = React.useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(),
  );

  // Width setter with constraints (Requirement 2.3, 2.4)
  const setWidth = React.useCallback((newWidth: number) => {
    const MIN_WIDTH = 240; // 15rem
    const MAX_WIDTH = 480; // 30rem
    const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    _setWidth(constrainedWidth);
  }, []);

  // Restore saved width from PreferenceStore on mount (Requirement 2.6)
  React.useEffect(() => {
    const savedWidth = loadWidth();
    setWidth(savedWidth);
    _setIconSize(loadIconSize());
    _setTheme(loadTheme());
  }, [setWidth]);

  // Persist IconSize (Requirement 4.4)
  const setIconSize = React.useCallback((size: IconSize) => {
    _setIconSize(size);
    saveIconSize(size);
  }, []);

  // Persist Theme (Requirement 5.5)
  const setTheme = React.useCallback((variant: ThemeVariant) => {
    _setTheme(variant);
    saveTheme(variant);
  }, []);

  // Helper to add a recent item
  const addRecentItem = React.useCallback((itemId: string) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((id) => id !== itemId);
      const updated = [itemId, ...filtered].slice(0, 5);
      return updated;
    });
  }, []);

  // Helper to toggle pin item
  const togglePinItem = React.useCallback((itemId: string) => {
    setPinnedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);

  // Helper to reorder items
  const reorderItems = React.useCallback((newOrder: string[]) => {
    setItemOrder(newOrder);
  }, []);

  // Helper to toggle group expansion
  const toggleGroup = React.useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  // Auto-collapse on small screens
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 480px)");
    const handleResize = () => {
      if (mql.matches) {
        setOpen(false);
      }
    };

    mql.addEventListener("change", handleResize);
    handleResize(); // Check initial size

    return () => mql.removeEventListener("change", handleResize);
  }, [setOpen]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      // Existing properties (backward compatible)
      state,
      open,
      setOpen,
      toggleSidebar,

      // New properties
      width,
      setWidth,
      iconSize,
      setIconSize,
      theme,
      setTheme,
      isResizing,
      setIsResizing,
      searchQuery,
      setSearchQuery,
      recentItems,
      addRecentItem,
      pinnedItems,
      togglePinItem,
      itemOrder,
      reorderItems,
      expandedGroups,
      toggleGroup,
    }),
    [
      state,
      open,
      setOpen,
      toggleSidebar,
      width,
      setWidth,
      iconSize,
      setIconSize,
      theme,
      setTheme,
      isResizing,
      setIsResizing,
      searchQuery,
      setSearchQuery,
      recentItems,
      addRecentItem,
      pinnedItems,
      togglePinItem,
      itemOrder,
      reorderItems,
      expandedGroups,
      toggleGroup,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delay={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": `${width}px`,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          className={cn(
            "bg-sidebar",
            "group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { state } = useSidebar();

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap */}
      {/* Smooth animation system: width transitions with 200ms ease-in-out (Requirement 1.1, 1.2) */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-in-out",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          // Smooth animation system: width and transform transitions with 200ms ease-in-out (Requirement 1.1, 1.2, 11.6)
          // Using CSS transforms for performance (Requirement 11.6)
          "fixed inset-y-0 z-10 flex h-svh w-(--sidebar-width) transition-[left,right,width,transform] duration-200 ease-in-out",
          side === "left"
            ? "left-0 translate-x-0 group-data-[collapsible=offcanvas]:translate-x-[-100%]"
            : "right-0 translate-x-0 group-data-[collapsible=offcanvas]:translate-x-[100%]",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l border-sidebar-border",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  onClick,
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <Tooltip>
      <TooltipTrigger
        data-sidebar="trigger"
        data-slot="sidebar-trigger"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sidebar" }),
          "cursor-pointer ml-1 hover:bg-sidebar",
          className,
        )}
        onClick={(event) => {
          onClick?.(event as React.MouseEvent<HTMLButtonElement>);
          toggleSidebar();
        }}
        {...props}
      >
        <Menu className="size-5" />
        <span className="sr-only">Toggle Menu</span>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Toggle Menu
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar, width, setWidth, state, setIsResizing } = useSidebar();
  const isResizingRef = React.useRef(false);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(0);

  // Handle mouse down to start resize (Requirement 2.1)
  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Only allow resize in expanded mode
      if (state === "collapsed") {
        toggleSidebar();
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      isResizingRef.current = true;
      setIsResizing(true);
      startXRef.current = event.clientX;
      startWidthRef.current = width;

      // Prevent text selection during resize
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
    },
    [state, toggleSidebar, width],
  );

  // Handle mouse move during resize (Requirement 2.2)
  const handleMouseMove = React.useCallback(
    (event: MouseEvent) => {
      if (!isResizingRef.current) return;

      const deltaX = event.clientX - startXRef.current;
      const newWidth = startWidthRef.current + deltaX;

      // Update width with constraints applied (Requirement 2.3, 2.4)
      setWidth(newWidth);
    },
    [setWidth],
  );

  // Handle mouse up to end resize (Requirement 2.5)
  const handleMouseUp = React.useCallback(() => {
    if (!isResizingRef.current) return;

    isResizingRef.current = false;
    setIsResizing(false);

    // Restore cursor and text selection
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    // Persist width to PreferenceStore (Requirement 2.5)
    saveWidth(width);
  }, [width]);

  // Attach global mouse event listeners
  React.useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onMouseDown={handleMouseDown}
      title="Toggle Sidebar"
      className={cn(
        // Smooth animation system: transition-all with 200ms ease-in-out for resize handle (Requirement 1.1, 1.2)
        "hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all duration-200 ease-in-out group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex",
        "in-data-[side=left][data-state=collapsed]_&]:cursor-e-resize in-data-[side=right][data-state=collapsed]_&]:cursor-w-resize",
        "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        // Add cursor style for expanded mode resize
        state === "expanded" && "cursor-ew-resize",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "bg-background relative flex w-full flex-1 flex-col",
        "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn("bg-background h-8 w-full shadow-none", className)}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { state } = useSidebar();

  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(
        "flex flex-col gap-2 p-2",
        // Gradient background for expanded mode (Requirement 3.4)
        state === "expanded" &&
          "bg-gradient-to-b from-sidebar-accent/10 to-transparent",
        className,
      )}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("bg-sidebar-border mx-2 w-auto", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel<T extends React.ElementType = "div">({
  className,
  as,
  ...props
}: { as?: T } & Omit<React.ComponentPropsWithoutRef<T>, "as">) {
  const Comp = as || "div";

  return (
    <Comp
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-in-out focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupAction<T extends React.ElementType = "button">({
  className,
  as,
  ...props
}: { as?: T } & Omit<React.ComponentPropsWithoutRef<T>, "as">) {
  const Comp = as || "button";

  return (
    <Comp
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  // Base classes with smooth animation system:
  // • Transition for transform and background-color (150ms ease-in-out for hover states per Requirement 1.3)
  // • hover:scale-105 for scale transform on hover (150ms per Requirement 1.3)
  // • Icon transitions: transform with 200ms ease-in-out for rotation/bounce (Requirement 1.4)
  // • Using CSS transforms for performance (Requirement 11.6)
  // • Enhanced visual feedback (Requirement 3.1, 3.2, 3.3, 3.5):
  //   - Left border accent on active state
  //   - Hover background with 0.9 opacity
  //   - Medium font weight on active state
  //   - 2px focus ring with accent color
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[transform,background-color,border-color] duration-150 ease-in-out hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground hover:scale-105 focus-visible:ring-2 focus-visible:ring-sidebar-ring active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 border-l-2 border-transparent data-[active=true]:border-l-2 data-[active=true]:border-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:transition-transform [&>svg]:duration-200 [&>svg]:ease-in-out hover:[&>svg]:rotate-12",
  {
    variants: {
      variant: {
        default:
          "hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent/90 hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton<T extends React.ElementType = "button">({
  as,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: { as?: T } & Omit<React.ComponentPropsWithoutRef<T>, "as"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = as || "button";
  const { state, iconSize: contextIconSize } = useSidebar();

  const iconSizeClasses =
    contextIconSize === "small"
      ? "[&>svg]:size-3.5 gap-1.5"
      : contextIconSize === "large"
        ? "[&>svg]:size-5 gap-3"
        : ""; // medium uses default from cva

  const button = (
    <Comp
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        sidebarMenuButtonVariants({ variant, size }),
        iconSizeClasses,
        className,
      )}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed"}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction<T extends React.ElementType = "button">({
  className,
  as,
  showOnHover = false,
  ...props
}: { as?: T } & Omit<React.ComponentPropsWithoutRef<T>, "as"> & {
    showOnHover?: boolean;
  }) {
  const Comp = as || "button";

  return (
    <Comp
      data-slot="sidebar-menu-action"
      data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn("group/menu-sub-item relative", className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton<T extends React.ElementType = "a">({
  as,
  size = "md",
  isActive = false,
  className,
  ...props
}: { as?: T } & Omit<React.ComponentPropsWithoutRef<T>, "as"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  const Comp = as || "a";

  return (
    <Comp
      data-slot="sidebar-menu-sub-button"
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};

// Export new types
export type { SidebarContextProps };
