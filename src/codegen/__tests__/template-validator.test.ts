/**
 * Unit tests for Template Validator
 *
 * Tests template syntax validation, error detection, and error reporting.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TemplateValidator,
  createTemplateValidator,
  type ValidationResult,
} from "../template-validator";

describe("TemplateValidator", () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    validator = createTemplateValidator();
  });

  describe("valid templates", () => {
    it("should validate a simple variable template", () => {
      const template = "Hello {{name}}!";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should validate multiple variables", () => {
      const template = "{{greeting}} {{name}}, welcome to {{place}}!";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("greeting")).toBe(true);
      expect(result.variables.has("name")).toBe(true);
      expect(result.variables.has("place")).toBe(true);
    });

    it("should validate variables with filters", () => {
      const template = "{{name | pascalCase}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should validate variables with multiple filters", () => {
      const template = "{{name | trim | pascalCase | lowercase}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should validate nested property access", () => {
      const template = "{{user.name}} - {{user.email}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("user.name")).toBe(true);
      expect(result.variables.has("user.email")).toBe(true);
    });

    it("should validate deeply nested properties", () => {
      const template = "{{address.city.name}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("address.city.name")).toBe(true);
    });

    it("should validate conditional blocks", () => {
      const template = "{{#if showGreeting}}Hello!{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("showGreeting")).toBe(true);
    });

    it("should validate nested conditionals", () => {
      const template = "{{#if outer}}{{#if inner}}Content{{/if}}{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("outer")).toBe(true);
      expect(result.variables.has("inner")).toBe(true);
    });

    it("should validate loop blocks", () => {
      const template = "{{#each items}}{{this}}{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("items")).toBe(true);
    });

    it("should validate nested loops", () => {
      const template =
        "{{#each outer}}{{#each inner}}{{this}}{{/each}}{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("outer")).toBe(true);
      expect(result.variables.has("inner")).toBe(true);
    });

    it("should validate mixed conditionals and loops", () => {
      const template = "{{#if show}}{{#each items}}{{this}}{{/each}}{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("show")).toBe(true);
      expect(result.variables.has("items")).toBe(true);
    });

    it("should validate template with comments", () => {
      const template = "{{!-- This is a comment --}}{{name}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should validate empty template", () => {
      const template = "";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.size).toBe(0);
    });

    it("should validate template with no variables", () => {
      const template = "Hello World!";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.size).toBe(0);
    });

    it("should validate multiline template", () => {
      const template = `{{#if show}}
  Line 1
  Line 2
{{/if}}`;

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate variables with underscores", () => {
      const template = "{{user_name}} {{_private}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("user_name")).toBe(true);
      expect(result.variables.has("_private")).toBe(true);
    });

    it("should validate variables with dollar signs", () => {
      const template = "{{$var}} {{var$name}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.variables.has("$var")).toBe(true);
      expect(result.variables.has("var$name")).toBe(true);
    });
  });

  describe("syntax errors", () => {
    it("should detect unclosed variable tag", () => {
      const template = "Hello {{name!";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unclosed template tag");
      expect(result.errors[0].line).toBe(1);
    });

    it("should detect empty variable expression", () => {
      const template = "Hello {{}}!";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Empty variable expression");
    });

    it("should detect invalid variable name", () => {
      const template = "{{123invalid}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Invalid variable name");
    });

    it("should detect invalid variable name with special characters", () => {
      const template = "{{user-name}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Invalid variable name");
    });

    it("should detect empty filter name", () => {
      const template = "{{name | }}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Empty filter name");
    });

    it("should detect unclosed if block", () => {
      const template = "{{#if condition}}Content";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unclosed {{#if}} block");
      expect(result.errors[0].line).toBe(1);
    });

    it("should detect unclosed each block", () => {
      const template = "{{#each items}}{{this}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unclosed {{#each}} block");
    });

    it("should detect unexpected closing if tag", () => {
      const template = "Content{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unexpected {{/if}}");
    });

    it("should detect unexpected closing each tag", () => {
      const template = "Content{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unexpected {{/each}}");
    });

    it("should detect mismatched closing tags", () => {
      const template = "{{#if condition}}Content{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2); // Mismatched tag + unclosed if
      expect(result.errors[0].message).toContain("Mismatched closing tag");
    });

    it("should detect empty if condition", () => {
      const template = "{{#if }}Content{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Empty condition");
    });

    it("should detect empty each array name", () => {
      const template = "{{#each }}{{this}}{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Empty array name");
    });

    it("should detect invalid array name in each", () => {
      const template = "{{#each 123items}}{{this}}{{/each}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Invalid array name");
    });

    it("should detect multiple unclosed blocks", () => {
      const template = "{{#if a}}{{#if b}}{{#each items}}Content";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3); // Three unclosed blocks
      expect(result.errors[0].message).toContain("Unclosed");
      expect(result.errors[1].message).toContain("Unclosed");
      expect(result.errors[2].message).toContain("Unclosed");
    });

    it("should detect nested unclosed blocks", () => {
      const template = "{{#if outer}}{{#if inner}}Content{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unclosed {{#if}} block");
    });
  });

  describe("warnings", () => {
    it("should warn about unknown filter", () => {
      const template = "{{name | unknownFilter}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true); // Warnings don't make template invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("Unknown or invalid filter");
      expect(result.warnings[0].severity).toBe("warning");
    });

    it("should warn about multiple unknown filters", () => {
      const template = "{{name | unknown1 | unknown2}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(2);
    });

    it("should not warn about known filters", () => {
      const template = "{{name | pascalCase | camelCase | kebab-case}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("error context", () => {
    it("should provide context for errors", () => {
      const template = "Hello {{name!";

      const result = validator.validate(template);

      expect(result.errors[0].context).toBeDefined();
      expect(result.errors[0].context).toContain("Hello {{name!");
      expect(result.errors[0].context).toContain("^"); // Pointer
    });

    it("should provide context for multiline templates", () => {
      const template = `Line 1
{{#if condition}}
Line 3`;

      const result = validator.validate(template);

      expect(result.errors[0].context).toBeDefined();
      expect(result.errors[0].line).toBe(2);
    });

    it("should provide line and column numbers", () => {
      const template = "Hello {{name}}!\n{{invalid-var}}";

      const result = validator.validate(template);

      expect(result.errors[0].line).toBe(2);
      expect(result.errors[0].column).toBe(1);
    });
  });

  describe("variable extraction", () => {
    it("should extract all variables from template", () => {
      const template = "{{a}} {{b}} {{c}}";

      const result = validator.validate(template);

      expect(result.variables.size).toBe(3);
      expect(result.variables.has("a")).toBe(true);
      expect(result.variables.has("b")).toBe(true);
      expect(result.variables.has("c")).toBe(true);
    });

    it("should extract variables from conditionals", () => {
      const template = "{{#if show}}{{name}}{{/if}}";

      const result = validator.validate(template);

      expect(result.variables.has("show")).toBe(true);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should extract variables from loops", () => {
      const template = "{{#each items}}{{name}}{{/each}}";

      const result = validator.validate(template);

      expect(result.variables.has("items")).toBe(true);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should not duplicate variables", () => {
      const template = "{{name}} {{name}} {{name}}";

      const result = validator.validate(template);

      expect(result.variables.size).toBe(1);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should extract nested property variables", () => {
      const template = "{{user.name}} {{user.email}}";

      const result = validator.validate(template);

      expect(result.variables.has("user.name")).toBe(true);
      expect(result.variables.has("user.email")).toBe(true);
    });
  });

  describe("context validation", () => {
    it("should validate that all variables are in context", () => {
      const template = "{{name}} {{age}}";
      const context = { name: "Alice", age: 30 };

      const result = validator.validateContext(template, context);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn about missing variables", () => {
      const template = "{{name}} {{age}}";
      const context = { name: "Alice" };

      const result = validator.validateContext(template, context);

      expect(result.valid).toBe(true); // Warnings don't make it invalid
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("Missing variables");
      expect(result.warnings[0].message).toContain("age");
    });

    it("should warn about multiple missing variables", () => {
      const template = "{{name}} {{age}} {{email}}";
      const context = { name: "Alice" };

      const result = validator.validateContext(template, context);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("age");
      expect(result.warnings[0].message).toContain("email");
    });

    it("should validate nested properties by checking root", () => {
      const template = "{{user.name}} {{user.email}}";
      const context = { user: { name: "Alice", email: "alice@example.com" } };

      const result = validator.validateContext(template, context);

      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("should warn if root of nested property is missing", () => {
      const template = "{{user.name}}";
      const context = {};

      const result = validator.validateContext(template, context);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain("user.name");
    });

    it("should return syntax errors before checking context", () => {
      const template = "{{name!";
      const context = { name: "Alice" };

      const result = validator.validateContext(template, context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unclosed");
    });
  });

  describe("error formatting", () => {
    it("should format validation errors", () => {
      const template = "{{#if condition}}Content";

      const result = validator.validate(template);
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Template Validation Errors");
      expect(formatted).toContain("[ERROR]");
      expect(formatted).toContain("Unclosed {{#if}} block");
      expect(formatted).toContain("line 1");
    });

    it("should format validation warnings", () => {
      const template = "{{name | unknownFilter}}";

      const result = validator.validate(template);
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Template Validation Warnings");
      expect(formatted).toContain("[WARNING]");
      expect(formatted).toContain("Unknown or invalid filter");
    });

    it("should format both errors and warnings", () => {
      const template = "{{#if condition}}{{name | unknownFilter}}";

      const result = validator.validate(template);
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Template Validation Errors");
      expect(formatted).toContain("Template Validation Warnings");
    });

    it("should return success message for valid template", () => {
      const template = "{{name}}";

      const result = validator.validate(template);
      const formatted = validator.formatErrors(result);

      expect(formatted).toBe("Template is valid");
    });

    it("should include context in formatted errors", () => {
      const template = "Hello {{name!";

      const result = validator.validate(template);
      const formatted = validator.formatErrors(result);

      expect(formatted).toContain("Hello {{name!");
      expect(formatted).toContain("^");
    });
  });

  describe("edge cases", () => {
    it("should handle template with only whitespace", () => {
      const template = "   \n  \t  ";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.size).toBe(0);
    });

    it("should handle variables with whitespace", () => {
      const template = "{{  name  }}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should handle filters with whitespace", () => {
      const template = "{{name  |  pascalCase  |  lowercase}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has("name")).toBe(true);
    });

    it("should handle nested braces in text", () => {
      const template = "Code: { {{variable}} }";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has("variable")).toBe(true);
    });

    it("should handle consecutive variables", () => {
      const template = "{{first}}{{second}}{{third}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.size).toBe(3);
    });

    it("should handle very long variable names", () => {
      const longName = "a".repeat(100);
      const template = `{{${longName}}}`;

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has(longName)).toBe(true);
    });

    it("should handle deeply nested blocks", () => {
      const template =
        "{{#if a}}{{#if b}}{{#if c}}{{#if d}}Content{{/if}}{{/if}}{{/if}}{{/if}}";

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
    });

    it("should handle template with many variables", () => {
      const vars = Array.from({ length: 100 }, (_, i) => `{{var${i}}}`).join(
        " ",
      );

      const result = validator.validate(vars);

      expect(result.valid).toBe(true);
      expect(result.variables.size).toBe(100);
    });
  });

  describe("real-world templates", () => {
    it("should validate React component template", () => {
      const template = `export const {{componentName | pascalCase}} = () => {
  return (
    <div>
      {{#if hasProps}}
      <p>{{propName}}</p>
      {{/if}}
    </div>
  );
};`;

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has("componentName")).toBe(true);
      expect(result.variables.has("hasProps")).toBe(true);
      expect(result.variables.has("propName")).toBe(true);
    });

    it("should validate IPC contract template", () => {
      const template = `export const {{contractName | pascalCase}}Contract = {
  channel: "{{domain}}:{{action | kebab-case}}",
  {{#if hasInput}}
  input: z.object({
    {{#each inputFields}}
    {{name}}: z.{{type}}(),
    {{/each}}
  }),
  {{/if}}
};`;

      const result = validator.validate(template);

      expect(result.valid).toBe(true);
      expect(result.variables.has("contractName")).toBe(true);
      expect(result.variables.has("domain")).toBe(true);
      expect(result.variables.has("action")).toBe(true);
      expect(result.variables.has("hasInput")).toBe(true);
      expect(result.variables.has("inputFields")).toBe(true);
    });

    it("should detect errors in complex template", () => {
      const template = `export const {{componentName | pascalCase}} = () => {
  {{#if hasProps}}
  return <div>{{propName}}</div>;
  {{#each items}}
  <li>{{this}}</li>
  {{/if}}
};`;

      const result = validator.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
