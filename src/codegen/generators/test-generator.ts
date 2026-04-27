/**
 * E2E Test Generator
 *
 * Generates Playwright E2E tests.
 */

import { TemplateLoader } from "../template-loader";
import { TemplateEngine } from "../template-engine";
import { FileSystemManager, FileOperationResult } from "../file-system";
import { GeneratorValidator } from "../generator-validator";

export interface TestGeneratorOptions {
  name: string;
  feature?: string;
}

export class TestGenerator {
  constructor(
    private loader: TemplateLoader,
    private engine: TemplateEngine,
    private fsManager: FileSystemManager
  ) {}

  /**
   * Generates E2E test file
   */
  async generate(options: TestGeneratorOptions): Promise<FileOperationResult[]> {
    const context = {
      ...options,
      name: options.name,
    };

    const results: FileOperationResult[] = [];
    const testTemplate = await this.loader.loadTemplate("e2e-test");
    const testContent = this.engine.render(testTemplate.content, context);
    
    const fileName = this.snakeCase(options.feature || options.name);
    const testPath = `e2e-tests/${fileName}.spec.ts`;
    
    await this.validateAndWrite(testPath, testContent, results);

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

  private snakeCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }
}

/**
 * Creates a test generator instance
 */
export function createTestGenerator(
  loader: TemplateLoader,
  engine: TemplateEngine,
  fsManager: FileSystemManager
): TestGenerator {
  return new TestGenerator(loader, engine, fsManager);
}
