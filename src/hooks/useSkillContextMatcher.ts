import { useSetAtom } from "jotai";
import { useCallback } from "react";
import { ipc } from "@/ipc/types";
import { contextMatcher } from "@/skills/context_matcher";
import { matchedSkillsAtom, dismissedSkillsAtom } from "@/atoms/chatAtoms";
import { useAtomValue } from "jotai";

/**
 * Returns a `analyzeContext` function that, given a user message, fetches all
 * registered skills and runs the context matcher against the message.
 *
 * The call is **fire-and-forget** — it does not block message submission.
 * Results are stored in `matchedSkillsAtom` for downstream tasks (15.2–15.4)
 * to consume.
 */
export function useSkillContextMatcher() {
  const setMatchedSkills = useSetAtom(matchedSkillsAtom);
  const dismissedSkills = useAtomValue(dismissedSkillsAtom);

  const analyzeContext = useCallback(
    (message: string) => {
      // Reset immediately so stale results are not shown while the new ones load
      setMatchedSkills([]);

      if (!message.trim()) return;

      // Non-blocking: run in the background without awaiting
      void (async () => {
        try {
          const skills = await ipc.skills.list(undefined);
          if (skills.length === 0) return;

          const matches = contextMatcher.match(message, skills);

          // Filter out dismissed skills
          const filteredMatches = matches.filter(
            (match) => !dismissedSkills.has(match.skill.name),
          );

          setMatchedSkills(filteredMatches);
        } catch {
          // Skill matching is best-effort; silently ignore errors so the
          // main chat submission flow is never affected.
        }
      })();
    },
    [setMatchedSkills, dismissedSkills],
  );

  return { analyzeContext };
}
