# Story system

Story beats are shown after every action completion (bottom-sheet popup).

## stories.json structure (js/stories.js + data/stories.json)

```json
{
  "action_id": [
    { "conditions": { "dayMax": 7 }, "rewards": { "faith": 14, "wisdom": 1 }, "text": "..." },
    { "conditions": { "langMin": 2, "npcMet": "kenji" }, "text": "..." },
    { "conditions": {}, "rewards": {}, "text": "dry catch-all — no reward" }
  ]
}
```

## `rewards` field (optional)
When present on a beat, its values replace the action's `reward` in `actions.json` for non-trust stats (faith, wisdom, contacts, langXP). NPC trust always comes from the action def. Omitting `rewards` means the action's default reward applies. `"rewards": {}` means no reward at all (dry outcome). This is how `pray`, `study_scripture`, and `open_air_preach` produce variable outcomes. **`rewards.energyReward`** (number, optional) overrides the action's `energyReward` from `actions.json` — used for the dry-rest beat (energy +1 instead of +3).

## `penalty` field (optional)
When present, stat losses apply AFTER rewards. Use this for hostile/hollow outcomes that should actually hurt the player. Schema:
- `faith`, `wisdom`, `contacts` — positive magnitudes (deducted; floor at 0)
- `spiritDry` — signed delta (positive = drier, negative = recovers)
- `trust` — `{ id, amount }` (positive magnitude; trust never drops past the current stage's threshold — they don't forget you)
- `npcMood`, `npcStress`, `npcBurden` — signed `{ id, amount }` deltas (mood −5..+5, stress 0..10, burden 0..10)

Penalty beats render a red chip-row under the story popup, play `playSetback()` (descending minor third), and log a journal entry with `type: 'setback'` and icon `⛅`.

## Supported conditions

`dayMin`, `dayMax`, `wisdomMin`, `wisdomMax`, `langMin`, `langMax`, `contactsMin`, `contactsMax`, `spiritDryMin`, `spiritDryMax`, `npcMet` (string), `stageMin_{npcId}`, `stageMax_{npcId}`, `moodMin_{npcId}`, `moodMax_{npcId}`, `stressMin_{npcId}`, `stressMax_{npcId}`, `burdenMin_{npcId}`, `burdenMax_{npcId}`, `daysNotSeenMin_{npcId}`, **`flagSet_{npcId}`** (string — beat only matches when `state.npcs[npcId].flags[<value>]` is present), **`prevBeatId_{actionId}`** (string — matches when the last beat to fire for that action had this `id`).

**Picker bias:** when `spiritDry >= 6` on preaching/tract/study actions, penalty beats are weighted 2× — bad outcomes more likely, not guaranteed.

## Beat-level fields beyond `conditions`, `rewards`, `penalty`
- `id` (string, optional) — when present, fires `state.flags.lastBeatByAction[actionId] = id` after the beat resolves. Enables `prevBeatId_{actionId}` chaining on subsequent runs of the same action.
- `setsFlag` (string, optional) — writes `state.npcs[<actionNPC>].flags[<value>] = state.time.day`. Only takes effect on NPC actions (those in `NPC_ACTION_MAP`); silently ignored elsewhere.
- `clearsFlag` (string, optional) — deletes the named flag on the action's NPC. Use on callback beats so they fire once and step aside.

Flags are short-lived per-NPC carryover for callback beats ("today she apologizes for last time"). Author the original beat with `setsFlag`, then write one or more responder beats that require `flagSet_<sameNpc>` and use `clearsFlag` to consume it. Flag value is the day it was set — useful for future staleness rules.

## Selection
Specific matches (any condition key) take priority over catch-all. Picks randomly among matching specifics. Falls back to catch-all if nothing matches.

**To add story text:** edit `data/stories.json` only — no JS changes needed. To add variable rewards to a beat, add `"rewards": { ... }` alongside the text.

## Popup behaviour
Slides up from bottom, sits above tab bar. Shows NPC portrait for NPC visit/deep actions (determined by `NPC_ACTION_MAP` in `actions.js`, not by naming convention). Skipped when NPC first-meet modal is pending. Auto-dismisses 6s or tap.

---

# Journal (js/journal.js)

Append-only record of important moments in the player's missionary life. Rendered on the bottom-nav "Journal" tab. Empty at start of a new game.

**Entries are added automatically** in response to engine events:
- **Milestone unlock** (`onMilestone`) — every milestone becomes a journal entry
- **NPC first-meet** (`onNPCMeet`) — body = the lang-tiered intro text
- **NPC stage advance** (`onNPCStageAdvance`) — body = the stage-advance moment text from `data/stageAdvances.json`
- **Language level-up** (`onLangLevelUp`) — body = a short flavor line

Entries don't trigger their own notifications — the engine event that produced them already does (toast / modal / popup). The Journal tab badge ("(N)" suffix on the tab label) is the persistent indicator that fresh entries are waiting. Tapping the tab calls `markJournalRead()` and resets the badge to 0.

**Entry shape:** `{ id, day, phase, icon, title, body, type, npcId? }` — `id` is the dedupe key (same id never appears twice).

**Backfill on load:** Saves made before the journal existed have an empty `state.journal`. On load, `save.js` backfills entries for every completed milestone with placeholder day=1/phase=morning.

**To add a new journal-triggering event:** wire it in `js/main.js` next to the existing hooks: `addJournalEntry({...})` + `renderJournal()`.

---

# Reflections (js/reflections.js + data/reflections.json)

End-of-day reflection line. Conditional shape (same specific-3×-over-catch-all weighting as stories.js).

`data/reflections.json` is `{ reflections: [{ conditions, text }] }`.

**Picker condition keys:** `dayMin/Max`, `spiritDryMin/Max`, `contactsTodayMin/Max`, `paydayToday`, `setbackToday`, `langLevelUpToday`, `noActionsToday`, `hadDeepVisitToday_<npcId>`.

State.dayLog carries `startContacts`, `paydayToday`, `setbackToday`, `langLevelUpToday` flags written by `engine.endDay` + `actions.doAction` + `main.onLangLevelUp`.
