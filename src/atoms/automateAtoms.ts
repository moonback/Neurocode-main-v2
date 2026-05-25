import { atom } from "jotai";

/** Valid views within the Automate panel */
export type AutomateView = "dashboard" | "agents" | "scheduler";

/** Currently active Automate view */
export const automateViewAtom = atom<AutomateView>("dashboard");

/** The currently selected agent ID in the Agent Console */
export const selectedAgentIdAtom = atom<string | null>(null);
