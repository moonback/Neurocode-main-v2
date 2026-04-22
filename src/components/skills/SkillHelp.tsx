import React from "react";
import { HelpCircle, BookOpen, Code, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface SkillHelpProps {
  /** Custom trigger element. If not provided, a default help icon button is used. */
  trigger?: React.ReactNode;
}

/**
 * In-app help dialog explaining skill format and usage.
 *
 * Provides comprehensive documentation on:
 * - SKILL.md file format
 * - Frontmatter fields
 * - Skill invocation methods
 * - Naming conventions
 * - Examples
 */
export function SkillHelp({ trigger }: SkillHelpProps) {
  return (
    <Dialog>
      {trigger ? (
        <DialogTrigger {...({ asChild: true } as any)}>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger
          className="inline-flex size-7 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          title="Skill format help"
          data-testid="skill-help-button"
        >
          <HelpCircle className="size-4" />
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="size-5" />
            Skill Format & Usage
          </DialogTitle>
          <DialogDescription>
            Learn how to create and use skills in NeuroCode
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm" data-testid="skill-help-content">
          {/* What is a Skill */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">What is a Skill?</h3>
            <p className="text-muted-foreground">
              A skill is a reusable instruction set that extends NeuroCode's
              capabilities. Skills are defined in SKILL.md files containing YAML
              frontmatter (metadata) and markdown content (instructions).
            </p>
          </section>

          {/* File Format */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Code className="size-4" />
              SKILL.md File Format
            </h3>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Skills use a structured format with YAML frontmatter followed by
                markdown instructions:
              </p>
              <div className="rounded-md bg-muted p-3 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre">
                  {`---
name: lint
description: Run pre-commit checks including formatting and linting
---

# Lint

Run pre-commit checks to ensure code quality.

## Instructions

1. Run formatting check with \`npm run fmt\`
2. Run linting with \`npm run lint\`
3. Fix any errors found`}
                </pre>
              </div>
            </div>
          </section>

          {/* Frontmatter Fields */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">Frontmatter Fields</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                    name
                  </code>
                  <Badge variant="destructive" className="text-xs">
                    Required
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  The skill identifier used in slash commands. Must be lowercase
                  letters, numbers, and hyphens only.
                </p>
                <p className="text-muted-foreground text-xs">
                  Examples: <code className="text-xs">lint</code>,{" "}
                  <code className="text-xs">fix-issue</code>,{" "}
                  <code className="text-xs">dyad:lint</code> (grouped)
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                    description
                  </code>
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  A brief explanation of when to use the skill. Used for
                  automatic skill loading based on context matching.
                </p>
              </div>
            </div>
          </section>

          {/* Naming Conventions */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">Naming Conventions</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="font-medium text-xs">Simple Skills</p>
                <p className="text-muted-foreground text-xs">
                  Use lowercase letters, numbers, and hyphens:{" "}
                  <code className="text-xs">my-skill</code>
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-xs">Grouped Skills</p>
                <p className="text-muted-foreground text-xs">
                  Use a namespace prefix with colon:{" "}
                  <code className="text-xs">namespace:skill-name</code>
                </p>
                <p className="text-muted-foreground text-xs">
                  Example: <code className="text-xs">dyad:lint</code>,{" "}
                  <code className="text-xs">dyad:fix-issue</code>
                </p>
              </div>
            </div>
          </section>

          {/* Skill Invocation */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Zap className="size-4" />
              How to Use Skills
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="font-medium text-xs">Slash Commands</p>
                <p className="text-muted-foreground text-xs">
                  Type <code className="text-xs">/skill-name</code> in the chat
                  to explicitly invoke a skill. You can also pass arguments:{" "}
                  <code className="text-xs">/lint src/</code>
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium text-xs">Automatic Loading</p>
                <p className="text-muted-foreground text-xs">
                  NeuroCode automatically suggests relevant skills based on your
                  message context. Skills with good descriptions are more likely
                  to be matched.
                </p>
              </div>
            </div>
          </section>

          {/* Skill Locations */}
          <section className="space-y-3">
            <h3 className="font-semibold text-base">Skill Locations</h3>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    User
                  </Badge>
                  <code className="text-xs font-mono">
                    ~/.neurocode/skills/
                  </code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Personal skills available only to you
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    Workspace
                  </Badge>
                  <code className="text-xs font-mono">.neurocode/skills/</code>
                </div>
                <p className="text-muted-foreground text-xs">
                  Team skills shared via version control. Workspace skills
                  override user skills with the same name.
                </p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="space-y-2">
            <h3 className="font-semibold text-base">Tips</h3>
            <ul className="space-y-1 text-muted-foreground text-xs list-disc list-inside">
              <li>
                Write clear, specific instructions in the markdown content
              </li>
              <li>Use descriptive names that reflect what the skill does</li>
              <li>
                Add a good description to enable automatic skill suggestions
              </li>
              <li>
                Group related skills under a common namespace for better
                organization
              </li>
              <li>
                Test your skills after creation to ensure they work as expected
              </li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
