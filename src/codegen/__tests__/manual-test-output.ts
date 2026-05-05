/**
 * Manual test script to demonstrate output formatting
 *
 * Run with: npx ts-node src/codegen/__tests__/manual-test-output.ts
 */

import {
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printGenerationSummary,
  printValidationErrors,
  printSectionHeader,
  printList,
  printKeyValue,
  printDivider,
  createSpinner,
  type GeneratedFileInfo,
} from "../output-formatter";

console.log("\n=== Output Formatter Demo ===\n");

// Test basic messages
printSectionHeader("Basic Messages");
printSuccess("Operation completed successfully!");
printError("Something went wrong!");
printWarning("This is a warning message");
printInfo("Here's some information");

console.log();
printDivider();

// Test generation summary (normal mode)
printSectionHeader("Generation Summary (Normal Mode)");
const files: GeneratedFileInfo[] = [
  { path: "src/components/Button.tsx", action: "create", size: 1024 },
  { path: "src/components/Button.test.tsx", action: "create", size: 512 },
  { path: "src/components/Input.tsx", action: "update", size: 2048 },
  { path: "src/components/Card.tsx", action: "skip", size: 768 },
];

printGenerationSummary(files, { verbose: true });

// Test generation summary (dry-run mode)
printSectionHeader("Generation Summary (Dry-Run Mode)");
printGenerationSummary(files, { dryRun: true, verbose: true });

// Test validation errors
printSectionHeader("Validation Errors");
printValidationErrors([
  "Missing required parameter: name",
  "Invalid naming convention: must be camelCase",
  "File already exists: src/test.ts",
]);

console.log();
printDivider();

// Test list and key-value
printSectionHeader("Lists and Key-Value Pairs");
printList(["Item 1", "Item 2", "Item 3"]);
console.log();
printKeyValue("Name", "UserProfile");
printKeyValue("Type", "Component");
printKeyValue("Path", "src/components/UserProfile.tsx");

console.log();
printDivider();

// Test spinner
printSectionHeader("Spinner Demo");
const spinner = createSpinner("Generating files...");
spinner.start();

setTimeout(() => {
  spinner.stop();
  printSuccess("Files generated successfully!");
  console.log("\n=== Demo Complete ===\n");
}, 2000);
