# Architecture

## Event-driven (no setInterval)
The engine is event-driven. There is **no tick loop**. Actions resolve instantly when the player taps a card; phase transitions fire when time hits 0 (or the player taps End Phase); day transitions fire when the player taps Continue on the end-of-day screen.

## Notification queue (`js/notifications.js`)
All player-facing events — story popups, NPC first-meet modal, stage-advance moments, milestone toasts, payday toasts, phase auto-advance toasts, end-of-day overlay — go through a single queue. The queue shows ONE event at a time; the next event does not fire until the current one is dismissed (tap, button, or auto-timeout).

- **Renderers** are registered in `main.js` (`registerNotificationRenderer(type, fn)`) — each renderer takes the event payload and a `done()` callback it must invoke when its UI is dismissed.
- **Enqueue** with `enqueueNotification({ type, ...payload })` — engine hooks in `main.js` do this instead of calling `showToast/showStoryPopup/showModal` directly.
- **Why this exists:** Without the queue, end-of-day overlay would cover a story popup and the popup would only surface again after the day had already advanced. The queue enforces strict FIFO order.
- **Registered types:** `story`, `toast`, `npcMeet`, `conversion`, `stageAdvance`, `npcStateShift`, `goHome`, `endOfDay`. Future: `letter` (Step 7), `journalEntry` (Step D), `unlockNotice` (Step F).
  - `goHome` (v37): fires when the evening ends while the player is away from home. Renders a forced modal (`showGoHomeModal` — no backdrop/close, only a **Go Home** button). Its `done()` is called when Go Home is tapped, which then runs the cinematic travel home → arrival fires the reflection.
- **Queue is in-memory only** — on page reload the in-flight queue is lost. Persistent flags like `pendingEndOfDay` survive in save and re-enqueue on boot.

## Action flow
1. UI → `bindActionList` click → `main.js` `handleAction(id)` → `engine.doAction(id)`
2. `engine.doAction` calls `actions.js doAction` which: checks unlock → spends time → spends energy → spends other costs → **selects story beat** → applies rewards (beat.rewards if present, else def.reward) → updates dayLog → rolls NPC encounter. Beat is selected before rewards so its `rewards` field can override the blanket action reward.
3. Engine fires hooks in order: `onActionComplete`, then `onNPCMeet` (if NPC first-met this action), then `onNPCStageAdvance` (for each stage advance queued by `addNPCTrust`), then loops `checkMilestones` for any newly-triggered milestones, then `onMilestone` for each. The story popup is suppressed if a first-meet or stage advance is about to fire — those bigger moments take precedence.
4. Engine checks `state.time.remaining <= 0` → auto-calls `endPhase(true)`.
5. `endPhase` fires `onBetweenPhases` (empty hook — future home for NPC moods/weather) + `onPhaseChange` to UI; refills time, does NOT refill energy. On evening end, sets `pendingEndOfDay` and fires `onEndOfDayReady` → UI shows reflection screen.
   - **Go-home gate (v37):** on evening end, if `state.location !== 'apartment'`, `endPhase` does NOT enter `reflecting`. Instead it sets `flags.pendingGoHome` (once) and fires `onGoHomeReady` → `goHome` modal; the phase stays `evening` (time 0). Only after the player travels home (a *free* trip — see travel below) does `endPhase` take the at-home branch: clear `pendingGoHome`, set `reflecting` + `pendingEndOfDay`, fire `onEndOfDay`/`onEndOfDayReady`. So **the day can only end from home.**
6. `endDay` increments day, resets phase to morning, refills both time AND energy, restores small faith, runs payday check, runs milestone check.

## Travel (`engine.doTravel` / `locations.travelTo`)
`doTravel(loc, { free })` → `travelTo(loc, free)`. `free` skips the time cost (used only by the end-of-day trip home, when phase-time is already 0) but still moves you; cost reported as 0. All trips route through `main.runTravel(loc)`, which plays a cinematic ~5s full-screen train video (`showTravelOverlay`, `#travel-overlay`, `assets/video/travel.MP4`) and then commits `doTravel` in the overlay's completion callback. For the free home trip, `doTravel`'s own "time ≤ 0 → `endPhase`" path arrives at the at-home reflection branch automatically.
7. `requestAnimationFrame(loop)` in `main.js` calls `renderFrame()` ~60fps (HUD, header, phase strip, action list). Action list rebuild is gated by a cache key so it only rebuilds when something changed.

## State object shape
```js
{
  meta: { version: 2, saveDate: null },
  character: { name: '', spiritDry: 0 },     // spiritDry 0–10: player's own dryness — ticks up from penalty beats + dry days; down from pray/rest/onsen
  time: {
    day: 1,
    phase: 'morning',          // 'morning' | 'afternoon' | 'evening' | 'reflecting'
    actionsThisPhase: 0,
    remaining: 6,              // time units left in current phase
    max: 6,                    // from data/timing.json
  },
  resources: {
    faith:    { current: 50, max: 100 },     // restored +faithPerDay at start of each day
    contacts: 0,
    money:    { current: 300, nextPayday: 6 },
    wisdom:   0,
    energy:   { current: 14, max: 14 },      // DAILY pool — refills only at start of new day
  },
  language: { xp: 0, level: 0 },             // 0–5
  location: 'apartment',                     // auto-updates to last-action's location (flavor)
  npcs: {
    kenji: { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 3, burden: 5, firedEvents: [], flags: {} },
    yuki:  { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 2, burden: 3, firedEvents: [], flags: {} },
    hiro:  { met: false, trust: 0, stage: 0, lastSeenDay: null, mood: 0, stress: 1, burden: 7, firedEvents: [], flags: {} },
    // mood: -5 to +5 (warmth); stress: 0–10 (busyness, blocks visits); burden: 0–10 (weariness, opens gospel)
    // firedEvents: scripted event IDs already fired (prevents re-firing)
    // flags: { name: dayItWasSet } — Phase C carryover for callback beats; set by setsFlag, consumed by clearsFlag
  },
  world: {},                                 // empty — placeholder for future weather/events (Step 4)
  milestones: { completed: [] },
  journal: [],                               // append-only: { id, day, phase, icon, title, body, type, npcId? }
  stats: { converts: 0, actionsCompleted: 0, onsenVisited: false, daysSurvived: 0 },
  flags: {
    muted: false,
    pendingNPCMeet: null,
    pendingMilestone: null,
    pendingEndOfDay: false,                  // true → UI shows reflection screen
    pendingGoHome: false,                    // true → evening ended away from home; must travel home before the day can end (v37)
    pendingStageAdvances: [],                // [{ npcId, newStage }] — drained by engine after each action
    pendingLangLevelUp: 0,                   // 0 if none; otherwise new level — drained by engine
    unreadJournalCount: 0,                   // badge on Journal tab; resets when player taps it
    lastBeatByAction: {},                    // { actionId: beatId } — last beat with explicit id per action; powers prevBeatId_X
  },
  dayLog: {
    phases: { morning: [], afternoon: [], evening: [] },  // rebuilt each day
    startContacts: 0,                        // snapshot at start of day — used to compute contactsToday for reflections
    paydayToday: false,                      // set true by engine.endDay when payday fires
    setbackToday: false,                     // set true by actions.doAction when a beat with a penalty fired
    langLevelUpToday: false,                 // set true by main.onLangLevelUp when level rose today
  },
}
```

## Time and energy
- **Time** is per-phase. `state.time.remaining` ticks down from `state.time.max` (default 6) as actions are taken. When it hits 0, the phase auto-advances. Refilled at the start of each phase.
- **Energy** is per-day. `state.resources.energy.current` ticks down from `.max` (default 14) across all three phases. Only refills at the start of a new day.
- **Faith** is restored by +`faithPerDay` (default 3) at the start of each day. No per-tick regen anywhere.
- **Payday** fires when `state.time.day >= state.resources.money.nextPayday` (default every 6 days).

## Hooks for future steps (empty no-ops in Step 1)
- `hooks.onBetweenPhases({ from, to })` — fires on each phase transition. Future home for NPC mood drift, weather re-rolls.
- `hooks.onEndOfDay({ dayLog })` — fires before the reflection screen. Future home for emergent events (persecution, letters from home, NPC inter-interactions).
- `hooks.onGoHomeReady()` — fires when the evening ends away from home (v37). `main.js` enqueues the `goHome` modal.

## Save versioning
Auto-saves after every action, on every phase end, and on every day end. localStorage key `tokyo_called_v2`. Saves with `meta.version < 2` are wiped on load.

When deploying: bump `APP_VERSION` in `js/version.js`, `CACHE` in `sw.js`, and `?v=` param on script tag in `index.html`. All three should match.
