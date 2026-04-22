import { useQuery } from "@tanstack/react-query";
import { skillClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { Skill, SkillFilter } from "@/ipc/types";

/**
 * Fetches registered skills from the skill registry.
 * Skills are SKILL.md-based instruction sets discovered from
 * ~/.neurocode/skills/ and .neurocode/skills/.
 */
export function useSkills(filter?: SkillFilter) {
  const query = useQuery({
    queryKey: queryKeys.skills.list(filter),
    queryFn: (): Promise<Skill[]> => skillClient.list(filter),
    // Skills don't change often; a 30s stale time avoids unnecessary IPC calls
    staleTime: 30_000,
  });

  return {
    skills: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
