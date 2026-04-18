import './style.css';
import appleUrl from '../assets/apple-pixel.png';
import { COLS, ROWS, createBoard, isBoardClear, removeCells, type Cell } from './game/Board';
import { normalizeRect, rectsIntersect, cellRect, type Rect } from './game/geometry';
import { Renderer } from './game/Renderer';
import { GameAudio } from './game/Sound';

const TIME_LIMIT_SEC = 120;

const T = {
  title: '\uC218\uD559\uB450\uB1CC\uD14C\uC2A4\uD2B8',
  restart: '\uB2E4\uC2DC \uD558\uAE30',
  overlayCleared: '\uC804\uCCB4 \uD074\uB9AC\uC5B4',
  msgCleared: (sec: number) =>
    `\uBAA8\uB4E0 \uC0AC\uACFC\uB97C \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4! \uAC78\uB9B0 \uC2DC\uAC04: ${sec.toFixed(1)}\uCD08.`,
  overlayOk: '\uD655\uC778',
  ariaBoard: '\uAC8C\uC784 \uBCF4\uB4DC',
} as const;

/** Time-over copy by final score (high → low). */
function timeUpGradeLine(score: number): string {
  if (score >= 100) return '\uC640\uC6B0! \uC218\uD559\uCC9C\uC7AC\uB124\uC694';
  if (score >= 90)
    return '\uC7A5\uB798\uD76C\uB9DD\uC744 \uC218\uD559\uC120\uC0DD\uB2D8\uC73C\uB85C \uC815\uD558\uC138\uC694. \uB2F9\uC7A5!!!';
  if (score >= 80) return '\uC774\uC815\uB3C4\uBA74 \uBC18\uC5D0\uC11C 1\uB4F1\uAC10\uC774\uB124\uC694.';
  if (score >= 70)
    return '\uC640\uC6B0! 2\uD559\uB144\uC774 \uC774\uC815\uB3C4\uB77C\uB2C8... \uB180\uB78D\uAD70\uC694!';
  if (score >= 60)
    return '\uAFCD \uC798\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uBC25\uB9CC \uC798 \uBA39\uC73C\uBA74 \uCC38 \uC88B\uACA0\uB124\uC694.';
  if (score >= 50) return '\uC81C\uBC95 \uC218\uD559\uC880 \uD55C\uB2E4\uB294 \uC18C\uB9AC \uB4E3\uACA0\uC5B4\uC694!';
  if (score >= 40) return '\uC774\uC815\uB3C4\uBA74 \uC798\uD558\uB294 \uC218\uC900\uC774\uC5D0\uC694!';
  if (score >= 30) return '\uC74C.... \uC9C0\uC6B0\uC57C \uC815\uC2E0\uCC28\uB9AC\uC790!!';
  if (score >= 20) return '\uC9C0\uC6B0\uC57C... \uACE0\uC9C0\uC6B0!!!! \uC9D1\uC911\uD574! \uC9D1\uC911!!';
  if (score >= 10) return '\uACE0\uC9C0\uC6B0!! \uC624\uB298\uBD80\uB85C \uC720\uD29C\uBE0C\uC2DC\uCCAD\uC740 \uAE08\uC9C0\uB2E4!!!';
  return '\uCC98\uC74C\uC740 \uB2E4 \uADF8\uB798.. \uB2E4\uC2DC\uD55C\uBC88 \uB3C4\uC804\uD574\uBCF4\uC790!';
}

type Phase = 'playing' | 'over' | 'cleared';

/** Touch / coarse pointer: no hover — tap "게임방법" to toggle tooltip. */
function setupTouchHowTo(): void {
  const wrap = document.querySelector<HTMLElement>('.how-to-wrap');
  const trigger = document.querySelector<HTMLElement>('.how-to-trigger');
  if (!wrap || !trigger) return;
  if (!window.matchMedia('(hover: none), (pointer: coarse)').matches) return;

  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-expanded', 'false');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = wrap.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener(
    'click',
    (e) => {
      if (wrap.contains(e.target as Node)) return;
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    },
    true
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function getCellsInSelection(
  board: Cell[][],
  selection: Rect,
  layout: { originX: number; originY: number; cellSize: number; cols: number; rows: number }
): { c: number; r: number }[] {
  const out: { c: number; r: number }[] = [];
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      if (!board[r]![c]) continue;
      const cr = cellRect(c, r, layout.originX, layout.originY, layout.cellSize);
      if (rectsIntersect(selection, cr)) {
        out.push({ c, r });
      }
    }
  }
  return out;
}

function sumSelected(board: Cell[][], cells: { c: number; r: number }[]): number {
  let s = 0;
  for (const { c, r } of cells) {
    const cell = board[r]![c];
    if (cell) s += cell.value;
  }
  return s;
}

/** Sum is 10: points by number of apples in the match. */
function scoreForMatchAppleCount(count: number): number {
  if (count === 2) return 5;
  if (count === 3) return 10;
  if (count === 4) return 20;
  if (count >= 5) return 50;
  return 0;
}

async function main(): Promise<void> {
  document.title = T.title;

  const scoreNum = document.querySelector<HTMLSpanElement>('#scoreNum')!;
  const timeNum = document.querySelector<HTMLSpanElement>('#timeNum')!;
  const restartBtn = document.querySelector<HTMLButtonElement>('#restartBtn')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
  const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
  const overlayTitle = document.querySelector<HTMLHeadingElement>('#overlayTitle')!;
  const overlayMessage = document.querySelector<HTMLParagraphElement>('#overlayMessage')!;
  const overlayClose = document.querySelector<HTMLButtonElement>('#overlayClose')!;

  restartBtn.textContent = T.restart;
  overlayClose.textContent = T.overlayOk;
  canvas.setAttribute('aria-label', T.ariaBoard);
  setupTouchHowTo();

  const apple = await loadImage(appleUrl);
  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('2D context not available');
  const ctx: CanvasRenderingContext2D = ctxRaw;

  const renderer = new Renderer(canvas, ctx, apple);
  const audio = new GameAudio();
  void audio.resume();
  window.addEventListener('pointerdown', () => void audio.resume(), { capture: true });

  let board: Cell[][] = createBoard(COLS, ROWS);
  let score = 0;
  let timeLeft = TIME_LIMIT_SEC;
  let phase: Phase = 'playing';
  let gameStartedAt = performance.now();
  let timerId: ReturnType<typeof setInterval> | null = null;

  let drag = false;
  let ptrId: number | null = null;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer(): void {
    stopTimer();
    timerId = setInterval(() => {
      if (phase !== 'playing') return;
      timeLeft -= 1;
      timeNum.textContent = String(timeLeft);
      if (timeLeft <= 0) {
        timeLeft = 0;
        phase = 'over';
        stopTimer();
        audio.playTimeUp();
        overlayTitle.textContent = '';
        overlayMessage.textContent = timeUpGradeLine(score);
        overlay.classList.remove('hidden');
      } else {
        audio.playTick();
      }
    }, 1000);
  }

  function updateHud(): void {
    scoreNum.textContent = String(score);
    timeNum.textContent = String(timeLeft);
  }

  function newGame(): void {
    stopTimer();
    board = createBoard(COLS, ROWS);
    score = 0;
    timeLeft = TIME_LIMIT_SEC;
    phase = 'playing';
    gameStartedAt = performance.now();
    drag = false;
    ptrId = null;
    overlay.classList.add('hidden');
    updateHud();
    startTimer();
    layoutAndDraw();
  }

  function cssSize(): { w: number; h: number } {
    const rect = canvas.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function layoutAndDraw(): void {
    const { w: cssW, h: cssH } = cssSize();
    if (cssW < 2 || cssH < 2) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const layout = renderer.getLayout(cssW, cssH, COLS, ROWS);
    renderer.clear(cssW, cssH);
    renderer.drawGrid(board, layout);

    if (drag) {
      const sel = normalizeRect(x0, y0, x1, y1);
      const picked = getCellsInSelection(board, sel, layout);
      const valid = picked.length > 0 && sumSelected(board, picked) === 10;
      renderer.drawSelection(sel, valid);
      renderer.drawDragLine(x0, y0, x1, y1, valid);
    }
  }

  function canvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (phase !== 'playing') return;
    void audio.resume();
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    ptrId = e.pointerId;
    drag = true;
    const p = canvasPoint(e.clientX, e.clientY);
    x0 = x1 = p.x;
    y0 = y1 = p.y;
    layoutAndDraw();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!drag || ptrId !== e.pointerId) return;
    e.preventDefault();
    const p = canvasPoint(e.clientX, e.clientY);
    x1 = p.x;
    y1 = p.y;
    layoutAndDraw();
  });

  function endPointer(e: PointerEvent): void {
    if (!drag || ptrId !== e.pointerId) return;
    e.preventDefault();
    canvas.releasePointerCapture(e.pointerId);
    const { w: cssW, h: cssH } = cssSize();
    const layout = renderer.getLayout(cssW, cssH, COLS, ROWS);
    const sel = normalizeRect(x0, y0, x1, y1);
    const picked = getCellsInSelection(board, sel, layout);
    const sum = sumSelected(board, picked);

    if (phase === 'playing' && picked.length > 0 && sum === 10) {
      audio.playCorrect();
      score += scoreForMatchAppleCount(picked.length);
      removeCells(board, picked);
      updateHud();
      if (isBoardClear(board)) {
        phase = 'cleared';
        stopTimer();
        const elapsedSec = (performance.now() - gameStartedAt) / 1000;
        overlayTitle.textContent = T.overlayCleared;
        overlayMessage.textContent = T.msgCleared(elapsedSec);
        overlay.classList.remove('hidden');
      }
    } else if (phase === 'playing' && picked.length > 0 && sum !== 10) {
      audio.playWrong();
    }

    drag = false;
    ptrId = null;
    layoutAndDraw();
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  restartBtn.addEventListener('click', () => {
    void audio.resume();
    newGame();
  });
  overlayClose.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (phase === 'over' || phase === 'cleared') {
      newGame();
    }
  });

  window.addEventListener('resize', () => layoutAndDraw());

  updateHud();
  startTimer();
  requestAnimationFrame(() => layoutAndDraw());
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:16px;color:#c62828">Failed to start: ${String(err)}</p>`;
});
