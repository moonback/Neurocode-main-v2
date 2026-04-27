/**
 * Documentation Generator
 *
 * Generates markdown documentation from JSDoc comments in IPC endpoints and React components.
 * Supports auto-update when code changes and validates documentation completeness.
 *
 * Requirements:
 * - 10.1: Generate JSDoc comments with parameter descriptions for IPC endpoints
 * - 10.2: Generate JSDoc comments with prop descriptions for React components
 * - 10.3: Extract JSDoc and generate markdown documentation
 * - 10.4: Generate markdown documentation for IPC endpoints and components
 * - 10.5: Update documentation when code changes are detected
 * - 10.6: Validate all public APIs have documentation comments
 */

import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
import { FileSystemManager, FileOperationResult } from "./file-system";

/**
 * JSDoc comment structure
 */
export interface JSDocComment {
  name: string;
  description: string;
  params: ParamDoc[];
  returns?: string;
  examples: string[];
  tags: Record<string, string>;
}

/**
 * Parameter documentation
 */
export interface ParamDoc {
  name: string;
  type: string;
  description: string;
  optional: boolean;
}

/**
 * IPC contract information
 */
export interface IPCContract {
  name: string;
  channel: string;
  inputSchema: string;
  outputSchema: string;
  filePath: string;
  jsdoc?: JSDocComment;
}

/**
 * React component information
 */
export interface ComponentInfo {
  name: string;
  props: PropInfo[];
  filePath: string;
  jsdoc?: JSDocComment;
}

/**
 * Component prop information
 */
export interface PropInfo {
  name: string;
  type: string;
  description: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Documentation validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Documentation validation error
 */
export interface ValidationError {
  file: string;
  name: string;
  message: string;
  severity: "error" | "warning";
}

/**
 * Documentation generator options
 */
export interface DocsGeneratorOptions {
  outputDir?: string;
  validateOnly?: boolean;
  autoUpdate?: boolean;
}

/**
 * File change event
 */
export interface FileChangeEvent {
  filePath: string;
  changeType: "created" | "modified" | "deleted";
  timestamp: number;
}

/**
 * Documentation generator for IPC endpoints and React components
 */
export class DocumentationGenerator {
  private fileWatchers: Map<string, fsSync.FSWatcher> = new Map();
  private lastGeneratedDocs: Map<string, string> = new Map();

  constructor(
    private projectRoot: string,
    private fsManager: FileSystemManager,
  ) {}

  /**
   * Extracts JSDoc comments from a TypeScript file
   *
   * @param filePath - Path to the TypeScript file
   * @returns Array of JSDoc comments found in the file
   */
  async extractJSDoc(filePath: string): Promise<JSDocComment[]> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    const content = await fs.readFile(absolutePath, "utf-8");

    const comments: JSDocComment[] = [];
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
    let match: RegExpExecArray | null;

    while ((match = jsdocRegex.exec(content)) !== null) {
      const commentText = match[1];
      const jsdoc = this.parseJSDocComment(commentText);

      // Try to find the name of the function/class/const following this comment
      const afterComment = content.substring(match.index + match[0].length);
      const nameMatch = afterComment.match(
        /^\s*(?:export\s+)?(?:const|function|class|interface|type)\s+(\w+)/,
      );

      if (nameMatch) {
        jsdoc.name = nameMatch[1];
      }

      comments.push(jsdoc);
    }

    return comments;
  }

  /**
   * Parses a JSDoc comment text into structured data
   *
   * @param commentText - The text inside the JSDoc comment (without /** and *\/)
   * @returns Parsed JSDoc comment
   */
  private parseJSDocComment(commentText: string): JSDocComment {
    const lines = commentText.split("\n").map((line) => {
      // Remove leading * and whitespace
      return line.replace(/^\s*\*\s?/, "").trim();
    });

    const jsdoc: JSDocComment = {
      name: "",
      description: "",
      params: [],
      examples: [],
      tags: {},
    };

    let currentSection: "description" | "example" | null = "description";
    let descriptionLines: string[] = [];
    let exampleLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("@param")) {
        currentSection = null;
        const paramMatch = line.match(
          /@param\s+\{([^}]+)\}\s+(\[?(\w+)\]?)\s*-?\s*(.*)/,
        );
        if (paramMatch) {
          const [, type, , name, description] = paramMatch;
          jsdoc.params.push({
            name: name || "",
            type: type || "unknown",
            description: description || "",
            optional: paramMatch[2].startsWith("["),
          });
        }
      } else if (line.startsWith("@returns") || line.startsWith("@return")) {
        currentSection = null;
        const returnsMatch = line.match(/@returns?\s+\{?([^}]*)\}?\s*(.*)/);
        if (returnsMatch) {
          jsdoc.returns = returnsMatch[2] || returnsMatch[1] || "";
        }
      } else if (line.startsWith("@example")) {
        currentSection = "example";
        exampleLines = [];
      } else if (line.startsWith("@")) {
        currentSection = null;
        const tagMatch = line.match(/@(\w+)\s+(.*)/);
        if (tagMatch) {
          jsdoc.tags[tagMatch[1]] = tagMatch[2];
        }
      } else if (currentSection === "description" && line) {
        descriptionLines.push(line);
      } else if (currentSection === "example" && line) {
        exampleLines.push(line);
      } else if (
        currentSection === "example" &&
        !line &&
        exampleLines.length > 0
      ) {
        // End of example block
        jsdoc.examples.push(exampleLines.join("\n"));
        exampleLines = [];
        currentSection = null;
      }
    }

    // Add any remaining example
    if (exampleLines.length > 0) {
      jsdoc.examples.push(exampleLines.join("\n"));
    }

    jsdoc.description = descriptionLines.join(" ").trim();

    return jsdoc;
  }

  /**
   * Extracts IPC contracts from a contract file
   *
   * @param filePath - Path to the IPC contract file
   * @returns Array of IPC contracts found in the file
   */
  async extractIPCContracts(filePath: string): Promise<IPCContract[]> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    const content = await fs.readFile(absolutePath, "utf-8");

    const contracts: IPCContract[] = [];

    // First, find the export statement and extract JSDoc before it
    // Match both "Contracts" (plural) and "Contract" (singular)
    const exportMatch = content.match(
      /\/\*\*([\s\S]*?)\*\/\s*export\s+const\s+\w+Contracts?\s*=\s*\{/
    );
    let exportJSDoc: JSDocComment | undefined;
    
    if (exportMatch) {
      const commentText = exportMatch[1];
      exportJSDoc = this.parseJSDocComment(commentText);
    }

    // Match contract definitions like: contractName: defineContract({ ... })
    // This regex handles multi-line definitions and various formatting
    const contractRegex =
      /(\w+):\s*defineContract\(\s*\{[\s\S]*?channel:\s*["']([^"']+)["'][\s\S]*?input:\s*([^,\n]+)[\s\S]*?output:\s*([^,\n}]+)/g;

    let match: RegExpExecArray | null;
    let contractIndex = 0;
    
    while ((match = contractRegex.exec(content)) !== null) {
      const [, name, channel, inputSchema, outputSchema] = match;
      const contractStartIndex = match.index;

      // Find JSDoc comment immediately before this contract definition
      // Look backwards from the contract start position
      const beforeContract = content.substring(0, contractStartIndex);
      
      // Find the last JSDoc comment before this contract
      const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
      let lastJsdocMatch: RegExpExecArray | null = null;
      let jsdocMatch: RegExpExecArray | null;
      
      while ((jsdocMatch = jsdocRegex.exec(beforeContract)) !== null) {
        lastJsdocMatch = jsdocMatch;
      }

      let jsdoc: JSDocComment | undefined;
      
      if (lastJsdocMatch) {
        // Check if there's only whitespace between the JSDoc and the contract
        const betweenJsdocAndContract = content.substring(
          lastJsdocMatch.index + lastJsdocMatch[0].length,
          contractStartIndex
        );
        
        // If there's only whitespace (including newlines), this JSDoc belongs to this contract
        if (/^\s*$/.test(betweenJsdocAndContract)) {
          const commentText = lastJsdocMatch[1];
          jsdoc = this.parseJSDocComment(commentText);
          jsdoc.name = name;
        }
      }
      
      // If no JSDoc found for this specific contract and this is the first contract,
      // use the export JSDoc
      if (!jsdoc && contractIndex === 0 && exportJSDoc) {
        jsdoc = { ...exportJSDoc, name };
      }

      contracts.push({
        name,
        channel,
        inputSchema: inputSchema.trim(),
        outputSchema: outputSchema.trim(),
        filePath: filePath.replace(/\\/g, "/"), // Normalize path separators
        jsdoc,
      });
      
      contractIndex++;
    }

    return contracts;
  }

  /**
   * Extracts React component information from a component file
   *
   * @param filePath - Path to the React component file
   * @returns Component information
   */
  async extractComponentInfo(filePath: string): Promise<ComponentInfo | null> {
    const absolutePath = path.resolve(this.projectRoot, filePath);
    const content = await fs.readFile(absolutePath, "utf-8");
    const jsdocs = await this.extractJSDoc(filePath);

    // Match component definitions
    const componentMatch = content.match(
      /(?:export\s+)?(?:function|const)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|<[^>]*>)/,
    );

    if (!componentMatch) {
      return null;
    }

    const componentName = componentMatch[1];

    // Find matching JSDoc
    const jsdoc = jsdocs.find((doc) => doc.name === componentName);

    // Extract props from interface or type
    const props = await this.extractComponentProps(content, componentName);

    return {
      name: componentName,
      props,
      filePath: filePath.replace(/\\/g, "/"), // Normalize path separators
      jsdoc,
    };
  }

  /**
   * Extracts component props from TypeScript interface or type
   *
   * @param content - File content
   * @param componentName - Component name
   * @returns Array of prop information
   */
  private async extractComponentProps(
    content: string,
    componentName: string,
  ): Promise<PropInfo[]> {
    const props: PropInfo[] = [];

    // Look for interface or type definition for props
    const propsInterfaceRegex = new RegExp(
      `(?:interface|type)\\s+${componentName}Props\\s*(?:=\\s*)?\\{([^}]+)\\}`,
      "s",
    );

    const match = content.match(propsInterfaceRegex);
    if (!match) {
      return props;
    }

    const propsContent = match[1];
    const propLines = propsContent.split("\n");

    for (const line of propLines) {
      const propMatch = line.match(
        /^\s*(?:\/\*\*\s*(.*?)\s*\*\/)?\s*(\w+)(\?)?:\s*([^;]+);?/,
      );

      if (propMatch) {
        const [, description, name, optional, type] = propMatch;
        props.push({
          name,
          type: type.trim(),
          description: description?.trim() || "",
          optional: !!optional,
        });
      }
    }

    return props;
  }

  /**
   * Generates markdown documentation for IPC endpoints
   *
   * @param contracts - Array of IPC contracts
   * @returns Markdown documentation string
   */
  generateIPCDocs(contracts: IPCContract[]): string {
    let markdown = "# IPC Endpoints Documentation\n\n";
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += "## Table of Contents\n\n";

    // Table of contents
    for (const contract of contracts) {
      markdown += `- [${contract.name}](#${contract.name.toLowerCase()})\n`;
    }

    markdown += "\n---\n\n";

    // Contract details
    for (const contract of contracts) {
      markdown += `## ${contract.name}\n\n`;

      if (contract.jsdoc?.description) {
        markdown += `${contract.jsdoc.description}\n\n`;
      }

      markdown += `**Channel:** \`${contract.channel}\`\n\n`;
      markdown += `**File:** \`${contract.filePath}\`\n\n`;

      // Input schema
      markdown += "### Input\n\n";
      markdown += "```typescript\n";
      markdown += contract.inputSchema + "\n";
      markdown += "```\n\n";

      if (contract.jsdoc?.params && contract.jsdoc.params.length > 0) {
        markdown += "**Parameters:**\n\n";
        for (const param of contract.jsdoc.params) {
          markdown += `- \`${param.name}\` (\`${param.type}\`)${param.optional ? " *optional*" : ""}: ${param.description}\n`;
        }
        markdown += "\n";
      }

      // Output schema
      markdown += "### Output\n\n";
      markdown += "```typescript\n";
      markdown += contract.outputSchema + "\n";
      markdown += "```\n\n";

      if (contract.jsdoc?.returns) {
        markdown += `**Returns:** ${contract.jsdoc.returns}\n\n`;
      }

      // Examples
      if (contract.jsdoc?.examples && contract.jsdoc.examples.length > 0) {
        markdown += "### Examples\n\n";
        for (const example of contract.jsdoc.examples) {
          markdown += "```typescript\n";
          markdown += example + "\n";
          markdown += "```\n\n";
        }
      }

      markdown += "---\n\n";
    }

    return markdown;
  }

  /**
   * Generates markdown documentation for React components
   *
   * @param components - Array of component information
   * @returns Markdown documentation string
   */
  generateComponentDocs(components: ComponentInfo[]): string {
    let markdown = "# React Components Documentation\n\n";
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;
    markdown += "## Table of Contents\n\n";

    // Table of contents
    for (const component of components) {
      markdown += `- [${component.name}](#${component.name.toLowerCase()})\n`;
    }

    markdown += "\n---\n\n";

    // Component details
    for (const component of components) {
      markdown += `## ${component.name}\n\n`;

      if (component.jsdoc?.description) {
        markdown += `${component.jsdoc.description}\n\n`;
      }

      markdown += `**File:** \`${component.filePath}\`\n\n`;

      // Props
      if (component.props.length > 0) {
        markdown += "### Props\n\n";
        markdown += "| Name | Type | Required | Description |\n";
        markdown += "|------|------|----------|-------------|\n";

        for (const prop of component.props) {
          const required = prop.optional ? "No" : "Yes";
          markdown += `| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${prop.description || "-"} |\n`;
        }

        markdown += "\n";
      }

      // Examples
      if (component.jsdoc?.examples && component.jsdoc.examples.length > 0) {
        markdown += "### Examples\n\n";
        for (const example of component.jsdoc.examples) {
          markdown += "```tsx\n";
          markdown += example + "\n";
          markdown += "```\n\n";
        }
      }

      markdown += "---\n\n";
    }

    return markdown;
  }

  /**
   * Validates that all public APIs have JSDoc comments
   *
   * @param filePaths - Array of file paths to validate
   * @returns Validation result
   */
  async validateDocumentation(filePaths: string[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    for (const filePath of filePaths) {
      const absolutePath = path.resolve(this.projectRoot, filePath);
      const content = await fs.readFile(absolutePath, "utf-8");
      const jsdocs = await this.extractJSDoc(filePath);

      // Check for exported functions/classes without JSDoc
      const exportRegex =
        /export\s+(?:const|function|class|interface|type)\s+(\w+)/g;
      let match: RegExpExecArray | null;

      while ((match = exportRegex.exec(content)) !== null) {
        const name = match[1];
        const hasJSDoc = jsdocs.some((doc) => doc.name === name);

        if (!hasJSDoc) {
          errors.push({
            file: filePath,
            name,
            message: `Missing JSDoc comment for exported ${match[0].includes("function") ? "function" : "declaration"} '${name}'`,
            severity: "warning",
          });
        } else {
          // Check if JSDoc has description
          const jsdoc = jsdocs.find((doc) => doc.name === name);
          if (jsdoc && !jsdoc.description) {
            warnings.push(
              `${filePath}: JSDoc for '${name}' is missing a description`,
            );
          }
        }
      }
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates that documentation is complete and up-to-date
   *
   * @param sourceDir - Directory containing source files
   * @param docsPath - Path to the documentation file
   * @returns Validation result with detailed errors and warnings
   */
  async validateDocumentationCompleteness(
    sourceDir: string,
    docsPath: string,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    try {
      // Check if documentation file exists
      const absoluteDocsPath = path.resolve(this.projectRoot, docsPath);
      await fs.access(absoluteDocsPath);

      // Check if documentation is up to date
      const isUpToDate = await this.isDocumentationUpToDate(
        sourceDir,
        docsPath,
      );

      if (!isUpToDate) {
        warnings.push(
          `Documentation at ${docsPath} is outdated. Source files have been modified since last generation.`,
        );
      }

      // Validate source files have JSDoc
      const sourceFiles = await this.findContractFiles(sourceDir);
      const sourceValidation = await this.validateDocumentation(sourceFiles);

      errors.push(...sourceValidation.errors);
      warnings.push(...sourceValidation.warnings);
    } catch {
      errors.push({
        file: docsPath,
        name: "documentation",
        message: `Documentation file not found at ${docsPath}`,
        severity: "error",
      });
    }

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generates documentation for all IPC contracts in a directory
   *
   * @param contractsDir - Directory containing IPC contract files
   * @param options - Documentation generation options
   * @returns Array of file operation results
   */
  async generateIPCDocumentation(
    contractsDir: string,
    options: DocsGeneratorOptions = {},
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];
    const outputDir = options.outputDir || "docs/ipc";

    // Find all contract files
    const contractFiles = await this.findContractFiles(contractsDir);

    for (const contractFile of contractFiles) {
      const contracts = await this.extractIPCContracts(contractFile);

      if (contracts.length === 0) {
        continue;
      }

      // Generate markdown
      const markdown = this.generateIPCDocs(contracts);

      // Determine output file name
      const baseName = path.basename(contractFile, ".ts");
      const outputPath = path.join(outputDir, `${baseName}.md`);

      if (!options.validateOnly) {
        const result = await this.fsManager.writeFile(
          outputPath,
          markdown,
          "overwrite",
        );
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Generates documentation for all React components in a directory
   *
   * @param componentsDir - Directory containing React component files
   * @param options - Documentation generation options
   * @returns Array of file operation results
   */
  async generateComponentDocumentation(
    componentsDir: string,
    options: DocsGeneratorOptions = {},
  ): Promise<FileOperationResult[]> {
    const results: FileOperationResult[] = [];
    const outputDir = options.outputDir || "docs/components";

    // Find all component files
    const componentFiles = await this.findComponentFiles(componentsDir);

    const components: ComponentInfo[] = [];

    for (const componentFile of componentFiles) {
      const componentInfo = await this.extractComponentInfo(componentFile);
      if (componentInfo) {
        components.push(componentInfo);
      }
    }

    if (components.length > 0) {
      // Generate markdown
      const markdown = this.generateComponentDocs(components);

      const outputPath = path.join(outputDir, "components.md");

      if (!options.validateOnly) {
        const result = await this.fsManager.writeFile(
          outputPath,
          markdown,
          "overwrite",
        );
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Finds all IPC contract files in a directory
   *
   * @param dir - Directory to search
   * @returns Array of contract file paths
   */
  private async findContractFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const absoluteDir = path.resolve(this.projectRoot, dir);

    try {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(absoluteDir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);

        if (entry.isDirectory()) {
          const subFiles = await this.findContractFiles(relativePath);
          files.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
          files.push(relativePath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Finds all React component files in a directory
   *
   * @param dir - Directory to search
   * @returns Array of component file paths
   */
  private async findComponentFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const absoluteDir = path.resolve(this.projectRoot, dir);

    try {
      const entries = await fs.readdir(absoluteDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(absoluteDir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);

        if (entry.isDirectory()) {
          const subFiles = await this.findComponentFiles(relativePath);
          files.push(...subFiles);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith(".tsx") || entry.name.endsWith(".jsx")) &&
          !entry.name.includes(".test.") &&
          !entry.name.includes(".stories.")
        ) {
          files.push(relativePath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Watches a directory for file changes and regenerates documentation
   *
   * @param dir - Directory to watch
   * @param type - Type of files to watch ("ipc" or "component")
   * @param options - Documentation generation options
   */
  async watchForChanges(
    dir: string,
    type: "ipc" | "component",
    options: DocsGeneratorOptions = {},
  ): Promise<void> {
    const absoluteDir = path.resolve(this.projectRoot, dir);

    // Check if already watching this directory
    if (this.fileWatchers.has(absoluteDir)) {
      return;
    }

    const watcher = fsSync.watch(absoluteDir, { recursive: true });

    this.fileWatchers.set(absoluteDir, watcher);

    // Handle file changes
    watcher.on("change", async (eventType, filename) => {
      if (eventType === "change" || eventType === "rename") {
        if (!filename) return;

        // Convert Buffer to string if needed
        const filenameStr =
          typeof filename === "string" ? filename : filename.toString();

        // Check if it's a relevant file
        const isRelevant =
          type === "ipc"
            ? filenameStr.endsWith(".ts") &&
              !filenameStr.includes(".test.") &&
              !filenameStr.includes(".spec.")
            : (filenameStr.endsWith(".tsx") || filenameStr.endsWith(".jsx")) &&
              !filenameStr.includes(".test.") &&
              !filenameStr.includes(".stories.");

        if (isRelevant) {
          // Regenerate documentation
          if (type === "ipc") {
            await this.generateIPCDocumentation(dir, options);
          } else {
            await this.generateComponentDocumentation(dir, options);
          }
        }
      }
    });
  }

  /**
   * Stops watching a directory for changes
   *
   * @param dir - Directory to stop watching
   */
  async stopWatching(dir: string): Promise<void> {
    const absoluteDir = path.resolve(this.projectRoot, dir);
    const watcher = this.fileWatchers.get(absoluteDir);

    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(absoluteDir);
    }
  }

  /**
   * Stops all file watchers
   */
  async stopAllWatchers(): Promise<void> {
    for (const watcher of this.fileWatchers.values()) {
      watcher.close();
    }
    this.fileWatchers.clear();
  }

  /**
   * Checks if documentation is up to date with source files
   *
   * @param sourceDir - Directory containing source files
   * @param docsPath - Path to the documentation file
   * @returns true if documentation is up to date
   */
  async isDocumentationUpToDate(
    sourceDir: string,
    docsPath: string,
  ): Promise<boolean> {
    try {
      const absoluteDocsPath = path.resolve(this.projectRoot, docsPath);
      const docsStats = await fs.stat(absoluteDocsPath);
      const docsModTime = docsStats.mtime.getTime();

      // Find all source files
      const sourceFiles = await this.findContractFiles(sourceDir);

      // Check if any source file is newer than the docs
      for (const sourceFile of sourceFiles) {
        const absoluteSourcePath = path.resolve(this.projectRoot, sourceFile);
        const sourceStats = await fs.stat(absoluteSourcePath);
        const sourceModTime = sourceStats.mtime.getTime();

        if (sourceModTime > docsModTime) {
          return false;
        }
      }

      return true;
    } catch {
      // Documentation file doesn't exist or can't be read
      return false;
    }
  }

  /**
   * Regenerates documentation if source files have changed
   *
   * @param sourceDir - Directory containing source files
   * @param docsPath - Path to the documentation file
   * @param type - Type of documentation ("ipc" or "component")
   * @param options - Documentation generation options
   * @returns true if documentation was regenerated
   */
  async regenerateIfOutdated(
    sourceDir: string,
    docsPath: string,
    type: "ipc" | "component",
    options: DocsGeneratorOptions = {},
  ): Promise<boolean> {
    const isUpToDate = await this.isDocumentationUpToDate(sourceDir, docsPath);

    if (!isUpToDate) {
      if (type === "ipc") {
        await this.generateIPCDocumentation(sourceDir, options);
      } else {
        await this.generateComponentDocumentation(sourceDir, options);
      }
      return true;
    }

    return false;
  }
}

/**
 * Creates a documentation generator instance
 *
 * @param projectRoot - Root directory of the project
 * @param fsManager - File system manager instance
 * @returns DocumentationGenerator instance
 */
export function createDocumentationGenerator(
  projectRoot: string,
  fsManager: FileSystemManager,
): DocumentationGenerator {
  return new DocumentationGenerator(projectRoot, fsManager);
}
