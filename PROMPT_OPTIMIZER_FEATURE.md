# Prompt Optimizer Feature

## Overview

A new prompt optimization feature has been added to the chat input that uses AI to improve user prompts for better results. The feature analyzes the user's input and rewrites it to be clearer, more specific, and more effective.

## Implementation Details

### Backend (IPC Layer)

#### 1. Type Definitions (`src/ipc/types/prompts.ts`)

- Added `OptimizePromptParamsDtoSchema` for input validation
- Added `optimize` contract to the `promptContracts` object
- Input: `{ prompt: string, context?: string }`
- Output: `string` (the optimized prompt)

#### 2. Handler (`src/ipc/handlers/prompt_handlers.ts`)

- Added `optimize` handler that:
  - Validates the input prompt
  - Gets the current model client from user settings
  - Uses `generateText` from the AI SDK to optimize the prompt
  - Returns the optimized prompt text

**Optimization Guidelines:**

- Makes prompts more specific and actionable
- Adds relevant context if missing
- Breaks down complex requests into clear steps
- Uses precise technical language when appropriate
- Maintains the user's original intent
- Keeps it concise but comprehensive
- Adds constraints or requirements for better results

### Frontend (UI Components)

#### 1. PromptOptimizerButton Component (`src/components/chat/PromptOptimizerButton.tsx`)

A new reusable button component that:

- Shows a sparkles icon (✨) to indicate AI enhancement
- Displays a loading spinner while optimizing
- Is disabled when there's no input or during streaming
- Shows helpful tooltips
- Handles errors gracefully with toast notifications

**Props:**

- `value: string` - The current prompt text
- `onChange: (value: string) => void` - Callback to update the prompt
- `disabled?: boolean` - Optional disable state

#### 2. Integration Points

**ChatInput Component** (`src/components/chat/ChatInput.tsx`)

- Added import for `PromptOptimizerButton`
- Placed the button between the text input and voice-to-text button
- Passes `inputValue` and `setInputValue` as props
- Disabled during streaming

**HomeChatInput Component** (`src/components/chat/HomeChatInput.tsx`)

- Same integration as ChatInput
- Provides consistent UX across both home and chat pages

## User Experience

1. **User types a prompt** in the chat input
2. **User clicks the sparkles button** (✨) to optimize
3. **Button shows loading state** while AI processes the prompt
4. **Optimized prompt replaces** the original text in the input
5. **User can review and edit** the optimized prompt before sending
6. **User sends the message** as usual

## Benefits

- **Better Results**: Optimized prompts lead to more accurate and helpful AI responses
- **Learning Tool**: Users can see how to improve their prompts over time
- **Time Saver**: Reduces back-and-forth by getting better results on the first try
- **Accessibility**: Makes it easier for non-technical users to write effective prompts

## Technical Notes

- Uses the same model client as the main chat (respects user's model selection)
- Temperature set to 0.7 for balanced creativity and consistency
- Error handling with user-friendly toast notifications
- Fully typed with TypeScript for type safety
- Follows the existing IPC contract pattern
- Integrates seamlessly with existing chat infrastructure

## Future Enhancements

Potential improvements for future iterations:

- Add context-aware optimization (use chat history or app context)
- Provide multiple optimization suggestions
- Add keyboard shortcut for quick access
- Show diff/comparison between original and optimized prompt
- Add user preferences for optimization style (concise vs detailed)
- Track optimization success metrics
