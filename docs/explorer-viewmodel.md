# Explorer ViewModel

`queryExplorer()` is the single screen-level query for World Cup 2026 Atlas.

UI components should render the returned `ExplorerViewModel` and should not read raw data or indexes directly.

```txt
AppData + Indexes + ExplorerViewState
  -> queryExplorer
  -> ExplorerViewModel
  -> Header / ExplorePanel / Map UI
```

## Current UI structure

The latest UI does not use separate `FilterPanel` and `DetailPanel` concepts.

Instead, the screen is modeled as:

```txt
Header
ExplorePanel
  - Groups & Teams
  - Date
  - Result
Map
```

## ViewModel shape

```ts
type ExplorerViewModel = {
  viewState: NormalizedExplorerViewState;
  header: ExplorerHeaderViewModel;
  explorePanel: ExplorePanelViewModel;
  map: ExplorerMapViewModel;
};
```

## Result target priority

The result card is derived from selection state with a fixed priority:

```txt
Country > Venue > Date > Group > Empty
```

This keeps shared URLs deterministic and avoids storing interaction history in URL state.

## Availability

Filter-like options use this availability model:

```ts
type FilterOptionAvailability = "available" | "outsideCurrentFilter";
```

Selection is represented separately with `isSelected`.

This keeps visual state clear:

- `isSelected`: the current selection.
- `available`: the option matches the current context, or there is no active selection.
- `outsideCurrentFilter`: the option is outside the current context but remains selectable.

## State transitions

State updates are still handled by `updateExplorerViewState()`.

`queryExplorer()` does not mutate state. It only derives UI-ready data.
