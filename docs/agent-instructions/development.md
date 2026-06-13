# Development

## Product Decisions

- Groups & Teams is the primary country and group selection surface.
- Venue selection happens through map pins and result context.
- URL query parameters represent shareable explorer state.
- Do not reintroduce Active Filters chips, a separate Country selector, or selection notice text.
- Do not add a search form to the explorer.
- Do not show raw URL state or a header-level Clear button.

## Visual Change Scope

- For visual polish tasks, prefer CSS-only changes unless behavior changes are required.
- Do not change tournament data, Natural Earth map data, projection logic, or venue coordinates
  during visual-only tasks.
