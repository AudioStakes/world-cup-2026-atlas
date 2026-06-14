# CSS Architecture

The app uses one global CSS entrypoint:

```ts
import "./styles/index.css";
```

`src/styles/index.css` declares the cascade layer order:

```css
@layer reset, tokens, base, layout, components, map, utilities, overrides;
```

Layer ownership:

- `reset`: narrow reset primitives such as box sizing.
- `tokens`: `:root` custom properties, app color/font defaults, shadows, and shared values.
- `base`: document and form-control baselines, including the intentionally global `#app`.
- `layout`: app shell, header, panel layout, and viewport sizing.
- `components`: CSS Modules imported by Preact components.
- `map`: MapView SVG, route, venue marker, and HTML marker-control classes that must stay global for SVG and map interaction.
- `utilities`: truly shared utility classes such as `.visually-hidden`.
- `overrides`: temporary documented overrides only.

Component-owned styles belong in `ComponentName.module.css` beside the component. Module class names use lower camel case, with `root` for the component root and `isSelected`-style names for local state classes. Do not add component-specific selectors to global CSS.

MapView is the exception to the module rule. SVG classes, generated map feature classes, route lines, venue marker labels, and marker overlay controls remain in `src/styles/map.css` because the SVG and tests depend on stable global selectors.

Override files such as `*-polish.css` and `*-override.css` are not allowed. If an override is unavoidable, place it in `src/styles/overrides.css` with a comment that includes the reason, deletion condition, and related issue or PR.

Stylelint enforces the boundary with strict duplicate selector, specificity, `!important`, class naming, layer naming, and custom property rules. Run:

```bash
pnpm lint:css
```

`pnpm verify` includes CSS linting.
