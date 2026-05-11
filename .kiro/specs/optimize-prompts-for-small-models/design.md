# Optimize Prompts for Small Models - Bugfix Design

## Overview

Small LLM models (models with limited context windows, typically <32k tokens) fail to call tools correctly because the system prompts in `src/prompts/system_prompt.ts` and `src/prompts/local_agent_prompt.ts` are too long and complex. These prompts contain extensive guidelines, multiple examples, nested instruction blocks, and verbose workflows that exceed the comprehension capacity of smaller models. This bug prevents users from effectively using lighter, more economical models.

The fix will implement a prompt optimization system that:
1. Detects when a small model is being used (based on context window size)
2. Provides simplified, concise prompts focused on essential tool calling instructions
3. Maintains full, detailed prompts for large models
4. Ensures tool calling instructions are clear and focused for small models

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a small model (context window < 32k tokens) receives the current verbose system prompts and fails to call tools correctly
- **Property (P)**: The desired behavior when small models receive optimized prompts - tools should be called correctly with proper parameters
- **Preservation**: Existing behavior for large models (context window >= 32k tokens) that must remain unchanged - they should continue receiving full, detailed prompts
- **Small Model**: A language model with a context window smaller than 32,000 tokens (e.g., Gemini Flash, smaller Ollama models, GPT-3.5)
- **Large Model**: A language model with a context window of 32,000 tokens or more (e.g., Claude Sonnet, GPT-4, Gemini Pro)
- **Context Window**: The maximum number of tokens a model can process in a single request (input + output)
- **Tool Calling**: The ability of an LLM to invoke structured functions/tools with correct parameters based on system prompt instructions
- **constructSystemPrompt**: The function in `src/prompts/system_prompt.ts` that assembles the final system prompt
- **constructLocalAgentPrompt**: The function in `src/prompts/local_agent_prompt.ts` that assembles the local agent prompt

## Bug Details

### Bug Condition

The bug manifests when a small model (context window < 32k tokens) receives the current system prompts. The prompts contain extensive guidelines (role blocks, app commands, skills system, general guidelines, tool calling rules, best practices, file editing tool selection, development workflow, image generation guidelines) that consume significant token budget and create cognitive overload. The small model either fails to identify the correct tool to call, calls tools with incorrect parameters, or doesn't call tools at all.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { model: LanguageModel, promptType: string }
  OUTPUT: boolean
  
  RETURN input.model.contextWindow < 32000
         AND input.promptType IN ['system_prompt', 'local_agent_prompt']
         AND currentPromptIsVerbose(input.promptType)
END FUNCTION
```

### Examples

- **Example 1**: User with Gemini Flash (8k context window) asks to "read the file src/App.tsx" → Model responds with explanation text instead of calling the `read_file` tool
- **Example 2**: User with GPT-3.5-turbo (16k context window) asks to "create a new Button component" → Model attempts to use markdown code blocks instead of the `<dyad-write>` tag
- **Example 3**: User with small Ollama model (4k context window) asks to "search for the login function" → Model doesn't call the `grep` or `code_search` tool and instead says it cannot help
- **Edge Case**: User with a model at exactly 32k context window → Should receive full prompts (boundary condition)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Large models (context window >= 32k tokens) must continue to receive the full, detailed system prompts with all guidelines, examples, and workflows
- All prompt modes (build, ask, local-agent, plan) must continue to work correctly for large models
- Skills system integration must remain unchanged for all models
- Theme prompt appending must continue to work for all models
- The prompt construction logic for different chat modes must remain unchanged for large models

**Scope:**
All inputs that do NOT involve small models (context window < 32k) should be completely unaffected by this fix. This includes:
- Large model prompt generation (Claude, GPT-4, Gemini Pro, etc.)
- Custom model configurations with large context windows
- All existing prompt customization features (AI_RULES.md, theme prompts)
- Prompt mode selection logic (build vs ask vs local-agent vs plan)

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Excessive Prompt Length**: The current prompts contain 5000+ tokens of instructions, examples, and guidelines
   - `BUILD_SYSTEM_PREFIX` includes role, app commands, skills system, guidelines, examples
   - `LOCAL_AGENT_SYSTEM_PROMPT` includes role, app commands, skills, guidelines, tool calling, best practices, file editing selection, development workflow, image generation
   - Small models lose focus on tool calling instructions when overwhelmed with information

2. **Nested Instruction Complexity**: Multiple nested blocks (role → guidelines → tool calling → best practices → workflow) create cognitive overload
   - Small models struggle to extract the essential "how to call tools" information
   - Critical tool calling instructions are buried within verbose guidelines

3. **Verbose Examples**: Extensive examples (Example 1, 2, 3 in BUILD_SYSTEM_PREFIX) consume tokens without providing value for tool calling
   - Small models may focus on example patterns rather than core tool calling mechanics

4. **No Model-Aware Prompt Selection**: The current code doesn't detect model size and always uses full prompts
   - `constructSystemPrompt` and `constructLocalAgentPrompt` don't consider context window size
   - No mechanism exists to switch between verbose and concise prompt variants

## Correctness Properties

Property 1: Bug Condition - Small Models Call Tools Correctly

_For any_ system prompt generation where the model has a context window smaller than 32,000 tokens, the prompt construction functions SHALL generate optimized, concise prompts that enable the model to call tools correctly with proper parameters, focusing on essential tool calling instructions without verbose guidelines or examples.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Large Model Prompt Behavior

_For any_ system prompt generation where the model has a context window of 32,000 tokens or more, the prompt construction functions SHALL produce exactly the same verbose, detailed prompts as the original code, preserving all guidelines, examples, workflows, and instruction blocks.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/prompts/system_prompt.ts`

**Function**: `constructSystemPrompt`

**Specific Changes**:
1. **Add Model Size Detection**: Modify `constructSystemPrompt` to accept model information and detect if context window < 32k
   - Add optional `model?: LargeLanguageModel` parameter
   - Call `findLanguageModel(model)` to get context window size
   - Determine if model is "small" (< 32k) or "large" (>= 32k)

2. **Create Concise Prompt Variants**: Create simplified versions of prompt blocks for small models
   - `BUILD_SYSTEM_PREFIX_CONCISE`: Minimal role + essential tool calling instructions only
   - `ASK_MODE_SYSTEM_PROMPT_CONCISE`: Minimal role + read-only tool instructions
   - Remove verbose examples, nested guidelines, and workflow details from concise variants

3. **Implement Prompt Selection Logic**: Add conditional logic to select appropriate prompt variant
   - If model is small: use concise variants
   - If model is large or unknown: use full verbose variants (preserve existing behavior)

4. **Update Function Signature**: Modify `constructSystemPrompt` to accept model parameter
   - Update all call sites to pass model information when available
   - Maintain backward compatibility by making model parameter optional

5. **Preserve AI_RULES and Theme Prompt**: Ensure custom AI_RULES.md and theme prompts are still appended regardless of model size

**File**: `src/prompts/local_agent_prompt.ts`

**Function**: `constructLocalAgentPrompt`

**Specific Changes**:
1. **Add Model Size Detection**: Similar to system_prompt.ts, add model detection logic
   - Add optional `model?: LargeLanguageModel` parameter
   - Detect if context window < 32k

2. **Create Concise Local Agent Variants**: Create simplified versions for Pro, Basic, and Ask modes
   - `LOCAL_AGENT_SYSTEM_PROMPT_CONCISE`: Minimal role + essential tool calling + concise workflow
   - `LOCAL_AGENT_BASIC_SYSTEM_PROMPT_CONCISE`: Minimal role + basic tool calling
   - `LOCAL_AGENT_ASK_SYSTEM_PROMPT_CONCISE`: Minimal role + read-only instructions
   - Focus on: what tools exist, how to call them, when to call them (remove verbose best practices)

3. **Simplify Shared Blocks for Small Models**: Create concise versions of shared blocks
   - `COMMON_GUIDELINES_CONCISE`: 2-3 essential rules only
   - `TOOL_CALLING_BLOCK_CONCISE`: Core tool calling rules without verbose explanations
   - Remove or drastically simplify: SKILLS_BLOCK, APP_COMMANDS_BLOCK, workflow details

4. **Implement Prompt Selection Logic**: Add conditional logic in `constructLocalAgentPrompt`
   - If model is small: use concise variants
   - If model is large or unknown: use full verbose variants

5. **Update Function Signature**: Add model parameter and update call sites

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code with small models, then verify the fix works correctly and preserves existing behavior for large models.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that small models fail to call tools correctly with current verbose prompts.

**Test Plan**: Create test cases that generate prompts for small models (context window < 32k) and verify that the prompts are too long/complex. Manually test with actual small models (if available) to observe tool calling failures. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Gemini Flash Test**: Generate prompt for Gemini Flash (8k context window) in build mode → Observe verbose prompt with 5000+ tokens (will fail on unfixed code)
2. **GPT-3.5 Test**: Generate prompt for GPT-3.5-turbo (16k context window) in local-agent mode → Observe full verbose prompt with all blocks (will fail on unfixed code)
3. **Small Ollama Model Test**: Generate prompt for 4k context window model → Observe prompt exceeds reasonable size for small model (will fail on unfixed code)
4. **Boundary Test**: Generate prompt for exactly 32k context window model → Should receive full prompt (may pass on unfixed code, validates boundary)

**Expected Counterexamples**:
- Small models receive prompts with 5000+ tokens of instructions
- Prompts contain verbose examples, nested guidelines, and complex workflows
- Possible causes: no model size detection, no concise prompt variants, always using full prompts

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (small models), the fixed functions produce optimized, concise prompts that enable correct tool calling.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  prompt := constructSystemPrompt_fixed(input.model, ...)
  ASSERT prompt.length < 2000 tokens
  ASSERT prompt contains essential tool calling instructions
  ASSERT prompt does NOT contain verbose examples
  ASSERT prompt does NOT contain nested workflow details
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (large models), the fixed functions produce the same result as the original functions.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT constructSystemPrompt_original(input) = constructSystemPrompt_fixed(input)
  ASSERT constructLocalAgentPrompt_original(input) = constructLocalAgentPrompt_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (different large models, different modes)
- It catches edge cases that manual unit tests might miss (boundary conditions, custom models)
- It provides strong guarantees that behavior is unchanged for all large model inputs

**Test Plan**: Observe behavior on UNFIXED code first for large models (Claude, GPT-4, Gemini Pro), capture the exact prompts generated, then write property-based tests to verify the fixed code produces identical prompts for these models.

**Test Cases**:
1. **Claude Sonnet Preservation**: Verify Claude Sonnet (200k context window) receives identical full prompt after fix
2. **GPT-4 Preservation**: Verify GPT-4 (128k context window) receives identical full prompt after fix
3. **Gemini Pro Preservation**: Verify Gemini Pro (1M context window) receives identical full prompt after fix
4. **Custom Large Model Preservation**: Verify custom models with context window >= 32k receive identical prompts
5. **All Modes Preservation**: Verify build, ask, local-agent, and plan modes all work identically for large models
6. **AI_RULES Preservation**: Verify custom AI_RULES.md content is still appended for all models
7. **Theme Prompt Preservation**: Verify theme prompts are still appended for all models

### Unit Tests

- Test model size detection logic (< 32k vs >= 32k)
- Test prompt variant selection (concise vs verbose)
- Test that concise prompts are significantly shorter than verbose prompts
- Test that concise prompts still contain essential tool calling instructions
- Test backward compatibility when model parameter is not provided (should use verbose prompts)
- Test boundary condition (exactly 32k context window → should use verbose prompts)

### Property-Based Tests

- Generate random large models (context window >= 32k) and verify prompts are identical to original
- Generate random small models (context window < 32k) and verify prompts are concise and contain tool instructions
- Generate random chat modes and verify mode-specific behavior is preserved
- Test that all combinations of (model size, chat mode, readOnly flag, basicAgentMode flag) produce valid prompts

### Integration Tests

- Test full prompt generation flow with small model in build mode → verify tool calling works
- Test full prompt generation flow with large model in build mode → verify identical behavior to before fix
- Test local agent prompt generation with small model in Pro mode → verify concise prompt with tool instructions
- Test local agent prompt generation with large model in Pro mode → verify identical verbose prompt
- Test that AI_RULES.md customization works for both small and large models
- Test that theme prompts work for both small and large models
