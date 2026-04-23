import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import log from "electron-log";
import { ToolDefinition, AgentContext, escapeXmlAttr } from "./types";
import { safeJoin } from "@/ipc/utils/path_utils";
import { deploySupabaseFunction } from "../../../../../../supabase_admin/supabase_management_client";
import {
  isServerFunction,
  isSharedServerModule,
} from "../../../../../../supabase_admin/supabase_utils";
import { engineFetch } from "./engine_fetch";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import { queueCloudSandboxSnapshotSync } from "@/ipc/utils/cloud_sandbox_provider";
import { readSettings } from "@/main/settings";

const readFile = fs.promises.readFile;
const logger = log.scope("edit_file");

const editFileSchema = z.object({
  path: z.string().describe("The file path relative to the app root"),
  content: z.string().describe("The updated code snippet to apply"),
  instructions: z
    .string()
    .optional()
    .describe(
      "Instructions for the edit. A single sentence describing what you are going to do for the sketched edit. This helps the less intelligent model apply the edit correctly. Use first person to describe what you are doing. Don't repeat what you've said in previous messages. Use it to disambiguate any uncertainty in the edit.",
    ),
});

const turboFileEditResponseSchema = z.object({
  result: z.string(),
});

async function callTurboFileEdit(
  params: {
    path: string;
    content: string;
    originalContent: string;
    instructions?: string;
  },
  ctx: AgentContext,
): Promise<string> {
  const response = await engineFetch(ctx, "/tools/turbo-file-edit", {
    method: "POST",
    body: JSON.stringify({
      path: params.path,
      content: params.content,
      originalContent: params.originalContent,
      instructions: params.instructions ?? "",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `File edit failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = turboFileEditResponseSchema.parse(await response.json());
  return data.result;
}

const EXISTING_CODE_MARKER = "// ... existing code ...";

/**
 * Local fallback for applying edits without the Pro engine.
 * Splits the content on `// ... existing code ...` markers and stitches
 * the blocks back into the original file by finding each block's anchor.
 */
function applyEditLocally(
  originalContent: string,
  editContent: string,
): string {
  // If no markers, treat the whole content as the new file
  if (!editContent.includes(EXISTING_CODE_MARKER)) {
    return editContent;
  }

  const blocks = editContent.split(EXISTING_CODE_MARKER);
  let result = originalContent;

  // Filter out empty/whitespace-only blocks
  const nonEmptyBlocks = blocks.filter((b) => b.trim().length > 0);

  for (const block of nonEmptyBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Try to find this block in the current result and replace it
    if (result.includes(trimmed)) {
      // Block already exists verbatim — no change needed for this block
      continue;
    }

    // Find the best insertion point by looking for surrounding context lines
    const blockLines = trimmed.split("\n");
    const firstLine = blockLines[0]?.trim();
    const lastLine = blockLines[blockLines.length - 1]?.trim();

    if (firstLine && result.includes(firstLine)) {
      // Replace from first matching line
      const idx = result.indexOf(firstLine);
      const before = result.slice(0, idx);
      const after = result.slice(idx);

      // Try to find the end anchor
      if (lastLine && after.includes(lastLine)) {
        const endIdx = after.indexOf(lastLine) + lastLine.length;
        result = before + trimmed + after.slice(endIdx);
      } else {
        // Just replace from the anchor to end of that line
        const lineEnd = after.indexOf("\n");
        result = before + trimmed + (lineEnd >= 0 ? after.slice(lineEnd) : "");
      }
    } else {
      // Can't find anchor — append the block (best effort)
      result = result + "\n" + trimmed;
    }
  }

  return result;
}

const DESCRIPTION = `
## When to Use edit_file

Use the \`edit_file\` tool when you need to modify **a section or function** within an existing file. The edit output will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.

**Use only ONE edit_file call per file.** If you need to make multiple changes to the same file, include all edits in sequence within a single call using \`// ... existing code ...\` comments between them.

## When NOT to Use edit_file

Do NOT use this tool when:
- You are making a **small, surgical edit** (1-3 lines) like fixing a typo, renaming a variable, updating a single value, or changing an import. Use \`search_replace\` instead for these precise changes.
- You are creating a brand-new file (use \`write_file\` instead).
- You are rewriting most of an existing file (in those cases, use \`write_file\` to output the complete file instead).

## Basic Format

When writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.

Basic example:
\`\`\`
edit_file(path="file.js", instructions="I am adding error handling to the fetchData function and updating the return type.", content="""
// ... existing code ...
FIRST_EDIT
// ... existing code ...
SECOND_EDIT
// ... existing code ...
THIRD_EDIT
// ... existing code ...
""")
\`\`\`

## General Principles

You should bias towards repeating as few lines of the original file as possible to convey the change.

NEVER show unmodified code in the edit, unless sufficient context of unchanged lines around the code you're editing is needed to resolve ambiguity.

DO NOT omit spans of pre-existing code without using the // ... existing code ... comment to indicate its absence.

## Example: Basic Edit
\`\`\`
edit_file(path="LandingPage.tsx", instructions="I am changing the return statement in LandingPage to render a div with 'hello' instead of the previous content.", content="""
// ... existing code ...

const LandingPage = () => {
  // ... existing code ...
  return (
    <div>hello</div>
  );
};

// ... existing code ...
""")
\`\`\`

## Example: Deleting Code

**When deleting code, you must provide surrounding context and leave an explicit comment indicating what was removed.**
\`\`\`
edit_file(path="utils.ts", instructions="I am removing the deprecatedHelper function located between currentHelper and anotherHelper.", content="""
// ... existing code ...

export function currentHelper() {
  return "active";
}

// REMOVED: deprecatedHelper() function

export function anotherHelper() {
  return "working";
}

// ... existing code ...
""")
\`\`\`
`;
export const editFileTool: ToolDefinition<z.infer<typeof editFileSchema>> = {
  name: "edit_file",
  description: DESCRIPTION,
  inputSchema: editFileSchema,
  defaultConsent: "always",
  modifiesState: true,

  getConsentPreview: (args) => `Edit ${args.path}`,

  buildXml: (args, isComplete) => {
    if (!args.path) return undefined;

    let xml = `<dyad-edit path="${escapeXmlAttr(args.path)}" description="${escapeXmlAttr(args.instructions ?? "")}">\n${args.content ?? ""}`;
    if (isComplete) {
      xml += "\n</dyad-edit>";
    }
    return xml;
  },

  execute: async (args, ctx: AgentContext) => {
    const fullFilePath = safeJoin(ctx.appPath, args.path);

    // Track if this is a shared module
    if (isSharedServerModule(args.path)) {
      ctx.isSharedModulesChanged = true;
    }

    // Read original file content
    if (!fs.existsSync(fullFilePath)) {
      throw new DyadError(
        `File does not exist: ${args.path}`,
        DyadErrorKind.NotFound,
      );
    }

    const originalContent = await readFile(fullFilePath, "utf8");

    // Use Pro engine if available, otherwise apply locally
    const settings = readSettings();
    const apiKey = settings.providerSettings?.auto?.apiKey?.value;

    let newContent: string;
    if (apiKey) {
      // Call the turbo-file-edit endpoint (Pro)
      newContent = await callTurboFileEdit(
        {
          path: args.path,
          content: args.content,
          originalContent,
          instructions: args.instructions,
        },
        ctx,
      );
    } else {
      // Local fallback: apply edit without Pro engine
      newContent = applyEditLocally(originalContent, args.content);
    }

    if (!newContent) {
      throw new Error(
        "Failed to extract content from turbo-file-edit response",
      );
    }

    // Ensure directory exists
    const dirPath = path.dirname(fullFilePath);
    fs.mkdirSync(dirPath, { recursive: true });

    // Write file content
    fs.writeFileSync(fullFilePath, newContent);
    logger.log(`Successfully edited file: ${fullFilePath}`);
    queueCloudSandboxSnapshotSync({
      appId: ctx.appId,
      changedPaths: [args.path],
    });

    // Deploy Supabase function if applicable
    if (
      ctx.supabaseProjectId &&
      isServerFunction(args.path) &&
      !ctx.isSharedModulesChanged
    ) {
      try {
        await deploySupabaseFunction({
          supabaseProjectId: ctx.supabaseProjectId,
          functionName: path.basename(path.dirname(args.path)),
          appPath: ctx.appPath,
          organizationSlug: ctx.supabaseOrganizationSlug ?? null,
        });
      } catch (error) {
        return `File edited, but failed to deploy Supabase function: ${error}`;
      }
    }

    return `Successfully edited ${args.path}`;
  },
};
