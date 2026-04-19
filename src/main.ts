import './style.css';
import appleUrl from '../assets/apple-pixel.png';
import { createBoard, isBoardClear, pickGridSize, removeCells, type Cell } from './game/Board';
import { normalizeRect } from './game/geometry';
import { Renderer } from './game/Renderer';
import {
  getCellsInSelection,
  scoreForMatchAppleCount,
  sumSelected,
} from './game/selection';
import { GameAudio } from './game/Sound';
import { T, timeUpGradeLine } from './i18n';

const TIME_LIMIT_SEC = 120;
const LS_AUDIO_VOL = 'mathApple_volume';
const LS_AUDIO_MUTE = 'mathApple_muted';

/** Lets preventDefault() block page scroll while dragging on canvas (mobile). */
const canvasPointerOpts: AddEventListenerOptions = { passive: false };

type Phase = 'idle' | 'playing' | 'over' | 'cleared';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function main(): Promise<void> {
  document.title = T.title;

  const scoreNum = document.querySelector<HTMLSpanElement>('#scoreNum')!;
  const timeNum = document.querySelector<HTMLSpanElement>('#timeNum')!;
  const canvas = document.querySelector<HTMLCanvasElement>('#gameCanvas')!;
  canvas.draggable = false;
  const canvasWrap = canvas.parentElement as HTMLElement;
  const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
  const overlayTitle = document.querySelector<HTMLHeadingElement>('#overlayTitle')!;
  const overlayMessage = document.querySelector<HTMLParagraphElement>('#overlayMessage')!;
  const overlayClose = document.querySelector<HTMLButtonElement>('#overlayClose')!;
  const muteBtn = document.querySelector<HTMLButtonElement>('#muteBtn')!;
  const volumeSlider = document.querySelector<HTMLInputElement>('#volumeSlider')!;

  overlayClose.textContent = T.overlayOk;
  canvas.setAttribute('aria-label', T.ariaBoard);

  const apple = await loadImage(appleUrl);
  const ctxRaw = canvas.getContext('2d');
  if (!ctxRaw) throw new Error('2D context not available');
  const ctx: CanvasRenderingContext2D = ctxRaw;

  const renderer = new Renderer(ctx, apple);
  const audio = new GameAudio();
  void audio.resume();
  window.addEventListener('pointerdown', () => void audio.resume(), { capture: true });

  document.querySelector<HTMLElement>('.audio-controls')?.setAttribute('aria-label', T.volumeAria);

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
    if (localStorage.getItem(LS_AUDIO_MUTE) === '1') audio.setMuted(true);
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
          'button, input, select, textarea, a, summary, details, .audio-controls, .settings-panel'
        )
      )
    );
  }

  function touchTargetIsOverlay(target: EventTarget | null): boolean {
    return (
      target instanceof Element && !overlay.classList.contains('hidden') && overlay.contains(target)
    );
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

  /** Desktop: Chrome/trackpad can still emit wheel during drag, so block it globally. */
  document.addEventListener(
    'wheel',
    (e) => {
      if (drag || canvasTouchSequence) {
        e.preventDefault();
        return;
      }
      if (phase !== 'playing') return;
      const t = e.target;
      if (t instanceof Node && canvasWrap.contains(t)) e.preventDefault();
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    'selectstart',
    (e) => {
      if (drag) e.preventDefault();
    },
    { capture: true }
  );

  document.addEventListener(
    'dragstart',
    (e) => {
      if (drag) e.preventDefault();
    },
    { capture: true }
  );

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
        canvasTouchSequence = false;
        audio.playTimeUp();
        overlayTitle.textContent = '';
        overlayMessage.textContent = T.msgTimeUp(score, timeUpGradeLine(score));
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
    layoutAndDraw();
  }

  function startGame(): void {
    if (phase === 'playing') return;
    void audio.resume();
    phase = 'playing';
    gameStartedAt = performance.now();
    overlay.classList.add('hidden');
    audio.resetTickMelody();
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

  canvas.addEventListener(
    'mousedown',
    (e) => {
      if (phase === 'playing') e.preventDefault();
    },
    { capture: true }
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
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
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
        canvasTouchSequence = false;
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

  overlayClose.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (phase === 'over' || phase === 'cleared') {
      prepareFreshRound();
      startGame();
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
      }
      layoutAndDraw();
    }, 150);
  });

  prepareFreshRound();
  requestAnimationFrame(() => {
    layoutAndDraw();
    startGame();
  });
}

main().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:16px;color:#c62828">Failed to start: ${String(err)}</p>`;
});
