# Idea: music sections matched to page content

Status: idea, not started.

## The idea

Today each page has one of six moods, and each mood has a playlist of whole pieces. Instead:

1. **Cut the recordings into sections** of about 30 seconds, split at natural phrase breaks rather than every 30 s exactly.
2. **Tag each section.** Dan picks tags from a fixed list of adjectives and keywords (for example: gentle, bouncy, tiptoe, running, stormy, sleepy, sad, silly, grand, watery, farmyard, night). The list is a starting point; Dan edits it.
3. **Analyze each page** (text and picture description) and give it tags from the same list.
4. **Match:** each page plays the section whose tags fit best. Neighboring pages that fit the same section keep it playing, as moods do now.

## Open questions

- Cutting: by hand with start/end times in `tracks.json`, or detect phrase breaks automatically (silence or loudness dips) and let Dan adjust?
- Tagging pages: by hand in the book files, by a script using an LLM, or both (script suggests, Dan approves)?
- Matching: best tag overlap, with a penalty for switching sections too often?
- Transitions: crossfade between sections, or wait for a section to end?
- Does `mood` stay as a fallback for the built-in music?

## Where it would touch

- `scripts/build-music.mjs`: write one file per section, or keep whole files and seek to a start time.
- `src/audio/tracks.json`: sections with tags.
- `src/books/*.ts`: tags per page.
- `src/audio/engine.ts`, `src/audio/clips.ts`: pick a section per page.
