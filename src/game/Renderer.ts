import type { Cell } from './Board';
import { cellRect, type Rect } from './geometry';

export type Layout = {
  originX: number;
  originY: number;
  cellSize: number;
  cols: number;
  rows: number;
};

export class Renderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly apple: HTMLImageElement
  ) {}

  clear(cssWidth: number, cssHeight: number): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#1a1f2e';
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }

  drawGrid(board: Cell[][], layout: Layout): void {
    const { ctx } = this;

    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const cell = board[r]![c];
        if (!cell) continue;

        const rect = cellRect(c, r, layout.originX, layout.originY, layout.cellSize);
        const pad = Math.max(1, Math.floor(layout.cellSize * 0.06));
        const innerW = rect.right - rect.left - pad * 2;
        const innerH = rect.bottom - rect.top - pad * 2;

        ctx.save();

        if (this.apple.complete && this.apple.naturalWidth > 0) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(this.apple, rect.left + pad, rect.top + pad, innerW, innerH);
        } else {
          ctx.fillStyle = '#c62828';
          ctx.fillRect(rect.left + pad, rect.top + pad, innerW, innerH);
        }

        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,0.65)';
        ctx.lineWidth = Math.max(2, layout.cellSize * 0.08);
        ctx.font = `bold ${Math.floor(layout.cellSize * 0.42)}px system-ui, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        ctx.strokeText(String(cell.value), cx, cy);
        ctx.fillText(String(cell.value), cx, cy);
        ctx.restore();
      }
    }
  }

  drawSelection(sel: Rect | null, valid: boolean): void {
    if (!sel) return;
    const { ctx } = this;
    const w = sel.right - sel.left;
    const h = sel.bottom - sel.top;
    if (w < 2 || h < 2) return;

    ctx.save();
    ctx.fillStyle = valid ? 'rgba(229, 57, 53, 0.28)' : 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(sel.left, sel.top, w, h);
    ctx.strokeStyle = valid ? '#e53935' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash(valid ? [] : [6, 4]);
    ctx.strokeRect(sel.left + 0.5, sel.top + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  /** Diagonal drag guide from pointer down to current position (drawn on top of the selection box). */
  drawDragLine(x0: number, y0: number, x1: number, y1: number, valid: boolean): void {
    const dx = x1 - x0;
    const dy = y1 - y0;
    if (dx * dx + dy * dy < 9) return;

    const { ctx } = this;
    const glow = valid ? 'rgba(255, 235, 59, 1)' : 'rgba(255, 255, 255, 0.95)';
    const core = valid ? '#b71c1c' : '#37474f';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = glow;
    ctx.lineWidth = 10;
    ctx.shadowColor = valid ? '#ffeb3b' : '#e3f2fd';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = core;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    const r = 6;
    ctx.lineWidth = 2;
    ctx.strokeStyle = glow;
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
    ] as const) {
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  getLayout(canvasCssW: number, canvasCssH: number, cols: number, rows: number): Layout {
    const margin = 8;
    const innerW = canvasCssW - margin * 2;
    const innerH = canvasCssH - margin * 2;
    const cellSize = Math.floor(Math.min(innerW / cols, innerH / rows));
    const boardW = cellSize * cols;
    const boardH = cellSize * rows;
    const originX = Math.floor((canvasCssW - boardW) / 2);
    const originY = Math.floor((canvasCssH - boardH) / 2);
    return { originX, originY, cellSize, cols, rows };
  }
}
