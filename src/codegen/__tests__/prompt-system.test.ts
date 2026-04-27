/**
 * Unit tests for the interactive prompt system
 *
 * Tests parameter collection, validation, and interactive/non-interactive modes
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  collectParameters,
  validators,
  type ParameterDefinition,
  type PromptOptions,
} from "../prompt-system";

// Mock @inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

import { input, confirm, select } from "@inquirer/prompts";

describe("prompt-system", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("collectParameters", () => {
    describe("non-interactive mode", () => {
      it("should succeed when all required parameters are provided", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
          {
            name: "domain",
            description: "Domain parameter",
            type: "string",
            required: true,
          },
        ];

        const providedValues = {
          name: "testName",
          domain: "testDomain",
        };

        const options: PromptOptions = {
          interactive: false,
        };

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          name: "testName",
          domain: "testDomain",
        });
        expect(result.errors).toEqual([]);
      });

      it("should fail when required parameters are missing", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
          {
            name: "domain",
            description: "Domain parameter",
            type: "string",
            required: true,
          },
        ];

        const providedValues = {
          name: "testName",
          // domain is missing
        };

        const options: PromptOptions = {
          interactive: false,
        };

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain(
          "Missing required parameter: domain",
        );
      });

      it("should use default values for optional parameters", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
          {
            name: "verbose",
            description: "Verbose mode",
            type: "boolean",
            required: false,
            default: false,
          },
        ];

        const providedValues = {
          name: "testName",
        };

        const options: PromptOptions = {
          interactive: false,
        };

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          name: "testName",
          verbose: false,
        });
      });

      it("should validate provided parameters", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
            validate: validators.camelCase,
          },
        ];

        const providedValues = {
          name: "InvalidPascalCase", // Should be camelCase
        };

        const options: PromptOptions = {
          interactive: false,
        };

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("Invalid value for name");
      });
    });

    describe("interactive mode", () => {
      it("should prompt for missing required parameters", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
        ];

        const providedValues = {};

        const options: PromptOptions = {
          interactive: true,
        };

        vi.mocked(input).mockResolvedValue("promptedName");

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          name: "promptedName",
        });
        expect(input).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Name parameter (required)",
          }),
        );
      });

      it("should not prompt for parameters that are already provided", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
        ];

        const providedValues = {
          name: "providedName",
        };

        const options: PromptOptions = {
          interactive: true,
        };

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          name: "providedName",
        });
        expect(input).not.toHaveBeenCalled();
      });

      it("should handle boolean parameters with confirm prompt", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "mutation",
            description: "Is this a mutation?",
            type: "boolean",
            required: true,
          },
        ];

        const providedValues = {};

        const options: PromptOptions = {
          interactive: true,
        };

        vi.mocked(confirm).mockResolvedValue(true);

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          mutation: true,
        });
        expect(confirm).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Is this a mutation? (required)",
          }),
        );
      });

      it("should handle select parameters with choices", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "type",
            description: "Select type",
            type: "select",
            required: true,
            choices: [
              { value: "query", name: "Query" },
              { value: "mutation", name: "Mutation" },
            ],
          },
        ];

        const providedValues = {};

        const options: PromptOptions = {
          interactive: true,
        };

        vi.mocked(select).mockResolvedValue("mutation");

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(result.parameters).toEqual({
          type: "mutation",
        });
        expect(select).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Select type (required)",
            choices: [
              { value: "query", name: "Query" },
              { value: "mutation", name: "Mutation" },
            ],
          }),
        );
      });

      it("should handle prompt errors gracefully", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
          },
        ];

        const providedValues = {};

        const options: PromptOptions = {
          interactive: true,
        };

        vi.mocked(input).mockRejectedValue(new Error("User cancelled"));

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("Failed to collect parameter name");
      });

      it("should validate prompted values", async () => {
        const definitions: ParameterDefinition[] = [
          {
            name: "name",
            description: "Name parameter",
            type: "string",
            required: true,
            validate: validators.camelCase,
          },
        ];

        const providedValues = {};

        const options: PromptOptions = {
          interactive: true,
        };

        // The prompt system will call the validate function
        // We need to verify it's passed correctly
        vi.mocked(input).mockResolvedValue("validCamelCase");

        const result = await collectParameters(
          definitions,
          providedValues,
          options,
        );

        expect(result.success).toBe(true);
        expect(input).toHaveBeenCalledWith(
          expect.objectContaining({
            validate: expect.any(Function),
          }),
        );
      });
    });
  });

  describe("validators", () => {
    describe("identifier", () => {
      it("should accept valid identifiers", () => {
        expect(validators.identifier("validName")).toBe(true);
        expect(validators.identifier("valid_name")).toBe(true);
        expect(validators.identifier("valid-name")).toBe(true);
        expect(validators.identifier("valid123")).toBe(true);
      });

      it("should reject invalid identifiers", () => {
        expect(validators.identifier("123invalid")).not.toBe(true);
        expect(validators.identifier("invalid name")).not.toBe(true);
        expect(validators.identifier("invalid@name")).not.toBe(true);
        expect(validators.identifier("")).not.toBe(true);
      });

      it("should reject non-string values", () => {
        expect(validators.identifier(123)).not.toBe(true);
        expect(validators.identifier(null)).not.toBe(true);
        expect(validators.identifier(undefined)).not.toBe(true);
      });
    });

    describe("pascalCase", () => {
      it("should accept valid PascalCase", () => {
        expect(validators.pascalCase("ValidName")).toBe(true);
        expect(validators.pascalCase("UserProfile")).toBe(true);
        expect(validators.pascalCase("MyComponent123")).toBe(true);
      });

      it("should reject invalid PascalCase", () => {
        expect(validators.pascalCase("invalidName")).not.toBe(true);
        expect(validators.pascalCase("Invalid_Name")).not.toBe(true);
        expect(validators.pascalCase("Invalid-Name")).not.toBe(true);
        expect(validators.pascalCase("123Invalid")).not.toBe(true);
      });
    });

    describe("camelCase", () => {
      it("should accept valid camelCase", () => {
        expect(validators.camelCase("validName")).toBe(true);
        expect(validators.camelCase("userProfile")).toBe(true);
        expect(validators.camelCase("myFunction123")).toBe(true);
      });

      it("should reject invalid camelCase", () => {
        expect(validators.camelCase("InvalidName")).not.toBe(true);
        expect(validators.camelCase("invalid_name")).not.toBe(true);
        expect(validators.camelCase("invalid-name")).not.toBe(true);
        expect(validators.camelCase("123invalid")).not.toBe(true);
      });
    });

    describe("kebabCase", () => {
      it("should accept valid kebab-case", () => {
        expect(validators.kebabCase("valid-name")).toBe(true);
        expect(validators.kebabCase("user-profile")).toBe(true);
        expect(validators.kebabCase("my-feature-123")).toBe(true);
      });

      it("should reject invalid kebab-case", () => {
        expect(validators.kebabCase("InvalidName")).not.toBe(true);
        expect(validators.kebabCase("invalid_name")).not.toBe(true);
        expect(validators.kebabCase("invalid Name")).not.toBe(true);
        expect(validators.kebabCase("123-invalid")).not.toBe(true);
      });
    });

    describe("notEmpty", () => {
      it("should accept non-empty strings", () => {
        expect(validators.notEmpty("valid")).toBe(true);
        expect(validators.notEmpty("  valid  ")).toBe(true);
      });

      it("should reject empty strings", () => {
        expect(validators.notEmpty("")).not.toBe(true);
        expect(validators.notEmpty("   ")).not.toBe(true);
      });

      it("should reject non-string values", () => {
        expect(validators.notEmpty(123)).not.toBe(true);
        expect(validators.notEmpty(null)).not.toBe(true);
      });
    });

    describe("minLength", () => {
      it("should accept strings meeting minimum length", () => {
        const validator = validators.minLength(3);
        expect(validator("abc")).toBe(true);
        expect(validator("abcd")).toBe(true);
      });

      it("should reject strings below minimum length", () => {
        const validator = validators.minLength(3);
        expect(validator("ab")).not.toBe(true);
        expect(validator("")).not.toBe(true);
      });
    });

    describe("maxLength", () => {
      it("should accept strings within maximum length", () => {
        const validator = validators.maxLength(5);
        expect(validator("abc")).toBe(true);
        expect(validator("abcde")).toBe(true);
      });

      it("should reject strings exceeding maximum length", () => {
        const validator = validators.maxLength(5);
        expect(validator("abcdef")).not.toBe(true);
      });
    });

    describe("combine", () => {
      it("should pass when all validators pass", () => {
        const validator = validators.combine(
          validators.notEmpty,
          validators.camelCase,
        );
        expect(validator("validName")).toBe(true);
      });

      it("should fail when any validator fails", () => {
        const validator = validators.combine(
          validators.notEmpty,
          validators.camelCase,
        );
        expect(validator("")).not.toBe(true);
        expect(validator("InvalidName")).not.toBe(true);
      });

      it("should return the first error message", () => {
        const validator = validators.combine(
          validators.notEmpty,
          validators.camelCase,
        );
        const result = validator("");
        expect(result).not.toBe(true);
        expect(typeof result).toBe("string");
      });
    });
  });
});
