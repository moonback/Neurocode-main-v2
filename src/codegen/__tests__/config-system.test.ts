/**
 * Unit Tests for Configuration System
 *
 * Tests parsing, validation, pretty printing, and round-trip preservation
 * of configuration files.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ConfigurationParser } from "../config-parser";
import { ConfigurationPrinter } from "../config-printer";
import { ConfigurationValidator } from "../config-validator";
import { Configuration, DEFAULT_CONFIGURATION } from "../config-schema";

describe("ConfigurationParser", () => {
  let parser: ConfigurationParser;

  beforeEach(() => {
    parser = new ConfigurationParser(process.cwd());
  });

  describe("parse", () => {
    it("should parse valid configuration", () => {
      const validConfig = JSON.stringify(DEFAULT_CONFIGURATION);
      const result = parser.parse(validConfig);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it("should handle invalid JSON syntax", () => {
      const invalidJson = '{ "templates": { "directory": "test" ';
      const result = parser.parse(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain("Invalid JSON syntax");
    });

    it("should provide line and column for syntax errors", () => {
      const invalidJson = '{\n  "templates": {\n    "directory": "test"\n  ';
      const result = parser.parse(invalidJson);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].line).toBeDefined();
    });

    it("should validate against schema", () => {
      const invalidConfig = JSON.stringify({
        templates: {
          directory: 123, // Should be string
        },
      });
      const result = parser.parse(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it("should handle missing required fields with defaults", () => {
      const partialConfig = JSON.stringify({
        templates: {
          directory: "custom/templates",
          ipc: {
            contract: "ipc-contract.template",
            handler: "ipc-handler.template",
            hook: "ipc-hook.template",
            test: "ipc-test.template",
          },
          component: {
            component: "react-component.template",
            test: "react-component-test.template",
            story: "react-component-story.template",
          },
          schema: {
            schema: "db-schema.template",
            migration: "db-migration.template",
          },
          test: {
            e2e: "e2e-test.template",
            unit: "unit-test.template",
          },
        },
        naming: {
          ipc: {
            contractSuffix: "Contract",
            handlerSuffix: "Handler",
            hookPrefix: "use",
          },
          component: {
            suffix: "",
            testSuffix: ".test",
            storySuffix: ".stories",
          },
          schema: {
            tableSuffix: "Table",
          },
        },
        paths: {
          ipc: {
            contracts: "src/ipc/types",
            handlers: "src/ipc/handlers",
            hooks: "src/hooks",
          },
          components: "src/components",
          schemas: "src/db",
          tests: {
            e2e: "e2e-tests",
            unit: "src/__tests__",
          },
        },
        formatting: {
          enabled: true,
          lint: true,
          autoFix: true,
          typeCheck: true,
        },
      });
      const result = parser.parse(partialConfig);

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config!.templates.directory).toBe("custom/templates");
    });
  });

  describe("formatErrors", () => {
    it("should format parse errors for display", () => {
      const errors = [
        {
          message: "Invalid type",
          path: ["templates", "directory"],
          line: 2,
          column: 5,
        },
      ];
      const formatted = parser.formatErrors(errors);

      expect(formatted).toContain("Configuration Error");
      expect(formatted).toContain("templates.directory");
      expect(formatted).toContain("Line: 2");
      expect(formatted).toContain("Invalid type");
    });
  });
});

describe("ConfigurationPrinter", () => {
  let printer: ConfigurationPrinter;

  beforeEach(() => {
    printer = new ConfigurationPrinter();
  });

  describe("print", () => {
    it("should print configuration as valid JSON", () => {
      const printed = printer.print(DEFAULT_CONFIGURATION);

      expect(() => JSON.parse(printed)).not.toThrow();
      const parsed = JSON.parse(printed);
      expect(parsed).toEqual(DEFAULT_CONFIGURATION);
    });

    it("should use specified indentation", () => {
      const printed2 = printer.print(DEFAULT_CONFIGURATION, { indent: 2 });
      const printed4 = printer.print(DEFAULT_CONFIGURATION, { indent: 4 });

      expect(printed2).not.toBe(printed4);
      expect(printed2.length).toBeLessThan(printed4.length);

      // Both should parse to same object
      expect(JSON.parse(printed2)).toEqual(JSON.parse(printed4));
    });

    it("should handle custom configurations", () => {
      const customConfig: Configuration = {
        ...DEFAULT_CONFIGURATION,
        templates: {
          ...DEFAULT_CONFIGURATION.templates,
          directory: "custom/path",
        },
      };

      const printed = printer.print(customConfig);
      const parsed = JSON.parse(printed);

      expect(parsed.templates.directory).toBe("custom/path");
    });
  });

  describe("format", () => {
    it("should format unformatted JSON", () => {
      const unformatted =
        '{"templates":{"directory":"test"},"naming":{"ipc":{"contractSuffix":"Contract"}}}';
      const formatted = printer.format(unformatted);

      expect(formatted).toContain("\n");
      expect(formatted).toContain("  ");
      expect(() => JSON.parse(formatted)).not.toThrow();
    });

    it("should return original content if parsing fails", () => {
      const invalid = "not valid json";
      const result = printer.format(invalid);

      expect(result).toBe(invalid);
    });
  });
});

describe("ConfigurationValidator", () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
  });

  describe("validate", () => {
    it("should validate correct configuration", () => {
      const result = validator.validate(DEFAULT_CONFIGURATION);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid field types", () => {
      const invalid = {
        templates: {
          directory: 123, // Should be string
        },
      };
      const result = validator.validate(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should provide field path in errors", () => {
      const invalid = {
        templates: {
          directory: "test",
          ipc: {
            contract: 123, // Should be string
          },
        },
      };
      const result = validator.validate(invalid);

      expect(result.valid).toBe(false);
      const error = result.errors.find((e) => e.field.includes("contract"));
      expect(error).toBeDefined();
    });

    it("should warn about absolute paths", () => {
      const config: Configuration = {
        ...DEFAULT_CONFIGURATION,
        paths: {
          ...DEFAULT_CONFIGURATION.paths,
          components: "/absolute/path",
        },
      };
      const result = validator.validate(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("absolute"))).toBe(true);
    });

    it("should warn about paths with ..", () => {
      const config: Configuration = {
        ...DEFAULT_CONFIGURATION,
        paths: {
          ...DEFAULT_CONFIGURATION.paths,
          components: "../outside/project",
        },
      };
      const result = validator.validate(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes(".."))).toBe(true);
    });

    it("should warn about invalid naming conventions", () => {
      const config: Configuration = {
        ...DEFAULT_CONFIGURATION,
        naming: {
          ...DEFAULT_CONFIGURATION.naming,
          ipc: {
            ...DEFAULT_CONFIGURATION.naming.ipc,
            hookPrefix: "Use", // Should be lowercase
          },
        },
      };
      const result = validator.validate(config);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("lowercase"))).toBe(true);
    });
  });

  describe("formatErrors", () => {
    it("should format validation errors", () => {
      const result = {
        valid: false,
        errors: [
          {
            field: "templates.directory",
            message: "Expected string, received number",
            value: 123,
          },
        ],
        warnings: [],
      };
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Configuration Validation Failed");
      expect(formatted).toContain("templates.directory");
      expect(formatted).toContain("Expected string");
    });

    it("should format warnings", () => {
      const result = {
        valid: true,
        errors: [],
        warnings: ["Path is absolute", "Hook prefix should be lowercase"],
      };
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Configuration Warnings");
      expect(formatted).toContain("Path is absolute");
      expect(formatted).toContain("Hook prefix should be lowercase");
    });
  });
});

describe("Configuration Round-Trip", () => {
  it("should preserve configuration through parse-print-parse cycle", () => {
    const parser = new ConfigurationParser(process.cwd());
    const printer = new ConfigurationPrinter();

    // Start with default configuration
    const original = DEFAULT_CONFIGURATION;

    // Print it
    const printed = printer.print(original);

    // Parse it
    const parseResult = parser.parse(printed);
    expect(parseResult.success).toBe(true);
    expect(parseResult.config).toEqual(original);

    // Print again
    const reprinted = printer.print(parseResult.config!);

    // Parse again
    const reparseResult = parser.parse(reprinted);
    expect(reparseResult.success).toBe(true);
    expect(reparseResult.config).toEqual(original);
  });

  it("should preserve custom configuration values", () => {
    const parser = new ConfigurationParser(process.cwd());
    const printer = new ConfigurationPrinter();

    const custom: Configuration = {
      templates: {
        directory: "custom/templates",
        ipc: {
          contract: "custom-contract.tmpl",
          handler: "custom-handler.tmpl",
          hook: "custom-hook.tmpl",
          test: "custom-test.tmpl",
        },
        component: {
          component: "custom-component.tmpl",
          test: "custom-test.tmpl",
          story: "custom-story.tmpl",
        },
        schema: {
          schema: "custom-schema.tmpl",
          migration: "custom-migration.tmpl",
        },
        test: {
          e2e: "custom-e2e.tmpl",
          unit: "custom-unit.tmpl",
        },
      },
      naming: {
        ipc: {
          contractSuffix: "Spec",
          handlerSuffix: "Impl",
          hookPrefix: "query",
        },
        component: {
          suffix: "Component",
          testSuffix: ".spec",
          storySuffix: ".story",
        },
        schema: {
          tableSuffix: "Schema",
        },
      },
      paths: {
        ipc: {
          contracts: "lib/ipc/contracts",
          handlers: "lib/ipc/handlers",
          hooks: "lib/hooks",
        },
        components: "lib/components",
        schemas: "lib/db",
        tests: {
          e2e: "tests/e2e",
          unit: "tests/unit",
        },
      },
      formatting: {
        enabled: false,
        lint: false,
        autoFix: false,
        typeCheck: false,
      },
    };

    const printed = printer.print(custom);
    const parseResult = parser.parse(printed);

    expect(parseResult.success).toBe(true);
    expect(parseResult.config).toEqual(custom);
  });
});
