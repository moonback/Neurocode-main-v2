import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkillEditor } from "./SkillEditor";
import type { Skill } from "@/ipc/types";

interface SkillCreatorProps {
  /** Called after the skill is successfully created. */
  onCreated?: (skill: Skill) => void;
  /** Custom trigger element. If not provided, a default "New Skill" button is used. */
  trigger?: React.ReactNode;
}

/**
 * A dialog wrapper around SkillEditor for creating new skills.
 *
 * This provides a standard entry point for skill creation that can be
 * reused in the SkillList or other parts of the UI.
 */
export function SkillCreator({ onCreated, trigger }: SkillCreatorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger {...({ asChild: true } as any)}>
        {trigger || (
          <Button size="sm" data-testid="new-skill-button">
            <Plus className="mr-2 h-4 w-4" />
            New Skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Skill</DialogTitle>
          <DialogDescription>
            Define a new set of instructions that can be triggered by a slash
            command or automatically suggested.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <SkillEditor onSaved={onCreated} onClose={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
