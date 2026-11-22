import { ClipPlayer, ClipPool, findTrack, playlistFor } from './clips';
import { makeImpulse, makeKit, type Kit } from './instruments';
import { MOOD_DEFS, type Mood } from './moods';
import { MoodPlayer } from './player';
import { playSfx, type Sfx, type Sting } from './sfx';

const LOOKAHEAD = 0.15;
const TICK_MS = 25;
/** No page turn or tap for this long: drop the melody, keep a soft bed. */
export const THIN_AFTER_MS = 75_000;
/** No activity for this long: let the music fade out until the next page turn. */
export const REST_AFTER_MS = 240_000;
/** Wait this long on a page before changing music, so skimming doesn't restart it on every page. */
export const MOOD_SETTLE_MS = 400;

export type IdleState = 'active' | 'thin' | 'resting';

type Player = MoodPlayer | ClipPlayer;

interface Chain {
  music: GainNode;
  /** Recordings skip the reverb; they already have the room they were recorded in. */
  recordings: GainNode;
  sfx: GainNode;
  master: GainNode;
}

/** Shared output chain: dry + reverb into a gentle limiter, then volume. */
function buildChain(ctx: BaseAudioContext): Chain {
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.005;
  limiter.release.value = 0.2;
  limiter.connect(master);
  const reverb = ctx.createConvolver();
  reverb.buffer = makeImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  reverb.connect(wet);
  wet.connect(limiter);
  const music = ctx.createGain();
  music.gain.value = 0.55;
  music.connect(limiter);
  music.connect(reverb);
  const recordings = ctx.createGain();
  recordings.gain.value = 0.9;
  recordings.connect(limiter);
  const sfx = ctx.createGain();
  sfx.gain.value = 0.6;
  sfx.connect(limiter);
  const sfxSend = ctx.createGain();
  sfxSend.gain.value = 0.4;
  sfx.connect(sfxSend);
  sfxSend.connect(reverb);
  return { music, recordings, sfx, master };
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private kit: Kit | null = null;
  private chain: Chain | null = null;
  private current: Player | null = null;
  private fading: Player[] = [];
  private pool: ClipPool | null = null;
  private recordingsOn = true;
  private targetTrack: string | null = null;
  /** Where each playlist left off, so coming back to a mood plays the next piece. */
  private playlistIndex = new Map<string, number>();
  private timer: number | undefined;
  private lastActivity = Date.now();
  private targetMood: Mood | null = null;
  private pending: number | undefined;
  private volume = 0.7;
  private musicOn = true;
  idle: IdleState = 'active';

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  get state() {
    return {
      mood: this.targetMood,
      playing: this.current?.mood ?? null,
      track: this.current instanceof ClipPlayer ? this.current.trackId : null,
      idle: this.idle,
      context: this.ctx?.state ?? 'locked',
      players: (this.current ? 1 : 0) + this.fading.length,
    };
  }

  /** Must run inside a tap or key handler: browsers only start audio after a user gesture. */
  async unlock() {
    if (!this.ctx) {
      // Safari 16.4+: play through the iPhone/iPad silent switch like a media app.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) {
        try {
          session.type = 'playback';
        } catch {
          /* older Safari */
        }
      }
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'playback' });
      this.kit = makeKit(this.ctx);
      this.chain = buildChain(this.ctx);
      this.chain.master.gain.value = this.volume;
      try {
        this.pool = new ClipPool(this.ctx);
      } catch {
        this.pool = null; // recordings unavailable; synthesized music still works
      }
      this.timer = window.setInterval(() => this.tick(), TICK_MS);
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.targetMood) this.startMood(this.targetMood);
  }

  /** Real recordings (default) or the synthesized loops. */
  setRecordings(on: boolean) {
    if (on === this.recordingsOn) return;
    this.recordingsOn = on;
    if (this.current && this.targetMood) {
      this.stopAll(1);
      this.startMood(this.targetMood);
    }
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.ctx && this.chain) {
      const g = this.chain.master.gain;
      g.cancelScheduledValues(this.ctx.currentTime);
      g.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicOn(on: boolean) {
    this.musicOn = on;
    if (!on) this.stopAll(1);
    else if (this.targetMood) this.startMood(this.targetMood);
  }

  /** Call on every page turn or tap. Brings thinned or resting music back. */
  activity() {
    this.lastActivity = Date.now();
    if (this.idle === 'thin') this.current?.setThin(false, 2);
    if (this.idle === 'resting' && this.targetMood) {
      this.idle = 'active';
      this.startMood(this.targetMood);
    }
    this.idle = 'active';
  }

  /** `track` names a specific recording for this page; otherwise the mood's playlist plays. */
  setMood(mood: Mood, track?: string) {
    this.targetMood = mood;
    this.targetTrack = track ?? null;
    this.activity();
    window.clearTimeout(this.pending);
    if (this.current?.key === this.wantedKey()) return;
    if (!this.current) {
      this.startMood(mood);
      return;
    }
    this.pending = window.setTimeout(() => {
      if (this.targetMood) this.startMood(this.targetMood);
    }, MOOD_SETTLE_MS);
  }

  sfx(name: Sfx | Sting) {
    if (!this.ctx || !this.kit || !this.chain || this.ctx.state !== 'running') return;
    playSfx(this.kit, this.chain.sfx, name, this.ctx.currentTime + 0.01);
  }

  /** The named track if it exists and recordings are on, else the mood. */
  private wantedKey(): string | null {
    if (!this.targetMood) return null;
    if (this.recordingsOn && this.pool && this.targetTrack && findTrack(this.targetTrack)) return `track:${this.targetTrack}`;
    return this.targetMood;
  }

  private startMood(mood: Mood, forceSynth = false) {
    if (!this.ctx || !this.kit || !this.chain || !this.musicOn) return;
    const key = forceSynth ? mood : this.wantedKey() ?? mood;
    if (this.current?.key === key && !forceSynth) return;
    const now = this.ctx.currentTime;
    const def = MOOD_DEFS[mood];
    const urgent = mood === 'chase';
    // Anything already on its way out leaves quickly so flipping pages fast never stacks up music.
    for (const p of this.fading) p.fadeOut(0.3);
    if (this.current) {
      this.current.fadeOut(urgent ? 0.8 : 2);
      this.fading.push(this.current);
    }
    const track = key.startsWith('track:') ? findTrack(key.slice(6)) : undefined;
    const playlist = track ? [track] : playlistFor(mood);
    if (!forceSynth && this.recordingsOn && this.pool && playlist.length > 0) {
      const index = this.playlistIndex.get(key) ?? 0;
      this.current = new ClipPlayer(this.pool, this.chain.recordings, key, mood, playlist, index, urgent ? 0.8 : def.fadeIn, (i) =>
        // Next time this mood comes back, start with the following piece.
        this.playlistIndex.set(key, (i + 1) % playlist.length),
      );
      return;
    }
    const start = now + (this.current ? (urgent ? 0.05 : 0.6) : 0.05);
    this.current = new MoodPlayer(this.kit, this.chain.music, mood, start, def.fadeIn);
  }

  private stopAll(seconds: number) {
    if (this.current) {
      this.current.fadeOut(seconds);
      this.fading.push(this.current);
      this.current = null;
    }
  }

  private tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    // A recording that can't load (offline before it was cached, or a decode error) falls back to synth.
    if (this.current?.failed) this.startMood(this.current.mood, true);
    const until = this.ctx.currentTime + LOOKAHEAD;
    this.current?.scheduleUntil(until);
    for (const p of this.fading) p.scheduleUntil(until);
    this.fading = this.fading.filter((p) => {
      if (!p.finished) return true;
      // Give reverb tails a moment before cutting the bus.
      window.setTimeout(() => p.disconnect(), 3000);
      return false;
    });

    const quiet = Date.now() - this.lastActivity;
    if (this.idle === 'active' && quiet > THIN_AFTER_MS) {
      this.idle = 'thin';
      this.current?.setThin(true, 5);
    } else if (this.idle === 'thin' && quiet > REST_AFTER_MS) {
      this.idle = 'resting';
      this.stopAll(8);
    }
  }

  dispose() {
    window.clearInterval(this.timer);
    void this.ctx?.close();
  }
}

/** Renders a mood without a speaker. Used by tests to check level and clipping. */
export async function renderMood(mood: Mood, seconds: number, sampleRate = 22050) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const kit = makeKit(ctx);
  const chain = buildChain(ctx);
  chain.master.gain.value = 1;
  const player = new MoodPlayer(kit, chain.music, mood, 0, 0.01);
  player.scheduleUntil(seconds);
  const buffer = await ctx.startRendering();
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
      sum += v * v;
      count += 1;
    }
  }
  return { peak, rms: Math.sqrt(sum / count) };
}

/** Renders a sound effect and reports its level. */
export async function renderSfx(name: Sfx | Sting, seconds = 2, sampleRate = 22050) {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const kit = makeKit(ctx);
  const chain = buildChain(ctx);
  chain.master.gain.value = 1;
  playSfx(kit, chain.sfx, name, 0.01);
  const buffer = await ctx.startRendering();
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    for (const v of buffer.getChannelData(ch)) peak = Math.max(peak, Math.abs(v));
  }
  return { peak };
}
