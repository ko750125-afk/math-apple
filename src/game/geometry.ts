export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export function normalizeRect(x0: number, y0: number, x1: number, y1: number): Rect {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  return { left, top, right, bottom };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export function cellRect(
  col: number,
  row: number,
  originX: number,
  originY: number,
  cellSize: number
): Rect {
  const left = originX + col * cellSize;
  const top = originY + row * cellSize;
  return {
    left,
    top,
    right: left + cellSize,
    bottom: top + cellSize,
  };
}
