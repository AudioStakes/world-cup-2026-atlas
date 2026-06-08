# Full-viewport app shell layout

The explorer now uses a full-viewport app shell layout.

## Goal

The page itself should not scroll vertically. The whole SPA should fit inside the viewport:

```txt
header
left explorer panel | map panel
```

The app shell owns the viewport height. Internal content areas own their own scrolling.

## Files

```txt
src/full-viewport-app-shell.css
src/main.tsx
```

`full-viewport-app-shell.css` is imported after the existing CSS files so it can safely override layout sizing without rewriting the whole stylesheet.

## Layout policy

```txt
html / body / #app
  height: 100%
  overflow: hidden

.atlas-shell
  height: 100dvh
  overflow: hidden

.atlas-body
  remaining app workspace
  overflow: hidden

.explore-panel
  fixed within viewport
  internal sections scroll

.map-panel
  fixed within viewport
  map is clipped/contained inside the panel
```

## Why a separate CSS file

The current stylesheet is large and contains visual styling plus layout styling. A separate override file keeps this migration small and reversible while we tune the app-shell behavior.
