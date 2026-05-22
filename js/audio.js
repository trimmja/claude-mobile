import { state } from './state.js';

let ctx = null;

function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.25, delay = 0) {
  const c = ac();
  if (!c || state.flags.muted) return;
  try {
    const osc  = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.value = freq;
    const t = c.currentTime + delay;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch (e) {}
}

export function playTap() {
  tone(660, 0.06, 'sine', 0.12);
}

export function playActionComplete() {
  tone(523, 0.25, 'sine', 0.20);
  tone(659, 0.25, 'sine', 0.15, 0.08);
}

export function playMilestone() {
  tone(523, 0.3, 'sine', 0.22);
  tone(659, 0.3, 'sine', 0.18, 0.10);
  tone(784, 0.5, 'sine', 0.18, 0.20);
}

export function playLevelUp() {
  [392, 494, 587, 740].forEach((f, i) => tone(f, 0.25, 'sine', 0.18, i * 0.09));
}

export function playNPCMeet() {
  tone(440, 0.2, 'sine', 0.18);
  tone(550, 0.3, 'sine', 0.15, 0.12);
}

export function playPayday() {
  tone(330, 0.2, 'triangle', 0.2);
  tone(440, 0.2, 'triangle', 0.18, 0.12);
  tone(550, 0.3, 'triangle', 0.16, 0.24);
}

export function toggleMute() {
  state.flags.muted = !state.flags.muted;
  return state.flags.muted;
}
