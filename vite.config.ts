import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Emits sw.js with a precache list of every built file plus everything in
// public/. The cache name changes whenever any file name changes, so a new
// build replaces the old cache.
function serviceWorker(): Plugin {
  let publicDir = '';
  return {
    name: 'story-shelf-sw',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      const files = new Set<string>(Object.keys(bundle));
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.add(relative(publicDir, full).split('\\').join('/'));
        }
      };
      if (publicDir) walk(publicDir);
      files.add('');
      const list = [...files].filter((f) => f !== 'sw.js').sort();
      const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12);
      const source = `const CACHE = 'story-shelf-${version}';
const FILES = ${JSON.stringify(list.map((f) => './' + f))};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('story-shelf-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
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
