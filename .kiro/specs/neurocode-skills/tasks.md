# Implementation Tasks: NeuroCode Skills

## Overview

This document outlines the implementation tasks for the NeuroCode Skills feature. Tasks are organized by component and should be executed in order.

---

## Phase 1: Core Infrastructure

### Task 1: Create Skill Types and Interfaces

- [x] 1.1 Create `src/skills/types.ts` with core type definitions
  - Define `Skill`, `SkillScope`, `ParsedSkill` interfaces
  - Define `CreateSkillParams`, `UpdateSkillParams`, `SkillFilter` interfaces
  - Define `ValidationError`, `ValidationWarning`, `ValidationResult` interfaces
  - Define `MatchedSkill` interface for context matching

- [x] 1.2 Create `src/skills/index.ts` as public exports

**Requirements:** Req 1 (Skill File Format)

---

### Task 2: Implement Skill Parser

- [x] 2.1 Create `src/skills/skill_parser.ts`
  - Implement `parse(content: string)` method to extract frontmatter and content
  - Implement `serialize(skill: ParsedSkill)` method for round-trip support
  - Handle YAML parsing with proper error messages and line numbers
  - Support for grouped skills with namespace prefix (e.g., `namespace:skill-name`)

- [x] 2.2 Create unit tests in `src/skills/__tests__/skill_parser.test.ts`
  - Test valid SKILL.md parsing
  - Test missing frontmatter
  - Test missing required fields
  - Test round-trip property (parse → serialize → parse)
  - Test grouped skill names with namespace

**Requirements:** Req 1 (Skill File Format)

---

### Task 3: Implement Skill Validator

- [x] 3.1 Create `src/skills/skill_validator.ts`
  - Implement `validate(skill: ParsedSkill)` method
  - Implement `validateName(name: string)` method
  - Implement `validateContent(content: string)` method
  - Define validation rules: `REQUIRED_NAME`, `REQUIRED_DESCRIPTION`, `INVALID_NAME_FORMAT`, `EMPTY_CONTENT`

- [x] 3.2 Create unit tests in `src/skills/__tests__/skill_validator.test.ts`
  - Test each validation rule
  - Test name format validation (lowercase, numbers, hyphens, optional namespace)
  - Test warning vs error distinction

**Requirements:** Req 9 (Skill Validation)

---

### Task 4: Implement Skill Registry

- [x] 4.1 Create `src/skills/skill_registry.ts`
  - Implement singleton pattern for registry
  - Implement `discoverAndRegister()` to scan skill directories
  - Implement `register(skillPath, scope)` to register a skill
  - Implement `unregister(name)` to remove a skill
  - Implement `get(name)` to retrieve a skill
  - Implement `list(filter?)` to list all skills
  - Handle workspace-level override of user-level skills

- [x] 4.2 Create unit tests in `src/skills/__tests__/skill_registry.test.ts`
  - Test skill registration and lookup
  - Test workspace override of user-level skills
  - Test skill discovery from file system

**Requirements:** Req 2 (Skill Discovery and Registration)

---

## Phase 2: IPC Layer

### Task 5: Define IPC Contracts

- [x] 5.1 Create `src/ipc/types/skills.ts`
  - Define Zod schemas for all skill-related types
  - Define contracts: `list`, `get`, `create`, `update`, `delete`, `execute`, `validate`, `discover`
  - Create `skillClient` using `createClient()`

- [x] 5.2 Export from `src/ipc/types/index.ts`

**Requirements:** All requirements (IPC foundation)

---

### Task 6: Implement IPC Handlers

- [x] 6.1 Create `src/ipc/handlers/skill_handlers.ts`
  - Implement `registerSkillHandlers()` function
  - Implement handlers for all contracts using `createTypedHandler()`
  - Use `DyadError` with appropriate `DyadErrorKind` for errors

- [x] 6.2 Register handlers in `src/ipc/ipc_host.ts`

**Requirements:** All requirements (IPC implementation)

---

### Task 7: Add Query Keys

- [x] 7.1 Add skill query keys to `src/lib/queryKeys.ts`
  - Add `skills.all` base key
  - Add `skills.list(filter)` key
  - Add `skills.detail(name)` key

**Requirements:** All requirements (React Query integration)

---

## Phase 3: Skill Management

### Task 8: Implement Skill Manager

- [x] 8.1 Create `src/skills/skill_manager.ts`
  - Implement `create(params)` to create a new skill directory and SKILL.md
  - Implement `update(name, params)` to update skill content
  - Implement `delete(name)` to remove skill directory
  - Implement `export(name)` to create portable archive

- [x] 8.2 Create unit tests in `src/skills/__tests__/skill_manager.test.ts`
  - Test skill creation with template generation
  - Test skill update operations
  - Test skill deletion
  - Test export functionality

**Requirements:** Req 5 (Skill Creation), Req 6 (Skill Management), Req 8 (Skill Sharing)

---

### Task 9: Implement Context Matcher

- [x] 9.1 Create `src/skills/context_matcher.ts`
  - Implement `match(context: string, skills: Skill[])` method
  - Implement keyword extraction and matching algorithm
  - Implement relevance scoring

- [x] 9.2 Create unit tests in `src/skills/__tests__/context_matcher.test.ts`
  - Test matching with various user messages
  - Test relevance ranking
  - Test threshold filtering

**Requirements:** Req 4 (Automatic Skill Loading)

---

## Phase 4: UI Components

### Task 10: Create Skill List Component

- [x] 10.1 Create `src/components/skills/SkillList.tsx`
  - Display all registered skills with names and descriptions
  - Support filtering by scope and namespace
  - Show grouped skills in hierarchical structure
  - Add actions: edit, delete, invoke

- [x] 10.2 Create `src/components/skills/__tests__/SkillList.test.tsx`

**Requirements:** Req 6 (Skill Management), Req 7 (Grouped Skills)

---

### Task 11: Create Skill Editor Component

- [x] 11.1 Create `src/components/skills/SkillEditor.tsx`
  - Edit skill content with markdown editor
  - Edit frontmatter fields (name, description)
  - Real-time validation feedback
  - Save and cancel actions

- [x] 11.2 Create `src/components/skills/__tests__/SkillEditor.test.tsx`

**Requirements:** Req 6 (Skill Management), Req 9 (Skill Validation)

---

### Task 12: Create Skill Creator Component

- [x] 12.1 Create `src/components/skills/SkillCreator.tsx`
  - Form for skill name and description
  - Generate SKILL.md template
  - Choose scope (user vs workspace)
  - Create skill directory

- [x] 12.2 Create `src/components/skills/__tests__/SkillCreator.test.tsx`

**Requirements:** Req 5 (Skill Creation Workflow)

---

### Task 13: Create Skill Matcher UI Component

- [x] 13.1 Create `src/components/skills/SkillMatcher.tsx`
  - Display automatically matched skills
  - Allow user to accept or decline
  - Show relevance score and reason

- [x] 13.2 Create `src/components/skills/__tests__/SkillMatcher.test.tsx`

**Requirements:** Req 4 (Automatic Skill Loading)

---

## Phase 5: Integration

### Task 14: Integrate Slash Command Handler

- [x] 14.1 Modify chat input component to detect `/skill-name` commands
- [x] 14.2 Implement command parsing with argument extraction
- [x] 14.3 Display error for unknown skills with available skills list
- [x] 14.4 Load skill content into context when invoked

**Requirements:** Req 3 (Skill Invocation via Slash Command)

---

### Task 15: Integrate Automatic Skill Loading

- [x] 15.1 Hook into message submission to analyze context
- [x] 15.2 Call context matcher to find relevant skills
- [x] 15.3 Display suggestions to user
- [x] 15.4 Handle user acceptance/rejection

**Requirements:** Req 4 (Automatic Skill Loading)

---

### Task 16: Initialize Skills on Startup

- [x] 16.1 Call `discoverAndRegister()` during app initialization
- [x] 16.2 Watch for file system changes in skill directories (optional)
- [x] 16.3 Handle errors gracefully during discovery

**Requirements:** Req 2 (Skill Discovery and Registration)

---

## Phase 6: Testing

### Task 17: Create E2E Tests

- [x] 17.1 Create `e2e-tests/skills.spec.ts`
  - Test skill creation flow
  - Test skill invocation via slash command
  - Test skill management (list, edit, delete)
  - Test automatic skill loading suggestions
  - Test grouped skills

**Requirements:** All requirements

---

### Task 18: Create Integration Tests

- [x] 18.1 Create `src/skills/__tests__/integration.test.ts`
  - Test full workflow: create → discover → invoke
  - Test IPC handler integration
  - Test file system operations

**Requirements:** All requirements

---

## Phase 7: Documentation

### Task 19: Create Skill Documentation

- [x] 19.1 Create help documentation for skills feature
- [x] 19.2 Add in-app help for skill format and usage
- [x] 19.3 Create example skills for common workflows

**Requirements:** Req 10 (Skill Documentation)

---

## Task Dependencies

```
Task 1 (Types) → Task 2 (Parser) → Task 3 (Validator) → Task 4 (Registry)
                                    ↓
                              Task 5 (IPC Contracts) → Task 6 (IPC Handlers)
                                    ↓
                              Task 7 (Query Keys)
                                    ↓
Task 8 (Manager) ─────────────────────────────────────────┘
Task 9 (Context Matcher)
        ↓
Task 10-13 (UI Components)
        ↓
Task 14-16 (Integration)
        ↓
Task 17-18 (Testing)
        ↓
Task 19 (Documentation)
```

---

## Estimated Effort

| Phase                        | Tasks        | Estimated Time |
| ---------------------------- | ------------ | -------------- |
| Phase 1: Core Infrastructure | 1-4          | 2-3 days       |
| Phase 2: IPC Layer           | 5-7          | 1 day          |
| Phase 3: Skill Management    | 8-9          | 1-2 days       |
| Phase 4: UI Components       | 10-13        | 2-3 days       |
| Phase 5: Integration         | 14-16        | 1-2 days       |
| Phase 6: Testing             | 17-18        | 1-2 days       |
| Phase 7: Documentation       | 19           | 0.5 days       |
| **Total**                    | **19 tasks** | **8-13 days**  |
