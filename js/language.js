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
  rest:             { jp: '休む',           en: 'Rest' },
  study_scripture:  { jp: '聖書を読む',     en: 'Study Scripture' },
  study_japanese:   { jp: '日本語の勉強',   en: 'Study Japanese' },
  hand_tracts:      { jp: 'チラシを配る',   en: 'Hand Out Tracts' },
  commuter_convo:   { jp: '話しかける',     en: 'Commuter Conversation' },
  open_air_preach:  { jp: '路上で説教',     en: 'Open Air Preach' },
  casual_convo:     { jp: '世間話',         en: 'Casual Conversation' },
  host_english:     { jp: '英会話イベント', en: 'Host English Event' },
  observe_shrine:   { jp: '神社を観察する', en: 'Observe & Listen' },
  onsen_visit:      { jp: '温泉に行く',     en: 'Onsen Visit' },
  visit_kenji:      { jp: '健二とコーヒー',   en: 'Coffee with Kenji' },
  visit_yuki:       { jp: '由紀と話す',       en: 'Chat with Yuki' },
  visit_hiro:       { jp: '浩と座る',         en: 'Sit with Hiro' },
  evening_kenji:    { jp: '健二との夜',           en: 'Evening with Kenji' },
  questions_yuki:   { jp: '由紀の問いに向き合う', en: 'Questions with Yuki' },
  pray_hiro:        { jp: '浩と祈る',             en: 'Pray with Hiro' },
  disciple_kenji:   { jp: '健二を導く',           en: 'Mentor Kenji' },
  disciple_yuki:    { jp: '由紀と聖書を学ぶ',     en: 'Study with Yuki' },
  disciple_hiro:    { jp: '浩と歩む',             en: 'Walk with Hiro' },
};

// One-line flavor shown on the Direction D dock cards (under the name).
// Plain, missionary-toned; kept short so the 2-line clamp rarely truncates.
export const ACTION_DESC = {
  pray:             'Kneel on the tatami. Quiet the city.',
  rest:             'Half a phase of sleep. Wake up a person again.',
  study_scripture:  'Sit with the Word before the day starts.',
  study_japanese:   'Drill kanji. Slow, humbling work.',
  hand_tracts:      'Stand by the kiosk. Offer. Be ignored. Offer again.',
  commuter_convo:   'Try a real exchange with a stranger.',
  open_air_preach:  'Raise your voice over Yoyogi. Most walk past.',
  casual_convo:     'An easy word with someone on a bench.',
  host_english:     'Run the conversation table. Your whole evening.',
  observe_shrine:   'Watch how this culture prays. Learn before you speak.',
  onsen_visit:      '“The church of the Japanese,” Kenji called it.',
  visit_kenji:      'Kiosk coffee before his 12-hour day.',
  visit_yuki:       'She brings her notebook of hard questions.',
  visit_hiro:       'The bench. The pigeons. No need for words.',
  evening_kenji:    'A long evening. The guard comes down in pieces.',
  questions_yuki:   'Her written questions, one by one.',
  pray_hiro:        'Pray aloud on the bench. He closes his eyes.',
  disciple_kenji:   'He reads on his commute now. Practical questions.',
  disciple_yuki:    'Romans, side by side, Japanese and English.',
  disciple_hiro:    'He reads in Emiko’s chair. Some days, chrysanthemums.',
};

export function actionDesc(id) { return ACTION_DESC[id] || ''; }

// UI labels that shift to Japanese at language level 0
export const TAB_LABELS = {
  actions: { jp: '行動', en: 'Actions' },
  people:  { jp: '人々', en: 'People' },
  journal: { jp: '日記', en: 'Journal' },
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
// On level-up, sets state.flags.pendingLangLevelUp so the engine can fire onLangLevelUp.
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
    state.flags.pendingLangLevelUp = newLevel;
    return true;
  }
  return false;
}
