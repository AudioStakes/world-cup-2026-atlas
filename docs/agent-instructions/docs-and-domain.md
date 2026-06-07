# Docs and Domain

## Overview

Use repository documentation to preserve product vocabulary, UX decisions, and architectural decisions.

## Rules

- Record durable architecture decisions as ADRs when they would be expensive to reverse.
- Document new shared domain terms when they become visible in code, tests, or documentation.
- Keep terminology consistent across data, query, ViewModel, and UI layers.

## Current Domain Language

- Group
- Team
- Venue
- Match Date
- Explorer Query
- Explorer ViewModel
- Route Visualization
- Selection State

## When To Add Docs

- A new selection rule affects multiple screens.
- A new ViewModel shape becomes a stable contract.
- A URL parameter becomes part of the public application behavior.
- A data-model decision would be difficult to unwind later.
