import { Home, Inbox, Settings, Store, BookOpen } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar"; // import useSidebar hook
import { useEffect, useState, useRef } from "react";
import { useAtom } from "jotai";
import { dropdownOpenAtom } from "@/atoms/uiAtoms";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  SidebarHeader,
  SidebarSearchFilter,
  PinnedItemsSection,
  RecentItemsSection,
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { SettingsList } from "./SettingsList";
import { LibraryList } from "./LibraryList";

// Menu items.
const items = [
  {
    id: "apps",
    title: "Apps",
    to: "/",
    icon: Home,
  },
  {
    id: "chat",
    title: "Chat",
    to: "/chat",
    icon: Inbox,
  },
  {
    id: "settings",
    title: "Config",
    to: "/settings",
    icon: Settings,
  },
  {
    id: "library",
    title: "Librairie",
    to: "/library",
    icon: BookOpen,
  },
  {
    id: "hub",
    title: "Hub",
    to: "/hub",
    icon: Store,
  },
];

// Hover state types
type HoverState =
  | "start-hover:app"
  | "start-hover:chat"
  | "start-hover:settings"
  | "start-hover:library"
  | "clear-hover"
  | "no-hover";

export function AppSidebar() {
  const { state, toggleSidebar, pinnedItems, recentItems, addRecentItem } =
    useSidebar(); // retrieve current sidebar state
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);

  // Update recent items when path changes
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  useEffect(() => {
    const currentItem = items.find(
      (item) =>
        (item.to === "/" && pathname === "/") ||
        (item.to !== "/" && pathname.startsWith(item.to)),
    );
    if (currentItem) {
      addRecentItem(currentItem.id);
    }
  }, [pathname, addRecentItem]);

  useEffect(() => {
    if (hoverState.startsWith("start-hover") && state === "collapsed") {
      expandedByHover.current = true;
      toggleSidebar();
    }
    if (
      hoverState === "clear-hover" &&
      state === "expanded" &&
      expandedByHover.current &&
      !isDropdownOpen
    ) {
      toggleSidebar();
      expandedByHover.current = false;
      setHoverState("no-hover");
    }
  }, [hoverState, toggleSidebar, state, setHoverState, isDropdownOpen]);


  const isAppRoute =
    routerState.location.pathname === "/" ||
    routerState.location.pathname.startsWith("/app-details");
  const isChatRoute = routerState.location.pathname === "/chat";
  const isSettingsRoute = routerState.location.pathname.startsWith("/settings");
  const isLibraryRoute = routerState.location.pathname.startsWith("/library");

  let selectedItem: string | null = null;
  if (hoverState === "start-hover:app") {
    selectedItem = "Apps";
  } else if (hoverState === "start-hover:chat") {
    selectedItem = "Chat";
  } else if (hoverState === "start-hover:settings") {
    selectedItem = "Settings";
  } else if (hoverState === "start-hover:library") {
    selectedItem = "Library";
  } else if (state === "expanded") {
    if (isAppRoute) {
      selectedItem = "Apps";
    } else if (isChatRoute) {
      selectedItem = "Chat";
    } else if (isSettingsRoute) {
      selectedItem = "Settings";
    } else if (isLibraryRoute) {
      selectedItem = "Library";
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      onMouseLeave={() => {
        if (!isDropdownOpen) {
          setHoverState("clear-hover");
        }
      }}
    >
      <SidebarHeader>
        <SidebarSearchFilter />
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <div className="flex mt-8">
          {/* Left Column: Menu items */}
          <div className="">
            <SidebarTrigger
              onMouseEnter={() => {
                setHoverState("clear-hover");
              }}
            />
            <AppIcons onHoverChange={setHoverState} />
          </div>
          {/* Right Column: Chat List Section */}
          <div className="w-[272px]">
            {state === "expanded" && (
              <>
                <PinnedItemsSection>
                  {items
                    .filter((item) => pinnedItems.includes(item.id))
                    .map((item) => (
                      <SidebarMenuItem
                        key={item.id}
                        id={item.id}
                        title={item.title}
                      >
                        <SidebarMenuButton as={Link} to={item.to}>
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </PinnedItemsSection>
                <RecentItemsSection>
                  {items
                    .filter((item) => recentItems.includes(item.id))
                    .map((item) => (
                      <SidebarMenuItem
                        key={item.id}
                        id={item.id}
                        title={item.title}
                      >
                        <SidebarMenuButton as={Link} to={item.to}>
                          <item.icon />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                </RecentItemsSection>
              </>
            )}
            <AppList show={selectedItem === "Apps"} />
            <ChatList show={selectedItem === "Chat"} />
            <SettingsList show={selectedItem === "Settings"} />
            <LibraryList show={selectedItem === "Library"} />
          </div>
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}

function AppIcons({
  onHoverChange,
}: {
  onHoverChange: (state: HoverState) => void;
}) {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { itemOrder, reorderItems } = useSidebar();

  // Sort items based on saved order (Requirement 6.3)
  const sortedItems = React.useMemo(() => {
    if (itemOrder.length === 0) return items;
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const sorted = itemOrder
      .map((id) => itemMap.get(id))
      .filter((item): item is (typeof items)[0] => !!item);

    // Add any items not in itemOrder at the end
    const remaining = items.filter((item) => !itemOrder.includes(item.id));
    return [...sorted, ...remaining];
  }, [itemOrder]);

  return (
    // When collapsed: only show the main menu
    <SidebarGroup className="pr-0">
      {/* <SidebarGroupLabel>Dyad</SidebarGroupLabel> */}

      <SidebarGroupContent>
        <SidebarMenu sortable onReorder={reorderItems}>
          {sortedItems.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.id} title={item.title} id={item.id}>
                <SidebarMenuButton
                  as={Link}
                  to={item.to}
                  size="sm"
                  className={`font-medium w-14 flex flex-col items-center gap-1 h-14 mb-2 rounded-2xl ${
                    isActive ? "bg-sidebar-accent" : ""
                  }`}
                  onMouseEnter={() => {
                    if (item.title === "Apps") {
                      onHoverChange("start-hover:app");
                    } else if (item.title === "Chat") {
                      onHoverChange("start-hover:chat");
                    } else if (item.title === "Settings") {
                      onHoverChange("start-hover:settings");
                    } else if (item.title === "Library") {
                      onHoverChange("start-hover:library");
                    }
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <item.icon className="h-5 w-5" />
                    <span className={"text-xs"}>{item.title}</span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
