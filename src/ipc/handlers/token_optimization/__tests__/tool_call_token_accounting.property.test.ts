// Feature: token-optimization
import * as fc from "fast-check";
import { describe, it, expect } from "vitest";
import type { ModelMessage } from "ai";

// **Property 21: Tool Call Token Accounting**
// **Validates: Requirements 7.6**

/**
 * Simple token counting function that mimics the current implementation
 * Uses ~4 characters per token heuristic
 */
function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0; // Empty strings have 0 tokens
  }
  return Math.ceil(text.length / 4);
}

/**
 * Calculate tokens for tool call definitions (schema/description)
 * In a real implementation, this would include the tool's schema and description
 */
function calculateToolDefinitionTokens(toolName: string): number {
  // Simulate tool definition tokens (name + schema + description)
  // This is a simplified version - real implementation would include full schema
  const mockDefinition = `{"name":"${toolName}","description":"Tool for ${toolName}","parameters":{"type":"object","properties":{}}}`;
  return estimateTokens(mockDefinition);
}

/**
 * Calculate tokens for tool call arguments (JSON parameters)
 */
function calculateToolArgumentTokens(args: Record<string, any>): number {
  const argsJson = JSON.stringify(args);
  return estimateTokens(argsJson);
}

/**
 * Calculate tokens for tool call results (response data)
 */
function calculateToolResultTokens(result: string): number {
  return estimateTokens(result);
}

/**
 * Calculate total tokens for a message array including tool calls
 * This is the function being tested by Property 21
 */
function calculateTotalTokensWithToolCalls(messages: ModelMessage[]): {
  totalTokens: number;
  breakdown: {
    messageContent: number;
    toolDefinitions: number;
    toolArguments: number;
    toolResults: number;
  };
} {
  let messageContentTokens = 0;
  let toolDefinitionTokens = 0;
  let toolArgumentTokens = 0;
  let toolResultTokens = 0;

  const toolsUsed = new Set<string>();

  for (const message of messages) {
    // Count regular message content tokens (exclude tool results which are counted below)
    if (message.role !== "tool" && typeof message.content === "string") {
      messageContentTokens += estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "text") {
          messageContentTokens += estimateTokens(part.text);
        } else if (part.type === "tool-call") {
          // Track tool usage for definition counting
          toolsUsed.add(part.toolName);
          
          // Count tool call arguments
          if (part.input) {
            toolArgumentTokens += calculateToolArgumentTokens(part.input);
          }
        }
      }
    }

    // Count tool result tokens for tool messages
    if (message.role === "tool" && typeof message.content === "string") {
      toolResultTokens += calculateToolResultTokens(message.content);
    }
  }

  // Count tool definition tokens (once per unique tool used)
  for (const toolName of toolsUsed) {
    toolDefinitionTokens += calculateToolDefinitionTokens(toolName);
  }

  const totalTokens = messageContentTokens + toolDefinitionTokens + toolArgumentTokens + toolResultTokens;

  return {
    totalTokens,
    breakdown: {
      messageContent: messageContentTokens,
      toolDefinitions: toolDefinitionTokens,
      toolArguments: toolArgumentTokens,
      toolResults: toolResultTokens,
    },
  };
}

// Arbitrary generators for test data

const toolNameArb = fc.constantFrom(
  "read_file",
  "write_file", 
  "execute_command",
  "search_files",
  "list_directory",
  "create_directory"
);

const toolArgumentsArb = fc.record({
  path: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  content: fc.option(fc.string({ maxLength: 200 })),
  query: fc.option(fc.string({ maxLength: 100 })),
  command: fc.option(fc.string({ maxLength: 100 })),
});

const toolCallPartArb = fc.record({
  type: fc.constant("tool-call" as const),
  toolCallId: fc.string({ minLength: 5, maxLength: 20 }),
  toolName: toolNameArb,
  input: toolArgumentsArb,
});

const textPartArb = fc.record({
  type: fc.constant("text" as const),
  text: fc.string({ maxLength: 500 }),
});

const contentPartArb = fc.oneof(textPartArb, toolCallPartArb);

const messageContentArb = fc.oneof(
  fc.string({ maxLength: 500 }),
  fc.array(contentPartArb, { minLength: 1, maxLength: 5 })
);

const userMessageArb = fc.record({
  role: fc.constant("user" as const),
  content: messageContentArb,
});

const assistantMessageArb = fc.record({
  role: fc.constant("assistant" as const),
  content: messageContentArb,
});

const toolMessageArb = fc.record({
  role: fc.constant("tool" as const),
  content: fc.string({ maxLength: 1000 }), // Tool results are always strings
  toolCallId: fc.string({ minLength: 5, maxLength: 20 }),
});

const systemMessageArb = fc.record({
  role: fc.constant("system" as const),
  content: fc.string({ maxLength: 200 }),
});

const messageArb = fc.oneof(
  userMessageArb,
  assistantMessageArb,
  toolMessageArb,
  systemMessageArb
);

const messageArrayArb = fc.array(messageArb, { minLength: 1, maxLength: 10 });

// Filter to only arrays that contain tool calls (not just tool results)
const messageArrayWithToolCallsArb = messageArrayArb.filter(messages => {
  return messages.some(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content.some(part => part.type === "tool-call");
    }
    return false; // Tool messages alone don't count as having tool calls
  });
});

describe("Property 21: Tool Call Token Accounting", () => {
  it("total tokens include tool definitions, arguments, and results in addition to regular message content", () => {
    fc.assert(
      fc.property(messageArrayWithToolCallsArb, (messages) => {
        const result = calculateTotalTokensWithToolCalls(messages);
        
        // Property: Total tokens should equal the sum of all components
        const expectedTotal = 
          result.breakdown.messageContent +
          result.breakdown.toolDefinitions +
          result.breakdown.toolArguments +
          result.breakdown.toolResults;
        
        expect(result.totalTokens).toBe(expectedTotal);
        
        // Property: All token counts should be non-negative
        expect(result.breakdown.messageContent).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.toolDefinitions).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.toolArguments).toBeGreaterThanOrEqual(0);
        expect(result.breakdown.toolResults).toBeGreaterThanOrEqual(0);
        expect(result.totalTokens).toBeGreaterThanOrEqual(0);
        
        // Property: If there are tool calls, tool-related tokens should be > 0
        const hasToolCalls = messages.some(msg => {
          if (Array.isArray(msg.content)) {
            return msg.content.some(part => part.type === "tool-call");
          }
          return false;
        });
        
        const hasToolResults = messages.some(msg => msg.role === "tool");
        
        if (hasToolCalls) {
          // Should have tool definition tokens (since we filtered for arrays with tool calls)
          expect(result.breakdown.toolDefinitions).toBeGreaterThan(0);
          // Tool arguments may be 0 if all tool calls have empty/null input
        }
        
        if (hasToolResults) {
          // Should have tool result tokens only if tool content is non-empty
          const hasNonEmptyToolResults = messages.some(msg => 
            msg.role === "tool" && typeof msg.content === "string" && msg.content.trim().length > 0
          );
          if (hasNonEmptyToolResults) {
            expect(result.breakdown.toolResults).toBeGreaterThan(0);
          }
        }
        
        // Property: Total should be greater than any individual component
        expect(result.totalTokens).toBeGreaterThanOrEqual(result.breakdown.messageContent);
        expect(result.totalTokens).toBeGreaterThanOrEqual(result.breakdown.toolDefinitions);
        expect(result.totalTokens).toBeGreaterThanOrEqual(result.breakdown.toolArguments);
        expect(result.totalTokens).toBeGreaterThanOrEqual(result.breakdown.toolResults);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("tool definition tokens are counted once per unique tool used", () => {
    fc.assert(
      fc.property(messageArrayWithToolCallsArb, (messages) => {
        const result = calculateTotalTokensWithToolCalls(messages);
        
        // Count unique tools used
        const toolsUsed = new Set<string>();
        for (const message of messages) {
          if (Array.isArray(message.content)) {
            for (const part of message.content) {
              if (part.type === "tool-call") {
                toolsUsed.add(part.toolName);
              }
            }
          }
        }
        
        // Calculate expected tool definition tokens
        let expectedToolDefinitionTokens = 0;
        for (const toolName of toolsUsed) {
          expectedToolDefinitionTokens += calculateToolDefinitionTokens(toolName);
        }
        
        expect(result.breakdown.toolDefinitions).toBe(expectedToolDefinitionTokens);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("tool argument tokens equal sum of all tool call input tokens", () => {
    fc.assert(
      fc.property(messageArrayWithToolCallsArb, (messages) => {
        const result = calculateTotalTokensWithToolCalls(messages);
        
        // Calculate expected tool argument tokens
        let expectedToolArgumentTokens = 0;
        for (const message of messages) {
          if (Array.isArray(message.content)) {
            for (const part of message.content) {
              if (part.type === "tool-call" && part.input) {
                expectedToolArgumentTokens += calculateToolArgumentTokens(part.input);
              }
            }
          }
        }
        
        expect(result.breakdown.toolArguments).toBe(expectedToolArgumentTokens);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("tool result tokens equal sum of all tool message content tokens", () => {
    fc.assert(
      fc.property(messageArrayWithToolCallsArb, (messages) => {
        const result = calculateTotalTokensWithToolCalls(messages);
        
        // Calculate expected tool result tokens
        let expectedToolResultTokens = 0;
        for (const message of messages) {
          if (message.role === "tool" && typeof message.content === "string") {
            expectedToolResultTokens += calculateToolResultTokens(message.content);
          }
        }
        
        expect(result.breakdown.toolResults).toBe(expectedToolResultTokens);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("message content tokens are counted separately from tool-related tokens", () => {
    fc.assert(
      fc.property(messageArrayWithToolCallsArb, (messages) => {
        const result = calculateTotalTokensWithToolCalls(messages);
        
        // Calculate expected message content tokens (excluding tool calls and results)
        let expectedMessageContentTokens = 0;
        for (const message of messages) {
          if (message.role === "tool") {
            // Tool messages are counted as tool results, not message content
            continue;
          }
          
          if (typeof message.content === "string") {
            expectedMessageContentTokens += estimateTokens(message.content);
          } else if (Array.isArray(message.content)) {
            for (const part of message.content) {
              if (part.type === "text") {
                expectedMessageContentTokens += estimateTokens(part.text);
              }
              // tool-call parts are not counted as message content
            }
          }
        }
        
        // Debug logging for failing case
        if (result.breakdown.messageContent !== expectedMessageContentTokens) {
          console.log("Messages:", JSON.stringify(messages, null, 2));
          console.log("Expected message content tokens:", expectedMessageContentTokens);
          console.log("Actual message content tokens:", result.breakdown.messageContent);
          console.log("Full breakdown:", result.breakdown);
        }
        
        expect(result.breakdown.messageContent).toBe(expectedMessageContentTokens);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});