# Render venue markers inside the map SVG

Venue markers are now rendered inside the same SVG as the Natural Earth base map.

## Why

Previously:

```txt
map background and routes -> SVG viewBox coordinates
venue markers             -> HTML overlay percent coordinates
```

That caused marker drift whenever the SVG was scaled, contained, or letterboxed differently from the overlay.

Now:

```txt
map background
routes
venue markers
```

all use the same SVG viewBox coordinate system.

## Accessibility

SVG marker groups use:

- `role="button"`
- `tabIndex={0}`
- `aria-label`
- Enter / Space keyboard activation
- `<title>` tooltip text

## Styling

Marker SVG styling lives in:

```txt
src/map-venue-marker-svg.css
```

It is imported after the existing map polish CSS.
