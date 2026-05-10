/**
 * CompressionEngine - Compresses context using various techniques
 *
 * This class is responsible for:
 * - Extracting function signatures from large files (>500 lines) using TypeScript compiler API
 * - Summarizing verbose documentation
 * - Deduplicating repeated patterns with references
 * - Measuring compression effectiveness
 *
 * Requirements: 2.1, 2.3, 2.5
 */

import * as ts from "typescript";
import type { Context, FileContext } from "./ContextOptimizer";

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Metrics about compression operations
 */
export interface CompressionMetrics {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  tokensSaved: number;
  techniquesApplied: string[];
}

/**
 * Pattern occurrence tracking for deduplication
 */
interface PatternOccurrence {
  pattern: string;
  count: number;
  locations: Array<{ fileIndex: number; position: number }>;
}

// =============================================================================
// CompressionEngine Class
// =============================================================================

export class CompressionEngine {
  private static readonly LARGE_FILE_THRESHOLD = 500; // lines
  private static readonly MIN_PATTERN_LENGTH = 50; // characters
  private static readonly MIN_PATTERN_OCCURRENCES = 2;

  /**
   * Estimate token count using 4-characters-per-token heuristic
   * This matches the existing pattern in the codebase
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Count lines in a file
   */
  private countLines(content: string): number {
    return content.split("\n").length;
  }

  /**
   * Extract function and class signatures from a TypeScript/JavaScript file
   *
   * This method uses the TypeScript compiler API to parse the file and extract:
   * - Function declarations with signatures (no implementation)
   * - Class declarations with method signatures (no implementation)
   * - Interface and type declarations (preserved as-is)
   * - Export statements
   *
   * @param file - The file to extract signatures from
   * @returns File with only signatures, or original file if extraction fails
   *
   * Requirements: 2.1
   */
  extractSignatures(file: FileContext): FileContext {
    // Only process files larger than threshold
    const lineCount = this.countLines(file.content);
    if (lineCount <= CompressionEngine.LARGE_FILE_THRESHOLD) {
      return file;
    }

    // Only process TypeScript/JavaScript files
    const language = file.language?.toLowerCase() || "";
    if (
      !["typescript", "javascript", "ts", "js", "tsx", "jsx"].includes(language)
    ) {
      return file;
    }

    try {
      // Parse the file using TypeScript compiler API
      const sourceFile = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
      );

      const signatures: string[] = [];

      // Visit each node in the AST
      const visit = (node: ts.Node) => {
        // Extract function declarations
        if (ts.isFunctionDeclaration(node)) {
          const signature = this.extractFunctionSignature(node, sourceFile);
          if (signature) {
            signatures.push(signature);
          }
        }
        // Extract class declarations
        else if (ts.isClassDeclaration(node)) {
          const signature = this.extractClassSignature(node, sourceFile);
          if (signature) {
            signatures.push(signature);
          }
        }
        // Extract interface declarations (preserve as-is)
        else if (ts.isInterfaceDeclaration(node)) {
          signatures.push(node.getText(sourceFile));
        }
        // Extract type alias declarations (preserve as-is)
        else if (ts.isTypeAliasDeclaration(node)) {
          signatures.push(node.getText(sourceFile));
        }
        // Extract enum declarations (preserve as-is)
        else if (ts.isEnumDeclaration(node)) {
          signatures.push(node.getText(sourceFile));
        }
        // Extract export statements
        else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
          signatures.push(node.getText(sourceFile));
        }

        // Continue visiting child nodes
        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      // If we extracted signatures, return compressed file
      if (signatures.length > 0) {
        const compressedContent = signatures.join("\n\n");
        return {
          ...file,
          content: compressedContent,
          tokenCount: this.estimateTokens(compressedContent),
        };
      }

      // If extraction failed or found nothing, return original
      return file;
    } catch (error) {
      // If parsing fails, return original file
      console.error(`Failed to extract signatures from ${file.path}:`, error);
      return file;
    }
  }

  /**
   * Extract function signature without implementation
   */
  private extractFunctionSignature(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile,
  ): string | null {
    try {
      const modifiers = node.modifiers
        ? node.modifiers.map((m) => m.getText(sourceFile)).join(" ") + " "
        : "";
      const name = node.name ? node.name.getText(sourceFile) : "anonymous";
      const typeParams = node.typeParameters
        ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(", ")}>`
        : "";
      const params = node.parameters
        .map((p) => p.getText(sourceFile))
        .join(", ");
      const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : "";

      return `${modifiers}function ${name}${typeParams}(${params})${returnType};`;
    } catch {
      return null;
    }
  }

  /**
   * Extract class signature with method signatures (no implementations)
   */
  private extractClassSignature(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
  ): string | null {
    try {
      const modifiers = node.modifiers
        ? node.modifiers.map((m) => m.getText(sourceFile)).join(" ") + " "
        : "";
      const name = node.name ? node.name.getText(sourceFile) : "Anonymous";
      const typeParams = node.typeParameters
        ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(", ")}>`
        : "";
      const heritage = node.heritageClauses
        ? " " +
          node.heritageClauses.map((hc) => hc.getText(sourceFile)).join(" ")
        : "";

      const members: string[] = [];

      // Extract member signatures
      node.members.forEach((member) => {
        if (ts.isPropertyDeclaration(member)) {
          members.push(`  ${member.getText(sourceFile)};`);
        } else if (ts.isMethodDeclaration(member)) {
          const methodSig = this.extractMethodSignature(member, sourceFile);
          if (methodSig) {
            members.push(`  ${methodSig}`);
          }
        } else if (ts.isConstructorDeclaration(member)) {
          const constructorSig = this.extractConstructorSignature(
            member,
            sourceFile,
          );
          if (constructorSig) {
            members.push(`  ${constructorSig}`);
          }
        }
      });

      const membersStr =
        members.length > 0 ? "\n" + members.join("\n") + "\n" : "";
      return `${modifiers}class ${name}${typeParams}${heritage} {${membersStr}}`;
    } catch {
      return null;
    }
  }

  /**
   * Extract method signature without implementation
   */
  private extractMethodSignature(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
  ): string | null {
    try {
      const modifiers = node.modifiers
        ? node.modifiers.map((m) => m.getText(sourceFile)).join(" ") + " "
        : "";
      const name = node.name.getText(sourceFile);
      const typeParams = node.typeParameters
        ? `<${node.typeParameters.map((tp) => tp.getText(sourceFile)).join(", ")}>`
        : "";
      const params = node.parameters
        .map((p) => p.getText(sourceFile))
        .join(", ");
      const returnType = node.type ? `: ${node.type.getText(sourceFile)}` : "";

      return `${modifiers}${name}${typeParams}(${params})${returnType};`;
    } catch {
      return null;
    }
  }

  /**
   * Extract constructor signature without implementation
   */
  private extractConstructorSignature(
    node: ts.ConstructorDeclaration,
    sourceFile: ts.SourceFile,
  ): string | null {
    try {
      const params = node.parameters
        .map((p) => p.getText(sourceFile))
        .join(", ");
      return `constructor(${params});`;
    } catch {
      return null;
    }
  }

  /**
   * Summarize verbose documentation
   *
   * This method reduces documentation length while preserving key information:
   * - Keeps first paragraph (usually the summary)
   * - Keeps @param, @returns, @throws tags
   * - Removes verbose examples and detailed explanations
   *
   * @param doc - The documentation to summarize
   * @returns Summarized documentation
   *
   * Requirements: 2.2
   */
  summarizeDocumentation(doc: string): string {
    // Split into lines
    const lines = doc.split("\n");

    // Track if we're in a JSDoc comment block
    const isJSDoc = lines.some((line) => line.trim().startsWith("/**"));

    if (!isJSDoc) {
      // For non-JSDoc, just keep first paragraph
      const paragraphs = doc.split(/\n\s*\n/);
      return paragraphs[0] || doc;
    }

    // For JSDoc, extract key parts
    const summaryLines: string[] = [];
    const importantTags: string[] = [];
    let inSummary = true;
    let inExample = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep opening and closing comment markers
      if (trimmed === "/**" || trimmed === "*/") {
        summaryLines.push(line);
        continue;
      }

      // Skip example blocks
      if (trimmed.startsWith("* @example")) {
        inExample = true;
        inSummary = false;
        continue;
      }

      // Check for other tags
      if (trimmed.startsWith("* @")) {
        inExample = false;
        inSummary = false;

        // Keep important tags
        if (
          trimmed.startsWith("* @param") ||
          trimmed.startsWith("* @returns") ||
          trimmed.startsWith("* @throws") ||
          trimmed.startsWith("* @deprecated")
        ) {
          importantTags.push(line);
        }
        continue;
      }

      // Skip example content
      if (inExample) {
        continue;
      }

      // Keep summary (first paragraph)
      if (inSummary) {
        summaryLines.push(line);
        // End summary on empty line
        if (trimmed === "*" || trimmed === "") {
          inSummary = false;
        }
      }
    }

    // Combine summary and important tags
    const result = [...summaryLines, ...importantTags];

    // Ensure we have closing marker
    if (result.length > 0 && !result[result.length - 1].includes("*/")) {
      result.push(" */");
    }

    return result.join("\n");
  }

  /**
   * Deduplicate repeated patterns in context
   *
   * This method:
   * - Identifies repeated code patterns across files
   * - Replaces repeated patterns with references
   * - Keeps the first occurrence and references subsequent ones
   *
   * @param context - The context to deduplicate
   * @returns Context with patterns replaced by references
   *
   * Requirements: 2.3
   */
  deduplicatePatterns(context: Context): Context {
    // Skip if there are too few files to have meaningful patterns
    if (context.files.length < 2) {
      return context;
    }

    // Find repeated patterns
    const patterns = this.findRepeatedPatterns(context.files);

    // If no patterns found, return original context
    if (patterns.length === 0) {
      return context;
    }

    // Replace patterns with references
    const deduplicatedFiles = context.files.map((file, fileIndex) => {
      let content = file.content;
      let modified = false;

      // Replace each pattern with a reference
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const firstLocation = pattern.locations[0];

        // If this is not the first occurrence, replace with reference
        if (firstLocation.fileIndex !== fileIndex) {
          const occurrencesInThisFile = pattern.locations.filter(
            (loc) => loc.fileIndex === fileIndex,
          );

          if (occurrencesInThisFile.length > 0) {
            const firstFile = context.files[firstLocation.fileIndex];
            const reference = `/* [Pattern #${i + 1}] - See ${firstFile.path} for implementation */`;
            content = content.replace(pattern.pattern, reference);
            modified = true;
          }
        }
      }

      if (modified) {
        return {
          ...file,
          content,
          tokenCount: this.estimateTokens(content),
        };
      }

      return file;
    });

    return {
      ...context,
      files: deduplicatedFiles,
    };
  }

  /**
   * Find repeated patterns across files
   */
  private findRepeatedPatterns(files: FileContext[]): PatternOccurrence[] {
    const patterns: Map<string, PatternOccurrence> = new Map();

    // Extract potential patterns from each file
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const potentialPatterns = this.extractPotentialPatterns(file.content);

      for (const pattern of potentialPatterns) {
        const existing = patterns.get(pattern);
        if (existing) {
          existing.count++;
          existing.locations.push({ fileIndex, position: 0 });
        } else {
          patterns.set(pattern, {
            pattern,
            count: 1,
            locations: [{ fileIndex, position: 0 }],
          });
        }
      }
    }

    // Filter to only patterns that occur multiple times
    return Array.from(patterns.values()).filter(
      (p) => p.count >= CompressionEngine.MIN_PATTERN_OCCURRENCES,
    );
  }

  /**
   * Extract potential patterns from content
   * Looks for code blocks that are likely to be repeated
   */
  private extractPotentialPatterns(content: string): string[] {
    const patterns: string[] = [];

    // Split into lines
    const lines = content.split("\n");

    // Look for function-like patterns (blocks between braces)
    let currentBlock: string[] = [];
    let braceDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Track brace depth
      for (const char of trimmed) {
        if (char === "{") braceDepth++;
        if (char === "}") braceDepth--;
      }

      currentBlock.push(line);

      // When we close a block, check if it's a potential pattern
      if (braceDepth === 0 && currentBlock.length > 0) {
        const block = currentBlock.join("\n");
        if (block.length >= CompressionEngine.MIN_PATTERN_LENGTH) {
          patterns.push(block);
        }
        currentBlock = [];
      }
    }

    return patterns;
  }

  /**
   * Measure compression effectiveness
   *
   * Calculates:
   * - Original token count
   * - Compressed token count
   * - Compression ratio
   * - Tokens saved
   * - Techniques applied
   *
   * @param original - Original context before compression
   * @param compressed - Context after compression
   * @returns Compression metrics
   *
   * Requirements: 2.5
   */
  measureCompression(
    original: Context,
    compressed: Context,
  ): CompressionMetrics {
    const originalTokens = this.calculateTotalTokens(original);
    const compressedTokens = this.calculateTotalTokens(compressed);
    const tokensSaved = originalTokens - compressedTokens;
    const compressionRatio =
      originalTokens > 0 ? compressedTokens / originalTokens : 1.0;

    // Determine which techniques were applied
    const techniquesApplied: string[] = [];

    // Check if signature extraction was used
    const hasSignatureExtraction = compressed.files.some((file, index) => {
      const originalFile = original.files[index];
      return (
        originalFile &&
        this.countLines(originalFile.content) >
          CompressionEngine.LARGE_FILE_THRESHOLD &&
        file.content.length < originalFile.content.length
      );
    });
    if (hasSignatureExtraction) {
      techniquesApplied.push("signature-extraction");
    }

    // Check if pattern deduplication was used
    const hasPatternDeduplication = compressed.files.some((file) =>
      file.content.includes("[Pattern #"),
    );
    if (hasPatternDeduplication) {
      techniquesApplied.push("pattern-deduplication");
    }

    // Check if documentation summarization was used
    const hasDocSummarization = compressed.files.some((file, index) => {
      const originalFile = original.files[index];
      return (
        originalFile &&
        originalFile.content.includes("/**") &&
        file.content.includes("/**") &&
        file.content.length < originalFile.content.length
      );
    });
    if (hasDocSummarization) {
      techniquesApplied.push("documentation-summarization");
    }

    return {
      originalTokens,
      compressedTokens,
      compressionRatio,
      tokensSaved,
      techniquesApplied,
    };
  }

  /**
   * Calculate total tokens in a context
   */
  private calculateTotalTokens(context: Context): number {
    let total = 0;

    // User instructions
    for (const instruction of context.userInstructions) {
      total += this.estimateTokens(instruction);
    }

    // Conversation history
    for (const turn of context.conversationHistory) {
      total += turn.tokenCount || this.estimateTokens(turn.content);
    }

    // Files
    for (const file of context.files) {
      total += file.tokenCount || this.estimateTokens(file.content);
    }

    // Skills
    for (const skill of context.skills) {
      total += skill.tokenCount || this.estimateTokens(skill.content);
    }

    return total;
  }
}
