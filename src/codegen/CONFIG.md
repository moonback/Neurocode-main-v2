# Codegen Configuration

This document describes all available configuration options for the code generation system.

## Configuration File

The configuration file should be named `codegen.config.json` and placed in the project root.

## Configuration Options

### `templates`

Defines paths to template files used for code generation.

#### `templates.directory`

- **Type**: `string`
- **Default**: `"src/codegen/templates"`
- **Description**: Base directory where template files are stored

#### `templates.ipc`

Configuration for IPC endpoint templates:

- `contract` (string, default: `"ipc-contract.template"`): Template for IPC contract definitions
- `handler` (string, default: `"ipc-handler.template"`): Template for IPC handler implementations
- `hook` (string, default: `"ipc-hook.template"`): Template for React Query hooks
- `test` (string, default: `"ipc-test.template"`): Template for IPC E2E tests

#### `templates.component`

Configuration for React component templates:

- `component` (string, default: `"react-component.template"`): Template for React components
- `test` (string, default: `"react-component-test.template"`): Template for component tests
- `story` (string, default: `"react-component-story.template"`): Template for Storybook stories

#### `templates.schema`

Configuration for database schema templates:

- `schema` (string, default: `"db-schema.template"`): Template for Drizzle schema definitions
- `migration` (string, default: `"db-migration.template"`): Template for database migrations

#### `templates.test`

Configuration for test templates:

- `e2e` (string, default: `"e2e-test.template"`): Template for E2E tests
- `unit` (string, default: `"unit-test.template"`): Template for unit tests

### `naming`

Defines naming conventions for generated code elements.

#### `naming.ipc`

Naming conventions for IPC endpoints:

- `contractSuffix` (string, default: `"Contract"`): Suffix for IPC contract names (e.g., `GetUserContract`)
- `handlerSuffix` (string, default: `"Handler"`): Suffix for IPC handler names (e.g., `getUserHandler`)
- `hookPrefix` (string, default: `"use"`): Prefix for React Query hooks (e.g., `useGetUser`)

#### `naming.component`

Naming conventions for React components:

- `suffix` (string, default: `""`): Suffix for component names (e.g., `""` or `"Component"`)
- `testSuffix` (string, default: `".test"`): Suffix for test files (e.g., `UserProfile.test.tsx`)
- `storySuffix` (string, default: `".stories"`): Suffix for story files (e.g., `UserProfile.stories.tsx`)

#### `naming.schema`

Naming conventions for database schemas:

- `tableSuffix` (string, default: `"Table"`): Suffix for table schema names (e.g., `usersTable`)

### `paths`

Defines where generated files should be placed.

#### `paths.ipc`

Output paths for IPC-related files:

- `contracts` (string, default: `"src/ipc/types"`): Directory for IPC contract definitions
- `handlers` (string, default: `"src/ipc/handlers"`): Directory for IPC handler implementations
- `hooks` (string, default: `"src/hooks"`): Directory for React Query hooks

#### `paths.components`

- **Type**: `string`
- **Default**: `"src/components"`
- **Description**: Directory for React components

#### `paths.schemas`

- **Type**: `string`
- **Default**: `"src/db"`
- **Description**: Directory for database schemas

#### `paths.tests`

Output paths for test files:

- `e2e` (string, default: `"e2e-tests"`): Directory for E2E tests
- `unit` (string, default: `"src/__tests__"`): Directory for unit tests

### `formatting`

Configuration for code formatting and linting.

#### `formatting.enabled`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to run code formatting on generated files

#### `formatting.lint`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to run linting on generated files

#### `formatting.autoFix`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to automatically fix linting errors

#### `formatting.typeCheck`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to run TypeScript type checking on generated files

## Example Configuration

```json
{
  "templates": {
    "directory": "src/codegen/templates",
    "ipc": {
      "contract": "ipc-contract.template",
      "handler": "ipc-handler.template",
      "hook": "ipc-hook.template",
      "test": "ipc-test.template"
    },
    "component": {
      "component": "react-component.template",
      "test": "react-component-test.template",
      "story": "react-component-story.template"
    },
    "schema": {
      "schema": "db-schema.template",
      "migration": "db-migration.template"
    },
    "test": {
      "e2e": "e2e-test.template",
      "unit": "unit-test.template"
    }
  },
  "naming": {
    "ipc": {
      "contractSuffix": "Contract",
      "handlerSuffix": "Handler",
      "hookPrefix": "use"
    },
    "component": {
      "suffix": "",
      "testSuffix": ".test",
      "storySuffix": ".stories"
    },
    "schema": {
      "tableSuffix": "Table"
    }
  },
  "paths": {
    "ipc": {
      "contracts": "src/ipc/types",
      "handlers": "src/ipc/handlers",
      "hooks": "src/hooks"
    },
    "components": "src/components",
    "schemas": "src/db",
    "tests": {
      "e2e": "e2e-tests",
      "unit": "src/__tests__"
    }
  },
  "formatting": {
    "enabled": true,
    "lint": true,
    "autoFix": true,
    "typeCheck": true
  }
}
```

## Configuration Inheritance

The configuration system supports defaults for all options. If a configuration file is not found or a specific option is not provided, the system will use sensible defaults.

## Validation

The configuration is validated against a schema when loaded. If validation fails, descriptive error messages will be provided indicating which fields are invalid and why.

## Customization

You can customize any part of the configuration to match your project's structure and conventions. All paths are relative to the project root.
