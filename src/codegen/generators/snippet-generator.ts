/**
 * Snippet Generator
 *
 * Provides common code snippets and handles insertion.
 */

import { TemplateLoader } from "../template-loader";
import { TemplateEngine } from "../template-engine";
import { FileSystemManager, FileOperationResult } from "../file-system";
import * as path from "node:path";

export interface SnippetGeneratorOptions {
  type: string;
  file?: string;
  line?: number;
  params?: Record<string, any>;
}

export class SnippetGenerator {
  constructor(
    private loader: TemplateLoader,
    private engine: TemplateEngine,
    private fsManager: FileSystemManager
  ) {}

  /**
   * Generates or inserts a snippet
   */
  async generate(options: SnippetGeneratorOptions): Promise<FileOperationResult[]> {
    const context = {
      ...options.params,
      type: options.type,
    };

    const results: FileOperationResult[] = [];
    const templateName = `snippet-${options.type}`;
    const snippetTemplate = await this.loader.loadTemplate(templateName);
    const snippetContent = this.engine.render(snippetTemplate.content, context);

    if (options.file) {
      // TODO: Implement insertion at specific line
      // For now, we'll just append to the file
      results.push(await this.fsManager.writeFile(options.file, snippetContent, "append"));
    } else {
      // Just return the snippet to be printed by the CLI
      // We'll use a virtual path to represent the snippet output
      results.push({
        path: `snippet:${options.type}`,
        action: "create",
        success: true,
        size: Buffer.byteLength(snippetContent),
        content: snippetContent // We add content here so CLI can print it
      } as any);
    }

    return results;
  }
}

/**
 * Creates a snippet generator instance
 */
export function createSnippetGenerator(
  loader: TemplateLoader,
  engine: TemplateEngine,
  fsManager: FileSystemManager
): SnippetGenerator {
  return new SnippetGenerator(loader, engine, fsManager);
}
