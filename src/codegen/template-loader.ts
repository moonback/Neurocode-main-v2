/**
 * Template Loader and Cache System
 *
 * This module provides template loading from a configurable directory with caching
 * to avoid repeated file reads. It supports template inheritance and composition.
 *
 * Requirements:
 * - 5.1: Load templates from a configurable templates directory
 * - 5.2: Use updated templates for subsequent generations when modified
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

/**
 * Template metadata and content
 */
export interface Template {
  name: string;
  content: string;
  path: string;
  extends?: string; // Name of parent template for inheritance
  blocks?: Map<string, string>; // Named blocks for composition
}

/**
 * Template loader configuration
 */
export interface TemplateLoaderConfig {
  templatesDirectory: string;
  cacheEnabled?: boolean;
  watchForChanges?: boolean;
}

/**
 * Template loader with caching and inheritance support
 */
export class TemplateLoader {
  private config: TemplateLoaderConfig;
  private cache: Map<string, Template>;
  private fileStats: Map<string, { mtime: number }>;

  constructor(config: TemplateLoaderConfig) {
    this.config = {
      cacheEnabled: true,
      watchForChanges: true,
      ...config,
    };
    this.cache = new Map();
    this.fileStats = new Map();
  }

  /**
   * Loads a template by name from the templates directory.
   * Uses cache if available and not modified.
   *
   * @param name - Template name (without extension)
   * @returns Template object with content and metadata
   * @throws Error if template file not found or cannot be read
   */
  async loadTemplate(name: string): Promise<Template> {
    const templatePath = this.resolveTemplatePath(name);

    // Check cache first
    if (this.config.cacheEnabled && this.cache.has(name)) {
      // If watching for changes, check if file was modified
      if (this.config.watchForChanges) {
        const isModified = await this.isTemplateModified(name, templatePath);
        if (!isModified) {
          return this.cache.get(name)!;
        }
        // File was modified, invalidate cache and reload
        this.cache.delete(name);
        this.fileStats.delete(templatePath);
      } else {
        // Not watching for changes, return cached version
        return this.cache.get(name)!;
      }
    }

    // Load template from file
    const template = await this.loadTemplateFromFile(name, templatePath);

    // Handle template inheritance if specified
    if (template.extends) {
      const parentTemplate = await this.loadTemplate(template.extends);
      template.content = this.applyInheritance(
        parentTemplate.content,
        template.content,
        template.blocks,
      );
    }

    // Cache the loaded template
    if (this.config.cacheEnabled) {
      this.cache.set(name, template);
    }

    return template;
  }

  /**
   * Loads a template from a file path
   *
   * @param name - Template name
   * @param templatePath - Full path to template file
   * @returns Template object
   * @throws Error if file cannot be read
   */
  private async loadTemplateFromFile(
    name: string,
    templatePath: string,
  ): Promise<Template> {
    try {
      const content = await fs.readFile(templatePath, "utf-8");
      const stats = await fs.stat(templatePath);

      // Store file stats for change detection
      this.fileStats.set(templatePath, { mtime: stats.mtimeMs });

      // Parse template metadata (extends, blocks)
      const { extends: extendsTemplate, blocks } =
        this.parseTemplateMetadata(content);

      return {
        name,
        content,
        path: templatePath,
        extends: extendsTemplate,
        blocks,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          `Template not found: ${name} (looked in ${templatePath})`,
        );
      }
      throw new Error(
        `Failed to load template ${name}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Resolves a template name to its full file path
   *
   * @param name - Template name (without extension)
   * @returns Full path to template file
   */
  private resolveTemplatePath(name: string): string {
    // Support both .template and .template.txt extensions
    const extensions = [".template", ".template.txt", ".hbs", ".mustache"];

    // If name already has an extension, use it as-is
    if (extensions.some((ext) => name.endsWith(ext))) {
      return path.join(this.config.templatesDirectory, name);
    }

    // Default to .template extension
    return path.join(this.config.templatesDirectory, `${name}.template`);
  }

  /**
   * Checks if a template file has been modified since it was cached
   *
   * @param name - Template name
   * @param templatePath - Full path to template file
   * @returns true if file was modified, false otherwise
   */
  private async isTemplateModified(
    name: string,
    templatePath: string,
  ): Promise<boolean> {
    try {
      const stats = await fs.stat(templatePath);
      const cachedStats = this.fileStats.get(templatePath);

      if (!cachedStats) {
        return true; // No cached stats, consider modified
      }

      return stats.mtimeMs !== cachedStats.mtime;
    } catch {
      // If we can't stat the file, consider it modified
      return true;
    }
  }

  /**
   * Parses template metadata from content (extends, blocks)
   *
   * Template metadata format:
   * {{!-- extends: base-template --}}
   * {{!-- block: blockName --}}
   * content
   * {{!-- endblock --}}
   *
   * @param content - Template content
   * @returns Parsed metadata
   */
  private parseTemplateMetadata(content: string): {
    extends?: string;
    blocks: Map<string, string>;
  } {
    const blocks = new Map<string, string>();
    let extendsTemplate: string | undefined;

    // Parse extends directive
    const extendsMatch = content.match(/\{\{!--\s*extends:\s*(\S+)\s*--\}\}/);
    if (extendsMatch) {
      extendsTemplate = extendsMatch[1];
    }

    // Parse block directives
    const blockRegex =
      /\{\{!--\s*block:\s*(\w+)\s*--\}\}([\s\S]*?)\{\{!--\s*endblock\s*--\}\}/g;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockRegex.exec(content)) !== null) {
      const blockName = blockMatch[1];
      const blockContent = blockMatch[2].trim();
      blocks.set(blockName, blockContent);
    }

    return { extends: extendsTemplate, blocks };
  }

  /**
   * Applies template inheritance by replacing blocks in parent template
   *
   * @param parentContent - Parent template content
   * @param childContent - Child template content
   * @param childBlocks - Named blocks from child template
   * @returns Merged template content
   */
  private applyInheritance(
    parentContent: string,
    childContent: string,
    childBlocks?: Map<string, string>,
  ): string {
    if (!childBlocks || childBlocks.size === 0) {
      return childContent;
    }

    let result = parentContent;

    // Replace each block in parent with child's version
    for (const [blockName, blockContent] of Array.from(childBlocks.entries())) {
      const blockRegex = new RegExp(
        `\\{\\{!--\\s*block:\\s*${blockName}\\s*--\\}\\}[\\s\\S]*?\\{\\{!--\\s*endblock\\s*--\\}\\}`,
        "g",
      );
      result = result.replace(blockRegex, blockContent);
    }

    return result;
  }

  /**
   * Clears the template cache
   */
  clearCache(): void {
    this.cache.clear();
    this.fileStats.clear();
  }

  /**
   * Invalidates a specific template in the cache
   *
   * @param name - Template name to invalidate
   */
  invalidateTemplate(name: string): void {
    this.cache.delete(name);
    const templatePath = this.resolveTemplatePath(name);
    this.fileStats.delete(templatePath);
  }

  /**
   * Gets the current cache size
   *
   * @returns Number of cached templates
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Checks if a template exists in the templates directory
   *
   * @param name - Template name
   * @returns true if template exists, false otherwise
   */
  async templateExists(name: string): Promise<boolean> {
    const templatePath = this.resolveTemplatePath(name);
    try {
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lists all available templates in the templates directory
   *
   * @returns Array of template names (without extensions)
   */
  async listTemplates(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.templatesDirectory);
      const templateExtensions = [
        ".template",
        ".template.txt",
        ".hbs",
        ".mustache",
      ];

      return files
        .filter((file) => templateExtensions.some((ext) => file.endsWith(ext)))
        .map((file) => {
          // Remove extension
          for (const ext of templateExtensions) {
            if (file.endsWith(ext)) {
              return file.slice(0, -ext.length);
            }
          }
          return file;
        });
    } catch (error) {
      throw new Error(`Failed to list templates: ${(error as Error).message}`);
    }
  }

  /**
   * Gets the templates directory path
   *
   * @returns Templates directory path
   */
  getTemplatesDirectory(): string {
    return this.config.templatesDirectory;
  }
}

/**
 * Creates a template loader with the given configuration
 *
 * @param config - Template loader configuration
 * @returns TemplateLoader instance
 */
export function createTemplateLoader(
  config: TemplateLoaderConfig,
): TemplateLoader {
  return new TemplateLoader(config);
}
