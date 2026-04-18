export const COLS = 17;
export const ROWS = 10;

/** Use full board on typical phones; only trim on very narrow widths so cells stay usable. */
export function pickGridSize(cssWidth: number): { cols: number; rows: number } {
  if (cssWidth >= 360) return { cols: COLS, rows: ROWS };
  if (cssWidth >= 320) return { cols: 15, rows: 9 };
  return { cols: 13, rows: 8 };
}

export type Cell = { value: number } | null;

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

export function removeCells(board: Cell[][], cells: { c: number; r: number }[]): void {
  for (const { c, r } of cells) {
    if (r >= 0 && r < board.length && c >= 0 && c < board[r]!.length) {
      board[r]![c] = null;
    }
  }
}
