/**
 * Output Formatting System for Code Generation CLI
 *
 * This module provides colored console output and summary formatting for the code generation tool.
 * It supports dry-run mode previews and displays summaries of generated files.
 *
 * Requirements:
 * - 6.4: Display a summary of generated files when scaffolding completes
 * - 6.7: Support a dry-run mode that shows what would be generated without creating files
 */

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Foreground colors
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Background colors
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
} as const;

/**
 * Message type for colored output
 */
export type MessageType = "success" | "error" | "warning" | "info";

/**
 * File action type for generation summary
 */
export type FileAction = "create" | "update" | "skip";

/**
 * Information about a generated file
 */
export interface GeneratedFileInfo {
  path: string;
  action: FileAction;
  size?: number; // Size in bytes (optional)
}

/**
 * Options for formatting output
 */
export interface OutputOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * Formats a colored message for console output
 *
 * @param type - Type of message (success, error, warning, info)
 * @param message - Message text
 * @returns Formatted string with ANSI color codes
 */
export function formatMessage(type: MessageType, message: string): string {
  const icons = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
  };

  const icon = icons[type];
  const color = colorMap[type];

  return `${color}${colors.bold}${icon}${colors.reset} ${color}${message}${colors.reset}`;
}

/**
 * Prints a colored message to console
 *
 * @param type - Type of message
 * @param message - Message text
 */
export function printMessage(type: MessageType, message: string): void {
  console.log(formatMessage(type, message));
}

/**
 * Prints a success message
 */
export function printSuccess(message: string): void {
  printMessage("success", message);
}

/**
 * Prints an error message
 */
export function printError(message: string): void {
  printMessage("error", message);
}

/**
 * Prints a warning message
 */
export function printWarning(message: string): void {
  printMessage("warning", message);
}

/**
 * Prints an info message
 */
export function printInfo(message: string): void {
  printMessage("info", message);
}

/**
 * Formats a file path with appropriate styling
 *
 * @param path - File path
 * @param action - Action performed on the file
 * @returns Formatted string
 */
function formatFilePath(path: string, action: FileAction): string {
  const actionColors = {
    create: colors.green,
    update: colors.yellow,
    skip: colors.gray,
  };

  const actionLabels = {
    create: "CREATE",
    update: "UPDATE",
    skip: "SKIP  ",
  };

  const color = actionColors[action];
  const label = actionLabels[action];

  return `  ${color}${label}${colors.reset}  ${colors.cyan}${path}${colors.reset}`;
}

/**
 * Formats file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 KB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Prints a summary of generated files
 *
 * @param files - Array of generated file information
 * @param options - Output options
 */
export function printGenerationSummary(
  files: GeneratedFileInfo[],
  options: OutputOptions = {},
): void {
  const { dryRun = false, verbose = false } = options;

  // Print header
  console.log();
  if (dryRun) {
    console.log(
      `${colors.bold}${colors.yellow}Dry Run - No files will be created${colors.reset}`,
    );
  } else {
    console.log(`${colors.bold}Generation Summary${colors.reset}`);
  }
  console.log();

  // Print file list
  if (files.length === 0) {
    console.log(`  ${colors.gray}No files to generate${colors.reset}`);
  } else {
    for (const file of files) {
      let line = formatFilePath(file.path, file.action);

      // Add file size if available and verbose mode is on
      if (verbose && file.size !== undefined) {
        line += ` ${colors.gray}(${formatFileSize(file.size)})${colors.reset}`;
      }

      console.log(line);
    }
  }

  console.log();

  // Print statistics
  const stats = {
    create: files.filter((f) => f.action === "create").length,
    update: files.filter((f) => f.action === "update").length,
    skip: files.filter((f) => f.action === "skip").length,
  };

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  const statsParts: string[] = [];
  if (stats.create > 0) {
    statsParts.push(`${colors.green}${stats.create} created${colors.reset}`);
  }
  if (stats.update > 0) {
    statsParts.push(`${colors.yellow}${stats.update} updated${colors.reset}`);
  }
  if (stats.skip > 0) {
    statsParts.push(`${colors.gray}${stats.skip} skipped${colors.reset}`);
  }

  if (statsParts.length > 0) {
    console.log(`  ${statsParts.join(", ")}`);
  }

  if (verbose && totalSize > 0) {
    console.log(
      `  ${colors.gray}Total size: ${formatFileSize(totalSize)}${colors.reset}`,
    );
  }

  console.log();

  // Print final message
  if (dryRun) {
    printInfo(
      "This was a dry run. Run without --dry-run to create these files.",
    );
  } else if (files.length > 0) {
    printSuccess("Generation completed successfully!");
  }
}

/**
 * Prints a section header
 *
 * @param title - Section title
 */
export function printSectionHeader(title: string): void {
  console.log();
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.gray}${"─".repeat(title.length)}${colors.reset}`);
}

/**
 * Prints a list of items with bullets
 *
 * @param items - Array of items to print
 * @param indent - Indentation level (default: 0)
 */
export function printList(items: string[], indent: number = 0): void {
  const indentation = "  ".repeat(indent);
  for (const item of items) {
    console.log(`${indentation}${colors.gray}•${colors.reset} ${item}`);
  }
}

/**
 * Prints a key-value pair
 *
 * @param key - Key name
 * @param value - Value
 * @param indent - Indentation level (default: 0)
 */
export function printKeyValue(
  key: string,
  value: string,
  indent: number = 0,
): void {
  const indentation = "  ".repeat(indent);
  console.log(
    `${indentation}${colors.bold}${key}:${colors.reset} ${colors.cyan}${value}${colors.reset}`,
  );
}

/**
 * Prints a divider line
 */
export function printDivider(): void {
  console.log(`${colors.gray}${"─".repeat(60)}${colors.reset}`);
}

/**
 * Formats validation errors for display
 *
 * @param errors - Array of error messages
 * @returns Formatted error string
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) {
    return "";
  }

  const lines = [
    `${colors.red}${colors.bold}Validation Errors:${colors.reset}`,
    "",
  ];

  for (const error of errors) {
    lines.push(`  ${colors.red}•${colors.reset} ${error}`);
  }

  return lines.join("\n");
}

/**
 * Prints validation errors
 *
 * @param errors - Array of error messages
 */
export function printValidationErrors(errors: string[]): void {
  if (errors.length > 0) {
    console.log(formatValidationErrors(errors));
  }
}

/**
 * Creates a progress indicator (spinner)
 * Returns an object with start() and stop() methods
 */
export function createSpinner(message: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let currentFrame = 0;
  let intervalId: NodeJS.Timeout | null = null;

  return {
    start() {
      process.stdout.write(
        `${colors.cyan}${frames[0]}${colors.reset} ${message}`,
      );
      intervalId = setInterval(() => {
        currentFrame = (currentFrame + 1) % frames.length;
        process.stdout.write(
          `\r${colors.cyan}${frames[currentFrame]}${colors.reset} ${message}`,
        );
      }, 80);
    },

    stop(finalMessage?: string) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      process.stdout.write("\r\x1b[K"); // Clear the line
      if (finalMessage) {
        console.log(finalMessage);
      }
    },
  };
}
