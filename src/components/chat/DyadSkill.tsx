import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  DyadCard,
  DyadCardHeader,
  DyadExpandIcon,
  DyadStateIndicator,
  DyadDescription,
  DyadCardContent,
} from "./DyadCardPrimitives";

interface DyadSkillProps {
  children?: ReactNode;
  node?: any;
  name?: string;
  description?: string;
}

export const DyadSkill: React.FC<DyadSkillProps> = ({
  children,
  node,
  name: nameProp,
  description: descriptionProp,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const name = nameProp || node?.properties?.name || "";
  const description = descriptionProp || node?.properties?.description || "";
  const state = node?.properties?.state as CustomTagState;

  const inProgress = state === "pending";
  const aborted = state === "aborted";

  return (
    <DyadCard
      state={state}
      accentColor="purple"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <DyadCardHeader icon={<Sparkles size={15} />} accentColor="purple">
        <div className="min-w-0 truncate">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">
              Skill utilisé
            </span>
            {name && (
              <code className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-mono">
                /{name}
              </code>
            )}
          </div>
          {description && (
            <span className="text-[11px] text-muted-foreground truncate block mt-0.5">
              {description}
            </span>
          )}
        </div>
        {inProgress && (
          <DyadStateIndicator state="pending" pendingLabel="Chargement..." />
        )}
        {aborted && (
          <DyadStateIndicator state="aborted" abortedLabel="Non chargé" />
        )}
        <div className="ml-auto flex items-center gap-1">
          <DyadExpandIcon isExpanded={isContentVisible} />
        </div>
      </DyadCardHeader>
      {description && !isContentVisible && (
        <DyadDescription>
          <span className="line-clamp-2">
            <span className="font-medium">Description : </span>
            {description}
          </span>
        </DyadDescription>
      )}
      <DyadCardContent isExpanded={isContentVisible}>
        <div
          className="text-xs cursor-text"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            {description && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <div className="text-sm text-purple-900 dark:text-purple-100">
                  <span className="font-medium">Description : </span>
                  {description}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instructions du skill :
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <CodeHighlight className="language-markdown">
                  {children}
                </CodeHighlight>
              </div>
            </div>
          </div>
        </div>
      </DyadCardContent>
    </DyadCard>
  );
};
