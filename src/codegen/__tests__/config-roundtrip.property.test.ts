/**
 * Property-Based Tests for Configuration Round-Trip Preservation
 *
 * Feature: coding-speed-improvements
 * Property 1: Configuration Round-Trip Preservation
 *
 * **Validates: Requirements 11.4**
 *
 * For any valid Configuration object, parsing its printed representation
 * then parsing again SHALL produce an equivalent Configuration object.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Configuration } from "../config-schema";
import { ConfigurationParser } from "../config-parser";
import { ConfigurationPrinter } from "../config-printer";

// Custom arbitraries for configuration types
const templateConfigArbitrary = fc.record({
  directory: fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => !s.includes("\0")),
  ipc: fc.record({
    contract: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    handler: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    hook: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    test: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
  }),
  component: fc.record({
    component: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    test: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    story: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
  }),
  schema: fc.record({
    schema: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    migration: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
  }),
  test: fc.record({
    e2e: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
    unit: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0")),
  }),
});

const namingConfigArbitrary = fc.record({
  ipc: fc.record({
    contractSuffix: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => /^[A-Z][a-zA-Z]*$/.test(s)),
    handlerSuffix: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => /^[A-Z][a-zA-Z]*$/.test(s)),
    hookPrefix: fc
      .string({ minLength: 1, maxLength: 10 })
      .filter((s) => /^[a-z]+$/.test(s)),
  }),
  component: fc.record({
    suffix: fc.string({ maxLength: 20 }),
    testSuffix: fc.string({ minLength: 1, maxLength: 20 }),
    storySuffix: fc.string({ minLength: 1, maxLength: 20 }),
  }),
  schema: fc.record({
    tableSuffix: fc.string({ minLength: 1, maxLength: 20 }),
  }),
});

const pathConfigArbitrary = fc.record({
  ipc: fc.record({
    contracts: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0") && !s.startsWith("/")),
    handlers: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0") && !s.startsWith("/")),
    hooks: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0") && !s.startsWith("/")),
  }),
  components: fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => !s.includes("\0") && !s.startsWith("/")),
  schemas: fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => !s.includes("\0") && !s.startsWith("/")),
  tests: fc.record({
    e2e: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0") && !s.startsWith("/")),
    unit: fc
      .string({ minLength: 1, maxLength: 50 })
      .filter((s) => !s.includes("\0") && !s.startsWith("/")),
  }),
});

const formattingConfigArbitrary = fc.record({
  enabled: fc.boolean(),
  lint: fc.boolean(),
  autoFix: fc.boolean(),
  typeCheck: fc.boolean(),
});

const configurationArbitrary: fc.Arbitrary<Configuration> = fc.record({
  templates: templateConfigArbitrary,
  naming: namingConfigArbitrary,
  paths: pathConfigArbitrary,
  formatting: formattingConfigArbitrary,
});

describe("Configuration Round-Trip Preservation", () => {
  it("should preserve configuration through print-parse-print cycle", () => {
    const parser = new ConfigurationParser(process.cwd());
    const printer = new ConfigurationPrinter();

    fc.assert(
      fc.property(configurationArbitrary, (config) => {
        // Print the configuration
        const printed = printer.print(config);

        // Parse the printed configuration
        const parseResult = parser.parse(printed);

        // Should parse successfully
        expect(parseResult.success).toBe(true);
        expect(parseResult.config).toBeDefined();

        // Print again
        const reprinted = printer.print(parseResult.config!);

        // Parse the reprinted configuration
        const reparseResult = parser.parse(reprinted);

        // Should parse successfully
        expect(reparseResult.success).toBe(true);
        expect(reparseResult.config).toBeDefined();

        // The two parsed configurations should be equivalent
        expect(reparseResult.config).toEqual(parseResult.config);
      }),
      { numRuns: 100 },
    );
  });

  it("should preserve configuration structure after round-trip", () => {
    const parser = new ConfigurationParser(process.cwd());
    const printer = new ConfigurationPrinter();

    fc.assert(
      fc.property(configurationArbitrary, (config) => {
        // Print and parse
        const printed = printer.print(config);
        const parseResult = parser.parse(printed);

        expect(parseResult.success).toBe(true);
        expect(parseResult.config).toBeDefined();

        // Check that all top-level keys are preserved
        expect(parseResult.config).toHaveProperty("templates");
        expect(parseResult.config).toHaveProperty("naming");
        expect(parseResult.config).toHaveProperty("paths");
        expect(parseResult.config).toHaveProperty("formatting");

        // Check that nested structures are preserved
        expect(parseResult.config!.templates).toHaveProperty("ipc");
        expect(parseResult.config!.templates).toHaveProperty("component");
        expect(parseResult.config!.naming).toHaveProperty("ipc");
        expect(parseResult.config!.paths).toHaveProperty("ipc");
      }),
      { numRuns: 100 },
    );
  });

  it("should produce valid JSON that can be parsed", () => {
    const printer = new ConfigurationPrinter();

    fc.assert(
      fc.property(configurationArbitrary, (config) => {
        const printed = printer.print(config);

        // Should be valid JSON
        expect(() => JSON.parse(printed)).not.toThrow();

        // Parsed JSON should match original structure
        const parsed = JSON.parse(printed);
        expect(parsed).toEqual(config);
      }),
      { numRuns: 100 },
    );
  });

  it("should handle different indentation levels", () => {
    const parser = new ConfigurationParser(process.cwd());
    const printer = new ConfigurationPrinter();

    fc.assert(
      fc.property(
        configurationArbitrary,
        fc.integer({ min: 0, max: 8 }),
        (config, indent) => {
          // Print with specific indentation
          const printed = printer.print(config, { indent });

          // Parse should work regardless of indentation
          const parseResult = parser.parse(printed);

          expect(parseResult.success).toBe(true);
          expect(parseResult.config).toEqual(config);
        },
      ),
      { numRuns: 100 },
    );
  });
});
