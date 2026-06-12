export const EXPLORER_MAP_VIEWBOX = {
  minX: 455,
  minY: 260,
  width: 840,
  height: 720,
} as const;

export type ExplorerMapViewBox = typeof EXPLORER_MAP_VIEWBOX;

export const EXPLORER_MAP_DISPLAY_VIEWBOX: ExplorerMapViewBox = {
  minX: 485,
  minY: 282,
  width: 790,
  height: 678,
} as const;

export function isInsideExplorerMapViewBox(
  point: { readonly x: number; readonly y: number },
  viewBox: ExplorerMapViewBox = EXPLORER_MAP_VIEWBOX,
): boolean {
  return (
    point.x >= viewBox.minX &&
    point.x <= viewBox.minX + viewBox.width &&
    point.y >= viewBox.minY &&
    point.y <= viewBox.minY + viewBox.height
  );
}
