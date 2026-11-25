const SHELL = 'story-shelf-272c7f1dc41c';
const MUSIC = 'story-shelf-music-41f2b6562651';
const SHELL_FILES = ["./","./assets/andika-latin-400-normal-BK42By1L.woff","./assets/andika-latin-400-normal-BTFTIZb-.woff2","./assets/andika-latin-700-normal-CAUSQC6x.woff","./assets/andika-latin-700-normal-Dk95f5lc.woff2","./assets/index-BmX9dr_9.js","./assets/index-yj9Wf3zb.css","./books/benjamin-bunny/08.jpg","./books/benjamin-bunny/11.jpg","./books/benjamin-bunny/12.jpg","./books/benjamin-bunny/15.jpg","./books/benjamin-bunny/16.jpg","./books/benjamin-bunny/19.jpg","./books/benjamin-bunny/20.jpg","./books/benjamin-bunny/23.jpg","./books/benjamin-bunny/24.jpg","./books/benjamin-bunny/27.jpg","./books/benjamin-bunny/28.jpg","./books/benjamin-bunny/31.jpg","./books/benjamin-bunny/32.jpg","./books/benjamin-bunny/35.jpg","./books/benjamin-bunny/36.jpg","./books/benjamin-bunny/39.jpg","./books/benjamin-bunny/40.jpg","./books/benjamin-bunny/43.jpg","./books/benjamin-bunny/44.jpg","./books/benjamin-bunny/47.jpg","./books/benjamin-bunny/48.jpg","./books/benjamin-bunny/51.jpg","./books/benjamin-bunny/52.jpg","./books/benjamin-bunny/55.jpg","./books/benjamin-bunny/57.jpg","./books/benjamin-bunny/58.jpg","./books/jemima-puddle-duck/11.jpg","./books/jemima-puddle-duck/12.jpg","./books/jemima-puddle-duck/15.jpg","./books/jemima-puddle-duck/16.jpg","./books/jemima-puddle-duck/19.jpg","./books/jemima-puddle-duck/20.jpg","./books/jemima-puddle-duck/23.jpg","./books/jemima-puddle-duck/24.jpg","./books/jemima-puddle-duck/27.jpg","./books/jemima-puddle-duck/28.jpg","./books/jemima-puddle-duck/31.jpg","./books/jemima-puddle-duck/32.jpg","./books/jemima-puddle-duck/35.jpg","./books/jemima-puddle-duck/36.jpg","./books/jemima-puddle-duck/39.jpg","./books/jemima-puddle-duck/40.jpg","./books/jemima-puddle-duck/43.jpg","./books/jemima-puddle-duck/44.jpg","./books/jemima-puddle-duck/47.jpg","./books/jemima-puddle-duck/48.jpg","./books/jemima-puddle-duck/51.jpg","./books/jemima-puddle-duck/52.jpg","./books/jemima-puddle-duck/55.jpg","./books/jemima-puddle-duck/57.jpg","./books/jemima-puddle-duck/58.jpg","./books/jemima-puddle-duck/8.jpg","./books/jeremy-fisher/jf03.jpg","./books/jeremy-fisher/jf04.jpg","./books/jeremy-fisher/jf05.jpg","./books/jeremy-fisher/jf06.jpg","./books/jeremy-fisher/jf07.jpg","./books/jeremy-fisher/jf08.jpg","./books/jeremy-fisher/jf09.jpg","./books/jeremy-fisher/jf10.jpg","./books/jeremy-fisher/jf11.jpg","./books/jeremy-fisher/jf12.jpg","./books/jeremy-fisher/jf13.jpg","./books/jeremy-fisher/jf14.jpg","./books/jeremy-fisher/jf15.jpg","./books/jeremy-fisher/jf16.jpg","./books/jeremy-fisher/jf17.jpg","./books/jeremy-fisher/jf18.jpg","./books/jeremy-fisher/jf19.jpg","./books/jeremy-fisher/jf20.jpg","./books/jeremy-fisher/jf21.jpg","./books/jeremy-fisher/jf22.jpg","./books/jeremy-fisher/jf23.jpg","./books/jeremy-fisher/jf24.jpg","./books/jeremy-fisher/jf25.jpg","./books/jeremy-fisher/jf26.jpg","./books/jeremy-fisher/jf27.jpg","./books/jeremy-fisher/jf28.jpg","./books/jeremy-fisher/jf29.jpg","./books/peter-rabbit/peter02.gif","./books/peter-rabbit/peter08.jpg","./books/peter-rabbit/peter11.jpg","./books/peter-rabbit/peter12.jpg","./books/peter-rabbit/peter15.jpg","./books/peter-rabbit/peter16.jpg","./books/peter-rabbit/peter19.jpg","./books/peter-rabbit/peter20.jpg","./books/peter-rabbit/peter23.jpg","./books/peter-rabbit/peter24.jpg","./books/peter-rabbit/peter27.jpg","./books/peter-rabbit/peter28.jpg","./books/peter-rabbit/peter31.jpg","./books/peter-rabbit/peter32.jpg","./books/peter-rabbit/peter35.jpg","./books/peter-rabbit/peter36.jpg","./books/peter-rabbit/peter39.jpg","./books/peter-rabbit/peter40.jpg","./books/peter-rabbit/peter43.jpg","./books/peter-rabbit/peter44.jpg","./books/peter-rabbit/peter47.jpg","./books/peter-rabbit/peter48.jpg","./books/peter-rabbit/peter51.jpg","./books/peter-rabbit/peter52.jpg","./books/peter-rabbit/peter55.jpg","./books/peter-rabbit/peter57.jpg","./books/peter-rabbit/peter58.jpg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./manifest.webmanifest"];
const MUSIC_FILES = ["./music/almost-too-serious.m4a","./music/aquarium.m4a","./music/at-the-fireside.m4a","./music/blind-mans-buff.m4a","./music/bumblebee.m4a","./music/child-falling-asleep.m4a","./music/curious-story.m4a","./music/dreaming.m4a","./music/foreign-lands.m4a","./music/gymnopedie.m4a","./music/happiness.m4a","./music/hens-and-roosters.m4a","./music/hobbyhorse.m4a","./music/important-event.m4a","./music/morning-mood.m4a","./music/mountain-king-chase.m4a","./music/mountain-king-sneak.m4a","./music/pleading-child.m4a","./music/poet-speaks.m4a"];
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
