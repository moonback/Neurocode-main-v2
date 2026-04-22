# Requirements Document

## Introduction

Smart Context Mode Improvements enhance the AI assistant's ability to select, score, and include relevant files and code snippets when building context for LLM requests. The goal is to improve response quality while reducing unnecessary token usage. This feature introduces improved file selection algorithms, a relevance scoring system, and configurable context strategies (balanced, conservative, deep) that users can choose based on their workflow needs.

## Glossary

- **Context_Manager**: The system component responsible for selecting, scoring, and assembling file content into the LLM context window.
- **Relevance_Score**: A numeric value (0.0–1.0) assigned to a file or code snippet indicating its predicted usefulness for the current request.
- **Context_Strategy**: A named configuration profile that controls how aggressively the Context_Manager includes files. Valid values: `balanced`, `conservative`, `deep`.
- **Token_Budget**: The maximum number of tokens allocated for context content in a single LLM request.
- **File_Selector**: The sub-component of the Context_Manager that identifies candidate files for inclusion.
- **Scorer**: The sub-component of the Context_Manager that computes Relevance_Scores for candidate files.
- **Context_Window**: The total token capacity available for a single LLM request, including system prompt, context, and user message.
- **Active_File**: The file currently open and focused in the editor.
- **Workspace**: The root directory of the user's project.

---

## Requirements

### Requirement 1: Improved File Selection

**User Story:** As a developer, I want the assistant to automatically select the most relevant files for my current task, so that responses are accurate without me manually specifying context.

#### Acceptance Criteria

1. WHEN a user submits a request, THE File_Selector SHALL identify candidate files by analyzing import graphs, symbol references, and file name similarity relative to the Active_File.
2. WHEN the Active_File imports or is imported by other files in the Workspace, THE File_Selector SHALL include those directly related files as high-priority candidates.
3. WHEN no Active_File is present, THE File_Selector SHALL use the user's request text to identify candidate files via keyword and symbol matching.
4. THE File_Selector SHALL complete candidate file identification within 500ms for Workspaces containing up to 10,000 files.
5. IF the File_Selector encounters a file it cannot read (e.g., binary, permission denied), THEN THE File_Selector SHALL skip that file and continue processing remaining candidates.

---

### Requirement 2: Relevance Scoring

**User Story:** As a developer, I want the assistant to prioritize the most relevant files, so that the context window is used efficiently and responses stay focused.

#### Acceptance Criteria

1. THE Scorer SHALL assign a Relevance_Score between 0.0 and 1.0 to each candidate file identified by the File_Selector.
2. WHEN computing a Relevance_Score, THE Scorer SHALL consider: direct import relationships, symbol overlap with the user's request, recency of file modification, and file path proximity to the Active_File.
3. THE Context_Manager SHALL include candidate files in descending order of Relevance_Score until the Token_Budget is reached.
4. WHEN two candidate files have equal Relevance_Scores, THE Context_Manager SHALL prefer the file with the more recent modification timestamp.
5. THE Scorer SHALL produce Relevance_Scores that are deterministic for identical inputs, so that context selection is reproducible.

---

### Requirement 3: Reduced Token Usage Without Quality Loss

**User Story:** As a developer, I want the assistant to use tokens efficiently, so that I can work with larger codebases without hitting context limits.

#### Acceptance Criteria

1. THE Context_Manager SHALL truncate low-scoring file content to include only the most relevant sections (e.g., function signatures, class definitions, and surrounding lines) when the Token_Budget would otherwise be exceeded.
2. WHEN a file's Relevance_Score is below 0.3, THE Context_Manager SHALL include only its top-level declarations rather than full file content.
3. THE Context_Manager SHALL never exceed the Token_Budget when assembling context for a request.
4. WHEN context is truncated, THE Context_Manager SHALL insert a comment marker indicating the omission so the LLM is aware content was abbreviated.
5. THE Context_Manager SHALL track and expose the total token count used for context in each request for observability purposes.

---

### Requirement 4: Configurable Context Strategies

**User Story:** As a developer, I want to choose a context strategy that matches my workflow, so that I can trade off between speed, token cost, and response depth.

#### Acceptance Criteria

1. THE Context_Manager SHALL support three Context_Strategy values: `balanced`, `conservative`, and `deep`.
2. WHILE the `conservative` strategy is active, THE Context_Manager SHALL limit context to the Active_File and files with a Relevance_Score of 0.7 or higher, using at most 25% of the Token_Budget for context.
3. WHILE the `balanced` strategy is active, THE Context_Manager SHALL include files with a Relevance_Score of 0.4 or higher, using at most 50% of the Token_Budget for context.
4. WHILE the `deep` strategy is active, THE Context_Manager SHALL include all files with a Relevance_Score above 0.1, using at most 80% of the Token_Budget for context.
5. WHEN a user changes the Context_Strategy, THE Context_Manager SHALL apply the new strategy starting from the next request without requiring a restart.
6. THE Context_Manager SHALL persist the user's selected Context_Strategy across application sessions.
7. IF no Context_Strategy has been configured by the user, THEN THE Context_Manager SHALL default to the `balanced` strategy.

---

### Requirement 5: Strategy Configuration UI

**User Story:** As a developer, I want to configure the context strategy from the settings page, so that I can adjust it without editing configuration files.

#### Acceptance Criteria

1. THE Settings_Page SHALL display a control for selecting the active Context_Strategy with the three options: `balanced`, `conservative`, and `deep`.
2. WHEN a user selects a Context_Strategy in the Settings_Page, THE Settings_Page SHALL immediately persist the selection and display a confirmation.
3. THE Settings_Page SHALL display a brief description of each Context_Strategy option so users understand the trade-offs before selecting.
4. WHEN the Settings_Page is opened, THE Settings_Page SHALL display the currently active Context_Strategy as the selected value.

---

### Requirement 6: Context Observability

**User Story:** As a developer, I want to see which files were included in the context for a given request, so that I can understand and debug the assistant's behavior.

#### Acceptance Criteria

1. WHEN a request is processed, THE Context_Manager SHALL record the list of included files, their Relevance_Scores, and the total token count used.
2. WHEN a user requests context details for a completed interaction, THE Context_Manager SHALL return the recorded file list, scores, and token usage for that interaction.
3. THE Context_Manager SHALL retain observability data for the most recent 50 interactions per session.
4. IF observability data for a requested interaction is not available, THEN THE Context_Manager SHALL return a descriptive message indicating the data is unavailable.
