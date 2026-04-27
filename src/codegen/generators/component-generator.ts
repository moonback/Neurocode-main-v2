/**
 * Component Generator
 *
 * Generates React components, tests, and stories.
 */

import { TemplateLoader } from "../template-loader";
import { TemplateEngine } from "../template-engine";
import { FileSystemManager, FileOperationResult } from "../file-system";
import { GeneratorValidator } from "../generator-validator";
import * as path from "node:path";

export interface ComponentGeneratorOptions {
  name: string;
  directory?: string;
  skipTest?: boolean;
  skipStory?: boolean;
  baseUi?: boolean;
}

export class ComponentGenerator {
  constructor(
    private loader: TemplateLoader,
    private engine: TemplateEngine,
    private fsManager: FileSystemManager
  ) {}

  /**
   * Generates component files
   */
  async generate(options: ComponentGeneratorOptions): Promise<FileOperationResult[]> {
    const context = {
      ...options,
      name: options.name,
    };

    const results: FileOperationResult[] = [];
    const componentDir = options.directory || "src/components";
    const baseName = this.pascalCase(options.name);
    const targetDir = path.join(componentDir, baseName);

    // 1. Component file (.tsx)
    const componentTemplate = await this.loader.loadTemplate("react-component");
    const componentContent = this.engine.render(componentTemplate.content, context);
    const componentPath = path.join(targetDir, `${baseName}.tsx`);
    await this.validateAndWrite(componentPath, componentContent, results);

    // 2. Test file (.test.tsx)
    if (!options.skipTest) {
      const testTemplate = await this.loader.loadTemplate("react-component-test");
      const testContent = this.engine.render(testTemplate.content, context);
      const testPath = path.join(targetDir, `${baseName}.test.tsx`);
      await this.validateAndWrite(testPath, testContent, results);
    }

    // 3. Story file (.stories.tsx)
    if (!options.skipStory) {
      const storyTemplate = await this.loader.loadTemplate("react-component-story");
      const storyContent = this.engine.render(storyTemplate.content, context);
      const storyPath = path.join(targetDir, `${baseName}.stories.tsx`);
      await this.validateAndWrite(storyPath, storyContent, results);
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

  private pascalCase(str: string): string {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
        return word.toUpperCase();
      })
      .replace(/\s+/g, "")
      .replace(/-+/g, "")
      .replace(/_+/g, "");
  }
}

/**
 * Creates a component generator instance
 */
export function createComponentGenerator(
  loader: TemplateLoader,
  engine: TemplateEngine,
  fsManager: FileSystemManager
): ComponentGenerator {
  return new ComponentGenerator(loader, engine, fsManager);
}
