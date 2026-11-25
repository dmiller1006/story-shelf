import '@fontsource/andika/latin-400.css';
import '@fontsource/andika/latin-700.css';
import './styles.css';
import { MusicEngine, renderMood, renderSfx } from './audio/engine';
import { TRACKS } from './audio/clips';
import { MOOD_DEFS } from './audio/moods';
import { BOOKS, findBook, imageUrl } from './books';
import type { Book } from './books/types';
import { onSwipe, setupInput, type Action } from './input';
import { loadProgress, loadSettings, saveProgress, saveSettings, type Settings, type TextSize } from './settings';

const app = document.getElementById('app')!;
const engine = new MusicEngine();
let settings: Settings = loadSettings();
if (new URLSearchParams(location.search).has('debug')) settings.debug = true;

type Route =
  | { view: 'shelf' }
  | { view: 'cover'; book: Book }
  | { view: 'page'; book: Book; index: number }
  | { view: 'end'; book: Book };

let route: Route = { view: 'shelf' };
let lastInput = '';
let lastPageKey = '';
let dialogOpen = false;
/** Set by screens so keyboard, page turner and gamepad know what to do. */
let onAction: (action: Action) => void = () => {};

// ---------- helpers ----------

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Array<Node | string | null | undefined | false>
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (key === 'className') {
      el.className = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

const ICONS = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5.5 10v10h5v-6h3v6h5V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  musicOn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor"/></svg>',
  musicOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" opacity=".4"/><circle cx="6.5" cy="18" r="2.5" fill="currentColor" opacity=".4"/><circle cx="17.5" cy="16" r="2.5" fill="currentColor" opacity=".4"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 8 8-8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

function iconButton(icon: string, label: string, onClick: (e: MouseEvent) => void, className = 'icon-btn') {
  const b = h('button', { className, type: 'button', 'aria-label': label, title: label, onClick });
  b.innerHTML = icon;
  return b;
}

function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.textSize = settings.textSize;
  engine.setVolume(settings.volume);
  engine.setRecordings(settings.recordings);
  engine.setMusicOn(settings.music);
  saveSettings(settings);
  renderDebug();
}

async function unlockAudio() {
  if (engine.unlocked && engine.state.context === 'running') return;
  try {
    await engine.unlock();
  } catch {
    /* audio is optional */
  }
  renderDebug();
}

// Any first tap or key press anywhere is allowed to start audio (browser rule).
window.addEventListener('pointerdown', () => void unlockAudio(), { capture: true });
window.addEventListener('keydown', () => void unlockAudio(), { capture: true });

// ---------- routing ----------

function parseRoute(): Route {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'book' && parts[1]) {
    const book = findBook(parts[1]);
    if (!book) return { view: 'shelf' };
    if (parts[2] === 'end') return { view: 'end', book };
    const n = Number(parts[2]);
    if (Number.isInteger(n) && n >= 1 && n <= book.pages.length) return { view: 'page', book, index: n - 1 };
    return { view: 'cover', book };
  }
  return { view: 'shelf' };
}

function hashFor(r: Route): string {
  switch (r.view) {
    case 'shelf':
      return '#/';
    case 'cover':
      return `#/book/${r.book.id}`;
    case 'page':
      return `#/book/${r.book.id}/${r.index + 1}`;
    case 'end':
      return `#/book/${r.book.id}/end`;
  }
}

/** Page turns replace history so the back button leaves the book instead of paging backwards. */
function go(r: Route, replace = false) {
  const hash = hashFor(r);
  if (location.hash !== hash) {
    if (replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
  }
  route = r;
  render();
}

window.addEventListener('popstate', () => {
  route = parseRoute();
  render();
});

// ---------- screens ----------

function render() {
  app.replaceChildren();
  document.body.dataset.view = route.view;
  switch (route.view) {
    case 'shelf':
      renderShelf();
      break;
    case 'cover':
      renderCover(route.book);
      break;
    case 'page':
      renderPage(route.book, route.index);
      break;
    case 'end':
      renderEnd(route.book);
      break;
  }
  renderDebug();
}

function topBar(left: Node | null, title: string) {
  const music = iconButton(settings.music ? ICONS.musicOn : ICONS.musicOff, settings.music ? 'Turn music off' : 'Turn music on', () => {
    settings.music = !settings.music;
    applySettings();
    music.innerHTML = settings.music ? ICONS.musicOn : ICONS.musicOff;
    music.setAttribute('aria-label', settings.music ? 'Turn music off' : 'Turn music on');
  });
  return h('header', { className: 'top-bar' }, left ?? h('span'), h('div', { className: 'top-title' }, title), h('div', { className: 'top-actions' }, music, grownUpButton()));
}

function homeButton() {
  return iconButton(ICONS.home, 'Back to the shelf', () => go({ view: 'shelf' }));
}

function renderShelf() {
  if (engine.unlocked) engine.setMood('cozy');
  const tiles = BOOKS.map((book) => {
    const progress = loadProgress(book.id);
    return h(
      'button',
      { className: 'book-tile', type: 'button', style: `--cover:${book.coverColor}`, onClick: () => go({ view: 'cover', book }) },
      h('div', { className: 'book-art' }, h('img', { src: imageUrl(book, book.cover), alt: '', draggable: 'false' })),
      h('div', { className: 'book-title' }, book.title),
      h('div', { className: 'book-meta' }, progress > 0 ? `Page ${progress + 1} of ${book.pages.length}` : book.author),
    );
  });
  app.append(
    topBar(null, ''),
    h('main', { className: 'shelf' }, h('h1', { className: 'shelf-title' }, 'Story Shelf'), h('div', { className: 'shelf-grid' }, ...tiles)),
  );
  const first = app.querySelector<HTMLButtonElement>('.book-tile');
  onAction = (a) => {
    if (a === 'next' || a === 'start') first?.click();
  };
}

function renderCover(book: Book) {
  if (engine.unlocked) engine.setMood(book.coverMood);
  const progress = loadProgress(book.id);
  const start = (index: number) => {
    void unlockAudio();
    go({ view: 'page', book, index });
  };
  const primary = h(
    'button',
    { className: 'big-btn', type: 'button', onClick: () => start(progress) },
    progress > 0 ? `Keep reading` : 'Start reading',
  );
  const actions = h(
    'div',
    { className: 'cover-actions' },
    primary,
    progress > 0 ? h('div', { className: 'cover-note' }, `You are on page ${progress + 1}.`) : null,
    progress > 0 ? h('button', { className: 'link-btn', type: 'button', onClick: () => start(0) }, 'Start from the beginning') : null,
  );
  app.append(
    topBar(homeButton(), ''),
    h(
      'main',
      { className: 'cover' },
      h('div', { className: 'cover-art', style: `--cover:${book.coverColor}` }, h('img', { src: imageUrl(book, book.cover), alt: book.coverAlt })),
      h('div', { className: 'cover-text' }, h('h1', {}, book.title), h('p', { className: 'byline' }, `by ${book.author}`), actions),
    ),
  );
  primary.focus({ preventScroll: true });
  onAction = (a) => {
    if (a === 'next' || a === 'start') start(progress);
    if (a === 'prev') go({ view: 'shelf' });
  };
}

function renderPage(book: Book, index: number) {
  const page = book.pages[index];
  const key = `${book.id}:${index}`;
  const previousKey = lastPageKey;
  const direction = previousKey.startsWith(book.id + ':') && Number(previousKey.split(':')[1]) > index ? 'back' : 'forward';
  lastPageKey = key;
  saveProgress(book.id, index);

  engine.setMood(page.mood, page.track);
  if (page.sting && previousKey !== key && settings.sfx) window.setTimeout(() => engine.sfx(page.sting!), 150);

  const turn = (delta: number) => {
    engine.activity();
    const next = index + delta;
    if (next < 0) go({ view: 'cover', book }, true);
    else if (next >= book.pages.length) go({ view: 'end', book }, true);
    else go({ view: 'page', book, index: next }, true);
  };

  let swipedAt = 0;
  const picture = h(
    'button',
    {
      className: 'picture',
      type: 'button',
      'aria-label': `Picture: ${page.alt} Tap for a sound.`,
      onClick: () => {
        if (Date.now() - swipedAt < 400) return;
        engine.activity();
        if (settings.sfx) engine.sfx(page.sfx ?? 'chime');
        picture.classList.remove('wiggle');
        void picture.offsetWidth;
        picture.classList.add('wiggle');
      },
    },
    h('img', { src: imageUrl(book, page.image), alt: '', draggable: 'false' }),
  );

  const text = h(
    'div',
    { className: 'story-text', 'aria-live': 'polite' },
    ...page.text.map((para) => {
      const lines = para.split('\n');
      const p = h('p', lines.length > 1 ? { className: 'lines' } : {});
      lines.forEach((line, i) => {
        if (i) p.append(h('br'));
        p.append(line);
      });
      return p;
    }),
  );

  const spread = h('div', { className: `spread turn-${direction}` }, h('div', { className: 'picture-wrap' }, picture), h('div', { className: 'text-wrap' }, text));

  const prev = iconButton(ICONS.prev, index === 0 ? 'Back to the cover' : 'Previous page', () => turn(-1), 'turn-btn turn-prev');
  const next = iconButton(ICONS.next, index === book.pages.length - 1 ? 'The end' : 'Next page', () => turn(1), 'turn-btn turn-next');

  const progress = h(
    'footer',
    { className: 'page-footer' },
    h('div', { className: 'progress', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(book.pages.length), 'aria-valuenow': String(index + 1) }, h('div', { className: 'progress-fill', style: `width:${((index + 1) / book.pages.length) * 100}%` })),
    h('div', { className: 'page-count' }, `${index + 1} of ${book.pages.length}`),
  );

  const reader = h('main', { className: 'reader' }, prev, spread, next);
  app.append(topBar(homeButton(), book.title), reader, progress);
  onSwipe(reader, (a) => {
    swipedAt = Date.now();
    turn(a === 'next' ? 1 : -1);
  });

  fitText(text);
  // Warm the cache for the neighbors so the next picture appears instantly.
  for (const n of [index + 1, index - 1]) {
    const p = book.pages[n];
    if (p) new Image().src = imageUrl(book, p.image);
  }

  onAction = (a) => turn(a === 'prev' ? -1 : 1);
}

function renderEnd(book: Book) {
  saveProgress(book.id, 0);
  engine.setMood('sleepy');
  if (settings.sfx && lastPageKey !== `${book.id}:end`) window.setTimeout(() => engine.sfx('theEnd'), 200);
  lastPageKey = `${book.id}:end`;
  const again = h('button', { className: 'big-btn', type: 'button', onClick: () => go({ view: 'page', book, index: 0 }) }, 'Read it again');
  app.append(
    topBar(homeButton(), book.title),
    h(
      'main',
      { className: 'the-end' },
      h('img', { src: imageUrl(book, book.pages[0].image), alt: '' }),
      h('h1', {}, 'The End'),
      h('div', { className: 'cover-actions' }, again, h('button', { className: 'link-btn', type: 'button', onClick: () => go({ view: 'shelf' }) }, 'Back to the shelf')),
      h('p', { className: 'credit' }, book.credit),
    ),
  );
  again.focus({ preventScroll: true });
  // Ignore extra page-turner presses right after arriving, so the book doesn't restart by accident.
  const arrived = Date.now();
  onAction = (a) => {
    if (a === 'prev') go({ view: 'page', book, index: book.pages.length - 1 }, true);
    else if (Date.now() - arrived > 2000) go({ view: 'page', book, index: 0 });
  };
}

// ---------- text fitting ----------

const BASE_SIZE: Record<TextSize, number> = { M: 24, L: 30, XL: 36 };

/** Shrinks the text on long pages until it fits without scrolling. */
function fitText(el: HTMLElement) {
  const fit = () => {
    const box = el.parentElement!;
    let size = BASE_SIZE[settings.textSize];
    // Keep phones readable without overflowing.
    size = Math.min(size, Math.max(18, window.innerWidth / 16));
    el.style.fontSize = `${size}px`;
    box.classList.remove('scroll');
    while (size > 15 && box.scrollHeight > box.clientHeight + 1) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
    // Last resort on very short screens (a phone held sideways): let the text scroll.
    if (box.scrollHeight > box.clientHeight + 1) box.classList.add('scroll');
  };
  requestAnimationFrame(fit);
  void document.fonts?.ready.then(fit);
}

let resizeTimer = 0;
window.addEventListener('resize', () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    const text = app.querySelector<HTMLElement>('.story-text');
    if (text) fitText(text);
  }, 100);
});

// ---------- grown-up settings ----------

const HOLD_MS = 1200;

/** The settings button only opens after a long press, so little hands don't wander in. */
function grownUpButton() {
  const b = iconButton(ICONS.gear, 'Grown-up settings (press and hold)', () => {}, 'icon-btn hold-btn');
  let timer = 0;
  const cancel = () => {
    window.clearTimeout(timer);
    b.classList.remove('holding');
  };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.classList.add('holding');
    timer = window.setTimeout(() => {
      cancel();
      openSettings();
    }, HOLD_MS);
  });
  b.addEventListener('pointerup', cancel);
  b.addEventListener('pointerleave', cancel);
  b.addEventListener('pointercancel', cancel);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  // Keyboard users: hold Enter is awkward, so allow Shift+Enter.
  b.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) openSettings();
  });
  return b;
}

function segmented<T extends string>(name: string, options: Array<[T, string]>, value: T, onChange: (v: T) => void) {
  return h(
    'div',
    { className: 'segmented', role: 'radiogroup', 'aria-label': name },
    ...options.map(([v, label]) => {
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(v === value), className: v === value ? 'on' : '' }, label);
      b.addEventListener('click', () => {
        onChange(v);
        b.parentElement!.querySelectorAll('button').forEach((x) => {
          const on = x === b;
          x.classList.toggle('on', on);
          x.setAttribute('aria-checked', String(on));
        });
      });
      return b;
    }),
  );
}

function toggle(label: string, value: boolean, onChange: (v: boolean) => void) {
  const input = h('input', { type: 'checkbox', checked: value });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { className: 'toggle' }, h('span', {}, label), input);
}

function openSettings() {
  const volume = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(settings.volume), 'aria-label': 'Music volume' });
  volume.addEventListener('input', () => {
    settings.volume = Number(volume.value);
    applySettings();
  });

  const currentBook = route.view === 'shelf' ? null : route.book;
  const dialog = h(
    'dialog',
    { className: 'settings' },
    h('h2', {}, 'Grown-up settings'),
    toggle('Music', settings.music, (v) => {
      settings.music = v;
      applySettings();
      render();
    }),
    h('label', { className: 'slider' }, h('span', {}, 'Music volume'), volume),
    toggle('Sound effects when the picture is tapped', settings.sfx, (v) => {
      settings.sfx = v;
      applySettings();
    }),
    h('div', { className: 'field' }, h('span', {}, 'Text size'), segmented<TextSize>('Text size', [['M', 'Medium'], ['L', 'Large'], ['XL', 'Huge']], settings.textSize, (v) => {
      settings.textSize = v;
      applySettings();
      render();
    })),
    h('div', { className: 'field' }, h('span', {}, 'Theme'), segmented('Theme', [['paper', 'Paper'], ['night', 'Night']], settings.theme, (v) => {
      settings.theme = v;
      applySettings();
    })),
    toggle('Real orchestra and piano recordings (off: simple built-in music)', settings.recordings, (v) => {
      settings.recordings = v;
      applySettings();
    }),
    toggle('Show debug info', settings.debug, (v) => {
      settings.debug = v;
      applySettings();
    }),
    currentBook
      ? h('button', { className: 'link-btn', type: 'button', onClick: () => {
          saveProgress(currentBook.id, 0);
          dialog.close();
          go({ view: 'cover', book: currentBook });
        } }, `Start "${currentBook.title}" over`)
      : null,
    h('p', { className: 'hint' }, 'Page turners: arrow keys, Page Up/Down, Space and Enter all work. Xbox controller: A or RB next, B or LB back.'),
    musicCredits(),
    h('button', { className: 'big-btn', type: 'button', onClick: () => dialog.close() }, 'Done'),
  );
  dialog.addEventListener('close', () => {
    dialogOpen = false;
    dialog.remove();
  });
  document.body.append(dialog);
  dialogOpen = true;
  dialog.showModal();
}

/** Who made each recording. CC BY-SA recordings must be credited where people can see it. */
function musicCredits() {
  return h(
    'details',
    { className: 'credits' },
    h('summary', {}, 'Music credits'),
    h(
      'ul',
      {},
      ...TRACKS.map((t) =>
        h('li', {}, `${t.composer}, ${t.title}. Performed by ${t.performer}. `, h('a', { href: t.source, target: '_blank', rel: 'noopener' }, t.license), '.'),
      ),
    ),
    h('p', {}, 'Recordings via Wikimedia Commons and Musopen, trimmed and volume-matched for Story Shelf.'),
  );
}

// ---------- debug overlay ----------

let debugEl: HTMLElement | null = null;

function renderDebug() {
  if (!settings.debug) {
    debugEl?.remove();
    debugEl = null;
    return;
  }
  if (!debugEl) {
    debugEl = h('pre', { className: 'debug', 'aria-hidden': 'true' });
    document.body.append(debugEl);
  }
  const s = engine.state;
  const where = route.view === 'page' ? `page ${route.index + 1} (${route.book.pages[route.index].mood})` : route.view;
  debugEl.textContent = [`view: ${where}`, `mood: ${s.mood ?? '-'} playing: ${s.playing ?? '-'} track: ${s.track ?? 'synth'}`, `idle: ${s.idle}  audio: ${s.context}  players: ${s.players}`, `last input: ${lastInput || '-'}`].join('\n');
}
window.setInterval(() => settings.debug && renderDebug(), 500);

// ---------- start ----------

setupInput(
  (action, source) => {
    lastInput = source;
    void unlockAudio();
    onAction(action);
    renderDebug();
  },
  () => dialogOpen,
);

applySettings();
route = parseRoute();
render();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const askToSaveMusic = () => navigator.serviceWorker.controller?.postMessage('cache-music');
    navigator.serviceWorker.addEventListener('controllerchange', askToSaveMusic);
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(askToSaveMusic)
      .catch(() => {});
  });
}

// Test hooks (used by e2e/smoke.mjs).
Object.assign(window, { __storyShelf: { engine, renderMood, renderSfx, moods: MOOD_DEFS, books: BOOKS } });
