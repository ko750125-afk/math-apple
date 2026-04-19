/** \uBAA8\uBC14\uC77C(css768px \uBBF8\uB9CC): 10\u00D715. \uB370\uC2A4\uD06C\uD1B1: 15\u00D710. */
const LAYOUT_BREAKPOINT_CSS_PX = 768;

export function pickGridSize(cssWidth: number): { cols: number; rows: number } {
  if (cssWidth < LAYOUT_BREAKPOINT_CSS_PX) return { cols: 10, rows: 15 };
  return { cols: 15, rows: 10 };
}

export type Cell = { value: number } | null;

/** Column/row index of a single board cell. */
export type CellCoord = { c: number; r: number };

export function createBoard(cols: number, rows: number): Cell[][] {
  let board: Cell[][];
  let sum: number;
  let attempts = 0;
  const maxAttempts = 500;

  do {
    board = [];
    sum = 0;
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        const value = 1 + Math.floor(Math.random() * 9);
        row.push({ value });
        sum += value;
      }
      board.push(row);
    }
    attempts++;
  } while (sum % 10 === 1 && attempts < maxAttempts);

  if (sum % 10 === 1) {
    const last = board[rows - 1]![cols - 1]!;
    for (let v = 1; v <= 9; v++) {
      if (v !== last.value && (sum - last.value + v) % 10 !== 1) {
        board[rows - 1]![cols - 1] = { value: v };
        break;
      }
    }
  }

  return board;
}

export function isBoardClear(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) return false;
    }
  }
  return true;
}

export function removeCells(board: Cell[][], cells: CellCoord[]): void {
  for (const { c, r } of cells) {
    if (r >= 0 && r < board.length && c >= 0 && c < board[r]!.length) {
      board[r]![c] = null;
    }
  }
}
