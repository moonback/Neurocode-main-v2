import { useAtom } from "jotai";
import { ideModeAtom, type IDEMode } from "@/atoms/modeAtom";
import { Hammer, ScanSearch, Bot } from "lucide-react";
import "./ModeSelector.css";

const MODES: {
  id: IDEMode;
  label: string;
  Icon: React.ElementType;
  description: string;
}[] = [
  {
    id: "build",
    label: "Build",
    Icon: Hammer,
    description: "Development & Code Editing",
  },
  {
    id: "inspect",
    label: "Inspect",
    Icon: ScanSearch,
    description: "Analysis & Code Review",
  },
  {
    id: "automate",
    label: "Automate",
    Icon: Bot,
    description: "Autonomous Agents & Workflows",
  },
];

export function ModeSelector() {
  const [mode, setMode] = useAtom(ideModeAtom);

  return (
    <div className="mode-selector" role="tablist" aria-label="IDE Mode">
      {MODES.map(({ id, label, Icon, description }) => {
        const isActive = mode === id;
        return (
          <button
            key={id}
            id={`mode-selector-${id}`}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label}: ${description}`}
            className={`mode-selector__item${isActive ? " mode-selector__item--active" : ""}`}
            onClick={() => setMode(id)}
          >
            <span className="mode-selector__icon">
              <Icon size={15} strokeWidth={isActive ? 2.5 : 1.8} />
            </span>
            <span className="mode-selector__label">{label}</span>
            {isActive && <span className="mode-selector__active-bar" />}
          </button>
        );
      })}
    </div>
  );
}
