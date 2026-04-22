---
name: examples:optimize-performance
description: Identify and fix performance bottlenecks in code or application.
---

# Optimize Performance

Identify and fix performance bottlenecks in code or application.

## Instructions

1. **Identify the performance issue:**
   - Ask the user to describe the performance problem
   - Understand what is slow (startup, runtime, specific operation)
   - Get baseline metrics if available
   - Identify the scope (frontend, backend, database, etc.)

2. **Profile and measure:**
   - Use appropriate profiling tools:
     - Browser DevTools for frontend
     - Node.js profiler for backend
     - Database query analyzers
   - Identify hot paths and bottlenecks
   - Measure current performance with concrete metrics

3. **Analyze the bottleneck:**
   - Review the slow code paths
   - Look for common issues:
     - Unnecessary re-renders (React)
     - N+1 queries (database)
     - Inefficient algorithms (O(n²) instead of O(n))
     - Large bundle sizes
     - Blocking operations
     - Memory leaks
     - Unnecessary computations

4. **Propose optimizations:**
   - Suggest specific improvements:
     - Memoization or caching
     - Algorithm improvements
     - Lazy loading or code splitting
     - Database query optimization
     - Debouncing or throttling
     - Web Workers for heavy computation
     - Virtual scrolling for large lists
   - Explain trade-offs of each approach

5. **Implement optimizations:**
   - Make targeted changes
   - Preserve correctness (add tests if needed)
   - Implement one optimization at a time
   - Measure impact after each change

6. **Verify improvements:**
   - Re-run profiling to measure improvement
   - Compare before/after metrics
   - Ensure no regressions in functionality
   - Document the optimization and results
