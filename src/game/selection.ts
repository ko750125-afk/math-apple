import type { Cell, CellCoord } from './Board';
import type { Layout } from './Renderer';
import { cellRect, rectsIntersect, type Rect } from './geometry';

/** All live cells whose square intersects the selection rect. */
export function getCellsInSelection(
  board: Cell[][],
  selection: Rect,
  layout: Layout
): CellCoord[] {
  const out: CellCoord[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (!board[r]![c]) continue;
      const cr = cellRect(c, r, layout.originX, layout.originY, layout.cellSize);
      if (rectsIntersect(selection, cr)) out.push({ c, r });
    }
  }
  return out;
}

export function sumSelected(board: Cell[][], cells: CellCoord[]): number {
  let s = 0;
  for (const { c, r } of cells) {
    const cell = board[r]![c];
    if (cell) s += cell.value;
  }
  return s;
}

/** Match sum is 10: points by number of apples cleared. */
export function scoreForMatchAppleCount(count: number): number {
  if (count === 2) return 5;
  if (count === 3) return 10;
  if (count === 4) return 20;
  if (count >= 5) return 50;
  return 0;
}
