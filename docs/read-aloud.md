# Read-aloud plan

Status: not built. This is the plan for adding it after the music has been used for a while.

## What it should feel like

- A **Read to me** button on each page. A voice reads the page and each word lights up as it is spoken.
- **Tap a word to hear it.** This is probably the most useful part for a strong reader: he reads on his own and taps "implored", "camomile" or "fortnight" when he gets stuck.
- The music **ducks** (drops about 12 dB) while the voice talks, then comes back up.
- **No auto page turn** by default. He turns the page when he's ready. A grown-up setting can turn on "keep reading" for bedtime.
- Off by default, so reading on his own stays the main thing.

## Where the voice comes from

| Option | Quality | Word highlighting | Cost / work | Offline |
| --- | --- | --- | --- | --- |
| **A. LibriVox recording + forced alignment** | Real human narrator | Exact, from alignment | Medium: one-time alignment per book | Yes, audio files are cached |
| B. Pre-generated neural TTS + timestamps | Good, consistent | Exact, the TTS returns word times | Low per book. Check the voice license. | Yes |
| C. Browser speech (`speechSynthesis`) | Depends on the device. iPad voices are OK. | `boundary` events are unreliable on iOS Safari | None | Mostly |

**Recommendation:** A first, with C as a fallback for books that have no recording.

- LibriVox recordings are public domain. Look for readings of *The Tale of Peter Rabbit* (often inside children's short-works collections) and pick one with a warm, clear reader.
- Forced alignment means a tool that takes audio plus the exact text and returns when each word starts. Options: `aeneas`, Montreal Forced Aligner, or WhisperX. Run it once on a computer and commit the results.
- Check that the recording matches this edition's text. Small differences such as "amongst" vs "among" break alignment, so fix those by hand.

Option C alone isn't good enough. iOS Safari often skips word boundary events, so highlighting would drift or stop. It's fine as a "tap a word to hear it" fallback, since that speaks one word at a time.

## Data

Add an optional `narration` to each page in the book file:

```ts
interface Narration {
  src: string;          // audio file in public/books/<id>/audio/, one per page
  words: Array<{
    start: number;      // seconds into the clip
    end: number;
    p: number;          // paragraph index
    w: number;          // word index within the paragraph
  }>;
}
```

One short clip per page keeps it simple: page turns stop the clip, and nothing has to seek inside a long file.

A script, `scripts/align.mjs`, would read the book file and an aligner's JSON output, then write `narration` back into the book file. Run it once per book.

## Rendering

- Split each paragraph into `<span>` words when narration is on. The text-fit code already measures the box, so spans don't change the layout.
- While a clip plays, use `requestAnimationFrame` to compare `audio.currentTime` with the word list and add a `.reading` class to the current word. Use a soft underline or background, not bold, so the line doesn't reflow.
- Tapping a word with narration plays just that slice of the clip (`start` to `end`). Without narration, it uses `speechSynthesis` for that one word.

## Audio

- Play narration through the same `AudioContext` (`MediaElementAudioSourceNode` or a decoded buffer). Then one tap unlocks everything, and ducking is a single gain change on the music bus.
- Ducking: ramp the music bus to 0.25 over 0.3 s when the voice starts, and back over 1 s when it ends.
- Cache the clips in the service worker like the pictures. Peter Rabbit should be about 5 to 8 MB as AAC at 64 kbps mono.

## Controls

- Reader bar: a "Read to me" button next to the music button. Tapping it reads the current page, and tapping again stops.
- Grown-up settings: Read-aloud on/off, Keep reading (auto page turn after the clip ends plus 1.5 s), and narration volume.
- Gamepad: Y reads the page. Page turners: none, since their keys are already taken by page turns.

## Tests to add

- Every word in the narration data maps to a real word on the page, and the times only go forward.
- e2e: press Read to me, check that `.reading` moves across words and the music bus ducks, then turn the page mid-clip and check that the voice stops.

## Open questions

- Which LibriVox reader? Listen to two or three with him and let him pick.
- Should highlighting be one word at a time or a whole line? Try both with him.
