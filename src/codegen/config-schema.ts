/**
 * Configuration Schema and Types
 *
 * Defines TypeScript types and Zod schemas for the codegen configuration system.
 * Supports template paths, naming conventions, path configuration, and formatting options.
 *
 * Requirements: 11.1
 */

import { z } from "zod";

/**
 * Template configuration - defines paths to template files
 */
export const TemplateConfigSchema = z.object({
  directory: z.string().default("src/codegen/templates"),
  ipc: z.object({
    contract: z.string().default("ipc-contract.template"),
    handler: z.string().default("ipc-handler.template"),
    hook: z.string().default("ipc-hook.template"),
    test: z.string().default("ipc-test.template"),
  }),
  component: z.object({
    component: z.string().default("react-component.template"),
    test: z.string().default("react-component-test.template"),
    story: z.string().default("react-component-story.template"),
  }),
  schema: z.object({
    schema: z.string().default("db-schema.template"),
    migration: z.string().default("db-migration.template"),
  }),
  test: z.object({
    e2e: z.string().default("e2e-test.template"),
    unit: z.string().default("unit-test.template"),
  }),
});

export type TemplateConfig = z.infer<typeof TemplateConfigSchema>;

/**
 * Naming configuration - defines naming conventions for generated code
 */
export const NamingConfigSchema = z.object({
  ipc: z.object({
    contractSuffix: z.string().default("Contract"),
    handlerSuffix: z.string().default("Handler"),
    hookPrefix: z.string().default("use"),
  }),
  component: z.object({
    suffix: z.string().default(""),
    testSuffix: z.string().default(".test"),
    storySuffix: z.string().default(".stories"),
  }),
  schema: z.object({
    tableSuffix: z.string().default("Table"),
  }),
});

export type NamingConfig = z.infer<typeof NamingConfigSchema>;

/**
 * Path configuration - defines where to generate files
 */
export const PathConfigSchema = z.object({
  ipc: z.object({
    contracts: z.string().default("src/ipc/types"),
    handlers: z.string().default("src/ipc/handlers"),
    hooks: z.string().default("src/hooks"),
  }),
  components: z.string().default("src/components"),
  schemas: z.string().default("src/db"),
  tests: z.object({
    e2e: z.string().default("e2e-tests"),
    unit: z.string().default("src/__tests__"),
  }),
});

export type PathConfig = z.infer<typeof PathConfigSchema>;

/**
 * Formatting configuration - defines code formatting options
 */
export const FormattingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  lint: z.boolean().default(true),
  autoFix: z.boolean().default(true),
  typeCheck: z.boolean().default(true),
});

export type FormattingConfig = z.infer<typeof FormattingConfigSchema>;

/**
 * Complete configuration object
 */
export const ConfigurationSchema = z.object({
  templates: TemplateConfigSchema,
  naming: NamingConfigSchema,
  paths: PathConfigSchema,
  formatting: FormattingConfigSchema,
});

export type Configuration = z.infer<typeof ConfigurationSchema>;

/**
 * Default configuration with sensible defaults for all options
 */
export const DEFAULT_CONFIGURATION: Configuration = {
  templates: {
    directory: "src/codegen/templates",
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
};
