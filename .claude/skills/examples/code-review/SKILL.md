---
name: examples:code-review
description: Perform a thorough code review focusing on correctness, security, and best practices.
---

# Code Review

Perform a thorough code review focusing on correctness, security, and best practices.

## Instructions

1. **Understand the context:**
   - Ask the user which files or PR to review
   - Read the relevant files or diff
   - Understand the purpose of the changes

2. **Check correctness:**
   - Verify logic is sound and handles edge cases
   - Check for potential bugs or race conditions
   - Ensure error handling is appropriate
   - Validate input/output types match expectations

3. **Check security:**
   - Look for potential security vulnerabilities (XSS, injection, etc.)
   - Verify authentication and authorization checks
   - Check for sensitive data exposure
   - Ensure proper input validation and sanitization

4. **Check best practices:**
   - Verify code follows project conventions
   - Check for code duplication
   - Ensure proper naming and documentation
   - Verify tests are included for new functionality

5. **Check performance:**
   - Look for potential performance issues
   - Check for unnecessary re-renders or computations
   - Verify efficient data structures are used

6. **Provide feedback:**
   - Summarize findings in categories (critical, important, minor)
   - Provide specific line references for issues
   - Suggest concrete improvements
   - Highlight what was done well
