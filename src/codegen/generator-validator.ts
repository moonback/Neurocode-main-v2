/**
 * Generator Output Validator
 *
 * Provides utilities to validate generated code before writing to disk.
 */

import * as ts from "typescript";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class GeneratorValidator {
  /**
   * Validates TypeScript syntax of a string
   */
  static validateTypeScript(
    content: string,
    fileName: string,
  ): ValidationResult {
    try {
      const sourceFile = ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.Latest,
        true,
      );

      // parseDiagnostics is an internal property but very useful
      const diagnostics = (sourceFile as any).parseDiagnostics;

      if (diagnostics && diagnostics.length > 0) {
        return {
          isValid: false,
          errors: diagnostics.map((d: any) => {
            const message =
              typeof d.messageText === "string"
                ? d.messageText
                : d.messageText.messageText;
            return `Syntax Error in ${fileName}: ${message}`;
          }),
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Validation failed for ${fileName}: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }
}
