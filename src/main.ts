import './style.css';
import appleUrl from '../assets/apple-pixel.png';
import { createBoard, isBoardClear, pickGridSize, removeCells, type Cell } from './game/Board';
import { normalizeRect, rectsIntersect, cellRect, type Rect } from './game/geometry';
import { Renderer } from './game/Renderer';
import { GameAudio } from './game/Sound';

const TIME_LIMIT_SEC = 120;
const LS_AUDIO_VOL = 'mathApple_volume';
const LS_AUDIO_MUTE = 'mathApple_muted';

/** Lets preventDefault() block page scroll while dragging on canvas (mobile). */
const canvasPointerOpts: AddEventListenerOptions = { passive: false };

const T = {
  title: '\uC218\uD559\uB450\uB1CC\uD14C\uC2A4\uD2B8',
  gameStart: '\uAC8C\uC784 \uC2DC\uC791',
  gameStop: '\uAC8C\uC784 \uC911\uC9C0',
  overlayCleared: '\uC804\uCCB4 \uD074\uB9AC\uC5B4',
  msgCleared: (sec: number, score: number) =>
    `\uBAA8\uB4E0 \uC0AC\uACFC\uB97C \uC81C\uAC70\uD588\uC2B5\uB2C8\uB2E4!\n\uCD1D\uC810 ${score}\uC810\n\uAC78\uB9B0 \uC2DC\uAC04: ${sec.toFixed(1)}\uCD08.`,
  overlayOk: '\uD655\uC778',
  ariaBoard: '\uAC8C\uC784 \uBCF4\uB4DC',
  muteBtn: '\uC74C\uC18C\uAC70',
  unmuteBtn: '\uC18C\uB9AC \uCF1C\uAE30',
  volumeAria: '\uBCFC\uB968',
} as const;

/** Time-over copy by final score (high ??low). */
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

type Phase = 'idle' | 'playing' | 'over' | 'cleared';

/** Touch / coarse pointer: no hover ??tap "게임방법" to toggle tooltip. */
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
  const startBtn = document.querySelector<HTMLButtonElement>('#startBtn')!;
  const stopBtn = document.querySelector<HTMLButtonElement>('#stopBtn')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
  canvas.draggable = false;
  const canvasWrap = canvas.parentElement as HTMLElement;
  const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
  const overlayTitle = document.querySelector<HTMLHeadingElement>('#overlayTitle')!;
  const overlayMessage = document.querySelector<HTMLParagraphElement>('#overlayMessage')!;
  const overlayClose = document.querySelector<HTMLButtonElement>('#overlayClose')!;
  const muteBtn = document.querySelector<HTMLButtonElement>('#muteBtn')!;
  const volumeSlider = document.querySelector<HTMLInputElement>('#volumeSlider')!;

  startBtn.textContent = T.gameStart;
  stopBtn.textContent = T.gameStop;
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

  const audioWrap = document.querySelector<HTMLElement>('.audio-controls');
  audioWrap?.setAttribute('aria-label', T.volumeAria);

  function syncMuteButton(): void {
    const m = audio.getMuted();
    muteBtn.setAttribute('aria-pressed', m ? 'true' : 'false');
    muteBtn.textContent = m ? T.unmuteBtn : T.muteBtn;
  }

  function loadAudioPrefs(): void {
    const v = localStorage.getItem(LS_AUDIO_VOL);
    if (v !== null) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) {
        audio.setVolume(Math.max(0, Math.min(1, n)));
        volumeSlider.value = String(Math.round(audio.getVolume() * 100));
      }
    } else {
      audio.setVolume(Number(volumeSlider.value) / 100);
    }
    const m = localStorage.getItem(LS_AUDIO_MUTE);
    if (m === '1') {
      audio.setMuted(true);
    }
    syncMuteButton();
  }

  loadAudioPrefs();

  muteBtn.addEventListener('click', () => {
    void audio.resume();
    audio.toggleMute();
    localStorage.setItem(LS_AUDIO_MUTE, audio.getMuted() ? '1' : '0');
    syncMuteButton();
  });

  volumeSlider.addEventListener('input', () => {
    void audio.resume();
    const v = Number(volumeSlider.value) / 100;
    audio.setVolume(v);
    localStorage.setItem(LS_AUDIO_VOL, String(v));
    if (v > 0 && audio.getMuted()) {
      audio.setMuted(false);
      localStorage.setItem(LS_AUDIO_MUTE, '0');
      syncMuteButton();
    }
  });

  const initialGrid = pickGridSize(window.innerWidth);
  let gridCols = initialGrid.cols;
  let gridRows = initialGrid.rows;
  let board: Cell[][] = createBoard(gridCols, gridRows);
  let score = 0;
  let timeLeft = TIME_LIMIT_SEC;
  let phase: Phase = 'idle';
  let gameStartedAt = 0;
  let timerId: ReturnType<typeof setInterval> | null = null;

  let drag = false;
  let ptrId: number | null = null;
  /** True from canvas touchstart until all touches end (finger may leave canvas while dragging). */
  let canvasTouchSequence = false;
  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = 0;

  function touchTargetIsUiControl(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      Boolean(
        target.closest(
          'button, input, select, textarea, a, .audio-controls, .play-controls, .how-to-wrap'
        )
      )
    );
  }

  function touchTargetIsOverlay(target: EventTarget | null): boolean {
    return target instanceof Element && !overlay.classList.contains('hidden') && overlay.contains(target);
  }

  /** Block page scroll during board drags; allow HUD sliders/buttons. */
  document.addEventListener(
    'touchmove',
    (e) => {
      if (touchTargetIsUiControl(e.target) || touchTargetIsOverlay(e.target)) return;
      if (drag || canvasTouchSequence) e.preventDefault();
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (e.touches.length === 0) canvasTouchSequence = false;
    },
    { capture: true }
  );
  document.addEventListener(
    'touchcancel',
    (e) => {
      if (e.touches.length === 0) canvasTouchSequence = false;
    },
    { capture: true }
  );

  /** iOS/Safari: take over the gesture when the board is touched during play. */
  const blockBoardTouchScroll = (e: TouchEvent): void => {
    if (phase !== 'playing') return;
    canvasTouchSequence = true;
    e.preventDefault();
  };
  canvas.addEventListener('touchstart', blockBoardTouchScroll, canvasPointerOpts);
  canvas.addEventListener('touchmove', blockBoardTouchScroll, canvasPointerOpts);

  /** Desktop: trackpad/wheel scroll while pointer is over the board. */
  document.addEventListener(
    'wheel',
    (e) => {
      if (phase !== 'playing') return;
      const t = e.target;
      if (t instanceof Node && canvasWrap.contains(t)) e.preventDefault();
    },
    { passive: false, capture: true }
  );

  function stopTimer(): void {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function syncPlayButtons(): void {
    const playing = phase === 'playing';
    startBtn.disabled = playing;
    stopBtn.disabled = !playing;
    document.documentElement.classList.toggle('game-playing', playing);
    document.body.classList.toggle('game-playing', playing);
    if (!playing) canvasTouchSequence = false;
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
        syncPlayButtons();
        audio.playTimeUp();
        overlayTitle.textContent = '';
        overlayMessage.textContent = `\uCD1D\uC810 ${score}\uC810\n\n${timeUpGradeLine(score)}`;
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

  /** New board and HUD; timer off until startGame(). */
  function prepareFreshRound(): void {
    stopTimer();
    const { w: cw } = cssSize();
    const g = pickGridSize(cw > 2 ? cw : window.innerWidth);
    gridCols = g.cols;
    gridRows = g.rows;
    board = createBoard(gridCols, gridRows);
    score = 0;
    timeLeft = TIME_LIMIT_SEC;
    phase = 'idle';
    drag = false;
    ptrId = null;
    canvasTouchSequence = false;
    overlay.classList.add('hidden');
    updateHud();
    audio.resetTickMelody();
    syncPlayButtons();
    layoutAndDraw();
  }

  function startGame(): void {
    if (phase === 'playing') return;
    void audio.resume();
    phase = 'playing';
    gameStartedAt = performance.now();
    overlay.classList.add('hidden');
    syncPlayButtons();
    audio.resetTickMelody();
    startTimer();
    layoutAndDraw();
  }

  function stopGame(): void {
    if (phase !== 'playing') return;
    void audio.resume();
    stopTimer();
    phase = 'idle';
    drag = false;
    ptrId = null;
    syncPlayButtons();
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

    const layout = renderer.getLayout(cssW, cssH, gridCols, gridRows);
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

  canvas.addEventListener(
    'pointerdown',
    (e) => {
      if (phase !== 'playing') return;
      void audio.resume();
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* ignore: rare environments block capture */
      }
      ptrId = e.pointerId;
      drag = true;
      const p = canvasPoint(e.clientX, e.clientY);
      x0 = x1 = p.x;
      y0 = y1 = p.y;
      layoutAndDraw();
    },
    canvasPointerOpts
  );

  /** Document: pointer may leave the canvas while dragging; capture is not always reliable. */
  document.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || ptrId !== e.pointerId) return;
      e.preventDefault();
      const p = canvasPoint(e.clientX, e.clientY);
      x1 = p.x;
      y1 = p.y;
      layoutAndDraw();
    },
    canvasPointerOpts
  );

  function endPointer(e: PointerEvent): void {
    if (!drag || ptrId !== e.pointerId) return;
    e.preventDefault();
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
    const { w: cssW, h: cssH } = cssSize();
    const layout = renderer.getLayout(cssW, cssH, gridCols, gridRows);
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
        syncPlayButtons();
        const elapsedSec = (performance.now() - gameStartedAt) / 1000;
        overlayTitle.textContent = T.overlayCleared;
        overlayMessage.textContent = T.msgCleared(elapsedSec, score);
        overlay.classList.remove('hidden');
      }
    } else if (phase === 'playing' && picked.length > 0 && sum !== 10) {
      audio.playWrong();
    }

    drag = false;
    ptrId = null;
    layoutAndDraw();
  }

  document.addEventListener('pointerup', endPointer, canvasPointerOpts);
  document.addEventListener('pointercancel', endPointer, canvasPointerOpts);

  startBtn.addEventListener('click', () => {
    void audio.resume();
    prepareFreshRound();
    startGame();
  });
  stopBtn.addEventListener('click', () => {
    void audio.resume();
    stopGame();
  });
  overlayClose.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (phase === 'over' || phase === 'cleared') {
      phase = 'idle';
      syncPlayButtons();
    }
  });

  let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('resize', () => {
    if (resizeDebounce) clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      const { w: cw } = cssSize();
      const nw = pickGridSize(cw > 2 ? cw : window.innerWidth);
      if (nw.cols !== gridCols || nw.rows !== gridRows) {
        gridCols = nw.cols;
        gridRows = nw.rows;
        board = createBoard(gridCols, gridRows);
        drag = false;
        ptrId = null;
        canvasTouchSequence = false;
        if (phase === 'playing') {
          stopTimer();
          phase = 'idle';
        }
        syncPlayButtons();
      }
      layoutAndDraw();
    }, 150);
  });

  prepareFreshRound();
  requestAnimationFrame(() => layoutAndDraw());
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:16px;color:#c62828">Failed to start: ${String(err)}</p>`;
});
