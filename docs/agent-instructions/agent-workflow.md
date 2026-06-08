# Agent Workflow

## Overview

Use dedicated skills for agent-instruction refactors and for any code changes that happen during that work.

## Rules

- When refactoring `AGENTS.md`, `CLAUDE.md`, or related agent-instruction docs, use `$agent-md-refactor`.
- Keep the root agent file minimal and move topic-specific guidance into linked docs when that improves progressive disclosure.
- If that refactor also requires repository code or test changes, use `$tdd` for those code changes.
- Apply `$tdd` as red-green-refactor through public behavior tests instead of batching tests and implementation separately.
