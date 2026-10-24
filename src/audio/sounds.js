/* Synthesized SFX with WebAudio.
   No audio files: every blip is generated from oscillators + envelopes.
   AudioContext is created lazily on the first sound (browsers require
   a user gesture). All sounds are short (< 250ms). */

let ctx = null;
let masterGain = null;
let muted = true;

export function setMuted(m) {
  muted = !!m;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
}

export function isMuted() { return muted; }

function ensureCtx() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.5;
    masterGain.connect(ctx.destination);
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

function blip({ freq = 440, type = 'sine', dur = 0.12, attack = 0.005, decay = 0.12, gain = 0.6, slide = 0 }) {
  const c = ensureCtx();
  if (!c || muted) return;
  if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  if (slide) o.frequency.linearRampToValueAtTime(freq + slide, c.currentTime + dur);
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur + decay);
  o.connect(g).connect(masterGain);
  o.start();
  o.stop(c.currentTime + dur + decay + 0.02);
}

function chord(freqs, opts = {}) {
  freqs.forEach((f, i) => setTimeout(() => blip({ freq: f, ...opts }), i * 35));
}

/* Public sound effects: */

export function sfxExtract() {
  blip({ freq: 520, type: 'triangle', dur: 0.05, decay: 0.10, gain: 0.35, slide: 220 });
}

export function sfxBlock() {
  blip({ freq: 220, type: 'square', dur: 0.06, decay: 0.10, gain: 0.30, slide: -90 });
}

export function sfxHeart() {
  blip({ freq: 140, type: 'sawtooth', dur: 0.18, decay: 0.20, gain: 0.35, slide: -60 });
}

export function sfxWin() {
  chord([523.25, 659.25, 783.99], { type: 'triangle', dur: 0.12, decay: 0.18, gain: 0.30 });
}

export function sfxHint() {
  blip({ freq: 880, type: 'sine', dur: 0.10, decay: 0.14, gain: 0.28, slide: 180 });
}

export function sfxTick() {
  blip({ freq: 1100, type: 'sine', dur: 0.025, decay: 0.04, gain: 0.18 });
}

export function sfxButton() {
  blip({ freq: 920, type: 'sine', dur: 0.02, decay: 0.03, gain: 0.14 });
}

export function sfxFail() {
  chord([369.99, 311.13, 261.63], { type: 'sawtooth', dur: 0.16, decay: 0.22, gain: 0.24, slide: -40 });
}

export function sfxAchievement() {
  chord([659.25, 783.99, 987.77, 1318.51], { type: 'sine', dur: 0.10, decay: 0.22, gain: 0.30 });
}
