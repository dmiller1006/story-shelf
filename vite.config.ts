import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Emits sw.js. Two caches:
// - shell: the page, scripts, styles, pictures. Precached on install (small, so
//   updates take over quickly). Named by a hash of file contents.
// - music: the recordings (24 MB). Filled in the background after the page asks,
//   and on first play, so a new version never waits on them.
// The page itself is fetched network-first, so a new deploy shows up on the next
// visit while online; offline it falls back to the cached copy.
function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'story-shelf-sw',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const shell = createHash('sha256');
      const music = createHash('sha256');
      const shellFiles: string[] = [];
      const musicFiles: string[] = [];
      for (const [name, chunk] of Object.entries(bundle)) {
        shellFiles.push(name);
        shell.update(name).update(chunk.type === 'chunk' ? chunk.code : chunk.source);
      }
      const walk = (dir: string) => {
        for (const name of readdirSync(dir).sort()) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) {
            walk(full);
            continue;
          }
          const rel = relative(publicDir, full).split('\\').join('/');
          if (rel === 'sw.js') continue;
          const isMusic = rel.startsWith('music/');
          (isMusic ? musicFiles : shellFiles).push(rel);
          (isMusic ? music : shell).update(rel).update(readFileSync(full));
        }
      };
      if (publicDir) walk(publicDir);
      shellFiles.push('');
      const list = (files: string[]) => JSON.stringify(files.sort().map((f) => './' + f));
      const source = `const SHELL = 'story-shelf-${shell.digest('hex').slice(0, 12)}';
const MUSIC = 'story-shelf-music-${music.digest('hex').slice(0, 12)}';
const SHELL_FILES = ${list(shellFiles)};
const MUSIC_FILES = ${list(musicFiles)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('story-shelf-') && k !== SHELL && k !== MUSIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => { fillMusic(); }) // not awaited: pages work while music saves
  );
});
// Save any recordings not saved yet, one at a time. Starts when this worker takes
// over, and again whenever the page asks (in case the worker was stopped midway).
let filling = null;
function fillMusic() {
  filling ??= caches.open(MUSIC).then(async (cache) => {
    for (const url of MUSIC_FILES) {
      if (await cache.match(url)) continue;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) await cache.put(url, res);
      } catch {
        return; // offline; try again next visit
      }
    }
  }).finally(() => { filling = null; });
  return filling;
}
self.addEventListener('message', (event) => {
  if (event.data === 'cache-music') event.waitUntil(fillMusic());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      // no-cache: check with the server even if the browser's HTTP cache has a copy
      // (GitHub Pages lets browsers keep pages 10 minutes).
      fetch(req.url, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(SHELL).then((cache) => cache.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res.ok && new URL(req.url).pathname.includes('/music/')) {
          const copy = res.clone();
          caches.open(MUSIC).then((cache) => cache.put(req, copy));
        }
        return res;
      });
    })
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
  server: { host: true },
  preview: { host: true },
});
