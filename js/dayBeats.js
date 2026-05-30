// Editorial "day-beat" phrase for the Direction D header.
// Content lives in data/dayBeats.json (loaded at boot via gameData.js).
// The phrase is picked deterministically by day+phase so it stays stable within a
// phase (no flicker on the rAF render loop) but varies across the run.

import { state } from './state.js';

let BEATS = {};

export function initDayBeatsFromData(data) {
  BEATS = data?.beats || data || {};
}

// Phase kanji appended after the English phrase (the serif "朝" moment in the design).
const PHASE_KANJI = { morning: '朝', afternoon: '昼', evening: '夜', reflecting: '夜' };

// Weekday derived from the in-game day. Day 1 = Monday; cycles every 7 days.
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function weekdayFor(day) {
  return WEEKDAYS[(day - 1) % 7] || 'Monday';
}

// Returns { phrase, jp } for the current day + phase.
export function dayBeat() {
  const phase = state.time.phase;
  const arr = BEATS[phase] || ['A new moment.'];
  // Offset by phase so the three phases of one day don't all show arr[day].
  const phaseOffset = phase === 'afternoon' ? 2 : phase === 'evening' ? 4 : 0;
  const idx = ((state.time.day - 1) + phaseOffset) % arr.length;
  return { phrase: arr[idx], jp: PHASE_KANJI[phase] || '' };
}
