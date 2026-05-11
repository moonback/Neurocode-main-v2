# Bugfix Requirements Document

## Introduction

Les petits modèles LLM (modèles de petite taille) ne parviennent pas à appeler correctement les outils disponibles dans l'application NeuroCode en raison de prompts système trop longs et complexes. Les fichiers `src/prompts/system_prompt.ts` et `src/prompts/local_agent_prompt.ts` contiennent des instructions détaillées, de nombreux exemples et des guidelines qui dépassent la capacité de compréhension des petits modèles. Cette situation empêche les utilisateurs d'utiliser efficacement des modèles plus légers et économiques.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a small LLM model receives the current system prompts THEN the system fails to call tools correctly due to prompt complexity

1.2 WHEN a small LLM model processes the lengthy instructions in `system_prompt.ts` and `local_agent_prompt.ts` THEN the system loses context and doesn't understand tool calling instructions

1.3 WHEN a small LLM model attempts to follow the verbose guidelines and examples THEN the system becomes confused and either doesn't call tools or calls them incorrectly

1.4 WHEN a small LLM model encounters multiple nested instruction blocks (role, guidelines, workflows, examples) THEN the system cannot extract the essential tool calling information

### Expected Behavior (Correct)

2.1 WHEN a small LLM model receives optimized system prompts THEN the system SHALL call tools correctly with proper parameters

2.2 WHEN a small LLM model processes simplified and concise instructions THEN the system SHALL understand tool calling requirements without losing context

2.3 WHEN a small LLM model follows streamlined guidelines THEN the system SHALL execute tool calls appropriately for the given task

2.4 WHEN a small LLM model encounters clear, focused instruction blocks THEN the system SHALL extract and apply tool calling information correctly

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a large or advanced LLM model (like Claude, GPT-4, etc.) receives the prompts THEN the system SHALL CONTINUE TO call tools correctly as before

3.2 WHEN any LLM model processes prompts in "build" mode THEN the system SHALL CONTINUE TO generate code using the appropriate tags (`<dyad-write>`, `<dyad-rename>`, etc.)

3.3 WHEN any LLM model processes prompts in "ask" mode THEN the system SHALL CONTINUE TO provide explanations without generating code

3.4 WHEN any LLM model processes prompts in "local-agent" mode (Pro, Basic, or Ask) THEN the system SHALL CONTINUE TO follow the appropriate workflow and tool restrictions

3.5 WHEN any LLM model uses skills system with slash commands THEN the system SHALL CONTINUE TO display and follow skill instructions correctly

3.6 WHEN any LLM model generates responses THEN the system SHALL CONTINUE TO respect language preferences, security guidelines, and formatting rules
