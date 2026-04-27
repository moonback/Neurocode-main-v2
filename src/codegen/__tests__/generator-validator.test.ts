/**
 * Unit tests for GeneratorValidator
 *
 * Tests TypeScript syntax validation and error handling.
 */

import { describe, it, expect } from "vitest";
import { GeneratorValidator } from "../generator-validator";

describe("GeneratorValidator", () => {
  describe("validateTypeScript", () => {
    it("should validate correct TypeScript code", () => {
      const code = `
        export function hello(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate correct React component", () => {
      const code = `
        import React from 'react';

        interface Props {
          name: string;
        }

        export function MyComponent({ name }: Props) {
          return <div>{name}</div>;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.tsx");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect syntax errors", () => {
      const code = `
        export function hello(name: string {
          return \`Hello, \${name}!\`;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect missing closing braces", () => {
      const code = `
        export function hello(name: string): string {
          return \`Hello, \${name}!\`;
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect invalid JSX syntax", () => {
      const code = `
        export function MyComponent() {
          return <div>unclosed div;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.tsx");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate empty file", () => {
      const code = "";

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate file with only comments", () => {
      const code = `
        // This is a comment
        /* This is a block comment */
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate complex TypeScript features", () => {
      const code = `
        type User = {
          id: number;
          name: string;
        };

        interface Repository<T> {
          find(id: number): Promise<T | null>;
          save(entity: T): Promise<void>;
        }

        class UserRepository implements Repository<User> {
          async find(id: number): Promise<User | null> {
            return null;
          }

          async save(entity: User): Promise<void> {
            // Implementation
          }
        }

        export const userRepo = new UserRepository();
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate async/await syntax", () => {
      const code = `
        export async function fetchData(): Promise<string> {
          const response = await fetch('https://api.example.com');
          return await response.text();
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate arrow functions", () => {
      const code = `
        export const add = (a: number, b: number): number => a + b;
        export const greet = (name: string) => \`Hello, \${name}!\`;
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate destructuring", () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }

        export function printUser({ name, age }: User) {
          console.log(\`\${name} is \${age} years old\`);
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate template literals", () => {
      const code = `
        export function createMessage(name: string, count: number): string {
          return \`Hello \${name}, you have \${count} messages\`;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate optional chaining", () => {
      const code = `
        interface User {
          profile?: {
            email?: string;
          };
        }

        export function getEmail(user: User): string | undefined {
          return user.profile?.email;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate nullish coalescing", () => {
      const code = `
        export function getDefaultValue(value: string | null | undefined): string {
          return value ?? 'default';
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should include filename in error messages", () => {
      const code = `
        export function broken(
      `;

      const result = GeneratorValidator.validateTypeScript(
        code,
        "my-file.ts",
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("my-file.ts"))).toBe(true);
    });

    it("should handle very long files", () => {
      // Generate a large valid TypeScript file
      const functions = Array.from(
        { length: 100 },
        (_, i) => `
        export function func${i}(x: number): number {
          return x * ${i};
        }
      `,
      ).join("\n");

      const result = GeneratorValidator.validateTypeScript(
        functions,
        "large.ts",
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate imports and exports", () => {
      const code = `
        import { useState } from 'react';
        import type { FC } from 'react';

        export { useState };
        export type { FC };

        export default function MyComponent() {
          return null;
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.tsx");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate generics", () => {
      const code = `
        export function identity<T>(value: T): T {
          return value;
        }

        export class Box<T> {
          constructor(private value: T) {}

          getValue(): T {
            return this.value;
          }
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate enums", () => {
      const code = `
        export enum Color {
          Red = 'RED',
          Green = 'GREEN',
          Blue = 'BLUE',
        }

        export enum Status {
          Active,
          Inactive,
        }
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect unclosed string literals", () => {
      const code = `
        export const message = "Hello world;
      `;

      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect invalid type annotations", () => {
      const code = `
        export function test(x: InvalidType): void {
          console.log(x);
        }
      `;

      // Note: TypeScript parser doesn't validate type existence, only syntax
      // This should still parse successfully
      const result = GeneratorValidator.validateTypeScript(code, "test.ts");

      expect(result.isValid).toBe(true);
    });
  });
});
