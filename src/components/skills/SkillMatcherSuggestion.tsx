import React from "react";
import { Sparkles, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchedSkill } from "@/skills/types";

interface SkillMatcherSuggestionProps {
  /** The skill that was matched and its relevance information. */
  match: MatchedSkill;
  /** Called when the user accepts the suggestion. */
  onAccept: (match: MatchedSkill) => void;
  /** Called when the user dismisses the suggestion. */
  onDismiss: (match: MatchedSkill) => void;
}

/**
 * A compact suggestion card shown when a skill matches the current context.
 *
 * This component highlights why the skill was suggested and provides
 * immediate actions to use it or clear the suggestion.
 */
export function SkillMatcherSuggestion({
  match,
  onAccept,
  onDismiss,
}: SkillMatcherSuggestionProps) {
  const { skill, relevance, reason } = match;

  return (
    <Card
      className="border-primary/20 bg-primary/5 shadow-sm transition-all hover:bg-primary/10"
      data-testid={`skill-suggestion-${skill.name}`}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <CardTitle className="text-sm font-semibold">
              Suggested Skill: /{skill.name}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-background/80"
            onClick={() => onDismiss(match)}
            data-testid="dismiss-suggestion"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <CardDescription className="text-xs mt-1">
          {skill.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-3">
        <div className="flex items-center gap-2 rounded-md bg-background/50 p-2 border border-primary/10">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
              Why this skill?
            </p>
            <p className="text-xs text-foreground truncate" title={reason}>
              {reason}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1">
            <div
              className="h-1.5 w-12 rounded-full bg-muted overflow-hidden"
              title={`Relevance: ${Math.round(relevance * 100)}%`}
            >
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${relevance * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {Math.round(relevance * 100)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onAccept(match)}
            data-testid="accept-suggestion"
          >
            <Check className="mr-1.5 h-3 w-3" />
            Use Skill
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onDismiss(match)}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
