# Map route rendering

Country routes are rendered from `ExplorerMapViewModel.routes`.

Design rules:

- route lines sit above the base map and below venue marker labels
- arrows show travel direction
- group-stage routes use solid dark neutral lines
- knockout routes use dashed red-tinted lines
- distance labels use a small pill background for readability
- route summary distances are approximate direct distances derived from venue coordinates, not
  driving or flight distances

Route data should remain derived from matches. Do not store separate route data.
