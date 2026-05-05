# Code Generation CLI Tool

This CLI tool provides commands for scaffolding common patterns in the Dyad/Kiro application, helping developers reduce repetitive coding tasks and maintain consistency across the codebase.

## Installation

The CLI is already set up as part of the project. No additional installation is required.

## Usage

Run the CLI using npm:

```bash
npm run codegen -- <command> [options]
```

Or directly with ts-node:

```bash
npx ts-node scripts/codegen.ts <command> [options]
```

## Available Commands

### General Options

- `--help, -h` - Display help for any command
- `--version, -v` - Display version number

### IPC Endpoint Generation

Generate a complete IPC endpoint including handler, contract, hook, and test files.

```bash
npm run codegen -- ipc <name> [options]
```

**Arguments:**

- `<name>` - Name of the IPC endpoint (e.g., "getUser", "updateSettings")

**Options:**

- `-d, --domain <domain>` - Domain/namespace for the IPC endpoint (e.g., "user", "settings")
- `-i, --input-schema <schema>` - Input schema definition (TypeScript type or Zod schema)
- `-o, --output-schema <schema>` - Output schema definition (TypeScript type or Zod schema)
- `-m, --mutation` - Mark this endpoint as a mutation (uses useMutation instead of useQuery)
- `--dry-run` - Show what would be generated without creating files
- `--no-test` - Skip generating E2E test file

**Example:**

```bash
npm run codegen -- ipc getUser --domain user --mutation --dry-run
```

### React Component Generation

Generate a React component with test and story files.

```bash
npm run codegen -- component <name> [options]
```

**Arguments:**

- `<name>` - Name of the component (e.g., "UserProfile", "SettingsPanel")

**Options:**

- `--no-test` - Skip generating test file
- `--no-story` - Skip generating Storybook story file
- `--base-ui` - Include Base UI component imports and patterns
- `--dry-run` - Show what would be generated without creating files

**Example:**

```bash
npm run codegen -- component UserProfile --base-ui --dry-run
```

### Database Schema Generation

Generate database schema and migration files using Drizzle ORM.

```bash
npm run codegen -- schema <table> [options]
```

**Arguments:**

- `<table>` - Name of the database table (e.g., "users", "chat_messages")

**Options:**

- `-c, --columns <columns>` - Column definitions (comma-separated)
- `-r, --relations <relations>` - Relation definitions (comma-separated)
- `--dry-run` - Show what would be generated without creating files

**Example:**

```bash
npm run codegen -- schema users --columns "name:string,email:string" --dry-run
```

### E2E Test Generation

Generate E2E test files with proper Playwright setup and fixtures.

```bash
npm run codegen -- test <feature> [options]
```

**Arguments:**

- `<feature>` - Name of the feature to test (e.g., "user-authentication", "chat-panel")

**Options:**

- `-f, --fixtures <fixtures>` - Test fixtures to include (comma-separated)
- `--dry-run` - Show what would be generated without creating files

**Example:**

```bash
npm run codegen -- test user-authentication --fixtures "user,settings" --dry-run
```

### Code Snippet Insertion

Insert common code patterns/snippets.

```bash
npm run codegen -- snippet <type> [options]
```

**Arguments:**

- `<type>` - Type of snippet (e.g., "ipc-query", "ipc-mutation", "react-hook", "error-handling")

**Options:**

- `-f, --file <file>` - Target file to insert snippet into
- `-l, --line <line>` - Line number to insert at

**Example:**

```bash
npm run codegen -- snippet ipc-query --file src/hooks/useUser.ts --line 10
```

### Refactoring Operations

Automated refactoring operations for renaming and restructuring code.

#### Rename IPC Endpoint

Rename an IPC endpoint across all files (handler, contract, hook, tests).

```bash
npm run codegen -- refactor rename-ipc <old-name> <new-name> [options]
```

**Arguments:**

- `<old-name>` - Current name of the IPC endpoint
- `<new-name>` - New name for the IPC endpoint

**Options:**

- `--dry-run` - Show what would be changed without modifying files

**Example:**

```bash
npm run codegen -- refactor rename-ipc getUser fetchUser --dry-run
```

#### Rename Component

Rename a React component across all files (component, tests, stories, imports).

```bash
npm run codegen -- refactor rename-component <old-name> <new-name> [options]
```

**Arguments:**

- `<old-name>` - Current name of the component
- `<new-name>` - New name for the component

**Options:**

- `--dry-run` - Show what would be changed without modifying files

**Example:**

```bash
npm run codegen -- refactor rename-component UserProfile UserCard --dry-run
```

### Documentation Generation

Generate documentation from code (JSDoc comments, API references).

```bash
npm run codegen -- docs [options]
```

**Options:**

- `-t, --type <type>` - Type of documentation to generate (ipc, components, all) [default: "all"]
- `-o, --output <path>` - Output directory for generated documentation [default: "docs/generated"]

**Example:**

```bash
npm run codegen -- docs --type ipc --output docs/api
```

## Command Registration System

The CLI is built with extensibility in mind using Commander.js. Each command is registered with:

- Clear descriptions
- Type-safe argument parsing
- Consistent option naming
- Help text generation
- Version support

### Adding New Commands

To add a new command, edit `scripts/codegen.ts` and follow the existing pattern:

```typescript
program
  .command("mycommand")
  .description("Description of my command")
  .argument("<required-arg>", "Description of required argument")
  .option("-o, --optional <value>", "Description of optional flag")
  .action(async (requiredArg: string, options: Record<string, unknown>) => {
    // Implementation here
  });
```

## Implementation Status

**✅ Completed:**

- CLI entry point with Commander.js
- Command registration system
- Help and version support
- All command structures defined

**🚧 In Progress:**

- Command implementations (Tasks 1.2+)

**📋 Planned:**

- Template engine integration
- File generation logic
- Validation and formatting
- Interactive prompts
- Configuration system

## Development

### Testing the CLI

You can test any command with the `--dry-run` flag to see what would be generated without creating files:

```bash
npm run codegen -- ipc testEndpoint --domain test --dry-run
```

### Getting Help

For help with any command, use the `--help` flag:

```bash
npm run codegen -- --help
npm run codegen -- ipc --help
npm run codegen -- refactor rename-ipc --help
```

## Requirements Satisfied

This CLI implementation satisfies the following requirements from the spec:

- **Requirement 6.1**: Provides commands for each scaffolding type (IPC, component, schema, test)
- **Requirement 6.2**: Supports interactive prompts for required parameters (to be implemented)
- **Requirement 6.3**: Supports non-interactive mode with all parameters as command-line arguments
- **Requirement 6.4**: Displays summary of generated files (to be implemented)
- **Requirement 6.5**: Displays descriptive error messages on failure (to be implemented)
- **Requirement 6.6**: Validates parameters before generation (to be implemented)
- **Requirement 6.7**: Supports dry-run mode

## Related Files

- `scripts/codegen.ts` - Main CLI entry point
- `.kiro/specs/coding-speed-improvements/` - Feature specification
- `package.json` - npm script configuration

## Next Steps

1. Implement template engine (Task 1.2)
2. Implement IPC generation logic (Task 1.3)
3. Implement component generation logic (Task 1.4)
4. Add interactive prompts
5. Add validation and error handling
6. Add tests
