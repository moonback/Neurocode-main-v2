# Implementation Plan

## Overview

This task list implements the bugfix for small LLM models failing to call tools correctly due to overly verbose system prompts. The workflow follows the exploratory bugfix methodology: explore the bug with tests, preserve existing behavior, implement the fix, and validate.

---

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Small Models Receive Verbose Prompts
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate small models receive prompts that are too verbose (5000+ tokens)
  - **Scoped PBT Approach**: Scope the property to concrete failing cases - small models (context window < 32k) with current prompt construction
  - Test implementation details from Bug Condition in design:
    - Generate prompts for models with context window < 32k tokens (Gemini Flash 8k, GPT-3.5 16k, small Ollama 4k)
    - Assert that current prompts are excessively long (> 5000 tokens for build mode, > 4000 tokens for local-agent mode)
    - Assert that prompts contain verbose examples, nested guidelines, and complex workflows
    - Test both `constructSystemPrompt` and `constructLocalAgentPrompt` functions
  - The test assertions should match the Expected Behavior Properties from design:
    - After fix: prompts for small models should be < 2000 tokens
    - After fix: prompts should contain essential tool calling instructions only
    - After fix: prompts should NOT contain verbose examples or nested workflows
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - Exact token counts for small models with current prompts
    - Specific verbose sections that should be removed (examples, nested guidelines, workflows)
    - Evidence that prompts exceed small model comprehension capacity
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Large Models Receive Identical Prompts
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for large models (context window >= 32k):
    - Run `constructSystemPrompt` for Claude Sonnet (200k), GPT-4 (128k), Gemini Pro (1M)
    - Run `constructLocalAgentPrompt` for same large models in Pro, Basic, and Ask modes
    - Capture exact prompt outputs (full text) for each model and mode combination
    - Record token counts and verify they match current verbose prompts
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all models with context window >= 32k, prompts should be identical to current implementation
    - Test all chat modes: build, ask, local-agent (Pro/Basic/Ask), plan
    - Test that AI_RULES.md customization is preserved
    - Test that theme prompts are preserved
    - Test boundary condition: exactly 32k context window should receive full prompts
  - Property-based testing generates many test cases for stronger guarantees:
    - Generate random large models (context window >= 32k)
    - Generate random combinations of (model, chat mode, readOnly flag, basicAgentMode flag)
    - Assert prompts match baseline captured from unfixed code
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [-] 3. Implement prompt optimization for small models

  - [x] 3.1 Add model size detection to `constructSystemPrompt`
    - Modify function signature to accept optional `model?: LargeLanguageModel` parameter
    - Add logic to detect context window size using `findLanguageModel(model)`
    - Determine if model is "small" (< 32k tokens) or "large" (>= 32k tokens)
    - Handle case where model parameter is not provided (default to large/verbose prompts for backward compatibility)
    - Test boundary condition: exactly 32k should be treated as large model
    - _Bug_Condition: isBugCondition(input) where input.model.contextWindow < 32000 AND input.promptType IN ['system_prompt', 'local_agent_prompt']_
    - _Expected_Behavior: Small models receive concise prompts (< 2000 tokens) with essential tool calling instructions only_
    - _Preservation: Large models (>= 32k) continue to receive full verbose prompts unchanged_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1_

  - [x] 3.2 Create concise prompt variants for small models in `system_prompt.ts`
    - Create `BUILD_SYSTEM_PREFIX_CONCISE`: Minimal role + essential tool calling instructions only
      - Remove verbose examples (Example 1, 2, 3)
      - Remove nested guidelines and workflow details
      - Keep only: core role, available tools list, basic tool calling syntax
      - Target: < 1000 tokens
    - Create `ASK_MODE_SYSTEM_PROMPT_CONCISE`: Minimal role + read-only tool instructions
      - Focus on: what read-only tools exist, how to call them
      - Remove verbose explanations and examples
      - Target: < 800 tokens
    - Ensure concise variants still contain critical information:
      - Tool names and basic descriptions
      - Tool calling syntax (function call format)
      - When to use which tool (brief guidelines)
    - _Bug_Condition: isBugCondition(input) where currentPromptIsVerbose(input.promptType)_
    - _Expected_Behavior: Concise prompts enable correct tool calling without cognitive overload_
    - _Preservation: Full verbose prompts remain unchanged for large models_
    - _Requirements: 1.3, 1.4, 2.2, 2.3, 2.4_

  - [x] 3.3 Implement prompt selection logic in `constructSystemPrompt`
    - Add conditional logic to select appropriate prompt variant based on model size
    - If model is small (< 32k): use concise variants (BUILD_SYSTEM_PREFIX_CONCISE, ASK_MODE_SYSTEM_PROMPT_CONCISE)
    - If model is large (>= 32k) or unknown: use full verbose variants (preserve existing behavior)
    - Ensure AI_RULES.md and theme prompts are still appended regardless of model size
    - Test all chat modes: build, ask, plan
    - _Bug_Condition: Small models receive verbose prompts that cause tool calling failures_
    - _Expected_Behavior: Small models receive optimized prompts that enable correct tool calling_
    - _Preservation: Large models receive identical prompts to original implementation_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.4 Add model size detection to `constructLocalAgentPrompt`
    - Modify function signature to accept optional `model?: LargeLanguageModel` parameter
    - Add logic to detect context window size (< 32k vs >= 32k)
    - Handle backward compatibility when model parameter is not provided
    - Test boundary condition: exactly 32k should be treated as large model
    - _Bug_Condition: isBugCondition(input) where input.model.contextWindow < 32000_
    - _Expected_Behavior: Small models receive concise local agent prompts_
    - _Preservation: Large models continue to receive full verbose local agent prompts_
    - _Requirements: 1.1, 1.2, 2.1, 3.4_

  - [x] 3.5 Create concise local agent prompt variants for small models
    - Create `LOCAL_AGENT_SYSTEM_PROMPT_CONCISE` (Pro mode): Minimal role + essential tool calling + concise workflow
      - Remove verbose best practices and development workflow details
      - Keep only: core role, available tools, basic workflow steps, essential guidelines
      - Target: < 1200 tokens
    - Create `LOCAL_AGENT_BASIC_SYSTEM_PROMPT_CONCISE` (Basic mode): Minimal role + basic tool calling
      - Focus on: limited tool set, basic operations
      - Target: < 1000 tokens
    - Create `LOCAL_AGENT_ASK_SYSTEM_PROMPT_CONCISE` (Ask mode): Minimal role + read-only instructions
      - Focus on: read-only tools, explanation mode
      - Target: < 800 tokens
    - Create concise versions of shared blocks:
      - `COMMON_GUIDELINES_CONCISE`: 2-3 essential rules only
      - `TOOL_CALLING_BLOCK_CONCISE`: Core tool calling rules without verbose explanations
    - Simplify or remove for small models: SKILLS_BLOCK, APP_COMMANDS_BLOCK, verbose workflow details
    - _Bug_Condition: Small models receive verbose local agent prompts with 4000+ tokens_
    - _Expected_Behavior: Concise local agent prompts enable correct tool calling for small models_
    - _Preservation: Full verbose local agent prompts remain unchanged for large models_
    - _Requirements: 1.3, 1.4, 2.2, 2.3, 2.4, 3.4_

  - [x] 3.6 Implement prompt selection logic in `constructLocalAgentPrompt`
    - Add conditional logic to select appropriate prompt variant based on model size
    - If model is small (< 32k): use concise variants (LOCAL_AGENT_SYSTEM_PROMPT_CONCISE, etc.)
    - If model is large (>= 32k) or unknown: use full verbose variants (preserve existing behavior)
    - Test all local agent modes: Pro, Basic, Ask
    - Ensure skills system integration works for both small and large models
    - Ensure theme prompts work for both small and large models
    - _Bug_Condition: Small models receive verbose prompts that cause tool calling failures_
    - _Expected_Behavior: Small models receive optimized prompts that enable correct tool calling_
    - _Preservation: Large models receive identical prompts to original implementation_
    - _Requirements: 2.1, 2.2, 2.3, 3.4, 3.5, 3.6_

  - [x] 3.7 Update call sites to pass model information
    - Identify all locations where `constructSystemPrompt` is called
    - Identify all locations where `constructLocalAgentPrompt` is called
    - Update call sites to pass model information when available
    - Ensure backward compatibility: if model info is not available, functions should default to verbose prompts
    - Test that existing code paths continue to work without modification
    - _Bug_Condition: Call sites don't provide model information for size detection_
    - _Expected_Behavior: Call sites pass model info to enable prompt optimization_
    - _Preservation: Call sites that don't pass model info continue to work with verbose prompts_
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 3.8 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Small Models Receive Concise Prompts
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify that small models now receive prompts < 2000 tokens
    - Verify that prompts contain essential tool calling instructions
    - Verify that prompts do NOT contain verbose examples or nested workflows
    - Document that counterexamples from task 1 are now resolved
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.9 Verify preservation tests still pass
    - **Property 2: Preservation** - Large Models Receive Identical Prompts
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Verify that large models (Claude, GPT-4, Gemini Pro) receive identical prompts to baseline
    - Verify that all chat modes (build, ask, local-agent, plan) work identically for large models
    - Verify that AI_RULES.md customization still works
    - Verify that theme prompts still work
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4. Add unit tests for prompt optimization logic

  - [ ] 4.1 Test model size detection logic
    - Test that models with context window < 32k are detected as "small"
    - Test that models with context window >= 32k are detected as "large"
    - Test boundary condition: exactly 32k should be treated as "large"
    - Test that unknown/missing model defaults to "large" (backward compatibility)
    - _Requirements: 2.1, 3.1_

  - [ ] 4.2 Test prompt variant selection
    - Test that small models receive concise prompt variants
    - Test that large models receive verbose prompt variants
    - Test that concise prompts are significantly shorter than verbose prompts (< 2000 tokens vs > 4000 tokens)
    - Test that concise prompts still contain essential tool calling instructions
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ] 4.3 Test backward compatibility
    - Test that `constructSystemPrompt` works without model parameter (defaults to verbose)
    - Test that `constructLocalAgentPrompt` works without model parameter (defaults to verbose)
    - Test that existing call sites continue to work without modification
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 4.4 Test AI_RULES and theme prompt preservation
    - Test that custom AI_RULES.md content is appended for both small and large models
    - Test that theme prompts are appended for both small and large models
    - Test that prompt customization features work identically for both model sizes
    - _Requirements: 3.5, 3.6_

- [ ] 5. Add integration tests for end-to-end prompt generation

  - [ ] 5.1 Test full prompt generation flow with small model in build mode
    - Generate complete system prompt for small model (e.g., Gemini Flash 8k) in build mode
    - Verify prompt is concise (< 2000 tokens)
    - Verify prompt contains essential tool calling instructions
    - Verify prompt does NOT contain verbose examples or workflows
    - Manually test with actual small model if available (optional but recommended)
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.2 Test full prompt generation flow with large model in build mode
    - Generate complete system prompt for large model (e.g., Claude Sonnet) in build mode
    - Verify prompt is identical to baseline (captured in task 2)
    - Verify prompt contains all verbose guidelines, examples, and workflows
    - Verify no regressions in prompt content or structure
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 5.3 Test local agent prompt generation with small model in Pro mode
    - Generate complete local agent prompt for small model in Pro mode
    - Verify prompt is concise (< 1200 tokens)
    - Verify prompt contains essential tool calling and workflow instructions
    - Verify prompt does NOT contain verbose best practices or development workflow details
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.4 Test local agent prompt generation with large model in Pro mode
    - Generate complete local agent prompt for large model in Pro mode
    - Verify prompt is identical to baseline (captured in task 2)
    - Verify prompt contains all verbose guidelines, best practices, and workflows
    - Verify no regressions in prompt content or structure
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ] 5.5 Test all chat modes with both small and large models
    - Test build mode: small model gets concise, large model gets verbose
    - Test ask mode: small model gets concise, large model gets verbose
    - Test local-agent Pro mode: small model gets concise, large model gets verbose
    - Test local-agent Basic mode: small model gets concise, large model gets verbose
    - Test local-agent Ask mode: small model gets concise, large model gets verbose
    - Test plan mode: small model gets concise, large model gets verbose
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Run all unit tests: `npm run test`
  - Run type checks: `npm run ts`
  - Run linting: `npm run lint`
  - Verify all exploration tests pass (bug is fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify all unit tests pass
  - Verify all integration tests pass
  - If any tests fail, investigate and fix before proceeding
  - Ask the user if questions arise or if manual testing with actual small models is needed

---

## Notes

- **Testing Strategy**: This implementation follows the exploratory bugfix workflow with property-based testing for strong guarantees
- **Exploration Phase**: Task 1 surfaces counterexamples demonstrating the bug on unfixed code
- **Preservation Phase**: Task 2 captures baseline behavior for large models before implementing the fix
- **Implementation Phase**: Tasks 3.1-3.7 implement the fix with clear bug condition and expected behavior annotations
- **Validation Phase**: Tasks 3.8-3.9 verify the fix works and preserves existing behavior
- **Additional Testing**: Tasks 4-5 add comprehensive unit and integration tests
- **Manual Testing**: Consider testing with actual small models (Gemini Flash, GPT-3.5, small Ollama models) to verify tool calling works correctly in practice
