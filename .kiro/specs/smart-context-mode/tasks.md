# Implementation Plan: Smart Context Mode Improvements

## Overview

Implement the Context Manager pipeline (File_Selector → Scorer → Assembler → ObservabilityStore) in the Electron main process, wire it into the existing `extractCodebase` call site, expose observability via a new `smart-context` IPC domain, and add a `SmartContextStrategySelector` settings UI component.

## Tasks

- [x] 1. Add Zod schemas and TypeScript interfaces for the Context Manager
  - Add `IncludedFileRecordSchema`, `ContextObservabilityRecordSchema`, and `ContextObservabilityResultSchema` to `src/lib/schemas.ts`
  - Define `CandidateFile`, `ScoredFile`, `ScorerInput`, `AssemblerOptions`, `AssembledContext`, and `IncludedFileRecord` TypeScript interfaces in a new `src/context_manager/types.ts` file
  - _Requirements: 2.1, 3.5, 6.1_

- [x] 2. Implement the Scorer
  - [x] 2.1 Implement `scoreFile` in `src/context_manager/scorer.ts`
    - Apply the four-factor weighted sum (import relationship 0.40, symbol overlap 0.30, path proximity 0.20, recency 0.10) clamped to [0.0, 1.0]
    - Ensure the function is pure with no I/O
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [x] 2.2 Write property test for Scorer — Property 1: Relevance scores are bounded
    - **Property 1: Relevance scores are bounded**
    - **Validates: Requirements 2.1**
    - File: `src/__tests__/smart_context_scorer.property.test.ts`

  - [x] 2.3 Write property test for Scorer — Property 2: Import-related files score higher
    - **Property 2: Import-related files score higher than unrelated files**
    - **Validates: Requirements 1.1, 1.2, 2.2**
    - File: `src/__tests__/smart_context_scorer.property.test.ts`

  - [x] 2.4 Write property test for Scorer — Property 3: Scoring is deterministic
    - **Property 3: Scoring is deterministic**
    - **Validates: Requirements 2.5**
    - File: `src/__tests__/smart_context_scorer.property.test.ts`

  - [x] 2.5 Write unit tests for Scorer
    - Test each scoring factor in isolation, edge cases (no active file, empty content, zero-age file)
    - File: `src/__tests__/smart_context_scorer.test.ts`
    - _Requirements: 2.1, 2.2, 2.5_

- [x] 3. Implement the Assembler
  - [x] 3.1 Implement `assembleContext` in `src/context_manager/assembler.ts`
    - Apply strategy thresholds (conservative 0.7/25%, balanced 0.4/50%, deep 0.1/80%)
    - Truncate files with `relevanceScore < 0.3` to top-level declarations only
    - Insert `// [dyad: content omitted — N lines]` markers for truncated sections
    - Sort included files descending by score, breaking ties by `mtime` descending
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4_

  - [x] 3.2 Write property test for Assembler — Property 4: Never exceeds token budget
    - **Property 4: Context assembly never exceeds the token budget**
    - **Validates: Requirements 3.3**
    - File: `src/__tests__/smart_context_assembler.property.test.ts`

  - [x] 3.3 Write property test for Assembler — Property 5: Strategy thresholds enforced
    - **Property 5: Strategy thresholds are enforced**
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - File: `src/__tests__/smart_context_assembler.property.test.ts`

  - [x] 3.4 Write property test for Assembler — Property 6: Low-scoring files truncated
    - **Property 6: Low-scoring files are truncated to top-level declarations**
    - **Validates: Requirements 3.1, 3.2**
    - File: `src/__tests__/smart_context_assembler.property.test.ts`

  - [x] 3.5 Write property test for Assembler — Property 7: Truncated files contain omission marker
    - **Property 7: Truncated files contain an omission marker**
    - **Validates: Requirements 3.4**
    - File: `src/__tests__/smart_context_assembler.property.test.ts`

  - [x] 3.6 Write property test for Assembler — Property 8: Files in descending score order
    - **Property 8: Files are included in descending score order with recency tiebreaking**
    - **Validates: Requirements 2.3, 2.4**
    - File: `src/__tests__/smart_context_assembler.property.test.ts`

  - [x] 3.7 Write unit tests for Assembler
    - Test each strategy threshold, truncation boundary at score 0.3, omission marker format, tie-breaking
    - File: `src/__tests__/smart_context_assembler.test.ts`
    - _Requirements: 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4_

- [x] 4. Checkpoint — Ensure all Scorer and Assembler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement the File_Selector
  - [x] 5.1 Implement `selectCandidateFiles` in `src/context_manager/file_selector.ts`
    - Reuse `collectFilesNativeGit` / `collectFilesIsoGit` for workspace file collection
    - Parse static `import`/`require` statements via regex to find files related to `activeFilePath`
    - Fall back to keyword/symbol matching against `requestText` when no active file is present
    - Skip unreadable files (binary, permission denied) and continue processing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Write property test for File_Selector — Property 13: Keyword-based candidate selection
    - **Property 13: Keyword-based candidate selection without active file**
    - **Validates: Requirements 1.3**
    - File: `src/__tests__/smart_context_file_selector.property.test.ts`

  - [x] 5.3 Write unit tests for File_Selector
    - Test import graph traversal, keyword fallback, unreadable file skipping, and the 500ms performance constraint
    - File: `src/__tests__/smart_context_file_selector.test.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement the ObservabilityStore
  - [x] 6.1 Implement `ObservabilityStore` class in `src/context_manager/observability_store.ts`
    - In-memory ring buffer capped at 50 entries
    - Implement `record`, `get`, and `getRecent` methods
    - Return `{ error: "Observability data not available for this interaction" }` for unknown IDs
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.2 Write property test for ObservabilityStore — Property 10: Records are complete
    - **Property 10: Observability records are complete**
    - **Validates: Requirements 3.5, 6.1**
    - File: `src/__tests__/smart_context_observability.property.test.ts`

  - [x] 6.3 Write property test for ObservabilityStore — Property 11: Retrieval round-trip
    - **Property 11: Observability retrieval round-trip**
    - **Validates: Requirements 6.2**
    - File: `src/__tests__/smart_context_observability.property.test.ts`

  - [x] 6.4 Write property test for ObservabilityStore — Property 12: Store retains at most 50 interactions
    - **Property 12: Observability store retains at most 50 interactions**
    - **Validates: Requirements 6.3**
    - File: `src/__tests__/smart_context_observability.property.test.ts`

  - [x] 6.5 Write unit tests for ObservabilityStore
    - Test ring buffer eviction, retrieval by ID, `getRecent` ordering, and missing-ID error message
    - File: `src/__tests__/smart_context_observability.test.ts`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7. Wire the Context Manager into the existing pipeline
  - [x] 7.1 Create `src/context_manager/index.ts` that composes File_Selector → Scorer → Assembler → ObservabilityStore
    - Accept `FileSelectorOptions`, active strategy from user settings, and token budget
    - Return `AssembledContext` and record the result in the singleton `ObservabilityStore`
    - Generate a UUID `interactionId` per request
    - _Requirements: 1.1, 2.3, 3.3, 4.5, 4.7_

  - [x] 7.2 Integrate the Context Manager into the `extractCodebase` call site
    - When `proSmartContextOption` is set (smart context enabled), replace the existing file-list-building logic with a call to the Context Manager
    - Pass the assembled `formattedOutput` into the prompt in place of the raw codebase string
    - _Requirements: 1.1, 3.3, 4.5_

- [ ] 8. Add the `smart-context` IPC domain
  - [x] 8.1 Add IPC contracts in `src/ipc/types/smart-context.ts`
    - Define `getContextObservability` (`get-context-observability`) and `getRecentContextObservability` (`get-recent-context-observability`) contracts using `defineContract` and the Zod schemas from task 1
    - Follow the patterns in `rules/electron-ipc.md`
    - _Requirements: 6.2, 6.3_

  - [x] 8.2 Implement IPC handlers in the main process
    - Register handlers that delegate to the singleton `ObservabilityStore`
    - Throw `DyadError` with an appropriate `DyadErrorKind` for unknown interaction IDs (per `rules/dyad-errors.md`)
    - _Requirements: 6.2, 6.4_

  - [x] 8.3 Generate renderer-side React Query hooks for the new IPC channels
    - Follow the hook generation pattern described in `rules/electron-ipc.md`
    - _Requirements: 6.2, 6.3_

- [ ] 9. Implement the `SmartContextStrategySelector` settings UI component
  - [x] 9.1 Create `src/components/SmartContextStrategySelector.tsx`
    - Render a segmented control / radio group with `balanced`, `conservative`, and `deep` options using Base UI primitives (per `rules/base-ui-components.md`)
    - Display a brief description for each option
    - Read the current strategy via the existing `get-user-settings` IPC hook and write changes via `set-user-settings`
    - Show a confirmation after the selection is persisted
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 9.2 Add `SmartContextStrategySelector` to the Settings page
    - Follow the pattern in `rules/adding-settings.md` for wiring a new setting into the Settings page
    - _Requirements: 5.1, 5.4_

  - [x] 9.3 Write unit tests for `SmartContextStrategySelector`
    - Test that all three options render, that selecting an option triggers a settings mutation, and that the current strategy is pre-selected on mount
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 10. Add property test for settings persistence round-trip
  - [x] 10.1 Write property test — Property 9: Strategy persistence round-trip
    - **Property 9: Strategy persistence round-trip**
    - **Validates: Requirements 4.6**
    - File: `src/__tests__/smart_context_settings.property.test.ts`

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://github.com/dubzzz/fast-check) with a minimum of 100 iterations each
- Unit tests live in `src/__tests__/` following the existing project convention
- The `ObservabilityStore` is a main-process singleton; renderer access is exclusively via IPC
- Read `rules/electron-ipc.md` before touching any IPC code, and `rules/adding-settings.md` before modifying the Settings page
