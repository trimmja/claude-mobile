# Japan Evangelistic Band — Claude Context

This file is the entry point for Claude. The auto-loaded companions are:

@ROADMAP.md
@PROGRESS.md
@CHARACTERS.md

`TODO.md` is read on demand when Jacob says "process todo" — see the TODO workflow section below.

---

## About me

- Beginner — no coding experience. Prefer plain-language explanations.
- I work in the local folder `jbe` (GitHub repo: `trimmja/japan-evangelistic-band`).
- I lean on Claude for everything — planning, design, code, commits.
- Ask before pushing to GitHub unless I say to publish / push / save to GitHub.
- **Hosting & testing:** GitHub Pages — https://trimmja.github.io/japan-evangelistic-band/ (not `claude-mobile`). Mostly test on **iPhone**. Push then refresh; stale PWA → Settings → **Load latest update** or reinstall Home Screen shortcut.
- Real missionary experience in Japan — keep the game culturally authentic.

---

## Coding guidelines (AI)

Behavioral guidelines to reduce common LLM coding mistakes. **Bias toward caution over speed** — for trivial tasks, use judgment.

**Project rules:** plain-language explanations; ask before push; for balance changes, edit `data/*.json` → push → refresh on iPhone to verify.

**1. Think before coding** — Don't assume or hide confusion. State assumptions; present multiple interpretations; suggest simpler approaches; stop and ask when unclear.

**2. Simplicity first** — Minimum code for the ask. No extra features, single-use abstractions, unrequested configurability, or impossible-case error handling. If 200 lines could be 50, rewrite.

**3. Goal-driven execution** — Turn asks into verifiable goals (tests, repro steps, before/after checks). Multi-step work gets a short plan with a verify line per step. Prefer strong success criteria over "make it work."

**4. No conflicting cost+reward on the same stat** — Never define an action that both costs AND rewards the same resource (e.g. `cost.faith: 5, reward.faith: 3` is forbidden — that's a net-negative on faith). If an action is meant to grow a stat, the cost goes to a *different* stat (time, energy, money, etc.). If it's meant to drain a stat, no reward on that stat. This rule applies to every action in `data/actions.json` and any future action definitions. Caught once on `study_scripture` — don't reintroduce.

---

## What this project is
A PWA simulation game about being an American missionary in Tokyo, Japan.
Built by someone with real missionary experience in Japan — authenticity matters.
Playable on iPhone via GitHub Pages (Add to Home Screen as a standalone app).
Dark theme, cherry blossom + gold palette, Japanese kanji in the UI that translates
as the player's language skill grows.

**Game model:** Turn-based **phase + time + energy** simulation (NOT a real-time idle game). Each day has three phases — Morning / Afternoon / Evening. Each phase has a **time budget** (default 6 units); when time runs out the phase auto-advances. Across the whole day you have an **energy budget** (default 14) that refills only at the next morning. Every action costs both time AND energy in different ratios. See `ROADMAP.md` for the full design direction and the multi-step plan (Steps 1–7).

## Live game
Deploy via: GitHub repo → Settings → Pages → branch `claude/environment-selection-iphone-EohwW` → root
URL: `https://trimmja.github.io/japan-evangelistic-band/` (not `claude-mobile` — that URL 404s)

## Tech stack
- Pure HTML/CSS/Vanilla JS — no build step, no framework, no package.json
- ES modules (`<script type="module">`) — works on GitHub Pages as-is
- localStorage for save/load
- Web Audio API for procedural sounds (no audio files needed)
- PWA: `manifest.json` + `sw.js` service worker for iPhone "Add to Home Screen"

## File map
```
ROADMAP.md            — design direction, locked decisions, multi-step roadmap (Steps 1–7)
PROGRESS.md           — what's actually shipped, ideas backlog
CHARACTERS.md         — NPC bios (read before any NPC change)
data/actions.json     — action defs: timeCost, energyCost, energyReward, cost, reward, npcChance
data/timing.json      — timePerPhase, energyPerDay, faithPerDay, payday config
data/stories.json     — story beat text keyed by action + conditions (editable content)
data/reflections.json — short reflection lines for the end-of-day screen
data/stageAdvances.json — text shown when an NPC advances to a new relationship stage (per NPC, per stage)
data/README.md        — how to edit the JSON files
index.html            — full game shell (all DOM structure, all IDs)
css/style.css         — all styles (dark theme, cherry blossom + gold palette)
js/main.js            — entry point: boot, intro screen, startGame(), engine hooks
js/gameData.js        — loads data/*.json at startup
js/state.js           — single mutable state object (source of truth, imported everywhere)
js/engine.js          — event-driven engine: doAction, endPhase, endDay; hooks
js/save.js            — localStorage save/load/reset (key: 'tokyo_called_v2')
js/language.js        — JP→EN translation, XP thresholds, addLangXP(), TAB_LABELS
js/resources.js       — spend/gain (incl. spendTime + spendEnergy + refillTime + refillEnergyDaily)
js/actions.js         — ACTION_DEFS, ACTION_UNLOCK, ACTION_VISIBLE, doAction, hasFittingAction
js/locations.js       — LOCATION_DEFS, LOCATION_ORDER, TRAVEL_COSTS, travelTo() — real navigation, see "Travel" section
js/npcs.js            — NPC_DEFS, getIntroText(), getStageAdvanceHint(), addNPCTrust()
js/stories.js         — getStoryText(actionId, state) — picks story beat from stories.json
js/reflections.js     — pickReflection() — random line for end-of-day screen
js/milestones.js      — MILESTONE_DEFS, checkMilestones() (called after each action + on new day)
js/journal.js         — addJournalEntry / getJournalEntries / markJournalRead — append-only record powering the Journal tab
js/unlocks.js         — checkUnlocks() polls action unlock conditions and notifies on newly-unlocked actions
js/audio.js           — playTap/ActionComplete/Milestone/LevelUp/NPCMeet/Payday, toggleMute(); startStationAmbience()/stopStationAmbience() fade station ambient in/out; toggleMute() also syncs ambient muted state
js/ui.js              — all DOM rendering + phase strip + top-bar + bottom-sheet + end-of-day screen; renderFrame() on rAF; togglePanel()/bindSheetHandle()/bindSceneOpenBtn() control the panel
js/notifications.js   — sequential notification queue: events show one at a time, next blocks until current dismissed
js/version.js         — APP_VERSION (bump when deploying); hardRefreshApp()
js/parseDuration.js   — (legacy, unused — kept for possible future "real minutes" time UI)
manifest.json         — PWA config (display: standalone)
sw.js                 — caches all JS/CSS/HTML; bump CACHE version to match APP_VERSION; MP4/video files are bypassed (browser needs Range requests for video)
assets/images/npcs/   — NPC portrait images (kenji/yuki/hiro.png); kanji fallback if missing
assets/video/shinjuku.MP4 — looping 10s video of Shinjuku Station; used as animated background (muted <video>) + ambient audio source (<audio>) when player is at station
```

---

## Architecture

### Event-driven (no setInterval)
The engine is event-driven. There is **no tick loop**. Actions resolve instantly when the player taps a card; phase transitions fire when time hits 0 (or the player taps End Phase); day transitions fire when the player taps Continue on the end-of-day screen.

### Notification queue (`js/notifications.js`)
All player-facing events — story popups, NPC first-meet modal, stage-advance moments, milestone toasts, payday toasts, phase auto-advance toasts, end-of-day overlay — go through a single queue. The queue shows ONE event at a time; the next event does not fire until the current one is dismissed (tap, button, or auto-timeout).

- **Renderers** are registered in `main.js` (`registerNotificationRenderer(type, fn)`) — each renderer takes the event payload and a `done()` callback it must invoke when its UI is dismissed.
- **Enqueue** with `enqueueNotification({ type, ...payload })` — engine hooks in `main.js` do this instead of calling `showToast/showStoryPopup/showModal` directly.
- **Why this exists:** Without the queue, end-of-day overlay would cover a story popup and the popup would only surface again after the day had already advanced. The queue enforces strict FIFO order.
- **Registered types:** `story`, `toast`, `npcMeet`, `endOfDay`. Future: `journalEntry` (Step D), `unlockNotice` (Step F).
- **Queue is in-memory only** — on page reload the in-flight queue is lost. Persistent flags like `pendingEndOfDay` survive in save and re-enqueue on boot.

### Action flow
1. UI → `bindActionList` click → `main.js` `handleAction(id)` → `engine.doAction(id)`
2. `engine.doAction` calls `actions.js doAction` which: checks unlock → spends time → spends energy → spends other costs → applies rewards → updates dayLog → rolls NPC encounter.
3. Engine fires hooks in order: `onActionComplete`, then `onNPCMeet` (if NPC first-met this action), then `onNPCStageAdvance` (for each stage advance queued by `addNPCTrust`), then loops `checkMilestones` for any newly-triggered milestones, then `onMilestone` for each. The story popup is suppressed if a first-meet or stage advance is about to fire — those bigger moments take precedence.
4. Engine checks `state.time.remaining <= 0` → auto-calls `endPhase(true)`.
5. `endPhase` fires `onBetweenPhases` (empty hook — future home for NPC moods/weather) + `onPhaseChange` to UI; refills time, does NOT refill energy. On evening end, sets `pendingEndOfDay` and fires `onEndOfDayReady` → UI shows reflection screen.
6. `endDay` increments day, resets phase to morning, refills both time AND energy, restores small faith, runs payday check, runs milestone check.
7. `requestAnimationFrame(loop)` in `main.js` calls `renderFrame()` ~60fps (HUD, header, phase strip, action list). Action list rebuild is gated by a cache key so it only rebuilds when something changed.

### State object shape
```js
{
  meta: { version: 2, saveDate: null },
  character: { name: '' },
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
    kenji: { met: false, trust: 0, stage: 0, lastSeenDay: null },
    yuki:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
    hiro:  { met: false, trust: 0, stage: 0, lastSeenDay: null },
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
    pendingStageAdvances: [],                // [{ npcId, newStage }] — drained by engine after each action
    pendingLangLevelUp: 0,                   // 0 if none; otherwise new level — drained by engine
    unreadJournalCount: 0,                   // badge on Journal tab; resets when player taps it
  },
  dayLog: { phases: { morning: [], afternoon: [], evening: [] } },  // rebuilt each day
}
```

### Time and energy
- **Time** is per-phase. `state.time.remaining` ticks down from `state.time.max` (default 6) as actions are taken. When it hits 0, the phase auto-advances. Refilled at the start of each phase.
- **Energy** is per-day. `state.resources.energy.current` ticks down from `.max` (default 14) across all three phases. Only refills at the start of a new day.
- **Faith** is restored by +`faithPerDay` (default 3) at the start of each day. No per-tick regen anywhere.
- **Payday** fires when `state.time.day >= state.resources.money.nextPayday` (default every 6 days).

### Hooks for future steps (empty no-ops in Step 1)
- `hooks.onBetweenPhases({ from, to })` — fires on each phase transition. Future home for NPC mood drift, weather re-rolls.
- `hooks.onEndOfDay({ dayLog })` — fires before the reflection screen. Future home for emergent events (persecution, letters from home, NPC inter-interactions).

---

## CSS design tokens (css/style.css)
```css
--bg: #0F0F1A           /* deep navy background */
--surface: #1A1A2E      /* card background */
--surface-2: #252540    /* elevated card */
--surface-3: #303058    /* inputs, track backgrounds */
--text: #F0EDE8         /* warm white */
--text-muted: #8080A8
--text-dim: #454568
--sakura: #FF8FAB       /* cherry blossom pink — primary accent; also time bar */
--sakura-light: #FFB3C6
--gold: #F0C040         /* gold — milestones, achievements */
--faith: #A78BFA        /* purple */
--trust: #34D399        /* green */
--money: #FBBF24        /* amber */
--wisdom: #60A5FA       /* blue */
--lang: #FB7185         /* coral/red */
--energy: #FCD34D       /* warm yellow — energy bar + ⚡ tags */
--danger: #F87171
--success: #34D399
```
Fonts: `Nunito` (English UI) + `Noto Sans JP` (Japanese text) — Google Fonts in `index.html`.

---

## Locations

**Locations are real now — `state.location` is where you ARE.** Actions are filtered by it (a station action only appears when you're at the station). The `.location-view` background reflects your current location.

You change location with **Travel** — see the Travel section below.

| ID | Icon | JP | EN | BG class |
|----|------|----|----|----------|
| apartment | 🏠 | アパート | Your Apartment | bg-apartment (purple) |
| station   | 🚉 | 駅       | Shinjuku Station | bg-station (blue) |
| park      | 🌸 | 公園     | Yoyogi Park    | bg-park (green) |
| cafe      | ☕ | カフェ   | English Café   | bg-cafe (brown) |
| shrine    | ⛩️ | 神社     | Local Shrine   | bg-shrine (red) |
| onsen     | ♨️ | 温泉     | Onsen          | bg-onsen (teal) |

The previous per-location unlock conditions (e.g. café requires wisdom 10) are now baked into the individual **action** unlocks instead. E.g. `host_english` requires wisdom ≥ 10; the café-located action is hidden behind that, but the café "location" itself isn't gated.

---

## Language progression (js/language.js)

XP thresholds: `[0, 20, 50, 80, 95, 100]`
- Level 0: kanji UI labels, no commuter_convo, NPC intros mostly in Japanese
- Level 1: English UI labels + tab names, commuter_convo unlocks, NPC intros mixed
- Level 2: NPC open→studying stage accessible, NPC intros fully in English
- Level 3: NPC studying→believer stage accessible
- Level 4: (reserved)
- Level 5: full fluency

`TAB_LABELS` exported from `language.js` — used by `renderHUD()` to update tab text when level changes.

---

## Travel (js/locations.js)

Travel is how `state.location` changes. It costs **time only** (never energy). Cost is destination-based and independent of where you came from:

| Destination | Time |
|-------------|------|
| Apartment (home) | 1 |
| Station | 1 |
| Shrine | 1 |
| Café | 2 |
| Park (Yoyogi) | 2 |
| Onsen | 3 |

**Where you wake up:** `engine.endDay()` resets `state.location = 'apartment'` — each new morning starts at home.

**Travel UI:** Always-visible row inside `.top-bar` (between the HUD and the scene, above `.location-view`). Shows one Travel button per other location with ⏳cost; disabled when you can't afford it. Tapping calls `engine.doTravel(locId)`. The `📍 You are at: …` header is gone — current location is shown in the `.location-info` overlay on the scene itself.

**People-tab tap-to-visit:** Each met NPC card has "Visit" and (if unlocked) "Heart-to-Heart" buttons. Tapping handles travel automatically: if the relevant action's location differs from `state.location`, travel runs first, then the action runs. Button shows `→ ☕ ⏳2` chip when travel is needed.

**Action filtering:** `allVisibleActions()` filters by `state.location`. An action's `location` field must equal `state.location` for the card to appear. A `null` location means "available anywhere" — currently only `pray` (1 time / 0 energy filler — missionaries pray everywhere).

**Actions no longer auto-update location.** The old auto-set in `doAction` is removed; only `doTravel()` writes to `state.location`.

**The `hasFittingAction()` shortcut:** Returns true if there's at least 1 time left (since travel costs 1 minimum, you can always go somewhere). Only returns false when the time bar is genuinely empty.

---

## Actions (js/actions.js)

Actions resolve **instantly** when tapped (with a brief CSS card-flash animation + story popup). Costs and rewards apply in the same call inside `doAction()`. No "in-flight" action state, no progress bar, no cancel.

**Each action costs both time AND energy** (in different ratios — see `data/actions.json`). Time gates the phase, energy gates the day. Examples:
- `pray` = 1 time, 0 energy (always-available filler)
- `rest` = 3 time, +3 energy (half-phase recovery)
- `open_air_preach` = 2 time, 3 energy (short + intense)
- `visit_hiro` = 3 time, 1 energy (long + restful — Hiro is presence-based)
- `host_english` = 4 time, 3 energy (whole evening)

**Visibility vs. unlock vs. fits-now:** Actions have three separate concepts:
- `visible()` — if false, card is completely hidden (NPC actions before NPC is met)
- `unlocked()` — if false, card shows as locked/greyed with requirements visible
- `disabled-time` / `disabled-energy` — visually dimmed when current time/energy can't afford the cost

**`hasFittingAction()`** in `actions.js` returns whether any visible+unlocked+affordable action exists. UI uses this to glow the End Phase button + show "— nothing more fits this phase —" nudge.

**Stat bonuses (applied in `applyRewards()`):**
- Communication actions (`hand_tracts`, `commuter_convo`, `casual_convo`, `host_english`): +contacts scaled to language level
- Spiritual actions (`pray`, `study_scripture`, `observe_shrine`): +faith scaled to wisdom
- NPC visit/deep actions: +trust scaled to language level (langWeight)

Adding a new action: entry in `data/actions.json` (with `timeCost` + `energyCost`) + rule in `ACTION_UNLOCK` + rule in `ACTION_VISIBLE` (if NPC-gated) + entry in `REQUIREMENT_BUILDERS` (if it has visible requirements) + name in `js/language.js` `ACTION_TEXT`.

---

## NPCs (js/npcs.js)

**Bios, arcs, langWeights, and future church roles all live in `CHARACTERS.md`** — always read that first before touching NPC code or content. This section covers code/data only.

| NPC | Met via | npcChance |
|---|---|---|
| Kenji (健二) | hand_tracts at station | 30% |
| Yuki (由紀) | host_english at café | 45% |
| Hiro (浩) | open_air_preach at park / observe_shrine at shrine | 35% / 25% |

**NPC_DEF fields:**
- `introByLang[]` — first-meet text indexed by language level (0/1/2+); picked by `getIntroText(npcId)`
- `stages[]` — stage name strings
- `trustNeeded[]` — trust threshold per stage
- `stageCondition[]` — extra condition functions per stage advance
- `stageConditionHints[]` — human-readable hint strings for those conditions

**Key functions:**
- `getIntroText(npcId)` — returns correct intro for current language level
- `getStageAdvanceHint(npcId)` — returns "X trust to next stage" or "Needs: Wisdom 15" or null
- `addNPCTrust(npcId, amount)` — applies trust + checks stage advance

**Stage thresholds (shared):**
```
Stage 0: Stranger     — trust: 0
Stage 1: Acquaintance — trust: 10
Stage 2: Friend       — trust: 28
Stage 3: Open         — trust: 55  + wisdom >= 15
Stage 4: Studying     — trust: 85  + lang level (varies per NPC)
Stage 5: Believer     — trust: 100 + lang >= 3
```

---

## Story system (js/stories.js + data/stories.json)

Story beats are shown after every action completion (bottom-sheet popup).

**stories.json structure:**
```json
{
  "action_id": [
    { "conditions": { "dayMax": 7 }, "text": "..." },
    { "conditions": { "langMin": 2, "npcMet": "kenji" }, "text": "..." },
    { "conditions": {}, "text": "catch-all fallback" }
  ]
}
```

**Supported conditions:** `dayMin`, `dayMax`, `wisdomMin`, `langMin`, `langMax`, `npcMet` (string), `stageMin_{npcId}`, `stageMax_{npcId}`

**Selection:** specific matches (any condition key) take priority over catch-all. Picks randomly among matching specifics. Falls back to catch-all if nothing matches.

**To add story text:** edit `data/stories.json` only — no JS changes needed.

**Popup behaviour:** slides up from bottom, sits above tab bar. Shows NPC portrait for `visit_*/deep_*` actions. Skipped when NPC first-meet modal is pending. Auto-dismisses 6s or tap.

---

## Journal (js/journal.js)

Append-only record of important moments in the player's missionary life. Rendered on the bottom-nav "Journal" tab. Empty at start of a new game.

**Entries are added automatically** in response to engine events:
- **Milestone unlock** (`onMilestone`) — every milestone becomes a journal entry
- **NPC first-meet** (`onNPCMeet`) — body = the lang-tiered intro text
- **NPC stage advance** (`onNPCStageAdvance`) — body = the stage-advance moment text from `data/stageAdvances.json`
- **Language level-up** (`onLangLevelUp`) — body = a short flavor line

Entries don't trigger their own notifications — the engine event that produced them already does (toast / modal / popup). The Journal tab badge ("(N)" suffix on the tab label) is the persistent indicator that fresh entries are waiting. Tapping the tab calls `markJournalRead()` and resets the badge to 0.

**Entry shape:** `{ id, day, phase, icon, title, body, type, npcId? }` — `id` is the dedupe key (same id never appears twice).

**Backfill on load:** Saves made before the journal existed have an empty `state.journal`. On load, `save.js` backfills entries for every completed milestone with placeholder day=1/phase=morning (real day isn't recoverable from historical data).

**To add a new journal-triggering event:** wire it in `js/main.js` next to the existing hooks: `addJournalEntry({...})` + `renderJournal()`. The Journal tab DOM is rebuilt on hook so even if the tab is currently visible, new entries appear immediately.

---

## Milestones (js/milestones.js)

| ID | Icon | Name | Trigger |
|----|------|------|---------|
| first_conversation | 💬 | First Conversation | contacts >= 1 |
| bible_accepted | 📖 | Someone Accepts a Bible | any NPC stage >= 1 |
| lang_level_1 | 🗣️ | Ohayō Gozaimasu | language level >= 1 |
| first_coffee | ☕ | First Coffee Together | any NPC met + trust >= 12 |
| first_month | 📅 | First Month Survived | day >= 30 |
| wisdom_15 | 📚 | The Word Takes Root | wisdom >= 15 |
| lang_level_2 | 🌏 | Getting Through | language level >= 2 |
| first_home_visit | 🏡 | A Japanese Home | any NPC trust >= 30 |
| first_bible_study | ✝️ | First Bible Study | any NPC stage >= 4 |
| onsen | ♨️ | The Onsen | stats.onsenVisited === true |
| first_convert | 🕊️ | First Convert | stats.converts >= 1 |
| lang_level_4 | 📣 | Preaching in Japanese | language level >= 4 |
| hundred_contacts | 👥 | 100 Contacts | contacts >= 100 |
| small_group | 🙌 | A Small Group | converts >= 2 + wisdom >= 50 |
| first_disciple | ⭐ | First Disciple | converts >= 1 + day >= 50 |

---

## UI layout (index.html)

```
[#story-popup]      — bottom-sheet popup; slides up after action; tap to dismiss
[#end-of-day]       — full-overlay reflection screen; appears when evening ends
[game-header]       — character name | "Day N" | ⚙ settings button
[.hud]              — 6 resource widgets: Faith ✦ | Energy ⚡ N/M | Contacts ◈ | Money ◎ | Wisdom ◆ | Language 語
[.top-bar]          — always-visible bar between HUD and scene; two columns:
  [.top-bar-phase]  — phase icon + phase name (EN) + pink scene-time bar fill + "N/M" count
  [#travel-row]     — one Travel button per other location with ⏳cost; disabled when time too low
[.location-view]    — fills remaining vertical space; immersive scene background
  [#location-img]   — still PNG for non-station locations; cross-fades on location change
  [#location-vid]   — looping MP4 for Shinjuku Station only; muted for iOS autoplay; opacity-fades in/out
  [#location-bg]    — CSS-gradient fallback layer (class swapped per location)
  [#scene-open-btn] — floating pill button "↑ Activities" near bottom of scene; tap to open panel; hidden when panel is open
  [.location-info]  — JP/EN location name overlaid at bottom of scene
[#station-ambience] — hidden <audio> element; plays ambient station sound at volume 0.35 when at station
[#sheet-scrim]      — dark overlay (z-index 19) behind the sheet when open; dims scene + top-bar; tap to close panel
[#bottom-sheet]     — slides up over the scene; fully hidden (translateY 100%) when closed — no peek strip
  [.sheet-handle]   — close-only row at top of sheet; tap to close; shows "↓ tap to close" pill when sheet is open
  [.content-area]   — scrollable panel area
    [#tab-actions]  — phase strip (icon + time bar + End Phase button) + nudge + action list
    [#tab-people]   — .people-list (only met NPCs; empty state if none) + contacts-summary
    [#tab-journal]  — .journal-list (empty on day 1; entries added on milestones, NPC meets, stage advances, lang level-ups; tap to expand body)
  [.content-tabs]   — bottom nav inside the sheet: Activities | People | Journal (📖 — shows "(N)" badge when unread entries)
[#toast]            — fixed, bottom-center; slides up on milestone/payday/phase-auto-advance
[#modal]            — full-screen overlay; NPC first meetings + reset confirm
[#settings-overlay] — bottom sheet; mute + reset buttons
```

**Phase strip** appears in **two places**: (1) `.top-bar` — always visible above the scene, shows phase icon + EN name + pink time bar + `N/M` count. (2) Inside the Activities tab (bottom sheet) — same data plus JP phase name and the End Phase button (glows when no action fits).

**End-of-day screen** (`#end-of-day`) shows: "Day N" header, per-phase summary of actions taken, totals (actions / contacts / lang level / goals), one random reflection line from `data/reflections.json`, Continue button.

---

## Design decisions

- **Turn-based, not real-time** — engine is event-driven; no `setInterval`. Days only advance when the player completes all three phases.
- **Time and energy are different things** — time gates the phase (per-phase budget), energy gates the day (across-phase budget). Different actions cost them in different ratios. See `ROADMAP.md` Section 3 for the rationale.
- **Pray as filler** — `pray` is 1 time, 0 energy, +faith. Always available; absorbs leftover time slots naturally so there's no "stuck with 1 time and nothing to do" corner case.
- **Rest as sabbath** — `rest` is 3 time, 0 energy, +3 energy reward. Half-a-phase commitment for real recovery; can't be looped because of the time cost.
- **NPC visibility** — NPC action cards are invisible until NPC is met (`ACTION_VISIBLE` in `actions.js`). Other gated actions show as locked with requirements.
- **Story popup skips NPC meet** — `pendingNPCMeet` flag is checked; if set, story popup is suppressed so the NPC modal takes focus.
- **Language barrier is a UI mechanic** — tab labels, HUD labels, NPC intro text all shift based on language level. Add more as the game grows.
- **Stat bonuses are modest** — multipliers (lang × 0.25 × contacts, etc.) are noticeable but not game-breaking.
- **Action requirements always visible** — gated actions show every unlock rule on the card. New gated actions need a `REQUIREMENT_BUILDERS` entry.
- **Save** — auto-saves after every action, on every phase end, and on every day end. localStorage key `tokyo_called_v2`. Saves with `meta.version < 2` are wiped on load.
- **Version bump** — when deploying: bump `APP_VERSION` in `js/version.js`, `CACHE` in `sw.js`, and `?v=` param on script tag in `index.html`. All three should match.

---

## NPC interaction system (language-tiered)

**Read `CHARACTERS.md` before writing any NPC story text or changing NPC mechanics.** It has each character's personality, arc, communication style, and langWeight.

### Trust scaling by language level

Each NPC_DEF has a `langWeight` field (0.0–1.0):
- `1.0` = highly language-dependent (Kenji, Yuki) — verbal communication IS the relationship
- `0.3` = presence-based (Hiro) — silence and being there is enough

Trust gain formula (applied in `applyRewards()` in `actions.js`):
```js
const LANG_SCALE = [0.4, 0.7, 1.0, 1.15, 1.3, 1.5]; // indexed by language level 0–5
const langFactor = 1 - (npcDef.langWeight * (1 - LANG_SCALE[lang]));
// Apply langFactor to base npcTrust amount. Then existing lang bonus applies on top.
```

At level 0, Kenji (langWeight 1.0): 40% of base trust — communication is stilted, progress is slow.
At level 0, Hiro (langWeight 0.3): ~82% of base trust — presence counts even without words.
At level 2+: 100% base + existing lang bonus.

### Story branches (3 language tiers)

Every `visit_*` and `deep_*` story entry in `stories.json` must have 3 language-tiered versions:
- `"langMax": 0` — phone translator, gestures, long silences, presence
- `"langMin": 1, "langMax": 1` — basics flow, simple questions, cautious exchange
- `"langMin": 2` — real conversation, things are learned and shared

Combine `langMin`/`langMax` with `stageMin`/`stageMax` as needed.

### NPC action locations (never `null` for NPC visit/deep actions)

| Action | Location | Reason |
|--------|----------|--------|
| visit_kenji | station | He's a commuter; station kiosk coffee. Station always available (avoids café-gate blocking). |
| deep_kenji | cafe | Deeper relationship → proper sit-down café meetup |
| visit_yuki | cafe | Where she is; café unlocks same time as host_english (when you meet her) |
| deep_yuki | cafe | Same venue, deeper depth |
| visit_hiro | park | He's always on the bench |
| deep_hiro | park | Deepest moments happen on the same bench |

### Contact-info rule

NPCs need a plausible reason you can reach them after first meeting:
- **Kenji**: hands you his business card before hurrying off (update intro text)
- **Yuki**: LINE ID exchange at end of English event (update intro text)
- **Hiro**: always at the same park bench — no contact needed

### Action naming convention

NPC interaction cards use narrative names, not generic ones:
- `visit_*` → describes what you're actually doing ("Coffee with Kenji", "Sit with Hiro")
- `deep_*` → "Heart-to-Heart with [Name]"
- JP labels: action-specific, not just "visit"

---

## New NPC checklist

When adding a new NPC, do ALL of these:
1. Add bio to `CHARACTERS.md` — personality, language notes, arc, church role, `langWeight`
2. Add state entry in `js/state.js`: `{ met: false, trust: 0, stage: 0 }`
3. Add `NPC_DEFS` entry in `js/npcs.js` — include `langWeight` + `introByLang[]` with 3 tiers (level 0 / 1 / 2+). Intro text at level 0 must include how the player can reach the NPC again (business card, LINE, or "they're always here").
4. Add `visit_{npc}` + `deep_{npc}` to `data/actions.json` with correct `"location"` (not null)
5. Add unlock/visible rules in `js/actions.js` (ACTION_UNLOCK, ACTION_VISIBLE, REQUIREMENT_BUILDERS, NPC_VISIT_ACTIONS set)
6. Add narrative labels to `js/language.js` ACTION_TEXT
7. Add `npcChance` to the relevant outreach action in `data/actions.json`
8. Write story beats in `data/stories.json` — 3 lang tiers × ~3 stage tiers ≈ ~9 beats per action

## TODO workflow

`TODO.md` is a frictionless brain-dump for bugs and ideas Jacob notices mid-play (especially on iPhone). It's a scratch pad, not a third progress log — it's expected to fill up between sessions and get cleared.

When Jacob says **"process todo"** (or "triage todo" / "clear todo" / similar), do this:

1. Read `TODO.md`
2. For each item, propose a triage:
   - **Fix now** — small bug or quick polish, do it this session
   - **Add to `PROGRESS.md`** — polish backlog item or new idea
   - **Add to `ROADMAP.md`** — direction-level decision or roadmap step
   - **Drop** — already done, duplicate, or not worth keeping
3. Confirm the plan with Jacob before moving anything
4. Apply the triage — write items into target files, then reset `TODO.md` back to the empty template (`## Bugs` / `## Ideas` headers, nothing under them)

Never auto-clear without confirmation. The point of triage is that Jacob sees each item get a home.

---

## Local testing & debugging

**For any UI bug Jacob reports on iPhone ("nothing happens when I tap", "blank area where X should be", "page acts dead"), run the local game with playwright and capture the actual `pageerror` / `console.error` before reading the source.** Reading code by inspection wastes hours; playwright surfaces the real cause in one run. We learned this the hard way debugging v17's "actions don't fire + travel row empty" — the root cause was a one-line `ReferenceError: handleEndPhase is not defined` that startGame() threw mid-execution, and it was invisible from code reading because everything looked syntactically fine.

**Setup (one-time per machine):**

```bash
cd /tmp && npm install playwright
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers npx playwright install chromium
```

**Start local server** (port 8080 is held by Jacob's `start.command`; use 8090):

```bash
python3 -m http.server 8090 > /tmp/jbe-server.log 2>&1 &
```

**Test-script template:** see `~/.claude/projects/-Users-jacobtrimm-projects-jbe/memory/reference_playwright_jbe.md` — has a reusable script, key DOM selectors, and cleanup commands.

**When debugging:**
- Trust the **local** working tree, not deployed `curl https://trimmja.github.io/japan-evangelistic-band/...` output. Local is the source of truth for what changed; deployed-curl only confirms what got pushed.
- Verify fixes with playwright before pushing. "It looks right" is not enough — confirm the runtime behavior.
- The render loop in `js/ui.js` wraps each render in `safeRender(name, fn)` so a single throw doesn't kill the loop. If you see `[render:Foo]` errors in the console, that's safeRender catching them — find and fix the underlying error.

---

## Authentic Japan touches to preserve
- Onsens as relationship-building (costs money, big trust reward)
- English conversation events as a real outreach method
- Tract distribution at train stations (hand_tracts action)
- Long slow relationship arcs — trust thresholds are not trivial
- Shame culture / wa baked into stage conditions (need wisdom before someone opens up)
- Monthly support from home church (real mechanic, not infinite money)
- Japanese location/action names in the UI even for English speakers

## How to continue building

- **Tune action balance**: edit `data/actions.json` (timeCost, energyCost, energyReward, cost.faith, reward.*), push, refresh.
- **Tune day pacing**: edit `data/timing.json` (timePerPhase, energyPerDay, faithPerDay, paydayEveryDays), push, refresh.
- **Add/edit story text**: edit `data/stories.json` only — no JS needed.
- **Add/edit end-of-day reflection lines**: edit `data/reflections.json` (just an array of strings).
- **Add an action**: entry in `data/actions.json` (with `timeCost` + `energyCost`) + `ACTION_UNLOCK` + `ACTION_VISIBLE` (if NPC-gated) + `REQUIREMENT_BUILDERS` (if it has visible requirements) + `ACTION_TEXT` in `language.js`.
- **Add NPC portrait**: drop `{npcId}.png` in `assets/images/npcs/` — appears everywhere automatically.
- **Add a location** (flavor): extend `LOCATION_DEFS` in `locations.js` + bg CSS class in `style.css`. Reference it as a string in any action's `location` field.
- **Add an NPC**: follow the New NPC checklist above — don't skip steps.
- **Add milestones**: extend `MILESTONE_DEFS` in `milestones.js`.
- **Add BGM**: load `<audio>` in `audio.js`, play on phase change or day change.
- **Add real location art**: set `background-image` on `.location-bg` elements in CSS.
- **Add a new system that runs between phases** (NPC mood, weather, etc.): hook into `engine.hooks.onBetweenPhases` in `main.js`. The hook is wired but no-op in Step 1.
- **Add a new system that runs at end of day** (events, persecution, etc.): hook into `engine.hooks.onEndOfDay` in `main.js`. Same — wired but no-op in Step 1.
