import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo } from "react";
import { useScrollAndNavigateTo } from "@/hooks/useScrollAndNavigateTo";
import { useAtom } from "jotai";
import { activeSettingsSectionAtom } from "@/atoms/viewAtoms";
import { SECTION_IDS, SETTINGS_SEARCH_INDEX } from "@/lib/settingsSearchIndex";
import Fuse from "fuse.js";
import {
  SearchIcon,
  XIcon,
  Settings2,
  Workflow,
  Brain,
  Plug,
  BarChart3,
  GitBranch,
  ShieldAlert,
  Wrench,
  FlaskConical,
  AlertTriangle,
  Stars,
} from "lucide-react";

type SettingsSection = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: SECTION_IDS.general, label: "Général", icon: Settings2 },
  { id: SECTION_IDS.workflow, label: "Workflow", icon: Workflow },
  { id: SECTION_IDS.ai, label: "Intelligence artificielle", icon: Brain },
  { id: SECTION_IDS.providers, label: "Fournisseurs IA", icon: Plug },
  { id: SECTION_IDS.telemetry, label: "Télémétrie", icon: BarChart3 },
  { id: SECTION_IDS.integrations, label: "Intégrations", icon: GitBranch },
  { id: SECTION_IDS.skills, label: "Skills", icon: Stars },
  { id: SECTION_IDS.agentPermissions, label: "Permissions agent", icon: ShieldAlert },
  { id: SECTION_IDS.toolsMcp, label: "Outils (MCP)", icon: Wrench },
  { id: SECTION_IDS.experiments, label: "Expériments", icon: FlaskConical },
  { id: SECTION_IDS.dangerZone, label: "Zone dangereuse", icon: AlertTriangle },
];

const fuse = new Fuse(SETTINGS_SEARCH_INDEX, {
  keys: [
    { name: "label", weight: 2 },
    { name: "description", weight: 1 },
    { name: "keywords", weight: 1.5 },
    { name: "sectionLabel", weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
});

export function SettingsList({ show }: { show: boolean }) {
  const [activeSection, setActiveSection] = useAtom(activeSettingsSectionAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollAndNavigateTo = useScrollAndNavigateTo("/settings", {
    behavior: "smooth",
    block: "start",
  });

  const scrollAndNavigateToWithHighlight = useScrollAndNavigateTo("/settings", {
    behavior: "smooth",
    block: "start",
    highlight: true,
  });

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return fuse.search(searchQuery.trim());
  }, [searchQuery]);

  useEffect(() => {
    if (!show) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            return;
          }
        }
      },
      { rootMargin: "-20% 0px -80% 0px", threshold: 0 },
    );

    for (const section of SETTINGS_SECTIONS) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [show, setActiveSection]);

  if (!show) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="h-6 w-6 rounded-lg bg-[#6c55dc]/12 flex items-center justify-center">
            <Settings2 className="h-3.5 w-3.5 text-[#6c55dc]" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Réglages</h2>
        </div>

        {/* Search bar */}
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher..."
            aria-label="Rechercher dans les réglages"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-muted/30 pl-8 pr-8 py-1.5 text-xs placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6c55dc]/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Thin separator */}
      <div className="mx-3 h-px bg-border/40 mb-1" />

      {/* List */}
      <ScrollArea className="flex-grow">
        <div className="space-y-0.5 px-2 pb-4">
          {searchResults !== null ? (
            searchResults.length > 0 ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                </p>
                {searchResults.map((result) => (
                  <button
                    key={`${result.item.id}-${result.refIndex}`}
                    onClick={() => {
                      scrollAndNavigateToWithHighlight(
                        result.item.id,
                        result.item.sectionId,
                      );
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-sidebar-accent group"
                  >
                    <div className="font-medium text-foreground group-hover:text-[#6c55dc] transition-colors">
                      {result.item.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {result.item.sectionLabel}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <SearchIcon className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Aucun réglage trouvé</p>
                <p className="text-[10px] text-muted-foreground/60">Essayez un autre terme</p>
              </div>
            )
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2.5 pt-1.5 pb-1">
                Navigation
              </p>
              {SETTINGS_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                const Icon = section.icon;
                const isDanger = section.id === SECTION_IDS.dangerZone;

                return (
                  <button
                    key={section.id}
                    onClick={() => scrollAndNavigateTo(section.id)}
                    className={cn(
                      "relative w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 flex items-center gap-2 group",
                      isActive
                        ? isDanger
                          ? "bg-red-500/10 text-red-500 font-medium"
                          : "bg-[#6c55dc]/10 text-[#6c55dc] font-medium"
                        : isDanger
                          ? "text-muted-foreground hover:bg-red-500/8 hover:text-red-500"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                    )}
                  >
                    {/* Active left bar */}
                    {isActive && (
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r-full ${
                          isDanger ? "bg-red-500" : "bg-[#6c55dc]"
                        }`}
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isActive
                          ? isDanger ? "text-red-500" : "text-[#6c55dc]"
                          : "text-muted-foreground/70 group-hover:text-foreground",
                        isDanger && !isActive && "group-hover:text-red-500",
                      )}
                    />
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
