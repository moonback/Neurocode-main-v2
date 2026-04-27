/**
 * IPC Generator
 *
 * Generates IPC contracts, handlers, React Query hooks, and E2E tests.
 */

import { TemplateLoader } from "../template-loader";
import { TemplateEngine } from "../template-engine";
import { FileSystemManager, FileOperationResult } from "../file-system";
import { GeneratorValidator } from "../generator-validator";

export interface IpcGeneratorOptions {
  name: string;
  domain: string;
  inputSchema?: string;
  outputSchema?: string;
  mutation?: boolean;
  skipTest?: boolean;
}

export class IpcGenerator {
  constructor(
    private loader: TemplateLoader,
    private engine: TemplateEngine,
    private fsManager: FileSystemManager
  ) {}

  /**
   * Generates all IPC related files
   */
  async generate(options: IpcGeneratorOptions): Promise<FileOperationResult[]> {
    const context = {
      ...options,
      inputSchema: options.inputSchema || "z.void()",
      outputSchema: options.outputSchema || "z.void()",
      mutation: options.mutation ?? true,
    };

    const results: FileOperationResult[] = [];

    // 1. Contract
    // Note: The task says src/ipc/types/{domain}/{name}Contract.ts
    const contractTemplate = await this.loader.loadTemplate("ipc-contract");
    const contractContent = this.engine.render(contractTemplate.content, context);
    const contractPath = `src/ipc/types/${options.domain}/${this.pascalCase(options.name)}Contract.ts`;
    await this.validateAndWrite(contractPath, contractContent, results);

    // 2. Handler
    // Note: The task says src/ipc/handlers/{domain}/{name}Handler.ts
    const handlerTemplate = await this.loader.loadTemplate("ipc-handler");
    const handlerContent = this.engine.render(handlerTemplate.content, context);
    const handlerPath = `src/ipc/handlers/${options.domain}/${this.pascalCase(options.name)}Handler.ts`;
    await this.validateAndWrite(handlerPath, handlerContent, results);

    // 3. Hook
    const hookTemplate = await this.loader.loadTemplate("ipc-hook");
    const hookContent = this.engine.render(hookTemplate.content, context);
    const hookPath = `src/hooks/use${this.pascalCase(options.name)}.ts`;
    await this.validateAndWrite(hookPath, hookContent, results);

    // 4. Test
    if (!options.skipTest) {
      const testTemplate = await this.loader.loadTemplate("ipc-test");
      const testContent = this.engine.render(testTemplate.content, context);
      const testPath = `e2e-tests/${options.domain}-${this.kebabCase(options.name)}.spec.ts`;
      await this.validateAndWrite(testPath, testContent, results);
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
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return word.toUpperCase();
      })
      .replace(/\s+/g, "")
      .replace(/-+/g, "")
      .replace(/_+/g, "");
  }

  private kebabCase(str: string): string {
    return str
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  }
}

/**
 * Creates an IPC generator instance
 */
export function createIpcGenerator(
  loader: TemplateLoader,
  engine: TemplateEngine,
  fsManager: FileSystemManager
): IpcGenerator {
  return new IpcGenerator(loader, engine, fsManager);
}
