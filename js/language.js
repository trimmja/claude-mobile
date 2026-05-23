import { state } from './state.js';

// XP thresholds per level (0–5)
const THRESHOLDS = [0, 20, 50, 80, 95, 100];

export const LOCATION_TEXT = {
  apartment: { jp: 'アパート',   en: 'Your Apartment' },
  station:   { jp: '新宿駅',     en: 'Shinjuku Station' },
  park:      { jp: '代々木公園', en: 'Yoyogi Park' },
  cafe:      { jp: 'カフェ',     en: 'English Conversation Café' },
  shrine:    { jp: '神社',       en: 'Local Shrine' },
  onsen:     { jp: '温泉',       en: 'Onsen' },
};

export const ACTION_TEXT = {
  pray:             { jp: '祈り',           en: 'Pray' },
  study_scripture:  { jp: '聖書を読む',     en: 'Study Scripture' },
  study_japanese:   { jp: '日本語の勉強',   en: 'Study Japanese' },
  hand_tracts:      { jp: 'チラシを配る',   en: 'Hand Out Tracts' },
  commuter_convo:   { jp: '話しかける',     en: 'Commuter Conversation' },
  open_air_preach:  { jp: '路上で説教',     en: 'Open Air Preach' },
  casual_convo:     { jp: '世間話',         en: 'Casual Conversation' },
  host_english:     { jp: '英会話イベント', en: 'Host English Event' },
  observe_shrine:   { jp: '神社を観察する', en: 'Observe & Listen' },
  onsen_visit:      { jp: '温泉に行く',     en: 'Onsen Visit' },
  visit_kenji:      { jp: '健二を訪ねる',   en: 'Visit Kenji' },
  visit_yuki:       { jp: '由紀を訪ねる',   en: 'Visit Yuki' },
  visit_hiro:       { jp: '浩を訪ねる',     en: 'Visit Hiro' },
  deep_kenji:       { jp: '健二と深く話す', en: 'Deep Talk — Kenji' },
  deep_yuki:        { jp: '由紀と深く話す', en: 'Deep Talk — Yuki' },
  deep_hiro:        { jp: '浩と深く話す',   en: 'Deep Talk — Hiro' },
};

// UI labels that shift to Japanese at language level 0
export const TAB_LABELS = {
  actions:    { jp: '行動', en: 'Actions' },
  people:     { jp: '人々', en: 'People' },
  milestones: { jp: '目標', en: '★ Goals' },
};

export function langLevel() { return state.language.level; }

export function langProgress() {
  const lv = state.language.level;
  if (lv >= 5) return 1;
  const from = THRESHOLDS[lv];
  const to   = THRESHOLDS[lv + 1];
  return (state.language.xp - from) / (to - from);
}

// Returns the JP + EN pair for a location
export function locText(id) { return LOCATION_TEXT[id] || { jp: id, en: id }; }

// Returns display name for location (JP at level 0, EN after level 1)
export function locName(id) {
  const t = LOCATION_TEXT[id];
  if (!t) return id;
  return state.language.level >= 1 ? t.en : t.jp;
}

// Returns both JP and EN for action names
export function actionText(id) { return ACTION_TEXT[id] || { jp: id, en: id }; }

// Adds XP, updates level. Returns true if leveled up.
export function addLangXP(amount) {
  if (state.language.level >= 5) return false;
  const oldLevel = state.language.level;
  state.language.xp = Math.min(100, state.language.xp + amount);
  let newLevel = 0;
  for (let i = 1; i <= 5; i++) {
    if (state.language.xp >= THRESHOLDS[i]) newLevel = i;
  }
  if (newLevel > oldLevel) {
    state.language.level = newLevel;
    return true;
  }
  return false;
}
