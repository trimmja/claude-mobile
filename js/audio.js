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

// Descending minor third — the "something was lost" cue.
// Quieter and shorter than playActionComplete so it lands as a sigh, not an alarm.
export function playSetback() {
  tone(330, 0.22, 'sine', 0.16);
  tone(262, 0.30, 'sine', 0.14, 0.10);
}

// Warm major-7 arpeggio — the "relationship deepened" cue.
// Softer + slower than playMilestone so it lands as warmth, not triumph.
// Reserved for NPC stage advances (1–4, 6–7). Conversion (stage 5) uses playMilestone;
// Elder (stage 8) uses playElderChord below.
export function playStageAdvance() {
  tone(392, 0.35, 'sine',     0.14);          // G4
  tone(494, 0.40, 'sine',     0.13, 0.14);    // B4
  tone(587, 0.55, 'triangle', 0.11, 0.28);    // D5 — softer triangle for the held note
}

// Fuller variant of playStageAdvance — adds an octave G above + a small held bass.
// Reserved for Stage 8 (Elder) — the "they're a leader now" cue. Warmer than playMilestone,
// fuller than playStageAdvance.
export function playElderChord() {
  tone(196, 0.60, 'triangle', 0.10);          // G3 — held bass
  tone(392, 0.35, 'sine',     0.14, 0.04);    // G4
  tone(494, 0.40, 'sine',     0.13, 0.18);    // B4
  tone(587, 0.55, 'triangle', 0.11, 0.32);    // D5
  tone(784, 0.55, 'sine',     0.10, 0.46);    // G5 — octave shimmer
}

export function toggleMute() {
  state.flags.muted = !state.flags.muted;
  // Sync ambient audio with mute state
  const amb = document.getElementById('station-ambience');
  if (amb) amb.muted = state.flags.muted;
  return state.flags.muted;
}

// ── Station ambient audio ─────────────────────────────────────────────────
let _ambienceFadeTimer = null;

export function startStationAmbience() {
  const amb = document.getElementById('station-ambience');
  if (!amb) return;
  amb.muted = state.flags.muted;
  amb.volume = 0;
  amb.play().catch(() => {}); // silently ignore autoplay block
  // Fade in over 1.5s
  clearInterval(_ambienceFadeTimer);
  _ambienceFadeTimer = setInterval(() => {
    const target = 0.35;
    if (amb.volume < target - 0.01) {
      amb.volume = Math.min(target, amb.volume + 0.02);
    } else {
      amb.volume = target;
      clearInterval(_ambienceFadeTimer);
    }
  }, 40);
}

export function stopStationAmbience() {
  const amb = document.getElementById('station-ambience');
  if (!amb) return;
  // Fade out over 1s, then pause
  clearInterval(_ambienceFadeTimer);
  _ambienceFadeTimer = setInterval(() => {
    if (amb.volume > 0.02) {
      amb.volume = Math.max(0, amb.volume - 0.02);
    } else {
      amb.volume = 0;
      amb.pause();
      clearInterval(_ambienceFadeTimer);
    }
  }, 30);
}
