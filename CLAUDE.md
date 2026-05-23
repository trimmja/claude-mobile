# Japan Evangelistic Band — Claude Context

Shared context for **Claude** and **Cursor**. Cursor loads `.cursor/rules/`; Claude should read this file. When either changes project context, the plan, or developer notes, **update both** this file and the matching `.cursor/rules/*.mdc` file.

@PROGRESS.md

---

## About me

- Beginner — no coding experience. Prefer plain-language explanations.
- I work in the local folder `jbe` (GitHub repo: `trimmja/japan-evangelistic-band`).
- I use **Claude** for planning and design, **Cursor** for edits and git.
- Ask before pushing to GitHub unless I say to publish / push / save to GitHub.
- **Hosting & testing:** GitHub Pages — https://trimmja.github.io/japan-evangelistic-band/ (not `claude-mobile`). Mostly test on **iPhone**. Push then refresh; stale PWA → Settings → **Load latest update** or reinstall Home Screen shortcut.
- Real missionary experience in Japan — keep the game culturally authentic.

---

## Working with AI

| Tool | Reads | Role |
|------|--------|------|
| Claude | This file (`CLAUDE.md`) + `PROGRESS.md` | Planning, ideas, design review |
| Cursor | `.cursor/rules/` + this file when needed | Code changes, commit, push |

**Sync rule:** If context here changes, update the matching Cursor rule (and vice versa). Cursor rule files: `00-sync-claude-md`, `01-about-developer`, `02-project-overview`, `03-current-plan`, `04-how-to-build`, `05-coding-guidelines`.

### Coding guidelines (AI)

Behavioral guidelines to reduce common LLM coding mistakes. **Bias toward caution over speed** — for trivial tasks, use judgment.

**Project merge:** plain-language explanations; ask before push; balance changes in `data/*.json` → push → refresh on iPhone to verify.

**1. Think before coding** — Don't assume or hide confusion. State assumptions; present multiple interpretations; suggest simpler approaches; stop and ask when unclear.

**2. Simplicity first** — Minimum code for the ask. No extra features, single-use abstractions, unrequested configurability, or impossible-case error handling. If 200 lines could be 50, rewrite.

**3. Goal-driven execution** — Turn asks into verifiable goals (tests, repro steps, before/after checks). Multi-step work gets a short plan with a verify line per step. Prefer strong success criteria over "make it work."

---

## What this project is
A PWA idle/management game about being an American missionary in Tokyo, Japan.
Built by someone with real missionary experience in Japan — authenticity matters.
Playable on iPhone via GitHub Pages (Add to Home Screen as a standalone app).
Dark theme, cherry blossom + gold palette, Japanese kanji in the UI that translates
as the player's language skill grows.

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
data/actions.json   — action durations, costs, rewards (plain English times)
data/timing.json    — faith regen, day length, payday amount/interval
data/stories.json   — story beat text keyed by action + conditions (editable content)
data/README.md      — how to edit the JSON files
index.html          — full game shell (all DOM structure, all IDs)
css/style.css       — all styles (dark theme, cherry blossom + gold palette)
js/main.js          — entry point: boot, intro screen, startGame(), engine hooks
js/gameData.js      — loads data/*.json at startup
js/parseDuration.js — "30 seconds" / "2 minutes" → milliseconds
js/state.js         — single mutable state object (source of truth, imported everywhere)
js/engine.js        — setInterval 1s tick loop; fires hooks for actions/days/milestones
js/save.js          — localStorage save/load/reset (key: 'tokyo_called_v1')
js/language.js      — JP→EN translation, XP thresholds, addLangXP(), TAB_LABELS
js/resources.js     — tick() passive regen, advanceTime(), spend(), gain()
js/actions.js       — ACTION_DEFS, ACTION_UNLOCK, ACTION_VISIBLE, start/complete/cancel
js/locations.js     — LOCATION_DEFS, LOCATION_ORDER, goTo()
js/npcs.js          — NPC_DEFS, getIntroText(), getStageAdvanceHint(), addNPCTrust()
js/stories.js       — getStoryText(actionId, state) — picks story beat from stories.json
js/milestones.js    — MILESTONE_DEFS, checkMilestones() (called each engine tick)
js/audio.js         — playTap/ActionComplete/Milestone/LevelUp/NPCMeet/Payday, toggleMute()
js/ui.js            — all DOM rendering + showStoryPopup(); renderFrame() called on rAF
js/version.js       — APP_VERSION (bump when deploying); hardRefreshApp()
manifest.json       — PWA config (display: standalone)
sw.js               — caches all JS/CSS/HTML; bump CACHE version to match APP_VERSION
assets/images/npcs/ — NPC portrait images (kenji/yuki/hiro.png); kanji fallback if missing
PROGRESS.md         — what's been built, what's planned, ideas backlog
```

---

## Architecture

### State → Engine → UI flow
1. `js/state.js` exports one mutable `state` object. All modules import and mutate it directly.
2. `js/engine.js` runs `setInterval(tick, 1000)`. Each tick: advances time, passive resource regen, checks if active action is complete, checks milestones. Fires hook callbacks into `main.js`.
3. `js/main.js` wires hooks: `hooks.onActionComplete`, `hooks.onNewDay`, `hooks.onPayday`, `hooks.onMilestone`, `hooks.onNPCMeet`.
4. `requestAnimationFrame(loop)` in `main.js` calls `renderFrame()` on every frame (~60fps). `renderFrame()` calls `renderHUD()`, `renderHeader()`, `renderActions()`, `renderActionBar()`.
5. Heavy rebuilds (action list, NPC panel, milestones) only trigger when tracked values change.

### Action completion flow
`engine.js` detects timer expiry → calls `completeAction()` → returns `{ id, bonuses }` → engine calls `hooks.onActionComplete({ id, bonuses })` → `main.js` hook shows story popup (if no NPC meet pending) + triggers re-renders + saves.

### State object shape
```js
{
  meta: { version: 1, saveDate: null },
  character: { name: '' },
  time: { day: 1, secondsPlayed: 0 },
  resources: {
    faith:    { current: 50, max: 100 },  // passive regen configurable in timing.json
    contacts: 0,
    money:    { current: 300, nextPayday: 30 },
    wisdom:   0,
  },
  language: { xp: 0, level: 0 },   // 0–5
  location: 'apartment',
  action: { id: null, startTime: null, duration: 0, label: '' },
  npcs: {
    kenji: { met: false, trust: 0, stage: 0 },
    yuki:  { met: false, trust: 0, stage: 0 },
    hiro:  { met: false, trust: 0, stage: 0 },
  },
  milestones: { completed: [] },
  stats: { converts: 0, actionsCompleted: 0, onsenVisited: false },
  flags: { muted: false, pendingNPCMeet: null, pendingMilestone: null },
}
```

### Timing
- `advanceTime()` increments `state.time.secondsPlayed` each engine tick
- `day = Math.floor(secondsPlayed / 60) + 1` → 1 in-game day = 60 real seconds
- Monthly support fires when `state.time.day >= state.resources.money.nextPayday`

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
--sakura: #FF8FAB       /* cherry blossom pink — primary accent */
--sakura-light: #FFB3C6
--gold: #F0C040         /* gold — milestones, achievements */
--faith: #A78BFA        /* purple */
--trust: #34D399        /* green */
--money: #FBBF24        /* amber */
--wisdom: #60A5FA       /* blue */
--lang: #FB7185         /* coral/red */
--danger: #F87171
--success: #34D399
```
Fonts: `Nunito` (English UI) + `Noto Sans JP` (Japanese text) — Google Fonts in `index.html`.

---

## Locations

| ID | Tab icon | Tab label | Unlock condition | BG class |
|----|----------|-----------|-----------------|----------|
| apartment | 🏠 | アパート | always | bg-apartment (purple gradient) |
| station   | 🚉 | 駅       | day >= 1        | bg-station (blue gradient) |
| park      | 🌸 | 公園     | day >= 1        | bg-park (green gradient) |
| cafe      | ☕ | カフェ   | wisdom >= 10    | bg-cafe (brown gradient) |
| shrine    | ⛩️ | 神社     | day >= 3        | bg-shrine (red gradient) |
| onsen     | ♨️ | 温泉     | contacts >= 30  | bg-onsen (teal gradient) |

Location names: shown in JP kanji until language level >= 1, then English.

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

## Actions (js/actions.js)

All costs deducted at action START. Rewards at completion. One action at a time.

**Visibility vs. unlock:** Actions have two separate concepts:
- `visible()` — if false, card is completely hidden (NPC actions before NPC is met)
- `unlocked()` — if false, card shows as locked/greyed with requirements visible

**Stat bonuses (applied in `completeAction()`):**
- Communication actions (`hand_tracts`, `commuter_convo`, `casual_convo`, `host_english`): +contacts scaled to language level
- Spiritual actions (`pray`, `study_scripture`, `observe_shrine`): +faith scaled to wisdom
- NPC visit/deep actions: +trust scaled to language level

Adding a new action: entry in `data/actions.json` + rule in `ACTION_UNLOCK` + rule in `ACTION_VISIBLE` (if NPC-gated) + entry in `REQUIREMENT_BUILDERS` (if it has visible requirements) + name in `js/language.js` `ACTION_TEXT`.

---

## NPCs (js/npcs.js)

**Kenji** (健二) — Salaryman, 34
- Met via: hand_tracts at station (30% chance)
- Future role: church elder / leader

**Yuki** (由紀) — University student, 21
- Met via: host_english at café (45% chance)
- Future role: theologian / teacher

**Hiro** (浩) — Retired, 68
- Met via: open_air_preach at park (35%) or observe_shrine at shrine (25%)
- Future role: pastoral heart

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
[#story-popup]      — bottom-sheet; slides up after action complete; tap to dismiss
[action-bar]        — hidden by default; shows active action progress + cancel button
[game-header]       — character name | "Day N" | ⚙ settings button
[.hud]              — 5 resource widgets: Faith ✦ | Contacts ◈ | Money ◎ | Wisdom ◆ | Language 語
[.location-view]    — 160px tall; CSS gradient bg + JP name + EN name overlaid
[.content-area]
  [.content-tabs]   — tab labels shift JP→EN at language level 1
  [#tab-actions]    — .action-list (rebuilt on location/action/NPC-met change)
  [#tab-people]     — .people-list (only met NPCs; empty state if none) + contacts-summary
  [#tab-milestones] — .milestones-list (15 rows, gold when complete)
[.location-tabs]    — bottom nav; 6 location buttons (locked ones dimmed)
[#toast]            — fixed, bottom-center; slides up on milestone/payday
[#modal]            — full-screen overlay; NPC first meetings + reset confirm
[#settings-overlay] — bottom sheet; mute + reset buttons
```

---

## Design decisions

- **NPC visibility** — NPC action cards are invisible until NPC is met (`ACTION_VISIBLE` in `actions.js`). Other gated actions show as locked with requirements.
- **Story popup skips NPC meet** — `pendingNPCMeet` flag is checked; if set, story popup is suppressed so the NPC modal takes focus.
- **Language barrier is a UI mechanic** — tab labels, HUD labels, NPC intro text all shift based on language level. Add more as the game grows.
- **Stat bonuses are modest** — multipliers (lang × 0.25 × contacts, etc.) are noticeable but not game-breaking.
- **Action requirements always visible** — gated actions show every unlock rule on the card. New gated actions need a `REQUIREMENT_BUILDERS` entry.
- **Active-only** — no offline progress, secondsPlayed only increments while engine runs.
- **One action at a time** — cancelling refunds half faith cost.
- **Save** — auto-saves every 30 engine ticks + on every action complete.
- **Version bump** — when deploying: bump `APP_VERSION` in `js/version.js`, `CACHE` in `sw.js`, and `?v=` param on script tag in `index.html`.

## Authentic Japan touches to preserve
- Onsens as relationship-building (costs money, big trust reward)
- English conversation events as a real outreach method
- Tract distribution at train stations (hand_tracts action)
- Long slow relationship arcs — trust thresholds are not trivial
- Shame culture / wa baked into stage conditions (need wisdom before someone opens up)
- Monthly support from home church (real mechanic, not infinite money)
- Japanese location/action names in the UI even for English speakers

## How to continue building

- **Tune action balance**: edit `data/actions.json`, push, refresh
- **Tune pacing**: edit `data/timing.json`, push, refresh
- **Add/edit story text**: edit `data/stories.json` only — no JS needed
- **Add an action**: entry in `data/actions.json` + `ACTION_UNLOCK` + `ACTION_VISIBLE` (if NPC-gated) + `REQUIREMENT_BUILDERS` + `ACTION_TEXT` in `language.js`
- **Add NPC portrait**: drop `{npcId}.png` in `assets/images/npcs/` — appears everywhere automatically
- **Add a location**: extend `LOCATION_DEFS` in `locations.js` + bg CSS class in `style.css`
- **Add an NPC**: extend `NPC_DEFS` in `npcs.js` + state entry in `state.js`
- **Add milestones**: extend `MILESTONE_DEFS` in `milestones.js`
- **Add BGM**: load `<audio>` in `audio.js`, play on location change
- **Add real location art**: set `background-image` on `.location-bg` elements in CSS
