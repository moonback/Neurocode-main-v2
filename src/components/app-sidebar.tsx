import {
  Home,
  Inbox,
  Settings,
  Store,
  BookOpen,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useSidebar } from "@/components/ui/sidebar";
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
} from "@/components/ui/sidebar";
import { ChatList } from "./ChatList";
import { AppList } from "./AppList";
import { SettingsList } from "./SettingsList";
import { LibraryList } from "./LibraryList";

// Menu items
const items = [
  { title: "Apps", label: "Apps", to: "/", icon: Home },
  { title: "Chat", label: "Chat", to: "/chat", icon: Inbox },
  { title: "Config", label: "Réglages", to: "/settings", icon: Settings },
  { title: "Librairie", label: "Librairie", to: "/library", icon: BookOpen },
  { title: "Hub", label: "Hub", to: "/hub", icon: Store },
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
  const { state, toggleSidebar } = useSidebar();
  const [hoverState, setHoverState] = useState<HoverState>("no-hover");
  const expandedByHover = useRef(false);
  const [isDropdownOpen] = useAtom(dropdownOpenAtom);

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

  const routerState = useRouterState();
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
    if (isAppRoute) selectedItem = "Apps";
    else if (isChatRoute) selectedItem = "Chat";
    else if (isSettingsRoute) selectedItem = "Settings";
    else if (isLibraryRoute) selectedItem = "Library";
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
      <SidebarContent className="overflow-hidden">
        <div className="flex mt-6">
          {/* Left Column: Icon rail */}
          <div className="flex flex-col items-center">
            <SidebarTrigger
              onMouseEnter={() => setHoverState("clear-hover")}
              className="mb-2"
            />
            <AppIcons onHoverChange={setHoverState} />
          </div>

          {/* Right Column: Expanded content */}
          <div className="w-[272px]">
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

  return (
    <SidebarGroup className="pr-0 pt-0">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive =
              (item.to === "/" && pathname === "/") ||
              (item.to !== "/" && pathname.startsWith(item.to));

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  as={Link}
                  to={item.to}
                  size="sm"
                  tooltip={item.label}
                  className={`
                    relative flex flex-col items-center justify-center
                    w-12 h-12 rounded-xl mb-1
                    transition-all duration-200
                    group
                    ${
                      isActive
                        ? "bg-[#6c55dc]/15 text-[#6c55dc] shadow-sm"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }
                  `}
                  onMouseEnter={() => {
                    if (item.title === "Apps") onHoverChange("start-hover:app");
                    else if (item.title === "Chat") onHoverChange("start-hover:chat");
                    else if (item.title === "Config") onHoverChange("start-hover:settings");
                    else if (item.title === "Librairie") onHoverChange("start-hover:library");
                  }}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#6c55dc]" />
                  )}
                  <div className="flex flex-col items-center gap-0.5">
                    <item.icon
                      className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "text-[#6c55dc]" : ""
                      }`}
                    />
                    <span className="text-[10px] font-medium leading-none">
                      {item.label}
                    </span>
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
