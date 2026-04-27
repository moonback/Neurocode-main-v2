/**
 * Database Generator
 *
 * Generates Drizzle schemas.
 */

import { TemplateLoader } from "../template-loader";
import { TemplateEngine } from "../template-engine";
import { FileSystemManager, FileOperationResult } from "../file-system";
import { GeneratorValidator } from "../generator-validator";

export interface DbGeneratorOptions {
  name: string;
  append?: boolean;
}

export class DbGenerator {
  constructor(
    private loader: TemplateLoader,
    private engine: TemplateEngine,
    private fsManager: FileSystemManager
  ) {}

  /**
   * Generates database schema
   */
  async generate(options: DbGeneratorOptions): Promise<FileOperationResult[]> {
    const context = {
      ...options,
      name: options.name,
    };

    const results: FileOperationResult[] = [];
    const schemaTemplate = await this.loader.loadTemplate("db-schema");
    const schemaContent = this.engine.render(schemaTemplate.content, context);

    if (options.append !== false) {
      // Append to existing schema.ts
      // Note: We don't validate the whole file after append here for performance, 
      // but we could validate the appended chunk if it's a complete TS fragment.
      results.push(await this.fsManager.writeFile("src/db/schema.ts", schemaContent, "append"));
    } else {
      // Create new schema file
      const fileName = `${this.kebabCase(options.name)}.ts`;
      const filePath = `src/db/schemas/${fileName}`;
      await this.validateAndWrite(filePath, schemaContent, results);
    }

    return results;
  }

  /**
   * Validates content and writes it if valid
   */
  private async validateAndWrite(
    path: string,
    content: string,
    results: FileOperationResult[]
  ): Promise<void> {
    const validation = GeneratorValidator.validateTypeScript(content, path);
    if (!validation.isValid) {
      throw new Error(`Generated code for ${path} is invalid:\n${validation.errors.join("\n")}`);
    }
    results.push(await this.fsManager.writeFile(path, content, "overwrite"));
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }
}

/**
 * Creates a database generator instance
 */
export function createDbGenerator(
  loader: TemplateLoader,
  engine: TemplateEngine,
  fsManager: FileSystemManager
): DbGenerator {
  return new DbGenerator(loader, engine, fsManager);
}
