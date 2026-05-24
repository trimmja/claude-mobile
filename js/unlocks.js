// Polls action unlock conditions and fires notifications for newly-unlocked ones.
// Called by the engine after every action and after every new day.
//
// Only announces a curated list of "real" unlocks (gated by stats/day/contacts).
// NPC actions (visit_/deep_) have their own notification surfaces — meet modal,
// stage-advance popup — and are intentionally excluded here to avoid double-noise.

import { state } from './state.js';
import { ACTION_DEFS } from './actions.js';
import { ACTION_TEXT } from './language.js';
import { enqueueNotification } from './notifications.js';
import { addJournalEntry } from './journal.js';

const ANNOUNCEABLE = ['commuter_convo', 'host_english', 'observe_shrine', 'onsen_visit'];

// One-time backfill for existing saves loading v17 for the first time.
// Marks all currently-unlocked announceable actions as already-notified so the
// player doesn't get retroactive toasts for things they unlocked weeks ago.
export function silentBackfillUnlocks() {
  if (state.flags.notifiedUnlocks.length > 0) return;
  for (const id of ANNOUNCEABLE) {
    const def = ACTION_DEFS[id];
    if (def?.unlocked()) state.flags.notifiedUnlocks.push(id);
  }
}

export function checkUnlocks() {
  for (const id of ANNOUNCEABLE) {
    if (state.flags.notifiedUnlocks.includes(id)) continue;
    const def = ACTION_DEFS[id];
    if (!def || !def.unlocked()) continue;

    state.flags.notifiedUnlocks.push(id);

    const text = ACTION_TEXT[id];
    const name = text ? text.en : id;
    const reason = (def.unlockHint || '').replace(/^Requires\s+/i, '') || 'now available';

    addJournalEntry({
      id: `unlock_${id}`,
      icon: '🔓',
      title: `Unlocked: ${name}`,
      body: `${reason}. A new option is open to you.`,
      type: 'unlock',
    });
    enqueueNotification({
      type: 'toast',
      icon: '🔓',
      title: `New: ${name}`,
      desc: reason,
    });
  }
}
