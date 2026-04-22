# Design Document: Smart Context Mode Improvements

## Overview

Smart Context Mode Improvements enhance how Dyad selects, scores, and assembles file content into the LLM context window for each request. The current system includes files based on glob patterns and a basic smart-context toggle. This feature introduces a proper relevance scoring pipeline, configurable strategy profiles, smart truncation, and per-request observability — all while fitting cleanly into the existing Electron IPC architecture.

The feature builds on top of the existing `extractCodebase` pipeline in `src/utils/codebase.ts` and the `proSmartContextOption` setting already present in `UserSettingsSchema`. The three strategy profiles (`conservative`, `balanced`, `deep`) map directly to the existing `SmartContextModeSchema` enum.

## Architecture

The feature introduces a new **Context Manager** layer that sits between the raw file collection step and the LLM prompt assembly step. It is composed of three sub-components:

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│                   Context Manager                    │
│                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────┐ │
│  │ File_Selector│──▶│    Scorer    │──▶│Assembler │ │
│  └──────────────┘   └──────────────┘   └──────────┘ │
│         │                  │                 │       │
│         ▼                  ▼                 ▼       │
│   Candidate Files    Scored Files     Context String │
│                                       + Observability│
└─────────────────────────────────────────────────────┘
```

The Context Manager runs entirely in the Electron main process (alongside the existing `extractCodebase` logic). The renderer communicates with it via the existing IPC patterns:

- **Settings IPC** (`set-user-settings` / `get-user-settings`) — persists the selected strategy.
- **New `smart-context` IPC domain** — exposes observability data (file list, scores, token counts) for the last 50 interactions.
- **Existing `extractCodebase` call site** — the Context Manager replaces the current file-list-building logic when smart context is enabled.

## Components and Interfaces

### File_Selector

Responsible for identifying candidate files from the workspace. Runs in the main process.

```typescript
interface FileSelectorOptions {
  appPath: string;
  activeFilePath: string | null;
  requestText: string;
  chatContext: AppChatContext;
}

interface CandidateFile {
  path: string; // relative path from appPath
  content: string; // raw file content
  mtime: number; // last modification timestamp (ms)
  sizeTokens: number; // estimated token count for full content
}

async function selectCandidateFiles(
  options: FileSelectorOptions,
): Promise<CandidateFile[]>;
```

Selection strategy:

1. Collect all workspace files using the existing `collectFilesNativeGit` / `collectFilesIsoGit` logic.
2. If `activeFilePath` is set, parse its import statements (static `import`/`require` analysis via regex over the file content) to find directly related files.
3. If no `activeFilePath`, tokenize `requestText` and match against file names and exported symbol names.
4. Return all collected files as candidates (scoring happens in the Scorer).

### Scorer

Assigns a `RelevanceScore` (0.0–1.0) to each candidate file. Pure function — no I/O.

```typescript
interface ScorerInput {
  candidate: CandidateFile;
  activeFilePath: string | null;
  requestText: string;
  importedPaths: Set<string>; // paths directly imported by active file
  importingPaths: Set<string>; // paths that import the active file
  now: number; // current timestamp for recency calculation
}

interface ScoredFile extends CandidateFile {
  relevanceScore: number; // 0.0–1.0
}

function scoreFile(input: ScorerInput): ScoredFile;
```

Scoring formula (weighted sum, clamped to [0.0, 1.0]):

| Factor                     | Weight | Description                                                              |
| -------------------------- | ------ | ------------------------------------------------------------------------ |
| Direct import relationship | 0.40   | 1.0 if file is directly imported by or imports the active file, else 0.0 |
| Symbol overlap             | 0.30   | Jaccard similarity between exported symbols and request tokens           |
| Path proximity             | 0.20   | 1.0 if same directory, 0.5 if sibling directory, else 0.0                |
| Recency                    | 0.10   | Normalized recency: `1 - (age_days / 30)`, clamped to [0, 1]             |

The formula is deterministic for identical inputs (no randomness).

### Assembler

Selects and truncates files according to the active strategy, then formats them for the LLM prompt.

```typescript
interface AssemblerOptions {
  scoredFiles: ScoredFile[];
  strategy: SmartContextMode; // "conservative" | "balanced" | "deep"
  tokenBudget: number;
  activeFilePath: string | null;
}

interface AssembledContext {
  formattedOutput: string;
  includedFiles: IncludedFileRecord[];
  totalTokensUsed: number;
}

interface IncludedFileRecord {
  path: string;
  relevanceScore: number;
  tokensUsed: number;
  wasTruncated: boolean;
}

function assembleContext(options: AssemblerOptions): AssembledContext;
```

Strategy thresholds:

| Strategy       | Min Score                         | Token Budget Cap |
| -------------- | --------------------------------- | ---------------- |
| `conservative` | 0.7 (active file always included) | 25%              |
| `balanced`     | 0.4                               | 50%              |
| `deep`         | 0.1                               | 80%              |

Truncation logic:

- Files with `relevanceScore < 0.3` are truncated to top-level declarations only (function signatures, class/interface definitions, type aliases, exported constants).
- When the token budget would be exceeded, the lowest-scoring files are truncated first.
- Truncated sections are replaced with `// [dyad: content omitted — N lines]`.
- Files are included in descending score order; ties broken by `mtime` (most recent first).

### Observability Store

An in-memory ring buffer (max 50 entries) in the main process that records context metadata per request.

```typescript
interface ContextObservabilityRecord {
  interactionId: string; // UUID per request
  timestamp: number;
  includedFiles: IncludedFileRecord[];
  totalTokensUsed: number;
  strategy: SmartContextMode;
}

class ObservabilityStore {
  record(entry: ContextObservabilityRecord): void;
  get(interactionId: string): ContextObservabilityRecord | null;
  getRecent(limit?: number): ContextObservabilityRecord[];
}
```

### Settings UI Component

A new `SmartContextStrategySelector` component following the pattern of existing selector components (e.g., `ThinkingBudgetSelector`). It renders a segmented control or radio group with three options and a description for each.

### New IPC Domain: `smart-context`

```typescript
// src/ipc/types/smart-context.ts

export const smartContextContracts = {
  getContextObservability: defineContract({
    channel: "get-context-observability",
    input: z.object({ interactionId: z.string().optional() }),
    output: ContextObservabilityResultSchema,
  }),
  getRecentContextObservability: defineContract({
    channel: "get-recent-context-observability",
    input: z.void(),
    output: z.array(ContextObservabilityRecordSchema),
  }),
};
```

## Data Models

### Zod Schemas (additions to `src/lib/schemas.ts`)

`SmartContextModeSchema` already exists:

```typescript
export const SmartContextModeSchema = z.enum([
  "balanced",
  "conservative",
  "deep",
]);
```

New schemas:

```typescript
export const IncludedFileRecordSchema = z.object({
  path: z.string(),
  relevanceScore: z.number().min(0).max(1),
  tokensUsed: z.number().int().nonnegative(),
  wasTruncated: z.boolean(),
});

export const ContextObservabilityRecordSchema = z.object({
  interactionId: z.string(),
  timestamp: z.number(),
  includedFiles: z.array(IncludedFileRecordSchema),
  totalTokensUsed: z.number().int().nonnegative(),
  strategy: SmartContextModeSchema,
});

export const ContextObservabilityResultSchema = z.union([
  ContextObservabilityRecordSchema,
  z.object({ error: z.string() }),
]);
```

### Settings Schema (existing field, already present)

`proSmartContextOption: SmartContextModeSchema.optional()` — already in `UserSettingsSchema`. Default is `"balanced"` (resolved at read time when unset).

### Database

No database changes required. Observability data is session-scoped and held in memory only.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Relevance scores are bounded

_For any_ set of candidate files and any scoring inputs, every `relevanceScore` produced by the Scorer SHALL be in the range [0.0, 1.0].

**Validates: Requirements 2.1**

---

### Property 2: Import-related files score higher than unrelated files

_For any_ workspace where file A directly imports file B, and file C has no import relationship with A, the Scorer SHALL assign file B a higher `relevanceScore` than file C when A is the active file (all other factors equal).

**Validates: Requirements 1.1, 1.2, 2.2**

---

### Property 3: Scoring is deterministic

_For any_ set of scoring inputs, running the Scorer twice with identical inputs SHALL produce identical `relevanceScore` values.

**Validates: Requirements 2.5**

---

### Property 4: Context assembly never exceeds the token budget

_For any_ set of scored files and any token budget, the total tokens used in the assembled context SHALL never exceed the token budget.

**Validates: Requirements 3.3**

---

### Property 5: Strategy thresholds are enforced

_For any_ set of scored candidate files and any token budget, when a strategy is applied:

- `conservative`: only files with `relevanceScore >= 0.7` are included (plus the active file), and total tokens ≤ 25% of budget.
- `balanced`: only files with `relevanceScore >= 0.4` are included, and total tokens ≤ 50% of budget.
- `deep`: only files with `relevanceScore > 0.1` are included, and total tokens ≤ 80% of budget.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 6: Low-scoring files are truncated to top-level declarations

_For any_ file with `relevanceScore < 0.3`, the content included in the assembled context SHALL contain only top-level declarations (function signatures, class/interface definitions, type aliases, exported constants) and not full implementation bodies.

**Validates: Requirements 3.1, 3.2**

---

### Property 7: Truncated files contain an omission marker

_For any_ file whose content is truncated during assembly, the resulting formatted output SHALL contain a comment marker indicating that content was omitted.

**Validates: Requirements 3.4**

---

### Property 8: Files are included in descending score order with recency tiebreaking

_For any_ assembled context, the included files SHALL appear in descending order of `relevanceScore`. When two files have equal scores, the file with the more recent `mtime` SHALL appear first.

**Validates: Requirements 2.3, 2.4**

---

### Property 9: Strategy persistence round-trip

_For any_ valid `SmartContextMode` value written to settings, reading the settings back SHALL return the same strategy value.

**Validates: Requirements 4.6**

---

### Property 10: Observability records are complete

_For any_ processed request, the observability record SHALL contain the list of included files with their scores, and the total token count SHALL equal the sum of `tokensUsed` across all included files.

**Validates: Requirements 3.5, 6.1**

---

### Property 11: Observability retrieval round-trip

_For any_ recorded interaction, retrieving the observability data by `interactionId` SHALL return a record whose `includedFiles` and `totalTokensUsed` match what was recorded at assembly time.

**Validates: Requirements 6.2**

---

### Property 12: Observability store retains at most 50 interactions

_For any_ sequence of more than 50 recorded interactions, the store SHALL retain exactly the 50 most recent interactions and discard the rest.

**Validates: Requirements 6.3**

---

### Property 13: Keyword-based candidate selection without active file

_For any_ request text containing a keyword that appears in a workspace file's name or exported symbols, and when no active file is present, the File_Selector SHALL include that file in the candidate set.

**Validates: Requirements 1.3**

## Error Handling

| Scenario                                                 | Behavior                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| File cannot be read (binary, permission denied)          | Skip file, log warning, continue with remaining candidates                  |
| Active file path does not exist in workspace             | Treat as no active file; fall back to keyword-based selection               |
| Token budget is 0 or negative                            | Return empty context with a warning log                                     |
| Observability data requested for unknown `interactionId` | Return `{ error: "Observability data not available for this interaction" }` |
| Scorer receives a file with no content                   | Assign score 0.0                                                            |
| Strategy value is unrecognized                           | Fall back to `"balanced"` and log a warning                                 |

All errors in the main-process Context Manager are logged via `electron-log` and do not surface as unhandled exceptions. Non-bug failures (e.g., unknown interaction ID) use `DyadError` with an appropriate `DyadErrorKind` per the project's error handling conventions.

## Testing Strategy

### Unit Tests

Unit tests cover the pure-function components (Scorer, Assembler truncation logic, ObservabilityStore). They live in `src/__tests__/` following the existing convention.

- `smart_context_scorer.test.ts` — score range, determinism, factor weighting
- `smart_context_assembler.test.ts` — strategy thresholds, truncation, omission markers, ordering
- `smart_context_observability.test.ts` — ring buffer capacity, retrieval, missing-ID error

### Property-Based Tests

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check), which is the PBT library best suited for TypeScript/Node.js environments. Each test runs a minimum of 100 iterations.

Tests live alongside unit tests in `src/__tests__/` with a `.property.test.ts` suffix.

**`smart_context_scorer.property.test.ts`**

- `// Feature: smart-context-mode, Property 1: Relevance scores are bounded`
  - Arbitrary: random `ScorerInput` with varying import relationships, symbol sets, timestamps
  - Assert: `score >= 0.0 && score <= 1.0`
- `// Feature: smart-context-mode, Property 2: Import-related files score higher`
  - Arbitrary: random workspace graph where file B is imported by active file A, file C is unrelated
  - Assert: `score(B) > score(C)`
- `// Feature: smart-context-mode, Property 3: Scoring is deterministic`
  - Arbitrary: random `ScorerInput`
  - Assert: `scoreFile(input) === scoreFile(input)` (run twice)

**`smart_context_assembler.property.test.ts`**

- `// Feature: smart-context-mode, Property 4: Context assembly never exceeds token budget`
  - Arbitrary: random scored file sets, random token budgets > 0
  - Assert: `assembledContext.totalTokensUsed <= tokenBudget`
- `// Feature: smart-context-mode, Property 5: Strategy thresholds are enforced`
  - Arbitrary: random scored file sets, random token budgets, each of the three strategies
  - Assert: all included files meet the strategy's minimum score threshold AND total tokens ≤ strategy's budget cap
- `// Feature: smart-context-mode, Property 6: Low-scoring files are truncated`
  - Arbitrary: random files with `relevanceScore < 0.3` and multi-line content
  - Assert: assembled output for those files contains only declaration-level lines
- `// Feature: smart-context-mode, Property 7: Truncated files contain omission marker`
  - Arbitrary: random files that will be truncated (large content, tight budget)
  - Assert: formatted output contains `// [dyad: content omitted`
- `// Feature: smart-context-mode, Property 8: Files in descending score order`
  - Arbitrary: random scored file sets
  - Assert: included files are sorted descending by score; ties broken by mtime descending

**`smart_context_observability.property.test.ts`**

- `// Feature: smart-context-mode, Property 10: Observability records are complete`
  - Arbitrary: random `AssembledContext` values
  - Assert: `record.totalTokensUsed === sum(record.includedFiles.map(f => f.tokensUsed))`
- `// Feature: smart-context-mode, Property 11: Observability retrieval round-trip`
  - Arbitrary: random observability records
  - Assert: `store.get(record.interactionId)` returns a record equal to what was stored
- `// Feature: smart-context-mode, Property 12: Store retains at most 50 interactions`
  - Arbitrary: sequences of N > 50 records
  - Assert: `store.getRecent().length === 50` and the retained records are the N most recent

**`smart_context_settings.property.test.ts`**

- `// Feature: smart-context-mode, Property 9: Strategy persistence round-trip`
  - Arbitrary: random `SmartContextMode` values (`"balanced" | "conservative" | "deep"`)
  - Assert: `writeSettings({ proSmartContextOption: strategy }); readSettings().proSmartContextOption === strategy`

### Integration Tests

- Verify the `get-context-observability` IPC endpoint returns data after a real chat request.
- Verify the `SmartContextStrategySelector` component renders all three options and triggers a settings update on selection.
- Verify the File_Selector completes within 500ms for a workspace of 10,000 files (single benchmark, not PBT).
