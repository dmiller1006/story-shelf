// End-to-end check against the production build.
// Usage: npm run build && npm run e2e [-- --shots <dir>]
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Use the project's Playwright if installed, otherwise the machine's global one.
const { chromium } = createRequire(import.meta.url)('playwright');

const PORT = 4318;
const BASE = `http://localhost:${PORT}/`;
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
};

// Own process group so the server and its children all stop at the end.
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
const stopServer = () => {
  try {
    process.kill(-server.pid);
  } catch {
    /* already gone */
  }
};
process.on('exit', stopServer);
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('preview server did not start')), 15000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(timer);
      resolve();
    }
  });
});

const browser = await chromium.launch();

// Fake Xbox controller: tests press buttons by setting window.__pad.
const gamepadShim = () => {
  const pad = { index: 0, id: 'Fake Xbox Controller', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  window.__pad = pad;
  navigator.getGamepads = () => [pad];
};

async function openPage(viewport, opts = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: opts.scale ?? 1, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (opts.gamepad) await page.addInitScript(gamepadShim);
  if (opts.settings) await page.addInitScript((s) => localStorage.setItem('story-shelf.settings', JSON.stringify(s)), opts.settings);
  await page.goto(BASE + (opts.path ?? ''));
  await page.waitForSelector('#app > *');
  return { context, page, errors };
}

const state = (page) => page.evaluate(() => window.__storyShelf.engine.state);
const books = await (async () => {
  const { context, page } = await openPage({ width: 800, height: 600 });
  const data = await page.evaluate(() => window.__storyShelf.books.map((b) => ({ id: b.id, moods: b.pages.map((p) => p.mood), count: b.pages.length })));
  await context.close();
  return data;
})();
const peter = books.find((b) => b.id === 'peter-rabbit');

// ---------- 1. Read the whole book with a page turner on an iPad ----------
{
  const { context, page, errors } = await openPage({ width: 1180, height: 820 }, { scale: 2 });
  check(await page.isVisible('text=Story Shelf'), 'shelf shows its title');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/1-shelf.png` });
  await page.click('.book-tile');
  check(await page.isVisible('text=Start reading'), 'cover shows Start reading');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/2-cover.png` });
  await page.click('text=Start reading');
  await page.waitForSelector('.story-text');
  let s = await state(page);
  check(s.context === 'running', `audio starts after the tap (context: ${s.context})`);
  check(s.mood === 'cozy', `page 1 mood is cozy (got ${s.mood})`);

  const seen = [];
  let maxPlayers = 0;
  for (let i = 0; i < peter.count; i++) {
    const info = await page.evaluate(() => {
      const box = document.querySelector('.text-wrap');
      const text = document.querySelector('.story-text');
      return {
        count: document.querySelector('.page-count')?.textContent,
        fits: box.scrollHeight <= box.clientHeight + 1,
        size: parseFloat(getComputedStyle(text).fontSize),
        img: document.querySelector('.picture img')?.complete && document.querySelector('.picture img').naturalWidth > 0,
      };
    });
    const st = await state(page);
    seen.push(st.mood);
    maxPlayers = Math.max(maxPlayers, st.players);
    if (!info.fits || info.size < 18 || !info.img) check(false, `iPad page ${i + 1}: fits=${info.fits} size=${info.size} image=${info.img}`);
    if (SHOTS && [0, 9, 10, 16].includes(i)) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${SHOTS}/3-page-${i + 1}.png` });
    }
    await page.keyboard.press(i % 2 ? 'PageDown' : 'ArrowRight');
    await page.waitForTimeout(40);
  }
  check(JSON.stringify(seen) === JSON.stringify(peter.moods), 'music mood follows every page');
  check(await page.isVisible('text=The End'), 'last page turn reaches The End');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/4-the-end.png` });
  s = await state(page);
  check(s.mood === 'sleepy', 'The End plays sleepy music');
  check(maxPlayers <= 3, `fast page turning never stacks up music, at most the current loop plus two fading out (most loops at once: ${maxPlayers})`);
  await page.waitForTimeout(3500);
  s = await state(page);
  check(s.players === 1 && s.playing === 'sleepy', `old music is cleaned up after a page settles (loops: ${s.players}, playing: ${s.playing})`);

  // Back button on a page turner from The End returns to the last page.
  await page.keyboard.press('PageUp');
  check((await page.textContent('.page-count')) === `${peter.count} of ${peter.count}`, 'PageUp from The End goes back to the last page');

  // Progress is remembered.
  await page.click('[aria-label="Back to the shelf"]');
  check((await page.textContent('.book-meta')).includes(`Page ${peter.count}`), 'shelf remembers the page');
  check(errors.length === 0, `no console errors (${errors.join(' | ')})`);
  await context.close();
}

// ---------- 2. Text fits at Huge size on every page and screen ----------
const viewports = {
  'iPad landscape': { width: 1180, height: 820 },
  'iPad portrait': { width: 820, height: 1180 },
  'iPad mini portrait': { width: 744, height: 1133 },
  'phone portrait': { width: 390, height: 844 },
  'phone landscape': { width: 844, height: 390 },
  laptop: { width: 1440, height: 900 },
};
for (const [name, viewport] of Object.entries(viewports)) {
  for (const textSize of ['L', 'XL']) {
    const { context, page } = await openPage(viewport, { path: '#/book/peter-rabbit/1', settings: { textSize } });
    const problems = [];
    let smallest = 99;
    let total = 0;
    const scrolled = [];
    for (const book of books) {
      for (let i = 0; i < book.count; i++) {
        // Hash navigation keeps the app loaded, which is much faster than a full page load.
        await page.evaluate((h) => (location.hash = h), `#/book/${book.id}/${i + 1}`);
        await page.waitForFunction((n) => document.querySelector('.page-count')?.textContent?.startsWith(`${n} of`), i + 1);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const r = await page.evaluate(() => {
          const box = document.querySelector('.text-wrap');
          const pic = document.querySelector('.picture img').getBoundingClientRect();
          return {
            fits: box.scrollHeight <= box.clientHeight + 1,
            scrolls: box.classList.contains('scroll') && getComputedStyle(box).overflowY === 'auto',
            size: parseFloat(getComputedStyle(document.querySelector('.story-text')).fontSize),
            picH: pic.height,
            overflowX: document.documentElement.scrollWidth > window.innerWidth,
          };
        });
        total += 1;
        smallest = Math.min(smallest, r.size);
        const where = `${book.id} p${i + 1}`;
        // Only a phone held sideways may fall back to scrolling text.
        if (!r.fits && !(name === 'phone landscape' && r.scrolls)) problems.push(`${where} overflows`);
        if (r.scrolls) scrolled.push(`${book.id} p${i + 1}`);
        if (r.overflowX) problems.push(`${where} scrolls sideways`);
        if (r.picH < 120) problems.push(`${where} picture only ${Math.round(r.picH)}px tall`);
      }
    }
    check(problems.length === 0, `${name}, text ${textSize}: all ${total} pages fit (smallest text ${smallest}px) ${problems.slice(0, 6).join(', ')}${scrolled.length ? ` (scrolls: ${scrolled.join(', ')})` : ''}`);
    await context.close();
  }
}

// ---------- 3. Phone and night-theme screenshots ----------
if (SHOTS) {
  const { context, page } = await openPage({ width: 390, height: 844 }, { scale: 2, path: '#/book/peter-rabbit/11' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/5-phone.png` });
  await context.close();
  const night = await openPage({ width: 1180, height: 820 }, { scale: 2, path: '#/book/peter-rabbit/26', settings: { theme: 'night' } });
  await night.page.waitForTimeout(400);
  await night.page.screenshot({ path: `${SHOTS}/6-night.png` });
  await night.context.close();
}

// ---------- 4. Xbox controller, swipe, grown-up settings ----------
{
  const { context, page, errors } = await openPage({ width: 1180, height: 820 }, { gamepad: true, path: '#/book/peter-rabbit/1' });
  await page.click('.story-text'); // a real tap so audio can start
  await page.evaluate(() => window.dispatchEvent(new Event('gamepadconnected')));
  const press = async (button) => {
    await page.evaluate((b) => (window.__pad.buttons[b].pressed = true), button);
    await page.waitForTimeout(80);
    await page.evaluate((b) => (window.__pad.buttons[b].pressed = false), button);
    await page.waitForTimeout(80);
  };
  await press(0);
  await press(5);
  await press(15);
  check((await page.textContent('.page-count')) === `4 of ${peter.count}`, 'Xbox A, RB and D-pad right turn forward');
  await press(1);
  await press(4);
  check((await page.textContent('.page-count')) === `2 of ${peter.count}`, 'Xbox B and LB turn back');
  // Holding A should turn only one page.
  await page.evaluate(() => (window.__pad.buttons[0].pressed = true));
  await page.waitForTimeout(400);
  await page.evaluate(() => (window.__pad.buttons[0].pressed = false));
  await page.waitForTimeout(80);
  check((await page.textContent('.page-count')) === `3 of ${peter.count}`, 'holding A turns one page, not many');
  // Stick push and return.
  await page.evaluate(() => (window.__pad.axes[0] = 0.9));
  await page.waitForTimeout(200);
  await page.evaluate(() => (window.__pad.axes[0] = 0));
  await page.waitForTimeout(80);
  check((await page.textContent('.page-count')) === `4 of ${peter.count}`, 'left stick push turns one page');

  // Touch swipe left = next page.
  const swipe = async (from, to) => {
    await page.evaluate(
      ([a, b]) => {
        const el = document.querySelector('.reader');
        const opts = (x) => ({ bubbles: true, pointerType: 'touch', clientX: x, clientY: 400, pointerId: 7 });
        el.dispatchEvent(new PointerEvent('pointerdown', opts(a)));
        el.dispatchEvent(new PointerEvent('pointerup', opts(b)));
      },
      [from, to],
    );
    await page.waitForTimeout(60);
  };
  await swipe(800, 500);
  check((await page.textContent('.page-count')) === `5 of ${peter.count}`, 'swipe left turns forward');
  await swipe(500, 800);
  check((await page.textContent('.page-count')) === `4 of ${peter.count}`, 'swipe right turns back');

  // Tapping the gear briefly does nothing; holding it opens settings.
  const gear = await page.$('.hold-btn');
  const box = await gear.boundingBox();
  await page.mouse.move(box.x + 24, box.y + 24);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  check(!(await page.isVisible('dialog.settings')), 'a quick tap on the gear does not open settings');
  await page.mouse.down();
  await page.waitForTimeout(1400);
  await page.mouse.up();
  check(await page.isVisible('dialog.settings'), 'holding the gear opens grown-up settings');
  await page.keyboard.press('ArrowRight');
  check((await page.textContent('.page-count')) === `4 of ${peter.count}`, 'page turner is ignored while settings are open');
  await page.click('dialog.settings >> text=Night');
  await page.click('dialog.settings >> text=Done');
  check((await page.getAttribute('html', 'data-theme')) === 'night', 'night theme applies');

  // Music toggle.
  await page.click('[aria-label="Turn music off"]');
  await page.waitForTimeout(100);
  check((await state(page)).playing === null, 'music button turns music off');
  await page.click('[aria-label="Turn music on"]');
  check((await state(page)).playing !== null, 'music button turns music back on');
  check(errors.length === 0, `no console errors (${errors.join(' | ')})`);
  await context.close();
}

// ---------- 5. Music and sound effects render cleanly ----------
{
  const { context, page } = await openPage({ width: 800, height: 600 });
  const levels = await page.evaluate(async () => {
    const out = {};
    for (const mood of ['cozy', 'playful', 'sneaky', 'chase', 'sad', 'sleepy']) out[mood] = await window.__storyShelf.renderMood(mood, 10);
    for (const s of ['chime', 'munch', 'chirp', 'splash', 'sneeze', 'crash', 'scratch', 'trot', 'quack', 'ribbit', 'plop', 'whoosh', 'thud', 'surprise', 'theEnd']) out[s] = await window.__storyShelf.renderSfx(s);
    return out;
  });
  for (const [name, l] of Object.entries(levels)) {
    const rms = l.rms === undefined ? '' : ` rms ${l.rms.toFixed(3)}`;
    const audible = l.rms === undefined ? l.peak > 0.02 : l.rms > 0.01;
    check(audible && l.peak < 0.99, `${name}: peak ${l.peak.toFixed(3)}${rms} (audible, no clipping)`);
  }
  await context.close();
}

// ---------- 6. Works offline after the first visit ----------
{
  const { context, page } = await openPage({ width: 1180, height: 820 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.goto(`${BASE}#/book/peter-rabbit/7`);
  await page.waitForSelector('.story-text', { timeout: 5000 }).catch(() => {});
  const ok = await page.evaluate(() => {
    const img = document.querySelector('.picture img');
    return !!img && img.complete && img.naturalWidth > 0 && document.querySelector('.story-text').textContent.includes('naughty');
  }).catch(() => false);
  check(ok, 'page 7 loads offline with its picture');
  await context.close();
}

// ---------- 7. Real recordings ----------
{
  const { context, page, errors } = await openPage({ width: 1180, height: 820 }, { path: '#/book/jemima-puddle-duck/5', settings: { debug: true } });
  await page.click('.story-text'); // tap so audio may start
  const playing = async () => {
    await page.waitForTimeout(2500);
    return page.evaluate(() => {
      const s = window.__storyShelf.engine.state;
      return { track: s.track, playing: s.playing };
    });
  };
  let st = await playing();
  check(st.track === 'morning-mood', `Jemima setting off plays Morning Mood (track: ${st.track})`);
  await page.keyboard.press('ArrowRight');
  st = await playing();
  check(st.track === 'morning-mood', `the same piece keeps playing across pages that share it (track: ${st.track})`);
  await page.evaluate(() => (location.hash = '#/book/jemima-puddle-duck/9'));
  st = await playing();
  check(st.playing === 'sneaky' && st.track !== null, `a sneaky page switches to a sneaky recording (track: ${st.track})`);
  // Recordings off in grown-up settings: the synth takes over.
  await page.evaluate(() => {
    localStorage.setItem('story-shelf.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('story-shelf.settings') || '{}'), recordings: false }));
  });
  await page.reload();
  await page.click('.story-text');
  st = await playing();
  check(st.track === null && st.playing === 'sneaky', `with recordings off, the built-in music plays (track: ${st.track}, mood: ${st.playing})`);
  check(errors.length === 0, `no console errors with recordings (${errors.join(' | ')})`);
  await context.close();
}

await browser.close();
stopServer();
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
