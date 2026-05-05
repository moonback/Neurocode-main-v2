# Code Generation System

This directory contains the code generation and scaffolding system for the Dyad/Kiro application.

## Interactive Prompt System

The interactive prompt system (`prompt-system.ts`) provides parameter collection for CLI commands with support for both interactive and non-interactive modes.

### Features

- **Interactive Mode**: Prompts users for missing required parameters
- **Non-Interactive Mode**: Validates that all required parameters are provided via CLI arguments
- **Parameter Validation**: Built-in validators for common patterns (camelCase, PascalCase, kebab-case, etc.)
- **Type Safety**: Full TypeScript support with type definitions

### Usage

#### Defining Parameters

```typescript
import { ParameterDefinition, validators } from "./prompt-system";

const parameterDefinitions: ParameterDefinition[] = [
  {
    name: "name",
    description: "Name of the IPC endpoint",
    type: "string",
    required: true,
    validate: validators.combine(validators.notEmpty, validators.camelCase),
  },
  {
    name: "domain",
    description: "Domain/namespace for the IPC endpoint",
    type: "string",
    required: true,
    validate: validators.identifier,
  },
  {
    name: "mutation",
    description: "Is this a mutation?",
    type: "boolean",
    required: false,
    default: false,
  },
];
```

#### Collecting Parameters

```typescript
import { collectParameters } from "./prompt-system";

// In your CLI command action
const result = await collectParameters(
  parameterDefinitions,
  { name: providedName, ...options },
  { interactive: !options.nonInteractive },
);

if (!result.success) {
  console.error("❌ Parameter validation failed:");
  for (const error of result.errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

// Use result.parameters for generation
console.log("Parameters:", result.parameters);
```

### Built-in Validators

The prompt system includes several built-in validators:

- **`validators.identifier`**: Validates identifiers (letters, numbers, underscores, hyphens)
- **`validators.pascalCase`**: Validates PascalCase names (e.g., `UserProfile`)
- **`validators.camelCase`**: Validates camelCase names (e.g., `getUser`)
- **`validators.kebabCase`**: Validates kebab-case names (e.g., `user-authentication`)
- **`validators.notEmpty`**: Validates non-empty strings
- **`validators.minLength(n)`**: Validates minimum string length
- **`validators.maxLength(n)`**: Validates maximum string length
- **`validators.combine(...validators)`**: Combines multiple validators

### Parameter Types

The prompt system supports three parameter types:

1. **`string`**: Text input with validation
2. **`boolean`**: Yes/no confirmation
3. **`select`**: Multiple choice selection

### Interactive vs Non-Interactive Mode

#### Interactive Mode (default)

When a required parameter is missing, the user is prompted to provide it:

```bash
$ npm run codegen -- ipc
? Name of the IPC endpoint (required): getUser
? Domain/namespace for the IPC endpoint (required): user
```

#### Non-Interactive Mode

All required parameters must be provided via CLI arguments:

```bash
$ npm run codegen -- ipc getUser --domain user --non-interactive
```

If parameters are missing, the command fails with an error:

```bash
$ npm run codegen -- ipc --non-interactive
❌ Parameter validation failed:
  - Missing required parameter: name (Name of the IPC endpoint)
  - Missing required parameter: domain (Domain/namespace for the IPC endpoint)
```

### Validation

Parameters are validated both when provided via CLI and when collected interactively:

```bash
$ npm run codegen -- ipc GetUser --domain user --non-interactive
❌ Parameter validation failed:
  - Invalid value for name: Must be camelCase (start with lowercase letter, no spaces or special characters)
```

### Testing

The prompt system includes comprehensive unit tests and integration tests:

- **Unit tests**: `__tests__/prompt-system.test.ts`
- **Integration tests**: `__tests__/cli-integration.test.ts`

Run tests with:

```bash
npm run test -- src/codegen/__tests__/
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 6.2**: Prompt for required parameters interactively
- **Requirement 6.3**: Support non-interactive mode with all parameters provided as command-line arguments
- **Requirement 6.6**: Validate parameters before generation and reject invalid inputs

## Future Enhancements

- Support for array parameters (comma-separated values)
- Support for file path parameters with autocomplete
- Support for custom validators per command
- Support for parameter dependencies (conditional parameters)

## Output Formatting System

The output formatting system (`output-formatter.ts`) provides colored console output and summary formatting for the code generation tool.

### Features

- **Colored Messages**: Success, error, warning, and info messages with ANSI colors
- **Generation Summary**: Display generated files with actions (create/update/skip)
- **Dry-Run Mode**: Preview what would be generated without creating files
- **File Statistics**: Show counts and total size of generated files
- **Progress Indicators**: Spinners for long-running operations
- **Validation Errors**: Formatted error display

### Usage

#### Basic Messages

```typescript
import {
  printSuccess,
  printError,
  printWarning,
  printInfo,
} from "./output-formatter";

printSuccess("Operation completed successfully!");
printError("Something went wrong!");
printWarning("This is a warning message");
printInfo("Here's some information");
```

#### Generation Summary

```typescript
import {
  printGenerationSummary,
  type GeneratedFileInfo,
} from "./output-formatter";

const files: GeneratedFileInfo[] = [
  { path: "src/components/Button.tsx", action: "create", size: 1024 },
  { path: "src/components/Button.test.tsx", action: "create", size: 512 },
  { path: "src/components/Input.tsx", action: "update", size: 2048 },
  { path: "src/components/Card.tsx", action: "skip", size: 768 },
];

// Normal mode
printGenerationSummary(files, { verbose: true });

// Dry-run mode
printGenerationSummary(files, { dryRun: true, verbose: true });
```

**Output:**

```
Dry Run - No files will be created

  CREATE  src/components/Button.tsx (1.0 KB)
  CREATE  src/components/Button.test.tsx (512 B)
  UPDATE  src/components/Input.tsx (2.0 KB)
  SKIP    src/components/Card.tsx (768 B)

  2 created, 1 updated, 1 skipped
  Total size: 4.3 KB

ℹ This was a dry run. Run without --dry-run to create these files.
```

#### Validation Errors

```typescript
import { printValidationErrors } from "./output-formatter";

printValidationErrors([
  "Missing required parameter: name",
  "Invalid naming convention: must be camelCase",
  "File already exists: src/test.ts",
]);
```

#### Progress Spinner

```typescript
import { createSpinner } from "./output-formatter";

const spinner = createSpinner("Generating files...");
spinner.start();

// Do work...

spinner.stop("Files generated successfully!");
```

### Dry-Run Mode

All generation commands support `--dry-run` mode, which shows what would be generated without creating any files.

**Example:**

```bash
npm run codegen -- ipc getUser --domain user --dry-run
```

**Output:**

```
ℹ Running in dry-run mode - no files will be created

Dry Run - No files will be created

  CREATE  src/ipc/handlers/user/getUser.ts (1.0 KB)
  CREATE  src/ipc/types/user/getUser.ts (512 B)
  CREATE  src/hooks/use-getUser.ts (768 B)
  CREATE  e2e-tests/user-getUser.spec.ts (2.0 KB)

  4 created
  Total size: 4.3 KB

ℹ This was a dry run. Run without --dry-run to create these files.
```

### Color Codes

The output formatter uses ANSI escape codes for terminal colors:

- **Success**: Green (✓)
- **Error**: Red (✗)
- **Warning**: Yellow (⚠)
- **Info**: Blue (ℹ)
- **File Actions**:
  - CREATE: Green
  - UPDATE: Yellow
  - SKIP: Gray

### Testing

The output formatter includes comprehensive unit tests:

```bash
npm test -- src/codegen/__tests__/output-formatter.test.ts
```

Run the manual demo to see all formatting features:

```bash
npx ts-node src/codegen/__tests__/manual-test-output.ts
```

### Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 6.4**: Display a summary of generated files when scaffolding completes
- **Requirement 6.7**: Support a dry-run mode that shows what would be generated without creating files

## Template Loader and Cache System

The template loader system (`template-loader.ts`) provides efficient template loading with caching and support for template inheritance.

### Features

- **Configurable Directory**: Load templates from any directory
- **Smart Caching**: Cache templates in memory to avoid repeated file reads
- **Change Detection**: Automatically reload templates when files are modified
- **Template Inheritance**: Support parent-child template relationships with block overrides
- **Multiple Formats**: Support `.template`, `.hbs`, and `.mustache` file extensions
- **Cache Management**: Clear cache or invalidate specific templates

### Usage

#### Creating a Template Loader

```typescript
import { createTemplateLoader } from "./template-loader";

const loader = createTemplateLoader({
  templatesDirectory: "./templates",
  cacheEnabled: true, // Default: true
  watchForChanges: true, // Default: true
});
```

#### Loading Templates

```typescript
// Load a template
const template = await loader.loadTemplate("component");

console.log(template.name); // "component"
console.log(template.content); // Template content
console.log(template.path); // Full path to template file
```

#### Template Inheritance

Templates can extend other templates and override specific blocks:

**Parent template (base.template):**

```handlebars
{{! block: header }}
Default header
{{! endblock }}

{{! block: content }}
Default content
{{! endblock }}

{{! block: footer }}
Default footer
{{! endblock }}
```

**Child template (page.template):**

```handlebars
{{! extends: base }}

{{! block: header }}
Custom page header
{{! endblock }}

{{! block: content }}
Custom page content
{{! endblock }}
```

When loading the child template, the loader automatically:

1. Loads the parent template
2. Replaces blocks in the parent with child's blocks
3. Returns the merged content

#### Cache Management

```typescript
// Get cache size
const size = loader.getCacheSize();

// Clear all cached templates
loader.clearCache();

// Invalidate a specific template
loader.invalidateTemplate("component");
```

#### Template Utilities

```typescript
// Check if template exists
const exists = await loader.templateExists("component");

// List all available templates
const templates = await loader.listTemplates();
// Returns: ["component", "handler", "test", ...]

// Get templates directory
const dir = loader.getTemplatesDirectory();
```

### Configuration Options

| Option               | Type      | Default | Description                              |
| -------------------- | --------- | ------- | ---------------------------------------- |
| `templatesDirectory` | `string`  | -       | Path to templates directory (required)   |
| `cacheEnabled`       | `boolean` | `true`  | Enable template caching                  |
| `watchForChanges`    | `boolean` | `true`  | Reload templates when files are modified |

### Template Metadata

Templates can include metadata using comment directives:

#### Extends Directive

```handlebars
{{! extends: parent-template }}
```

Specifies the parent template to inherit from.

#### Block Directive

```handlebars
{{! block: blockName }}
Block content here
{{! endblock }}
```

Defines a named block that can be overridden in child templates.

### Caching Behavior

The template loader uses smart caching to optimize performance:

1. **First Load**: Template is loaded from file and cached
2. **Subsequent Loads**: Template is returned from cache
3. **File Modified**: If `watchForChanges` is enabled, the loader detects file modifications and reloads
4. **Cache Disabled**: If `cacheEnabled` is false, templates are always loaded from file

### Change Detection

When `watchForChanges` is enabled (default), the loader:

1. Stores file modification time (mtime) when loading
2. Checks mtime on subsequent loads
3. Reloads template if mtime changed
4. Updates cache with new content

This ensures developers always get the latest template content during development.

### Testing

The template loader includes comprehensive unit tests:

```bash
npm test -- src/codegen/__tests__/template-loader.test.ts
```

Tests cover:

- Template loading and error handling
- Caching behavior
- Change detection
- Template inheritance
- Cache management
- Template utilities
- Metadata parsing

### Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 5.1**: Load templates from a configurable templates directory
- **Requirement 5.2**: Use updated templates for subsequent generations when modified

## CLI Commands

### IPC Endpoint Generation

```bash
npm run codegen -- ipc <name> --domain <domain> [options]
```

**Options:**

- `--dry-run` - Preview without creating files
- `--non-interactive` - Run without prompts
- `--no-test` - Skip E2E test generation
- `-m, --mutation` - Mark as mutation endpoint
- `--no-format` - Skip automatic formatting
- `--lint` - Run linter and fixers on generated files

### Component Generation

```bash
npm run codegen -- component <name> [options]
```

**Options:**

- `--dry-run` - Preview without creating files
- `--non-interactive` - Run without prompts
- `--no-test` - Skip test file generation
- `--no-story` - Skip Storybook story generation
- `--base-ui` - Include Base UI patterns
- `--no-format` - Skip automatic formatting
- `--lint` - Run linter and fixers on generated files

### Database Schema Generation

```bash
npm run codegen -- db <name> [options]
```

**Options:**

- `--dry-run` - Preview without creating files
- `--non-interactive` - Run without prompts
- `--no-append` - Create a new schema file instead of appending to `schema.ts`
- `--no-format` - Skip automatic formatting

### E2E Test Generation

```bash
npm run codegen -- test <name> [options]
```

**Options:**

- `--dry-run` - Preview without creating files
- `--non-interactive` - Run without prompts
- `-f, --feature <feature>` - Feature name for the filename
- `--no-format` - Skip automatic formatting

### Snippet Insertion

```bash
npm run codegen -- snippet <type> [name] [options]
```

**Types:** `ipc-registration`, `react-hook`

**Options:**

- `-f, --file <file>` - Target file to insert snippet into
- `--dry-run` - Preview without making changes

### Rename Refactoring

```bash
npm run codegen -- rename <type> <oldName> <newName> [options]
```

**Types:** `ipc`, `component`

**Options:**

- `-d, --domain <domain>` - Domain for IPC endpoint
- `--dry-run` - Preview without making changes

### Complex Workflow

```bash
npm run codegen -- workflow <name> [options]
```

**Options:**

- `-d, --domain <domain>` - Domain/Module name
- `--no-ipc` - Skip IPC generation
- `--no-component` - Skip Component generation
- `--no-db` - Skip Database generation
- `--dry-run` - Preview without making changes

## Implementation Status

- ✅ CLI framework setup
- ✅ Interactive prompt system
- ✅ Output formatting with colors
- ✅ Dry-run mode support
- ✅ Generation summary display
- ✅ Template loader and cache system
- ✅ Template variable substitution engine with filters and logic
- ✅ Atomic file system operations with backups and security
- ✅ IPC endpoint generation (Contract, Handler, Hook, Test)
- ✅ React Component generation (Component, Test, Story)
- ✅ Database Schema generation (Append or New File)
- ✅ E2E Test generation (Playwright)
- ✅ Automatic formatting and linting integration (PostProcessor)
- ✅ Generator output validation (Syntax checking)
- ✅ Snippet library and insertion
- ✅ Safe refactoring (Rename)
- ✅ Task orchestration and complex workflows
