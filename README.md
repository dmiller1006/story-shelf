# Story Shelf

Picture books in the browser for a six-year-old who reads well. The music follows the story: page by page it shifts between cozy, playful, sneaky, chase, sad and sleepy. Turn pages by tapping, swiping, a Bluetooth page turner, or an Xbox controller.

Books, all by Beatrix Potter with her original color illustrations:

| Book | Year | Pages | Tap sounds |
| --- | --- | --- | --- |
| The Tale of Peter Rabbit | 1902 | 27 | munching, sparrows, splash, "Kertyschoo!", crash, hoe |
| The Tale of Benjamin Bunny | 1904 | 26 | pony trotting, a tumble, munching, a crash |
| The Tale of Jemima Puddle-Duck | 1908 | 26 | quacks, whooshing flight, the puppies' commotion |
| The Tale of Mr. Jeremy Fisher | 1906 | 26 | ribbits, plops, the trout's splash, munching |

Grew out of the adaptive-soundtrack reader idea in [homebase](https://github.com/dmiller1006/homebase/blob/main/ideas/adaptive-soundtrack-epub-reader.md), aimed at kids and picture books instead of adult EPUBs. Picture books have fixed pages, so cues follow page numbers instead of text positions.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Vite prints a local URL and a network URL. Open the network one on an iPad on the same Wi-Fi.

To install it on the iPad home screen and use it offline, it has to be served over HTTPS. Over plain `http://` on the LAN it still works, just not offline.

## Deploying (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, then publish `dist/` to the `gh-pages` branch.

One-time setup in the repo on GitHub:

1. **Settings → Pages → Build and deployment → Source:** choose **Deploy from a branch**, then branch **gh-pages**, folder **/ (root)**, and Save. Or from a terminal, after the first deploy has made the branch:

   ```bash
   gh api -X POST repos/<user>/story-shelf/pages -f "source[branch]=gh-pages" -f "source[path]=/"
   ```

2. The site appears at `https://<user>.github.io/story-shelf/` a minute later.

Pages is free for public repos. A private repo needs a paid GitHub plan for Pages.

On the iPad, open the site in Safari, then Share → **Add to Home Screen**. It opens full screen and works offline after the first visit.

## How it works

| Part | Where | Notes |
| --- | --- | --- |
| Book data | `src/books/*.ts` | Text, picture, picture description, mood, tap sound and stings for each page |
| Pictures | `public/books/<id>/` | Public-domain scans from Project Gutenberg (eBooks #14838, #14407, #14814, #15077), resized to 900px and whitened at the edges so they blend into the page |
| Recordings | `src/audio/tracks.json`, `public/music/` | 19 public-domain classical recordings, three or so per mood, plus a few pieces tied to specific pages |
| Built-in music | `src/audio/moods.ts` | Six short loops written as note patterns and synthesized live. Used when recordings are off or can't load |
| Instruments | `src/audio/instruments.ts` | Music box, bell, pluck, flute, pizzicato and soft bass, pad, soft drum, noise sounds |
| Engine | `src/audio/engine.ts`, `src/audio/player.ts`, `src/audio/clips.ts` | Schedules notes ahead of time, crossfades moods, handles idle |
| Input | `src/input.ts` | Keyboard, page turners, gamepad, swipe |
| Screens | `src/main.ts`, `src/styles.css` | Shelf, cover, reader, The End, grown-up settings |
| Offline | `vite.config.ts` | Small service worker plugin that caches every built file |

### Music rules

- Each page has a mood, and each mood has a short playlist of recordings. Pages in a row with the same mood keep the same piece playing, so the music does not restart. When a piece ends, the next one in the playlist starts. Coming back to a mood later picks up with the next piece.
- A page can name a specific piece instead (`track` in the book file). Jemima sets off to Grieg's *Morning Mood*, her farmyard gets Saint-Saëns' *Hens and Roosters*, and Jeremy's pond gets *Aquarium*.
- If a recording can't load (offline before it was cached), the built-in music for that mood plays instead.
- A new mood waits 0.4 s and then crossfades over about 2 s (chase comes in faster). Flipping quickly through pages does not restart the music on every page.
- After 75 s with no page turn or tap, the melody drops out and a soft bed stays. After 4 minutes the music fades away. The next page turn brings it back.
- Music only reflects the page on screen, so it never hints at what comes next.
- On iPhone and iPad, sound needs one tap first (Apple's rule). The cover's big Start button covers that. It also asks Safari to play through the silent switch, like a media app.
- Recordings are leveled to set loudness: sleepy and sad pieces softest (-23 LUFS), chase loudest (-20), the rest in between (-21). The built-in moods render at a similar loudness to each other (RMS 0.09 to 0.13) with headroom. The e2e test checks this.

### Music recordings

All come from Wikimedia Commons: Schumann's *Kinderszenen* (Musopen), Grieg's *Peer Gynt* (Musopen), Satie's first *Gymnopédie*, *Flight of the Bumblebee* (US Army Band) and two Saint-Saëns pieces from *The Carnival of the Animals*. All are public domain except the two Saint-Saëns, which are CC BY-SA 2.0. Grown-up settings lists every piece with its performer, license and source.

To add or change one:

1. Add an entry to `src/audio/tracks.json` with its Commons page, direct file URL, moods, and optionally `start`, `end` (seconds) and `loudness` (LUFS).
2. Put the original in `music-src/` (gitignored), named as on Commons. Wikimedia rate-limits cloud servers, so `scripts/fetch-music-sources.sh` downloads them on a home computer and pushes them to a `music-src` branch.
3. Run `node scripts/build-music.mjs` (add `--only id,id` for some). It trims, fades, levels with ffmpeg's two-pass loudnorm and writes `public/music/<id>.m4a` (AAC 96 kbps).
4. `npm test` fails if a track has no built file.

### Page turning

| Input | Next | Back |
| --- | --- | --- |
| Touch | Tap right arrow, swipe left | Tap left arrow, swipe right |
| Keyboard or page turner | Right/Down arrow, Page Down, Space, Enter | Left/Up arrow, Page Up, Backspace |
| Xbox controller | A, RB, D-pad right, stick right | B, LB, D-pad left, stick left |

Most Bluetooth page turners and presentation clickers send one of those keys. Some phone "camera shutter" remotes send Volume Up, which a browser can't see.

Tapping the picture plays a sound. Most pages give a chime, and some have their own (see the table at the top).

### Grown-up settings

Press and hold the gear for about a second. Settings: music on/off, real recordings or built-in music, volume, tap sounds, text size (Medium, Large, Huge), Paper or Night theme, debug info, and restart the book. Music credits are at the bottom. Settings and the current page are saved in the browser.

Add `?debug` to the URL to see the current mood, idle state and the last input. That last one helps when you're testing a new page turner.

## Tests

```bash
npm test
```

Unit tests: music theory, every mood pattern, the recordings list (licenses, sources, every mood covered, every file built), book data (each picture exists, valid moods and sounds, full text in order), and key and button mapping.

```bash
npm run build && npm run e2e
```

Browser test against the production build. It reads Peter Rabbit cover to cover with a page turner, and checks that text fits without scrolling on all 105 pages of every book at Large and Huge on iPad, phone and laptop sizes. A phone held sideways is the one exception: two long Jemima pages scroll there. It also tests a simulated Xbox controller, swipes, the settings long-press, music on and off, recordings on and off, the level of every mood and sound effect, and loading offline. Add `-- --shots <dir>` to save screenshots.

## Adding a book

1. Put the pictures in `public/books/<id>/`. Resize them to about 900px. If a scan's paper is off-white, whiten it or it shows as a box.
2. Write `src/books/<id>.ts` like the others: for each page, its picture, a short picture description, the text, a mood, and optionally a tap sound or sting. Check each picture against its text by eye. Gutenberg's HTML sometimes groups pictures in pairs (Jeremy Fisher did).
3. Add it to `BOOKS` in `src/books/index.ts`.
4. Run `npm test`. It checks every picture and mood.

Good next picks, all public domain with original art and mirrored on GitHub by GITenberg: more Potter (*Squirrel Nutkin*, *Tom Kitten*, *Two Bad Mice*, *Mr. Tod*, *Johnny Town-Mouse*), *The Velveteen Rabbit* (1922; longer text, needs text-only pages), Kipling's *Just So Stories* (1902).

## Next

- Read-aloud: see [docs/read-aloud.md](docs/read-aloud.md).
- More books.
