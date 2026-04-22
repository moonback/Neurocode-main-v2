---
name: examples:debug-error
description: Debug an error or exception by analyzing stack traces, logs, and relevant code.
---

# Debug Error

Debug an error or exception by analyzing stack traces, logs, and relevant code.

## Instructions

1. **Gather information:**
   - Ask the user to provide the error message and stack trace
   - Request any relevant logs or console output
   - Understand when and how the error occurs

2. **Analyze the stack trace:**
   - Identify the exact line where the error occurred
   - Trace the call stack to understand the execution path
   - Read the relevant source files

3. **Identify the root cause:**
   - Examine the code at the error location
   - Check variable values and state at the point of failure
   - Look for common issues:
     - Null/undefined access
     - Type mismatches
     - Race conditions
     - Missing error handling
     - Incorrect assumptions about data

4. **Reproduce the issue:**
   - Understand the steps to reproduce
   - Identify the minimal reproduction case
   - Check if there are existing tests that should catch this

5. **Propose a fix:**
   - Explain the root cause clearly
   - Suggest one or more solutions
   - Discuss trade-offs of each approach
   - Recommend the best solution with reasoning

6. **Implement the fix:**
   - Make the necessary code changes
   - Add error handling if needed
   - Add or update tests to prevent regression
   - Verify the fix resolves the issue
