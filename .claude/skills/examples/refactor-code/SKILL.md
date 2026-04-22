---
name: examples:refactor-code
description: Refactor code to improve readability, maintainability, or performance while preserving behavior.
---

# Refactor Code

Refactor code to improve readability, maintainability, or performance while preserving behavior.

## Instructions

1. **Understand the current code:**
   - Ask the user which code to refactor and why
   - Read and understand the existing implementation
   - Identify the current behavior that must be preserved
   - Check if there are existing tests

2. **Identify refactoring opportunities:**
   - **Code duplication:** Extract common logic into functions
   - **Long functions:** Break into smaller, focused functions
   - **Complex conditionals:** Simplify or extract into named functions
   - **Magic numbers/strings:** Replace with named constants
   - **Poor naming:** Rename variables/functions for clarity
   - **Tight coupling:** Introduce abstractions or dependency injection
   - **Performance issues:** Optimize algorithms or data structures

3. **Plan the refactoring:**
   - Decide on the refactoring approach
   - Identify what will change and what will stay the same
   - Consider backward compatibility if needed
   - Plan incremental steps if it's a large refactoring

4. **Perform the refactoring:**
   - Make changes incrementally
   - Preserve existing behavior (no functional changes)
   - Update variable/function names for clarity
   - Extract reusable logic
   - Simplify complex expressions
   - Add comments where helpful

5. **Verify behavior is preserved:**
   - Run existing tests to ensure they still pass
   - If no tests exist, add tests before refactoring
   - Manually verify critical functionality
   - Check for any unintended side effects

6. **Clean up:**
   - Remove dead code
   - Update documentation and comments
   - Ensure consistent formatting
   - Run linting and type-checking
