export type Action = 'next' | 'prev' | 'start';

/**
 * Keys that turn pages. Bluetooth page turners and presentation clickers
 * pretend to be keyboards and send one of these.
 */
const KEYS: Record<string, Action> = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageDown: 'next',
  ' ': 'next',
  Enter: 'next',
  ArrowLeft: 'prev',
  ArrowUp: 'prev',
  PageUp: 'prev',
  Backspace: 'prev',
};

export function keyToAction(key: string): Action | null {
  return KEYS[key] ?? null;
}

/** Standard gamepad layout (Xbox controller): A, B, LB, RB, Menu, D-pad left/right. */
export const GAMEPAD_BUTTONS: Record<number, Action> = {
  0: 'next', // A
  1: 'prev', // B
  4: 'prev', // LB
  5: 'next', // RB
  9: 'start', // Menu
  14: 'prev', // D-pad left
  15: 'next', // D-pad right
};

const STICK_ON = 0.6;
const STICK_OFF = 0.3;

export type ActionHandler = (action: Action, source: string) => void;

/** Keyboard, page turner and gamepad. Swipes are wired per screen with `onSwipe`. */
export function setupInput(handle: ActionHandler, isBlocked: () => boolean) {
  window.addEventListener('keydown', (e) => {
    if (isBlocked() || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    const target = e.target as HTMLElement | null;
    // Let focused buttons, sliders and fields handle their own keys.
    if (target?.closest('button, input, select, textarea, a') && (e.key === 'Enter' || e.key === ' ' || target.tagName === 'INPUT')) return;
    const action = keyToAction(e.key);
    if (!action) return;
    e.preventDefault();
    handle(action, `key ${e.key === ' ' ? 'Space' : e.key}`);
  });

  const pressed = new Map<string, boolean>();
  const stick = new Map<number, number>();
  let polling = false;

  const poll = () => {
    const pads = navigator.getGamepads?.() ?? [];
    let any = false;
    for (const pad of pads) {
      if (!pad) continue;
      any = true;
      for (const [index, action] of Object.entries(GAMEPAD_BUTTONS)) {
        const id = `${pad.index}:${index}`;
        const down = pad.buttons[Number(index)]?.pressed ?? false;
        if (down && !pressed.get(id) && !isBlocked()) handle(action, `gamepad button ${index}`);
        pressed.set(id, down);
      }
      // Left stick: one page per push, must return to center before the next.
      const x = pad.axes[0] ?? 0;
      const latched = stick.get(pad.index) ?? 0;
      if (latched === 0 && Math.abs(x) > STICK_ON) {
        stick.set(pad.index, Math.sign(x));
        if (!isBlocked()) handle(x > 0 ? 'next' : 'prev', 'gamepad stick');
      } else if (latched !== 0 && Math.abs(x) < STICK_OFF) {
        stick.set(pad.index, 0);
      }
    }
    if (any) requestAnimationFrame(poll);
    else polling = false;
  };

  window.addEventListener('gamepadconnected', () => {
    if (!polling) {
      polling = true;
      requestAnimationFrame(poll);
    }
  });
}

/** Horizontal swipe on an element. Swipe left = next page. */
export function onSwipe(el: HTMLElement, handle: (action: Action) => void) {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  el.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) handle(dx < 0 ? 'next' : 'prev');
  });
  el.addEventListener('pointercancel', () => {
    tracking = false;
  });
}
