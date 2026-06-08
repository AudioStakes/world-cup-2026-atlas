# Agent Workflow

## Overview

Use dedicated skills for agent-instruction refactors and for any code changes that happen during that work.

## Rules

- When refactoring `AGENTS.md`, `CLAUDE.md`, or related agent-instruction docs, use `$agent-md-refactor`.
- Keep the root agent file minimal and move topic-specific guidance into linked docs when that improves progressive disclosure.
- If that refactor also requires repository code or test changes, use `$tdd` for those code changes.
- Use `$tdd` for changes to important repository behavior that already has automated test coverage, including hook code such as `.codex/hooks/stop_gate.mjs`.
- Apply `$tdd` as red-green-refactor through public behavior tests instead of batching tests and implementation separately.
