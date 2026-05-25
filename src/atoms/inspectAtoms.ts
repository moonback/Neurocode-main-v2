import { atom } from "jotai";

/** Valid views within the Inspect panel */
export type InspectView = "dashboard" | "codeReview" | "diagnostics";

/** Currently active Inspect view */
export const inspectViewAtom = atom<InspectView>("dashboard");

/** The currently selected file ID in the Code Review view */
export const selectedReviewFileIdAtom = atom<string | null>(null);

/** Type for the status of a diagnostic check */
export type DiagnosticStatus = "pending" | "passed" | "failed";

/** Atom to track the diagnostic status */
export const diagnosticStatusAtom = atom<DiagnosticStatus>("pending");
