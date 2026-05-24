// Player-facing journal — append-only record of moments worth remembering.
//
// Entries are added in response to engine events (milestone, NPC meet, stage
// advance, lang level up). They don't trigger their own notifications — the
// engine event that produced them already does (toast / modal / popup).
// What the Journal *does* surface is an unread badge on the tab, so the
// player knows fresh entries are waiting whether or not they caught the toast.

import { state } from './state.js';

export function addJournalEntry({ id, icon, title, body, type, npcId }) {
  if (!id) return false;
  // Dedupe — same id never appears twice.
  if (state.journal.some(e => e.id === id)) return false;
  state.journal.push({
    id,
    day: state.time.day,
    phase: state.time.phase,
    icon,
    title,
    body,
    type,
    npcId: npcId || null,
  });
  state.flags.unreadJournalCount++;
  return true;
}

// Newest first — what the UI renders by default.
export function getJournalEntries() {
  return state.journal.slice().reverse();
}

export function markJournalRead() {
  state.flags.unreadJournalCount = 0;
}

export function unreadJournalCount() {
  return state.flags.unreadJournalCount;
}
