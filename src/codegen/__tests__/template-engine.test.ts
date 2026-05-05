/**
 * Unit tests for Template Engine with Variable Substitution
 *
 * Tests variable substitution, transformation filters, and proper escaping.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateEngine, createTemplateEngine } from "../template-engine";

describe("TemplateEngine", () => {
  let engine: TemplateEngine;

  beforeEach(() => {
    engine = createTemplateEngine();
  });

  describe("basic variable substitution", () => {
    it("should substitute a simple variable", () => {
      const template = "Hello {{name}}!";
      const context = { name: "World" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello World!");
    });

    it("should substitute multiple variables", () => {
      const template = "{{greeting}} {{name}}, welcome to {{place}}!";
      const context = { greeting: "Hello", name: "Alice", place: "Wonderland" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello Alice, welcome to Wonderland!");
    });

    it("should handle missing variables as empty strings", () => {
      const template = "Hello {{name}}!";
      const context = {};

      const result = engine.render(template, context);

      expect(result).toBe("Hello !");
    });

    it("should handle undefined variables as empty strings", () => {
      const template = "Hello {{name}}!";
      const context = { name: undefined };

      const result = engine.render(template, context);

      expect(result).toBe("Hello !");
    });

    it("should handle null variables as empty strings", () => {
      const template = "Hello {{name}}!";
      const context = { name: null };

      const result = engine.render(template, context);

      expect(result).toBe("Hello !");
    });

    it("should substitute number variables", () => {
      const template = "The answer is {{answer}}";
      const context = { answer: 42 };

      const result = engine.render(template, context);

      expect(result).toBe("The answer is 42");
    });

    it("should substitute boolean variables", () => {
      const template = "Is active: {{active}}";
      const context = { active: true };

      const result = engine.render(template, context);

      expect(result).toBe("Is active: true");
    });

    it("should handle nested object properties with dot notation", () => {
      const template = "User: {{user.name}}, Email: {{user.email}}";
      const context = { user: { name: "Alice", email: "alice@example.com" } };

      const result = engine.render(template, context);

      expect(result).toBe("User: Alice, Email: alice@example.com");
    });

    it("should handle deeply nested properties", () => {
      const template = "City: {{address.city.name}}";
      const context = { address: { city: { name: "New York" } } };

      const result = engine.render(template, context);

      expect(result).toBe("City: New York");
    });

    it("should handle missing nested properties as empty strings", () => {
      const template = "City: {{address.city.name}}";
      const context = { address: {} };

      const result = engine.render(template, context);

      expect(result).toBe("City: ");
    });

    it("should handle array variables by joining with commas", () => {
      const template = "Tags: {{tags}}";
      const context = { tags: ["typescript", "react", "node"] };

      const result = engine.render(template, context);

      expect(result).toBe("Tags: typescript, react, node");
    });

    it("should handle object variables by JSON stringifying", () => {
      const template = "Config: {{config}}";
      const context = { config: { debug: true, port: 3000 } };

      const result = engine.render(template, context);

      // JSON.stringify produces quotes which get escaped
      expect(result).toBe('Config: {\\"debug\\":true,\\"port\\":3000}');
    });
  });

  describe("transformation filters", () => {
    describe("pascalCase filter", () => {
      it("should convert kebab-case to PascalCase", () => {
        const template = "{{name | pascalCase}}";
        const context = { name: "hello-world" };

        const result = engine.render(template, context);

        expect(result).toBe("HelloWorld");
      });

      it("should convert snake_case to PascalCase", () => {
        const template = "{{name | pascalCase}}";
        const context = { name: "hello_world" };

        const result = engine.render(template, context);

        expect(result).toBe("HelloWorld");
      });

      it("should convert space-separated to PascalCase", () => {
        const template = "{{name | pascalCase}}";
        const context = { name: "hello world" };

        const result = engine.render(template, context);

        expect(result).toBe("HelloWorld");
      });

      it("should handle single word", () => {
        const template = "{{name | pascalCase}}";
        const context = { name: "hello" };

        const result = engine.render(template, context);

        expect(result).toBe("Hello");
      });

      it("should handle already PascalCase", () => {
        const template = "{{name | pascalCase}}";
        const context = { name: "HelloWorld" };

        const result = engine.render(template, context);

        expect(result).toBe("Helloworld");
      });
    });

    describe("camelCase filter", () => {
      it("should convert kebab-case to camelCase", () => {
        const template = "{{name | camelCase}}";
        const context = { name: "hello-world" };

        const result = engine.render(template, context);

        expect(result).toBe("helloWorld");
      });

      it("should convert snake_case to camelCase", () => {
        const template = "{{name | camelCase}}";
        const context = { name: "hello_world" };

        const result = engine.render(template, context);

        expect(result).toBe("helloWorld");
      });

      it("should convert space-separated to camelCase", () => {
        const template = "{{name | camelCase}}";
        const context = { name: "hello world" };

        const result = engine.render(template, context);

        expect(result).toBe("helloWorld");
      });

      it("should handle single word", () => {
        const template = "{{name | camelCase}}";
        const context = { name: "hello" };

        const result = engine.render(template, context);

        expect(result).toBe("hello");
      });
    });

    describe("kebab-case filter", () => {
      it("should convert PascalCase to kebab-case", () => {
        const template = "{{name | kebab-case}}";
        const context = { name: "HelloWorld" };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });

      it("should convert camelCase to kebab-case", () => {
        const template = "{{name | kebab-case}}";
        const context = { name: "helloWorld" };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });

      it("should convert snake_case to kebab-case", () => {
        const template = "{{name | kebab-case}}";
        const context = { name: "hello_world" };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });

      it("should convert space-separated to kebab-case", () => {
        const template = "{{name | kebab-case}}";
        const context = { name: "hello world" };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });

      it("should handle already kebab-case", () => {
        const template = "{{name | kebab-case}}";
        const context = { name: "hello-world" };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });
    });

    describe("snake_case filter", () => {
      it("should convert PascalCase to snake_case", () => {
        const template = "{{name | snake_case}}";
        const context = { name: "HelloWorld" };

        const result = engine.render(template, context);

        expect(result).toBe("hello_world");
      });

      it("should convert camelCase to snake_case", () => {
        const template = "{{name | snake_case}}";
        const context = { name: "helloWorld" };

        const result = engine.render(template, context);

        expect(result).toBe("hello_world");
      });

      it("should convert kebab-case to snake_case", () => {
        const template = "{{name | snake_case}}";
        const context = { name: "hello-world" };

        const result = engine.render(template, context);

        expect(result).toBe("hello_world");
      });

      it("should convert space-separated to snake_case", () => {
        const template = "{{name | snake_case}}";
        const context = { name: "hello world" };

        const result = engine.render(template, context);

        expect(result).toBe("hello_world");
      });
    });

    describe("other filters", () => {
      it("should apply uppercase filter", () => {
        const template = "{{name | uppercase}}";
        const context = { name: "hello" };

        const result = engine.render(template, context);

        expect(result).toBe("HELLO");
      });

      it("should apply lowercase filter", () => {
        const template = "{{name | lowercase}}";
        const context = { name: "HELLO" };

        const result = engine.render(template, context);

        expect(result).toBe("hello");
      });

      it("should apply capitalize filter", () => {
        const template = "{{name | capitalize}}";
        const context = { name: "hello" };

        const result = engine.render(template, context);

        expect(result).toBe("Hello");
      });

      it("should apply trim filter", () => {
        const template = "{{name | trim}}";
        const context = { name: "  hello  " };

        const result = engine.render(template, context);

        expect(result).toBe("hello");
      });
    });

    describe("chained filters", () => {
      it("should apply multiple filters in sequence", () => {
        const template = "{{name | pascalCase | lowercase}}";
        const context = { name: "hello-world" };

        const result = engine.render(template, context);

        expect(result).toBe("helloworld");
      });

      it("should apply three filters in sequence", () => {
        const template = "{{name | trim | pascalCase | kebab-case}}";
        const context = { name: "  hello world  " };

        const result = engine.render(template, context);

        expect(result).toBe("hello-world");
      });

      it("should handle complex filter chains", () => {
        const template = "{{name | camelCase | uppercase}}";
        const context = { name: "hello-world-test" };

        const result = engine.render(template, context);

        expect(result).toBe("HELLOWORLDTEST");
      });
    });

    describe("filter errors", () => {
      it("should throw error for unknown filter", () => {
        const template = "{{name | unknownFilter}}";
        const context = { name: "hello" };

        expect(() => engine.render(template, context)).toThrow(
          "Unknown filter: unknownFilter",
        );
      });

      it("should throw error for unknown filter in chain", () => {
        const template = "{{name | pascalCase | unknownFilter}}";
        const context = { name: "hello" };

        expect(() => engine.render(template, context)).toThrow(
          "Unknown filter: unknownFilter",
        );
      });
    });
  });

  describe("TypeScript escaping", () => {
    it("should escape double quotes", () => {
      const template = "{{text}}";
      const context = { text: 'Hello "World"' };

      const result = engine.render(template, context);

      expect(result).toBe('Hello \\"World\\"');
    });

    it("should escape single quotes", () => {
      const template = "{{text}}";
      const context = { text: "Hello 'World'" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello \\'World\\'");
    });

    it("should escape backslashes", () => {
      const template = "{{path}}";
      const context = { path: "C:\\Users\\Alice" };

      const result = engine.render(template, context);

      expect(result).toBe("C:\\\\Users\\\\Alice");
    });

    it("should escape newlines", () => {
      const template = "{{text}}";
      const context = { text: "Line 1\nLine 2" };

      const result = engine.render(template, context);

      expect(result).toBe("Line 1\\nLine 2");
    });

    it("should escape carriage returns", () => {
      const template = "{{text}}";
      const context = { text: "Line 1\rLine 2" };

      const result = engine.render(template, context);

      expect(result).toBe("Line 1\\rLine 2");
    });

    it("should escape tabs", () => {
      const template = "{{text}}";
      const context = { text: "Column1\tColumn2" };

      const result = engine.render(template, context);

      expect(result).toBe("Column1\\tColumn2");
    });

    it("should escape backticks", () => {
      const template = "{{text}}";
      const context = { text: "Template `string`" };

      const result = engine.render(template, context);

      expect(result).toBe("Template \\`string\\`");
    });

    it("should escape multiple special characters", () => {
      const template = "{{text}}";
      const context = { text: 'Hello "World"\nNew line\tTab\\Path' };

      const result = engine.render(template, context);

      expect(result).toBe('Hello \\"World\\"\\nNew line\\tTab\\\\Path');
    });

    it("should escape special characters after applying filters", () => {
      const template = "{{text | pascalCase}}";
      const context = { text: 'hello-"world"' };

      const result = engine.render(template, context);

      // pascalCase splits on hyphens, so 'hello-"world"' becomes ['hello', '"world"']
      // Then capitalizes each: ['Hello', '"world"'] (quotes don't get capitalized)
      // Joins to: 'Hello"world"', then escaping happens
      expect(result).toBe('Hello\\"world\\"');
    });

    it("should handle empty strings without escaping issues", () => {
      const template = "{{text}}";
      const context = { text: "" };

      const result = engine.render(template, context);

      expect(result).toBe("");
    });

    it("should handle strings with only special characters", () => {
      const template = "{{text}}";
      const context = { text: "\"'\n\r\t\\`" };

      const result = engine.render(template, context);

      expect(result).toBe("\\\"\\'\\n\\r\\t\\\\\\`");
    });
  });

  describe("custom filters", () => {
    it("should allow registering custom filters", () => {
      engine.registerFilter("reverse", (value: string) => {
        return value.split("").reverse().join("");
      });

      const template = "{{text | reverse}}";
      const context = { text: "hello" };

      const result = engine.render(template, context);

      expect(result).toBe("olleh");
    });

    it("should allow using custom filters in chains", () => {
      engine.registerFilter("double", (value: string) => {
        return value + value;
      });

      const template = "{{text | double | uppercase}}";
      const context = { text: "hi" };

      const result = engine.render(template, context);

      expect(result).toBe("HIHI");
    });

    it("should allow overriding default filters", () => {
      engine.registerFilter("uppercase", (value: string) => {
        return `CUSTOM_${value.toUpperCase()}`;
      });

      const template = "{{text | uppercase}}";
      const context = { text: "hello" };

      const result = engine.render(template, context);

      expect(result).toBe("CUSTOM_HELLO");
    });
  });

  describe("filter utilities", () => {
    it("should return all registered filter names", () => {
      const filterNames = engine.getFilterNames();

      expect(filterNames).toContain("pascalCase");
      expect(filterNames).toContain("camelCase");
      expect(filterNames).toContain("kebab-case");
      expect(filterNames).toContain("snake_case");
      expect(filterNames).toContain("uppercase");
      expect(filterNames).toContain("lowercase");
      expect(filterNames).toContain("capitalize");
      expect(filterNames).toContain("trim");
    });

    it("should check if filter exists", () => {
      expect(engine.hasFilter("pascalCase")).toBe(true);
      expect(engine.hasFilter("camelCase")).toBe(true);
      expect(engine.hasFilter("unknownFilter")).toBe(false);
    });

    it("should include custom filters in filter names", () => {
      engine.registerFilter("custom", (value: string) => value);

      const filterNames = engine.getFilterNames();

      expect(filterNames).toContain("custom");
    });
  });

  describe("edge cases", () => {
    it("should handle template with no variables", () => {
      const template = "Hello World!";
      const context = { name: "Alice" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello World!");
    });

    it("should handle empty template", () => {
      const template = "";
      const context = { name: "Alice" };

      const result = engine.render(template, context);

      expect(result).toBe("");
    });

    it("should handle empty context", () => {
      const template = "Hello {{name}}!";
      const context = {};

      const result = engine.render(template, context);

      expect(result).toBe("Hello !");
    });

    it("should handle variables with spaces in braces", () => {
      const template = "Hello {{ name }}!";
      const context = { name: "Alice" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello Alice!");
    });

    it("should handle filters with spaces", () => {
      const template = "{{ name | pascalCase }}";
      const context = { name: "hello-world" };

      const result = engine.render(template, context);

      expect(result).toBe("HelloWorld");
    });

    it("should handle consecutive variables", () => {
      const template = "{{first}}{{second}}";
      const context = { first: "Hello", second: "World" };

      const result = engine.render(template, context);

      expect(result).toBe("HelloWorld");
    });

    it("should handle variables at start and end", () => {
      const template = "{{start}} middle {{end}}";
      const context = { start: "Begin", end: "Finish" };

      const result = engine.render(template, context);

      expect(result).toBe("Begin middle Finish");
    });

    it("should not process incomplete variable syntax", () => {
      const template = "Hello {{name!";
      const context = { name: "Alice" };

      const result = engine.render(template, context);

      expect(result).toBe("Hello {{name!");
    });

    it("should handle nested braces in text", () => {
      const template = "Code: { {{variable}} }";
      const context = { variable: "value" };

      const result = engine.render(template, context);

      expect(result).toBe("Code: { value }");
    });
  });

  describe("real-world code generation scenarios", () => {
    it("should generate TypeScript interface property", () => {
      const template = "  {{propName | camelCase}}: {{propType}};";
      const context = { propName: "user-name", propType: "string" };

      const result = engine.render(template, context);

      expect(result).toBe("  userName: string;");
    });

    it("should generate React component name", () => {
      const template = "export const {{componentName | pascalCase}} = () => {";
      const context = { componentName: "user-profile" };

      const result = engine.render(template, context);

      expect(result).toBe("export const UserProfile = () => {");
    });

    it("should generate IPC channel name", () => {
      const template = 'const channel = "{{domain}}:{{action | kebab-case}}";';
      const context = { domain: "user", action: "getUserProfile" };

      const result = engine.render(template, context);

      expect(result).toBe('const channel = "user:get-user-profile";');
    });

    it("should generate file path", () => {
      const template =
        "src/components/{{name | kebab-case}}/{{name | pascalCase}}.tsx";
      const context = { name: "user-profile" };

      const result = engine.render(template, context);

      expect(result).toBe("src/components/user-profile/UserProfile.tsx");
    });

    it("should generate hook name", () => {
      const template = "export const {{hookName | camelCase}} = () => {";
      const context = { hookName: "use-user-data" };

      const result = engine.render(template, context);

      expect(result).toBe("export const useUserData = () => {");
    });

    it("should handle description with special characters", () => {
      const template = '  description: "{{description}}",';
      const context = { description: 'User\'s "profile" data\nwith details' };

      const result = engine.render(template, context);

      expect(result).toBe(
        '  description: "User\\\'s \\"profile\\" data\\nwith details",',
      );
    });

    it("should generate database table name", () => {
      const template =
        "export const {{tableName | snake_case}} = pgTable('{{tableName | kebab-case}}', {";
      const context = { tableName: "UserProfile" };

      const result = engine.render(template, context);

      expect(result).toBe(
        "export const user_profile = pgTable('user-profile', {",
      );
    });

    it("should generate test description", () => {
      const template = 'it("should {{action | lowercase}}", () => {';
      const context = { action: "Create User Profile" };

      const result = engine.render(template, context);

      expect(result).toBe('it("should create user profile", () => {');
    });
  });

  describe("conditional rendering", () => {
    describe("basic conditionals", () => {
      it("should render content when condition is true", () => {
        const template = "{{#if showGreeting}}Hello World!{{/if}}";
        const context = { showGreeting: true };

        const result = engine.render(template, context);

        expect(result).toBe("Hello World!");
      });

      it("should not render content when condition is false", () => {
        const template = "{{#if showGreeting}}Hello World!{{/if}}";
        const context = { showGreeting: false };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat undefined as falsy", () => {
        const template = "{{#if missing}}Content{{/if}}";
        const context = {};

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat null as falsy", () => {
        const template = "{{#if value}}Content{{/if}}";
        const context = { value: null };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat empty string as falsy", () => {
        const template = "{{#if value}}Content{{/if}}";
        const context = { value: "" };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat zero as falsy", () => {
        const template = "{{#if value}}Content{{/if}}";
        const context = { value: 0 };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat empty array as falsy", () => {
        const template = "{{#if items}}Content{{/if}}";
        const context = { items: [] };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should treat non-empty string as truthy", () => {
        const template = "{{#if value}}Content{{/if}}";
        const context = { value: "hello" };

        const result = engine.render(template, context);

        expect(result).toBe("Content");
      });

      it("should treat non-zero number as truthy", () => {
        const template = "{{#if value}}Content{{/if}}";
        const context = { value: 42 };

        const result = engine.render(template, context);

        expect(result).toBe("Content");
      });

      it("should treat non-empty array as truthy", () => {
        const template = "{{#if items}}Content{{/if}}";
        const context = { items: [1, 2, 3] };

        const result = engine.render(template, context);

        expect(result).toBe("Content");
      });

      it("should treat object as truthy", () => {
        const template = "{{#if config}}Content{{/if}}";
        const context = { config: { debug: true } };

        const result = engine.render(template, context);

        expect(result).toBe("Content");
      });
    });

    describe("conditionals with variables", () => {
      it("should render variables inside conditional", () => {
        const template = "{{#if showName}}Hello {{name}}!{{/if}}";
        const context = { showName: true, name: "Alice" };

        const result = engine.render(template, context);

        expect(result).toBe("Hello Alice!");
      });

      it("should apply filters inside conditional", () => {
        const template = "{{#if showName}}{{name | uppercase}}{{/if}}";
        const context = { showName: true, name: "alice" };

        const result = engine.render(template, context);

        expect(result).toBe("ALICE");
      });

      it("should handle nested property access in condition", () => {
        const template = "{{#if user.isActive}}Active User{{/if}}";
        const context = { user: { isActive: true } };

        const result = engine.render(template, context);

        expect(result).toBe("Active User");
      });
    });

    describe("nested conditionals", () => {
      it("should handle nested conditionals", () => {
        const template = "{{#if outer}}Outer{{#if inner}} Inner{{/if}}{{/if}}";
        const context = { outer: true, inner: true };

        const result = engine.render(template, context);

        expect(result).toBe("Outer Inner");
      });

      it("should handle nested conditionals with false inner", () => {
        const template = "{{#if outer}}Outer{{#if inner}} Inner{{/if}}{{/if}}";
        const context = { outer: true, inner: false };

        const result = engine.render(template, context);

        expect(result).toBe("Outer");
      });

      it("should handle nested conditionals with false outer", () => {
        const template = "{{#if outer}}Outer{{#if inner}} Inner{{/if}}{{/if}}";
        const context = { outer: false, inner: true };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should handle multiple levels of nesting", () => {
        const template = "{{#if a}}A{{#if b}}B{{#if c}}C{{/if}}{{/if}}{{/if}}";
        const context = { a: true, b: true, c: true };

        const result = engine.render(template, context);

        expect(result).toBe("ABC");
      });
    });

    describe("multiple conditionals", () => {
      it("should handle multiple independent conditionals", () => {
        const template =
          "{{#if first}}First{{/if}} {{#if second}}Second{{/if}}";
        const context = { first: true, second: true };

        const result = engine.render(template, context);

        expect(result).toBe("First Second");
      });

      it("should handle multiple conditionals with different values", () => {
        const template =
          "{{#if first}}First{{/if}} {{#if second}}Second{{/if}}";
        const context = { first: true, second: false };

        const result = engine.render(template, context);

        expect(result).toBe("First ");
      });
    });

    describe("conditionals with whitespace", () => {
      it("should handle multiline conditional content", () => {
        const template = `{{#if show}}
Line 1
Line 2
{{/if}}`;
        const context = { show: true };

        const result = engine.render(template, context);

        expect(result).toBe("\nLine 1\nLine 2\n");
      });

      it("should preserve indentation in conditional content", () => {
        const template = `{{#if show}}
  indented line
{{/if}}`;
        const context = { show: true };

        const result = engine.render(template, context);

        expect(result).toBe("\n  indented line\n");
      });
    });
  });

  describe("loop rendering", () => {
    describe("basic loops", () => {
      it("should render content for each item in array", () => {
        const template = "{{#each items}}{{this}} {{/each}}";
        const context = { items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("a b c ");
      });

      it("should render nothing for empty array", () => {
        const template = "{{#each items}}{{this}} {{/each}}";
        const context = { items: [] };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should render nothing for non-array value", () => {
        const template = "{{#each items}}{{this}} {{/each}}";
        const context = { items: "not an array" };

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should render nothing for undefined array", () => {
        const template = "{{#each items}}{{this}} {{/each}}";
        const context = {};

        const result = engine.render(template, context);

        expect(result).toBe("");
      });

      it("should handle array of numbers", () => {
        const template = "{{#each numbers}}{{this}},{{/each}}";
        const context = { numbers: [1, 2, 3] };

        const result = engine.render(template, context);

        expect(result).toBe("1,2,3,");
      });
    });

    describe("loops with object items", () => {
      it("should access object properties in loop", () => {
        const template = "{{#each users}}{{name}} {{/each}}";
        const context = {
          users: [{ name: "Alice" }, { name: "Bob" }, { name: "Charlie" }],
        };

        const result = engine.render(template, context);

        expect(result).toBe("Alice Bob Charlie ");
      });

      it("should access multiple properties in loop", () => {
        const template = "{{#each users}}{{name}}:{{age}} {{/each}}";
        const context = {
          users: [
            { name: "Alice", age: 30 },
            { name: "Bob", age: 25 },
          ],
        };

        const result = engine.render(template, context);

        expect(result).toBe("Alice:30 Bob:25 ");
      });

      it("should apply filters to properties in loop", () => {
        const template = "{{#each users}}{{name | uppercase}} {{/each}}";
        const context = {
          users: [{ name: "alice" }, { name: "bob" }],
        };

        const result = engine.render(template, context);

        expect(result).toBe("ALICE BOB ");
      });
    });

    describe("loop special variables", () => {
      it("should provide @index variable", () => {
        const template = "{{#each items}}{{@index}}:{{this}} {{/each}}";
        const context = { items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("0:a 1:b 2:c ");
      });

      it("should provide @first variable", () => {
        const template =
          "{{#each items}}{{#if @first}}FIRST:{{/if}}{{this}} {{/each}}";
        const context = { items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("FIRST:a b c ");
      });

      it("should provide @last variable", () => {
        const template =
          "{{#each items}}{{this}}{{#if @last}}!{{/if}} {{/each}}";
        const context = { items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("a b c! ");
      });

      it("should handle @first and @last for single item", () => {
        const template =
          "{{#each items}}{{#if @first}}F{{/if}}{{this}}{{#if @last}}L{{/if}}{{/each}}";
        const context = { items: ["only"] };

        const result = engine.render(template, context);

        expect(result).toBe("FonlyL");
      });
    });

    describe("nested loops", () => {
      it("should handle nested loops", () => {
        const template =
          "{{#each outer}}{{#each inner}}{{this}}{{/each}} {{/each}}";
        const context = {
          outer: [{ inner: ["a", "b"] }, { inner: ["c", "d"] }],
        };

        const result = engine.render(template, context);

        expect(result).toBe("ab cd ");
      });

      it("should handle nested loops with different arrays", () => {
        const template =
          "{{#each groups}}{{name}}:{{#each members}}{{this}},{{/each}} {{/each}}";
        const context = {
          groups: [
            { name: "A", members: ["1", "2"] },
            { name: "B", members: ["3", "4"] },
          ],
        };

        const result = engine.render(template, context);

        expect(result).toBe("A:1,2, B:3,4, ");
      });
    });

    describe("loops with conditionals", () => {
      it("should handle conditional inside loop", () => {
        const template =
          "{{#each items}}{{#if active}}{{name}} {{/if}}{{/each}}";
        const context = {
          items: [
            { name: "Alice", active: true },
            { name: "Bob", active: false },
            { name: "Charlie", active: true },
          ],
        };

        const result = engine.render(template, context);

        expect(result).toBe("Alice Charlie ");
      });

      it("should handle loop inside conditional", () => {
        const template =
          "{{#if showItems}}{{#each items}}{{this}} {{/each}}{{/if}}";
        const context = { showItems: true, items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("a b c ");
      });

      it("should handle nested conditionals and loops", () => {
        const template =
          "{{#if show}}{{#each items}}{{#if active}}{{name}}{{/if}}{{/each}}{{/if}}";
        const context = {
          show: true,
          items: [
            { name: "A", active: true },
            { name: "B", active: false },
          ],
        };

        const result = engine.render(template, context);

        expect(result).toBe("A");
      });
    });

    describe("loops with multiline content", () => {
      it("should handle multiline loop content", () => {
        const template = `{{#each items}}
  - {{name}}
{{/each}}`;
        const context = {
          items: [{ name: "Alice" }, { name: "Bob" }],
        };

        const result = engine.render(template, context);

        expect(result).toBe("\n  - Alice\n\n  - Bob\n");
      });
    });

    describe("loops accessing outer context", () => {
      it("should access outer context variables in loop", () => {
        const template = "{{#each items}}{{prefix}}{{this}} {{/each}}";
        const context = { prefix: "Item:", items: ["a", "b", "c"] };

        const result = engine.render(template, context);

        expect(result).toBe("Item:a Item:b Item:c ");
      });

      it("should prioritize item properties over outer context", () => {
        const template = "{{#each items}}{{name}} {{/each}}";
        const context = {
          name: "Outer",
          items: [{ name: "Inner1" }, { name: "Inner2" }],
        };

        const result = engine.render(template, context);

        expect(result).toBe("Inner1 Inner2 ");
      });
    });
  });

  describe("real-world code generation with conditionals and loops", () => {
    it("should generate TypeScript interface with optional properties", () => {
      const template = `interface {{name | pascalCase}} {
  id: string;
{{#if hasName}}  name: string;
{{/if}}{{#if hasEmail}}  email: string;
{{/if}}}`;
      const context = { name: "user", hasName: true, hasEmail: false };

      const result = engine.render(template, context);

      expect(result).toBe(`interface User {
  id: string;
  name: string;
}`);
    });

    it("should generate array of imports", () => {
      const template = `{{#each imports}}import { {{name}} } from '{{path}}';
{{/each}}`;
      const context = {
        imports: [
          { name: "useState", path: "react" },
          { name: "useQuery", path: "@tanstack/react-query" },
        ],
      };

      const result = engine.render(template, context);

      expect(result).toBe(
        `import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
`,
      );
    });

    it("should generate function parameters", () => {
      // Note: In real templates, you'd handle commas differently (e.g., join in preprocessing)
      // This test shows a simple approach with trailing comma handling
      const template = `function {{name}}({{#each params}}{{name}}: {{type}}, {{/each}}) {`;
      const context = {
        name: "createUser",
        params: [
          { name: "name", type: "string" },
          { name: "age", type: "number" },
        ],
      };

      const result = engine.render(template, context);

      // Result will have trailing comma - in real use, you'd trim it or use different approach
      expect(result).toBe(`function createUser(name: string, age: number, ) {`);
    });

    it("should generate conditional error handling", () => {
      const template = `try {
  // code
} catch (error) {
{{#if useDyadError}}  throw new DyadError(DyadErrorKind.{{errorKind}}, message);
{{/if}}{{#if useDyadError}}{{/if}}{{#if useDyadError}}{{/if}}}`;
      const context = { useDyadError: true, errorKind: "Validation" };

      const result = engine.render(template, context);

      expect(result).toBe(`try {
  // code
} catch (error) {
  throw new DyadError(DyadErrorKind.Validation, message);
}`);
    });

    it("should generate test cases from array", () => {
      const template = `describe('{{component}}', () => {
{{#each tests}}  it('{{description}}', () => {
    // test code
  });
{{/each}}});`;
      const context = {
        component: "UserProfile",
        tests: [
          { description: "should render user name" },
          { description: "should handle missing data" },
        ],
      };

      const result = engine.render(template, context);

      expect(result).toBe(`describe('UserProfile', () => {
  it('should render user name', () => {
    // test code
  });
  it('should handle missing data', () => {
    // test code
  });
});`);
    });

    it("should generate conditional imports based on features", () => {
      const template = `import React from 'react';
{{#if useQuery}}import { useQuery } from '@tanstack/react-query';
{{/if}}{{#if useRouter}}import { useNavigate } from '@tanstack/react-router';
{{/if}}`;
      const context = { useQuery: true, useRouter: false };

      const result = engine.render(template, context);

      expect(result).toBe(`import React from 'react';
import { useQuery } from '@tanstack/react-query';
`);
    });

    it("should generate object properties from array", () => {
      const template = `const config = {
{{#each properties}}  {{key}}: {{value}},
{{/each}}};`;
      const context = {
        properties: [
          { key: "debug", value: "true" },
          { key: "port", value: "3000" },
        ],
      };

      const result = engine.render(template, context);

      expect(result).toBe(`const config = {
  debug: true,
  port: 3000,
};`);
    });

    it("should generate complex nested structure", () => {
      const template = `{{#each modules}}export const {{name | camelCase}} = {
{{#each functions}}  {{name}}: ({{#each params}}{{name}}: {{type}}{{#if @last}}{{/if}}{{/each}}) => {
    // implementation
  },
{{/each}}};
{{/each}}`;
      const context = {
        modules: [
          {
            name: "user-service",
            functions: [
              {
                name: "getUser",
                params: [{ name: "id", type: "string" }],
              },
            ],
          },
        ],
      };

      const result = engine.render(template, context);

      expect(result).toBe(`export const userService = {
  getUser: (id: string) => {
    // implementation
  },
};
`);
    });
  });
});
