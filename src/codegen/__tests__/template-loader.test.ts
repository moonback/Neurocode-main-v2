/**
 * Unit tests for Template Loader and Cache System
 *
 * Tests template loading, caching, inheritance, and change detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TemplateLoader, createTemplateLoader } from "../template-loader";

// Mock fs module
vi.mock("node:fs/promises");

describe("TemplateLoader", () => {
  const mockTemplatesDir = "/mock/templates";
  let loader: TemplateLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = createTemplateLoader({
      templatesDirectory: mockTemplatesDir,
      cacheEnabled: true,
      watchForChanges: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadTemplate", () => {
    it("should load a template from file", async () => {
      const templateContent = "Hello {{name}}!";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({
        mtimeMs: Date.now(),
      } as any);

      const template = await loader.loadTemplate("greeting");

      expect(template.name).toBe("greeting");
      expect(template.content).toBe(templateContent);
      expect(template.path).toBe(
        path.join(mockTemplatesDir, "greeting.template"),
      );
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, "greeting.template"),
        "utf-8",
      );
    });

    it("should throw error if template not found", async () => {
      const error: NodeJS.ErrnoException = new Error("File not found");
      error.code = "ENOENT";
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(loader.loadTemplate("nonexistent")).rejects.toThrow(
        "Template not found: nonexistent",
      );
    });

    it("should throw error with message for other read errors", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("Permission denied"));

      await expect(loader.loadTemplate("forbidden")).rejects.toThrow(
        "Failed to load template forbidden: Permission denied",
      );
    });

    it("should support templates with .template extension", async () => {
      const templateContent = "Content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: Date.now() } as any);

      await loader.loadTemplate("test.template");

      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, "test.template"),
        "utf-8",
      );
    });

    it("should support templates with .hbs extension", async () => {
      const templateContent = "Content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: Date.now() } as any);

      await loader.loadTemplate("test.hbs");

      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, "test.hbs"),
        "utf-8",
      );
    });
  });

  describe("caching", () => {
    it("should cache loaded templates", async () => {
      const templateContent = "Cached content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      // Load template first time
      await loader.loadTemplate("cached");
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Load template second time - should use cache
      await loader.loadTemplate("cached");
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should reload template if file was modified", async () => {
      const originalContent = "Original";
      const updatedContent = "Updated";

      // First load
      vi.mocked(fs.readFile).mockResolvedValueOnce(originalContent);
      vi.mocked(fs.stat)
        .mockResolvedValueOnce({ mtimeMs: 1000 } as any) // Initial load
        .mockResolvedValueOnce({ mtimeMs: 2000 } as any); // Check for modification

      const template1 = await loader.loadTemplate("modified");
      expect(template1.content).toBe(originalContent);

      // Second load with different mtime (file modified)
      vi.mocked(fs.readFile).mockResolvedValueOnce(updatedContent);
      vi.mocked(fs.stat).mockResolvedValueOnce({ mtimeMs: 2000 } as any);

      const template2 = await loader.loadTemplate("modified");
      expect(template2.content).toBe(updatedContent);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it("should not reload template if file was not modified", async () => {
      const templateContent = "Unchanged";

      // First load
      vi.mocked(fs.readFile).mockResolvedValueOnce(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      await loader.loadTemplate("unchanged");
      expect(fs.readFile).toHaveBeenCalledTimes(1);

      // Second load with same mtime
      await loader.loadTemplate("unchanged");
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should respect cacheEnabled=false", async () => {
      const loaderNoCache = createTemplateLoader({
        templatesDirectory: mockTemplatesDir,
        cacheEnabled: false,
      });

      const templateContent = "No cache";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      await loaderNoCache.loadTemplate("nocache");
      await loaderNoCache.loadTemplate("nocache");

      expect(fs.readFile).toHaveBeenCalledTimes(2); // Called twice
    });

    it("should respect watchForChanges=false", async () => {
      const loaderNoWatch = createTemplateLoader({
        templatesDirectory: mockTemplatesDir,
        cacheEnabled: true,
        watchForChanges: false,
      });

      const templateContent = "No watch";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValueOnce({ mtimeMs: 1000 } as any);

      await loaderNoWatch.loadTemplate("nowatch");

      // Change mtime but watchForChanges is false
      vi.mocked(fs.stat).mockResolvedValueOnce({ mtimeMs: 2000 } as any);
      await loaderNoWatch.loadTemplate("nowatch");

      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only called once
    });
  });

  describe("template inheritance", () => {
    it("should load parent template when extends is specified", async () => {
      const parentContent = `
{{!-- block: content --}}
Default content
{{!-- endblock --}}
      `.trim();

      const childContent = `
{{!-- extends: base --}}
{{!-- block: content --}}
Child content
{{!-- endblock --}}
      `.trim();

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(childContent) // Child template
        .mockResolvedValueOnce(parentContent); // Parent template

      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      const template = await loader.loadTemplate("child");

      expect(template.content).toContain("Child content");
      expect(template.content).not.toContain("Default content");
      expect(fs.readFile).toHaveBeenCalledTimes(2); // Child + parent
    });

    it("should replace multiple blocks in parent template", async () => {
      const parentContent = `
{{!-- block: header --}}
Default header
{{!-- endblock --}}
{{!-- block: footer --}}
Default footer
{{!-- endblock --}}
      `.trim();

      const childContent = `
{{!-- extends: base --}}
{{!-- block: header --}}
Custom header
{{!-- endblock --}}
{{!-- block: footer --}}
Custom footer
{{!-- endblock --}}
      `.trim();

      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(childContent)
        .mockResolvedValueOnce(parentContent);

      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      const template = await loader.loadTemplate("child");

      expect(template.content).toContain("Custom header");
      expect(template.content).toContain("Custom footer");
      expect(template.content).not.toContain("Default header");
      expect(template.content).not.toContain("Default footer");
    });

    it("should handle templates without inheritance", async () => {
      const templateContent = "Simple template without extends";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      const template = await loader.loadTemplate("simple");

      expect(template.content).toBe(templateContent);
      expect(template.extends).toBeUndefined();
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only child
    });
  });

  describe("cache management", () => {
    it("should clear all cached templates", async () => {
      const templateContent = "Content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      await loader.loadTemplate("test1");
      await loader.loadTemplate("test2");

      expect(loader.getCacheSize()).toBe(2);

      loader.clearCache();

      expect(loader.getCacheSize()).toBe(0);

      // Should reload from file after cache clear
      await loader.loadTemplate("test1");
      expect(fs.readFile).toHaveBeenCalledTimes(3); // 2 initial + 1 after clear
    });

    it("should invalidate specific template", async () => {
      const templateContent = "Content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      await loader.loadTemplate("test1");
      await loader.loadTemplate("test2");

      expect(loader.getCacheSize()).toBe(2);

      loader.invalidateTemplate("test1");

      expect(loader.getCacheSize()).toBe(1);

      // test1 should reload, test2 should use cache
      await loader.loadTemplate("test1");
      await loader.loadTemplate("test2");

      expect(fs.readFile).toHaveBeenCalledTimes(3); // 2 initial + 1 for test1
    });

    it("should return correct cache size", async () => {
      expect(loader.getCacheSize()).toBe(0);

      const templateContent = "Content";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      await loader.loadTemplate("test1");
      expect(loader.getCacheSize()).toBe(1);

      await loader.loadTemplate("test2");
      expect(loader.getCacheSize()).toBe(2);

      await loader.loadTemplate("test1"); // Already cached
      expect(loader.getCacheSize()).toBe(2);
    });
  });

  describe("template utilities", () => {
    it("should check if template exists", async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const exists = await loader.templateExists("existing");

      expect(exists).toBe(true);
      expect(fs.access).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, "existing.template"),
      );
    });

    it("should return false if template does not exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("Not found"));

      const exists = await loader.templateExists("nonexistent");

      expect(exists).toBe(false);
    });

    it("should list all templates in directory", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        "template1.template",
        "template2.template",
        "template3.hbs",
        "readme.md", // Should be filtered out
        "config.json", // Should be filtered out
      ] as any);

      const templates = await loader.listTemplates();

      expect(templates).toEqual(["template1", "template2", "template3"]);
    });

    it("should handle empty templates directory", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const templates = await loader.listTemplates();

      expect(templates).toEqual([]);
    });

    it("should throw error if cannot list templates", async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error("Permission denied"));

      await expect(loader.listTemplates()).rejects.toThrow(
        "Failed to list templates: Permission denied",
      );
    });

    it("should return templates directory path", () => {
      expect(loader.getTemplatesDirectory()).toBe(mockTemplatesDir);
    });
  });

  describe("metadata parsing", () => {
    it("should parse extends directive", async () => {
      const templateContent = "{{!-- extends: base-template --}}\nContent";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      // Mock parent template to avoid loading it
      vi.mocked(fs.readFile).mockResolvedValueOnce(templateContent);
      vi.mocked(fs.readFile).mockResolvedValueOnce("Parent content");

      const template = await loader.loadTemplate("child");

      expect(template.extends).toBe("base-template");
    });

    it("should parse block directives", async () => {
      const templateContent = `
{{!-- block: header --}}
Header content
{{!-- endblock --}}
{{!-- block: footer --}}
Footer content
{{!-- endblock --}}
      `;
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      const template = await loader.loadTemplate("blocks");

      expect(template.blocks).toBeDefined();
      expect(template.blocks?.size).toBe(2);
      expect(template.blocks?.get("header")).toContain("Header content");
      expect(template.blocks?.get("footer")).toContain("Footer content");
    });

    it("should handle templates without metadata", async () => {
      const templateContent = "Plain template without metadata";
      vi.mocked(fs.readFile).mockResolvedValue(templateContent);
      vi.mocked(fs.stat).mockResolvedValue({ mtimeMs: 1000 } as any);

      const template = await loader.loadTemplate("plain");

      expect(template.extends).toBeUndefined();
      expect(template.blocks?.size).toBe(0);
    });
  });
});
