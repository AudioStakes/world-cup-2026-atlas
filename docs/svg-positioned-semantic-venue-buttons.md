# SVG-positioned semantic venue buttons

Venue markers remain inside the SVG coordinate system but now use real semantic buttons.

## Why

`<g role="button">` caused two problems:

- Biome a11y recommends using a real `<button>`
- Playwright click targeting was unstable for SVG groups

## New approach

Each marker is rendered as:

```txt
<foreignObject x/y in SVG viewBox coordinates>
  <button>
```

This keeps marker placement tied to the same SVG viewBox as the map while preserving native button behavior.

## Benefits

- map and markers scale together
- `getByRole("button")` works
- native click and keyboard behavior
- no ARIA role emulation
