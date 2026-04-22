---
name: examples:write-tests
description: Write comprehensive unit or integration tests for a given function or component.
---

# Write Tests

Write comprehensive unit or integration tests for a given function or component.

## Instructions

1. **Understand the code:**
   - Ask the user which code needs tests
   - Read and understand the implementation
   - Identify the public API and expected behavior
   - Note any edge cases or error conditions

2. **Determine test strategy:**
   - Decide between unit tests, integration tests, or E2E tests
   - Identify the testing framework being used (Jest, Vitest, Playwright, etc.)
   - Check existing test patterns in the codebase

3. **Write test cases:**
   - **Happy path:** Test normal, expected usage
   - **Edge cases:** Test boundary conditions, empty inputs, large inputs
   - **Error cases:** Test invalid inputs, error handling
   - **State changes:** Test that state updates correctly
   - **Side effects:** Test that side effects occur as expected

4. **Follow testing best practices:**
   - Use descriptive test names that explain what is being tested
   - Arrange-Act-Assert pattern for clarity
   - One assertion per test when possible
   - Use appropriate matchers and assertions
   - Mock external dependencies appropriately
   - Avoid testing implementation details

5. **Ensure coverage:**
   - Cover all code paths
   - Test all public methods/functions
   - Test error boundaries
   - Test async behavior and promises

6. **Run and verify tests:**
   - Run the test suite to ensure tests pass
   - Check test coverage if available
   - Verify tests fail when they should (test the tests)
