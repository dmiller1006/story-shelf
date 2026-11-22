// Synthesized instruments. Every sound is built from oscillators and noise,
// so there is nothing to license and nothing to download.

export interface Kit {
  ctx: BaseAudioContext;
  noise: AudioBuffer;
}

export function makeKit(ctx: BaseAudioContext): Kit {
  const length = ctx.sampleRate;
  const noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return { ctx, noise };
}

/** A stereo room reverb impulse made from decaying noise. */
export function makeImpulse(ctx: BaseAudioContext, seconds = 2.4, decay = 3): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buffer;
}

const SILENT = 0.0001;

function envGain(ctx: BaseAudioContext, dest: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(dest);
  return g;
}

function osc(ctx: BaseAudioContext, type: OscillatorType, freq: number, dest: AudioNode, t: number, stop: number, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.setValueAtTime(detune, t);
  o.connect(dest);
  o.start(t);
  o.stop(stop);
  return o;
}

/** Percussive envelope: fast attack, exponential decay. */
function strike(g: GainNode, t: number, peak: number, decay: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(SILENT, t + decay);
}

/** Sustained envelope: attack, hold until t+dur, then release. */
function swell(g: GainNode, t: number, peak: number, attack: number, dur: number, release: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.min(attack, dur));
  g.gain.setValueAtTime(peak, t + Math.max(dur, attack));
  g.gain.exponentialRampToValueAtTime(SILENT, t + Math.max(dur, attack) + release);
}

export function musicBox(kit: Kit, dest: AudioNode, freq: number, t: number, vel = 0.5) {
  const { ctx } = kit;
  const partials: Array<[number, number, number]> = [
    [1, 1, 1.6],
    [4, 0.22, 0.5],
    [6.3, 0.06, 0.25],
  ];
  for (const [mult, amp, decay] of partials) {
    const g = envGain(ctx, dest);
    strike(g, t, vel * amp, decay);
    osc(ctx, 'sine', freq * mult, g, t, t + decay + 0.05);
  }
}

export function bell(kit: Kit, dest: AudioNode, freq: number, t: number, vel = 0.5) {
  const { ctx } = kit;
  const partials: Array<[number, number, number]> = [
    [1, 1, 1.8],
    [2.76, 0.3, 0.8],
    [5.4, 0.1, 0.35],
  ];
  for (const [mult, amp, decay] of partials) {
    const g = envGain(ctx, dest);
    strike(g, t, vel * amp, decay);
    osc(ctx, 'sine', freq * mult, g, t, t + decay + 0.05);
  }
}

export function pluck(kit: Kit, dest: AudioNode, freq: number, t: number, dur: number, vel = 0.5) {
  const { ctx } = kit;
  const decay = Math.min(Math.max(dur + 0.15, 0.25), 0.7);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1;
  filter.frequency.setValueAtTime(Math.min(freq * 5, 9000), t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.2, 200), t + 0.25);
  const g = envGain(ctx, dest);
  filter.connect(g);
  strike(g, t, vel, decay);
  osc(ctx, 'triangle', freq, filter, t, t + decay + 0.05);
  const sawGain = ctx.createGain();
  sawGain.gain.value = 0.25;
  sawGain.connect(filter);
  osc(ctx, 'sawtooth', freq, sawGain, t, t + decay + 0.05);
}

export function flute(kit: Kit, dest: AudioNode, freq: number, t: number, dur: number, vel = 0.5) {
  const { ctx } = kit;
  const g = envGain(ctx, dest);
  swell(g, t, vel, 0.12, dur, 0.3);
  const end = t + dur + 0.4;
  const main = osc(ctx, 'sine', freq, g, t, end);
  const overtone = ctx.createGain();
  overtone.gain.value = 0.1;
  overtone.connect(g);
  osc(ctx, 'triangle', freq * 2, overtone, t, end);
  // Gentle vibrato that arrives after the note settles.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(0.4, dur));
  lfo.connect(depth);
  depth.connect(main.frequency);
  lfo.start(t);
  lfo.stop(end);
}

export function pizzBass(kit: Kit, dest: AudioNode, freq: number, t: number, vel = 0.5) {
  const { ctx } = kit;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = envGain(ctx, dest);
  filter.connect(g);
  strike(g, t, vel, 0.35);
  osc(ctx, 'triangle', freq, filter, t, t + 0.4);
}

export function softBass(kit: Kit, dest: AudioNode, freq: number, t: number, dur: number, vel = 0.5) {
  const { ctx } = kit;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;
  const g = envGain(ctx, dest);
  filter.connect(g);
  swell(g, t, vel, 0.06, dur * 0.9, 0.35);
  const end = t + dur + 0.4;
  osc(ctx, 'sine', freq, filter, t, end);
  const tri = ctx.createGain();
  tri.gain.value = 0.3;
  tri.connect(filter);
  osc(ctx, 'triangle', freq, tri, t, end);
}

export function pad(kit: Kit, dest: AudioNode, freqs: number[], t: number, dur: number, vel = 0.5) {
  const { ctx } = kit;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  const g = envGain(ctx, dest);
  filter.connect(g);
  swell(g, t, vel / freqs.length, 1.2, dur, 1.6);
  const end = t + dur + 1.7;
  for (const f of freqs) {
    osc(ctx, 'sawtooth', f, filter, t, end, -7);
    osc(ctx, 'sawtooth', f, filter, t, end, 7);
  }
}

export function noiseBurst(
  kit: Kit,
  dest: AudioNode,
  t: number,
  opts: { type: BiquadFilterType; freq: number; q?: number; peak: number; attack?: number; decay: number; endFreq?: number },
) {
  const { ctx, noise } = kit;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.setValueAtTime(opts.freq, t);
  if (opts.endFreq) filter.frequency.exponentialRampToValueAtTime(opts.endFreq, t + opts.decay);
  filter.Q.value = opts.q ?? 1;
  const g = envGain(ctx, dest);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.peak, t + (opts.attack ?? 0.003));
  g.gain.exponentialRampToValueAtTime(SILENT, t + (opts.attack ?? 0.003) + opts.decay);
  src.connect(filter);
  filter.connect(g);
  src.start(t, Math.random() * 0.5);
  src.stop(t + (opts.attack ?? 0.003) + opts.decay + 0.05);
}

export function hat(kit: Kit, dest: AudioNode, t: number, vel = 0.5) {
  noiseBurst(kit, dest, t, { type: 'highpass', freq: 7000, peak: vel, decay: 0.04 });
}

export function softDrum(kit: Kit, dest: AudioNode, t: number, vel = 0.5) {
  const { ctx } = kit;
  const g = envGain(ctx, dest);
  strike(g, t, vel, 0.3);
  const o = osc(ctx, 'sine', 140, g, t, t + 0.35);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.14);
}

/** Rising or falling sine, used for bird chirps and boings. */
export function sweep(kit: Kit, dest: AudioNode, t: number, from: number, to: number, dur: number, vel = 0.4, type: OscillatorType = 'sine') {
  const { ctx } = kit;
  const g = envGain(ctx, dest);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vel, t + 0.01);
  g.gain.exponentialRampToValueAtTime(SILENT, t + dur);
  const o = osc(ctx, type, from, g, t, t + dur + 0.02);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
}
