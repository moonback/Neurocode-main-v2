import { atom } from "jotai";

/** The three top-level IDE modes. */
export type IDEMode = "build" | "inspect" | "automate";

/** Atom that stores the currently active IDE mode. Defaults to 'build'. */
export const ideModeAtom = atom<IDEMode>("build");
