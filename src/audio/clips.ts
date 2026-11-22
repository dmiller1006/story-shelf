import type { Mood } from './moods';
import tracks from './tracks.json';

export interface Track {
  id: string;
  title: string;
  composer: string;
  performer: string;
  license: string;
  /** Wikimedia Commons page of the original recording. */
  source: string;
  /** Direct link to the original file (used by scripts/fetch-music-sources.sh). */
  url: string;
  /** Moods whose playlist includes this track. Special tracks are only used by pages that name them. */
  moods: Mood[];
  /** Seconds into the original recording where the clip starts and ends (used by scripts/build-music.mjs). */
  start?: number;
  end?: number;
}

export const TRACKS: Track[] = tracks as Track[];

export function trackUrl(id: string): string {
  return `./music/${id}.m4a`;
}

export function playlistFor(mood: Mood): Track[] {
  return TRACKS.filter((t) => t.moods.includes(mood));
}

export function findTrack(id: string): Track | undefined {
  return TRACKS.find((t) => t.id === id);
}

/** A tiny silent WAV, played once inside the first tap so iOS lets these elements play later. */
function silentWav(): string {
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const s = (o: number, str: string) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  s(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  s(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true);
  v.setUint32(28, 16000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  s(36, 'data');
  v.setUint32(40, samples * 2, true);
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return 'data:audio/wav;base64,' + btoa(bin);
}

interface Slot {
  el: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  owner: object | null;
}

/**
 * A few <audio> elements routed into Web Audio. Elements stream from blob URLs, so
 * memory stays small and offline playback works from the service worker cache.
 */
export class ClipPool {
  private slots: Slot[] = [];
  private blobs = new Map<string, Promise<string>>();

  constructor(private readonly ctx: AudioContext, size = 3) {
    const silent = silentWav();
    for (let i = 0; i < size; i++) {
      const el = new Audio();
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      el.src = silent;
      // Must happen inside the unlocking tap on iOS.
      void el.play().then(() => el.pause()).catch(() => {});
      this.slots.push({ el, source: ctx.createMediaElementSource(el), owner: null });
    }
  }

  /** Hands out a free element. If all are busy, the oldest is taken over (it is fading out anyway). */
  take(owner: object): Slot {
    const free = this.slots.find((s) => !s.owner) ?? this.slots[0];
    free.el.onended = null;
    free.el.pause();
    free.source.disconnect();
    free.owner = owner;
    // Move to the end so the oldest borrower is first in line to be taken over.
    this.slots = [...this.slots.filter((s) => s !== free), free];
    return free;
  }

  release(slot: Slot, owner: object) {
    if (slot.owner !== owner) return;
    slot.el.onended = null;
    slot.el.pause();
    slot.source.disconnect();
    slot.owner = null;
  }

  /** Whether `owner` still holds this slot. */
  holds(slot: Slot, owner: object): boolean {
    return slot.owner === owner;
  }

  /** Fetches the clip (through the service worker cache) and returns a blob URL. */
  url(id: string): Promise<string> {
    let p = this.blobs.get(id);
    if (!p) {
      p = fetch(trackUrl(id))
        .then((r) => {
          if (!r.ok) throw new Error(`music ${id}: ${r.status}`);
          return r.blob();
        })
        .then((b) => URL.createObjectURL(b));
      p.catch(() => this.blobs.delete(id));
      this.blobs.set(id, p);
      // Keep only a handful of decoded files around.
      if (this.blobs.size > 8) {
        const [oldest, oldUrl] = this.blobs.entries().next().value!;
        this.blobs.delete(oldest);
        void oldUrl.then((u) => URL.revokeObjectURL(u)).catch(() => {});
      }
    }
    return p;
  }

  get context() {
    return this.ctx;
  }
}

/** Plays a playlist of recordings for one mood (or one named track). */
export class ClipPlayer {
  readonly bus: GainNode;
  private slot: Slot | null = null;
  private stopTime = Infinity;
  private stopped = false;
  private index: number;
  thin = false;
  /** Set when a clip could not be loaded, so the engine can fall back to synthesized music. */
  failed = false;

  constructor(
    private readonly pool: ClipPool,
    out: AudioNode,
    readonly key: string,
    readonly mood: Mood,
    private readonly playlist: Track[],
    startIndex: number,
    private readonly fadeIn: number,
    private readonly onIndex: (i: number) => void,
  ) {
    const ctx = pool.context;
    this.index = startIndex % playlist.length;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(out);
    void this.play(true);
  }

  get finished(): boolean {
    return this.pool.context.currentTime > this.stopTime;
  }

  get trackId(): string {
    return this.playlist[this.index].id;
  }

  scheduleUntil() {
    /* recordings schedule themselves */
  }

  private async play(first: boolean) {
    const track = this.playlist[this.index];
    this.onIndex(this.index);
    let url: string;
    try {
      url = await this.pool.url(track.id);
    } catch {
      this.failed = true;
      return;
    }
    if (this.stopped) return;
    if (this.slot && !this.pool.holds(this.slot, this)) return; // taken over by a newer player
    if (!this.slot) {
      this.slot = this.pool.take(this);
      this.slot.source.connect(this.bus);
      this.slot.el.onended = () => {
        if (this.stopped) return;
        this.index = (this.index + 1) % this.playlist.length;
        void this.play(false);
      };
    }
    const el = this.slot.el;
    el.src = url;
    el.currentTime = 0;
    try {
      await el.play();
    } catch {
      this.failed = true;
      return;
    }
    if (first) {
      const ctx = this.pool.context;
      const g = this.bus.gain;
      g.cancelScheduledValues(ctx.currentTime);
      g.setValueAtTime(0, ctx.currentTime);
      g.linearRampToValueAtTime(this.thin ? 0.4 : 1, ctx.currentTime + this.fadeIn);
    }
  }

  fadeOut(seconds: number) {
    const ctx = this.pool.context;
    const now = ctx.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    this.stopTime = Math.min(this.stopTime, now + seconds);
    window.setTimeout(() => this.stop(), seconds * 1000 + 50);
  }

  private stop() {
    this.stopped = true;
    if (this.slot) {
      this.pool.release(this.slot, this);
      this.slot = null;
    }
  }

  /** Idle: recordings can't drop instruments, so they just get quieter. */
  setThin(thin: boolean, seconds = 4) {
    if (thin === this.thin) return;
    this.thin = thin;
    const now = this.pool.context.currentTime;
    const g = this.bus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(thin ? 0.4 : 1, now + seconds);
  }

  disconnect() {
    this.stop();
    this.bus.disconnect();
  }
}
