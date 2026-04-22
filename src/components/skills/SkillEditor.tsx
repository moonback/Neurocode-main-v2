import React, { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { skillClient } from "@/ipc/types";
import { queryKeys } from "@/lib/queryKeys";
import type { Skill, ValidationResult } from "@/ipc/types";
import { SkillHelp } from "./SkillHelp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillEditorProps {
  /** The skill to edit. If undefined, the editor is in "create" mode. */
  skill?: Skill;
  /** Called after a successful save or when the user clicks Cancel. */
  onClose?: () => void;
  /** Called immediately after the skill is successfully saved. */
  onSaved?: (skill: Skill) => void;
}

interface Draft {
  name: string;
  description: string;
  content: string;
}

// ---------------------------------------------------------------------------
// Validation state indicator
// ---------------------------------------------------------------------------

interface ValidationIndicatorProps {
  result: ValidationResult | null;
  isValidating: boolean;
}

function ValidationIndicator({
  result,
  isValidating,
}: ValidationIndicatorProps) {
  if (isValidating) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        data-testid="validation-loading"
      >
        <Loader2 className="size-3 animate-spin" />
        Validating…
      </div>
    );
  }
  if (!result) return null;

  if (!result.valid) {
    return (
      <div className="space-y-1" data-testid="validation-errors">
        {result.errors.map((err) => (
          <div
            key={err.code}
            className="flex items-start gap-1.5 text-xs text-destructive"
            data-testid={`validation-error-${err.code}`}
          >
            <AlertCircle className="mt-0.5 size-3 shrink-0" />
            <span>{err.message}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {result.warnings.length > 0 ? (
        <div className="space-y-1" data-testid="validation-warnings">
          {result.warnings.map((w) => (
            <div
              key={w.code}
              className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"
              data-testid={`validation-warning-${w.code}`}
            >
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
          data-testid="validation-ok"
        >
          <CheckCircle2 className="size-3 shrink-0" />
          Skill looks good
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Build the raw SKILL.md text from draft fields
// ---------------------------------------------------------------------------

function buildRawContent(draft: Draft): string {
  return `---\nname: ${draft.name}\ndescription: ${draft.description}\n---\n\n${draft.content}`;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Full-featured skill editor supporting both create and update modes.
 *
 * Features:
 * - Editable name, description, and content fields
 * - Real-time (debounced) validation via the IPC `skills:validate` contract
 * - Error and warning display beneath the content editor
 * - Save / Cancel actions; save is disabled while validation errors exist
 * - Loading spinner during save
 */
export function SkillEditor({ skill, onClose, onSaved }: SkillEditorProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!skill;

  // ── Draft state ──────────────────────────────────────────────────────────

  const [draft, setDraft] = useState<Draft>({
    name: skill?.name ?? "",
    description: skill?.description ?? "",
    content: skill?.content ?? "",
  });

  // Reset draft if a different skill is passed in
  useEffect(() => {
    setDraft({
      name: skill?.name ?? "",
      description: skill?.description ?? "",
      content: skill?.content ?? "",
    });
  }, [skill?.name]);

  // ── Validation ──────────────────────────────────────────────────────────

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validate = useCallback(async (d: Draft) => {
    const raw = buildRawContent(d);
    setIsValidating(true);
    try {
      const result = await skillClient.validate(raw);
      setValidation(result);
    } catch {
      setValidation(null);
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Debounced validation — fires 400 ms after the user stops typing
  useEffect(() => {
    if (!draft.name.trim()) {
      setValidation(null);
      return;
    }
    const timer = setTimeout(() => validate(draft), 400);
    return () => clearTimeout(timer);
  }, [draft, validate]);

  // ── Save mutations ───────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEditMode) {
        return skillClient.update({
          name: draft.name,
          description: draft.description || undefined,
          content: draft.content || undefined,
        });
      } else {
        return skillClient.create({
          name: draft.name,
          description: draft.description,
          content: draft.content,
          scope: "user", // default new skills to user scope
        });
      }
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.skills.all });
      onSaved?.(saved);
      onClose?.();
    },
  });

  // ── Derived flags ────────────────────────────────────────────────────────

  const hasErrors = validation !== null && !validation.valid;
  const isSaveDisabled =
    !draft.name.trim() ||
    !draft.content.trim() ||
    hasErrors ||
    isValidating ||
    saveMutation.isPending;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!isSaveDisabled) saveMutation.mutate();
  };

  const handleCancel = () => {
    setDraft({
      name: skill?.name ?? "",
      description: skill?.description ?? "",
      content: skill?.content ?? "",
    });
    setValidation(null);
    onClose?.();
  };

  const setField =
    <K extends keyof Draft>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [key]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4" data-testid="skill-editor">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <h2
              className="text-base font-semibold"
              data-testid="skill-editor-title"
            >
              {isEditMode ? `Edit /${skill.name}` : "New Skill"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEditMode
                ? "Update the skill's frontmatter and instruction content."
                : "Create a new reusable skill available via slash command."}
            </p>
          </div>
          <SkillHelp />
        </div>
        {skill && (
          <Badge
            variant={skill.scope === "workspace" ? "default" : "secondary"}
            className="text-xs"
            data-testid="skill-editor-scope-badge"
          >
            {skill.scope}
          </Badge>
        )}
      </div>

      {/* Frontmatter fields */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label
            htmlFor="skill-name"
            className="text-xs font-medium text-muted-foreground"
          >
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="skill-name"
            placeholder="e.g. lint  or  dyad:lint"
            value={draft.name}
            onChange={setField("name")}
            disabled={isEditMode} // name is immutable once created
            className="font-mono"
            data-testid="skill-editor-name"
            autoFocus={!isEditMode}
          />
          {isEditMode && (
            <p className="text-xs text-muted-foreground">
              Skill names cannot be changed after creation.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label
            htmlFor="skill-description"
            className="text-xs font-medium text-muted-foreground"
          >
            Description
          </label>
          <Input
            id="skill-description"
            placeholder="Brief description of when to use this skill"
            value={draft.description}
            onChange={setField("description")}
            data-testid="skill-editor-description"
          />
        </div>
      </div>

      {/* Content editor */}
      <div className="space-y-1">
        <label
          htmlFor="skill-content"
          className="text-xs font-medium text-muted-foreground"
        >
          Instructions (Markdown) <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="skill-content"
          placeholder={`# My Skill\n\nDescribe what the AI should do when this skill is invoked.\nUse {{args}} for user-supplied arguments.`}
          value={draft.content}
          onChange={setField("content")}
          className="min-h-[200px] resize-y font-mono text-sm"
          data-testid="skill-editor-content"
          autoFocus={isEditMode}
        />
      </div>

      {/* Validation feedback */}
      <ValidationIndicator result={validation} isValidating={isValidating} />

      {/* Save error */}
      {saveMutation.isError && (
        <div
          className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
          data-testid="skill-editor-save-error"
        >
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          <span>
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : "Failed to save skill. Please try again."}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div
        className="flex justify-end gap-2"
        data-testid="skill-editor-actions"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={saveMutation.isPending}
          data-testid="skill-editor-cancel"
        >
          <X className="mr-1.5 size-3.5" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaveDisabled}
          data-testid="skill-editor-save"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-1.5 size-3.5" />
              {isEditMode ? "Save changes" : "Create skill"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
