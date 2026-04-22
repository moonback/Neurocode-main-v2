import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronRight,
  Edit2,
  Play,
  Search,
  Trash2,
  User,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { skillClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { Skill, SkillFilter } from "@/ipc/types";
import { SkillHelp } from "./SkillHelp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillListProps {
  /** Called when the user clicks "Edit" on a skill. */
  onEdit?: (skill: Skill) => void;
  /** Called when the user clicks "Invoke" on a skill. */
  onInvoke?: (skill: Skill) => void;
}

type ScopeFilter = "all" | "user" | "workspace";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group flat skill array into { [namespace]: Skill[] } + ungrouped list. */
function groupSkills(skills: Skill[]): {
  grouped: Record<string, Skill[]>;
  ungrouped: Skill[];
} {
  const grouped: Record<string, Skill[]> = {};
  const ungrouped: Skill[] = [];

  for (const skill of skills) {
    if (skill.namespace) {
      if (!grouped[skill.namespace]) grouped[skill.namespace] = [];
      grouped[skill.namespace].push(skill);
    } else {
      ungrouped.push(skill);
    }
  }
  return { grouped, ungrouped };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SkillRowProps {
  skill: Skill;
  onEdit?: (skill: Skill) => void;
  onInvoke?: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  isDeleting: boolean;
  indent?: boolean;
}

function SkillRow({
  skill,
  onEdit,
  onInvoke,
  onDelete,
  isDeleting,
  indent,
}: SkillRowProps) {
  return (
    <div
      data-testid={`skill-row-${skill.name}`}
      className={`flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40 ${
        indent ? "ml-6 border-l-2 border-l-primary/20" : ""
      }`}
    >
      {/* Icon */}
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <BookOpen className="size-4" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-sm font-medium"
            data-testid={`skill-name-${skill.name}`}
          >
            /{skill.name}
          </span>
          <Badge
            variant={skill.scope === "workspace" ? "default" : "secondary"}
            className="text-xs"
            data-testid={`skill-scope-badge-${skill.name}`}
          >
            {skill.scope === "workspace" ? (
              <>
                <FolderOpen className="mr-1 size-3" />
                workspace
              </>
            ) : (
              <>
                <User className="mr-1 size-3" />
                user
              </>
            )}
          </Badge>
        </div>
        {skill.description && (
          <p
            className="mt-0.5 text-xs text-muted-foreground line-clamp-2"
            data-testid={`skill-description-${skill.name}`}
          >
            {skill.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {onInvoke && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={`Invoke /${skill.name}`}
            data-testid={`invoke-skill-${skill.name}`}
            onClick={() => onInvoke(skill)}
          >
            <Play className="size-3.5" />
          </Button>
        )}
        {onEdit && (
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            title={`Edit /${skill.name}`}
            data-testid={`edit-skill-${skill.name}`}
            onClick={() => onEdit(skill)}
          >
            <Edit2 className="size-3.5" />
          </Button>
        )}

        {/* Delete with confirmation */}
        <AlertDialog>
          <AlertDialogTrigger {...({ asChild: true } as any)}>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive hover:text-destructive"
              title={`Delete /${skill.name}`}
              data-testid={`delete-skill-${skill.name}`}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete skill /{skill.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the skill and its SKILL.md file
                from disk. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onDelete(skill)}
                data-testid={`confirm-delete-skill-${skill.name}`}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface NamespaceGroupProps {
  namespace: string;
  skills: Skill[];
  onEdit?: (skill: Skill) => void;
  onInvoke?: (skill: Skill) => void;
  onDelete: (skill: Skill) => void;
  deletingName: string | null;
}

function NamespaceGroup({
  namespace,
  skills,
  onEdit,
  onInvoke,
  onDelete,
  deletingName,
}: NamespaceGroupProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-1" data-testid={`namespace-group-${namespace}`}>
      {/* Namespace header */}
      <button
        className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((e) => !e)}
        data-testid={`namespace-toggle-${namespace}`}
        aria-expanded={expanded}
      >
        <ChevronRight
          className={`size-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <span className="font-mono">{namespace}</span>
        <span className="ml-auto text-xs opacity-60">{skills.length}</span>
      </button>

      {/* Skills in namespace */}
      {expanded && (
        <div className="space-y-1">
          {skills.map((skill) => (
            <SkillRow
              key={skill.name}
              skill={skill}
              onEdit={onEdit}
              onInvoke={onInvoke}
              onDelete={onDelete}
              isDeleting={deletingName === skill.name}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Displays all registered skills with filtering, grouping, and actions.
 *
 * Features:
 * - Search by name/description
 * - Filter by scope (all / user / workspace)
 * - Hierarchical namespace grouping with collapsible sections
 * - Edit, invoke, and delete actions per skill
 */
export function SkillList({ onEdit, onInvoke }: SkillListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [deletingName, setDeletingName] = useState<string | null>(null);

  // Build the IPC filter (scope only — client-side search is faster for small lists)
  const ipcFilter: SkillFilter | undefined = useMemo(
    () => (scopeFilter === "all" ? undefined : { scope: scopeFilter }),
    [scopeFilter],
  );

  const { data: skills = [], isLoading } = useQuery({
    queryKey: queryKeys.skills.list(ipcFilter),
    queryFn: () => skillClient.list(ipcFilter),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => skillClient.delete(name),
    onMutate: (name) => setDeletingName(name),
    onSettled: () => setDeletingName(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
    },
  });

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [skills, search]);

  const { grouped, ungrouped } = useMemo(
    () => groupSkills(filtered),
    [filtered],
  );
  const hasNamespaces = Object.keys(grouped).length > 0;

  const handleDelete = (skill: Skill) => {
    deleteMutation.mutate(skill.name);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-12 text-muted-foreground"
        data-testid="skill-list-loading"
      >
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading skills…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="skill-list">
      {/* Toolbar */}
      <div className="flex items-center gap-2" data-testid="skill-list-toolbar">
        <SkillHelp />
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            id="skill-search"
            placeholder="Search skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="skill-search-input"
          />
        </div>
        <Select
          value={scopeFilter}
          onValueChange={(v) => setScopeFilter(v as ScopeFilter)}
        >
          <SelectTrigger
            className="h-8 w-[130px] text-sm"
            data-testid="skill-scope-filter"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="user">User only</SelectItem>
            <SelectItem value="workspace">Workspace only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center"
          data-testid="skill-list-empty"
        >
          <BookOpen className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search
              ? `No skills match "${search}"`
              : "No skills registered yet"}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
              data-testid="skill-search-clear"
            >
              Clear search
            </Button>
          )}
        </div>
      )}

      {/* Skill list */}
      {filtered.length > 0 && (
        <div className="space-y-3" data-testid="skill-list-items">
          {/* Ungrouped skills */}
          {ungrouped.length > 0 && (
            <div className="space-y-1" data-testid="skill-ungrouped">
              {ungrouped.map((skill) => (
                <SkillRow
                  key={skill.name}
                  skill={skill}
                  onEdit={onEdit}
                  onInvoke={onInvoke}
                  onDelete={handleDelete}
                  isDeleting={deletingName === skill.name}
                />
              ))}
            </div>
          )}

          {/* Namespace groups */}
          {hasNamespaces && (
            <div className="space-y-2" data-testid="skill-namespace-groups">
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ns, nsSkills]) => (
                  <NamespaceGroup
                    key={ns}
                    namespace={ns}
                    skills={nsSkills}
                    onEdit={onEdit}
                    onInvoke={onInvoke}
                    onDelete={handleDelete}
                    deletingName={deletingName}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <p
          className="text-xs text-muted-foreground"
          data-testid="skill-list-summary"
        >
          {filtered.length} skill{filtered.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}
    </div>
  );
}
