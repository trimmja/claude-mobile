# Tokyo Called — Claude Context

Shared context for **Claude** and **Cursor**. Cursor loads `.cursor/rules/`; Claude should read this file. When either changes project context, the plan, or developer notes, **update both** this file and the matching `.cursor/rules/*.mdc` file.

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
| Claude | This file (`CLAUDE.md`) | Planning, ideas, design review |
| Cursor | `.cursor/rules/` + this file when needed | Code changes, commit, push |

**Sync rule:** If context here changes, update the matching Cursor rule (and vice versa). Cursor rule files: `00-sync-claude-md`, `01-about-developer`, `02-project-overview`, `03-current-plan`, `04-how-to-build`, `05-coding-guidelines`.

### Coding guidelines (AI)

Behavioral guidelines to reduce common LLM coding mistakes. **Bias toward caution over speed** — for trivial tasks, use judgment.

**Project merge:** plain-language explanations; ask before push; balance changes in `data/*.json` → push → refresh on iPhone to verify.

**1. Think before coding** — Don't assume or hide confusion. State assumptions; present multiple interpretations; suggest simpler approaches; stop and ask when unclear.

**2. Simplicity first** — Minimum code for the ask. No extra features, single-use abstractions, unrequested configurability, or impossible-case error handling. If 200 lines could be 50, rewrite.

**3. Goal-driven execution** — Turn asks into verifiable goals (tests, repro steps, before/after checks). Multi-step work gets a short plan with a verify line per step. Prefer strong success criteria over "make it work."

**Working if:** smaller diffs, fewer overbuilt rewrites, questions before coding rather than after mistakes.

---

## Current plan

**Now**

1. Develop locally; push to GitHub when I ask.
2. Keep `CLAUDE.md` and `.cursor/rules/` aligned between Claude and Cursor.
3. Polish Phase 1 (core game is built) — balance, UX, iPhone PWA via GitHub Pages.
4. Test after pushes: https://trimmja.github.io/japan-evangelistic-band/

**Next (after Phase 1 feels solid)**

- Phase 2 ideas below (art, BGM, new districts, etc.) — only when I ask.

**Out of scope unless I ask**

- Frameworks, build tools, backend, offline idle progress.

*Update this section when priorities change.*

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
data/actions.json   — editable action durations, costs, rewards (plain English times)
data/timing.json    — faith regen, day length, payday amount/interval
data/README.md      — how to edit the JSON files
index.html          — full game shell (all DOM structure, all IDs)
css/style.css       — all styles (dark theme, cherry blossom + gold palette)
js/main.js          — entry point: boot, intro screen, startGame(), engine hooks
js/gameData.js      — loads data/*.json at startup, applies to actions + timing
js/parseDuration.js — "30 seconds" / "2 minutes" → milliseconds
js/state.js         — single mutable state object (source of truth, imported everywhere)
js/engine.js        — setInterval 1s tick loop; fires hooks for actions/days/milestones
js/save.js          — localStorage save/load/reset (key: 'tokyo_called_v1')
js/language.js      — JP→EN translation, XP thresholds, addLangXP(), locText(), actionText()
js/resources.js     — tick() passive regen, advanceTime(), spend(), gain(), canAfford()
js/actions.js       — ACTION_DEFS (from JSON), unlock rules, start/complete/cancel
js/locations.js     — LOCATION_DEFS, LOCATION_ORDER, goTo()
js/npcs.js          — NPC_DEFS, addNPCTrust(), getStageName(), getTrustPercent()
js/milestones.js    — MILESTONE_DEFS, checkMilestones() (called each engine tick)
js/audio.js         — playTap/ActionComplete/Milestone/LevelUp/NPCMeet/Payday, toggleMute()
js/ui.js            — all DOM rendering; renderFrame() called on every rAF
manifest.json       — PWA config (display: standalone)
sw.js               — caches all JS/CSS/HTML for offline load
```

---

## Architecture

### State → Engine → UI flow
1. `js/state.js` exports one mutable `state` object. All modules import and mutate it directly.
2. `js/engine.js` runs `setInterval(tick, 1000)`. Each tick: advances time, runs passive resource regen, checks if active action is complete, checks milestones. Fires hook callbacks into `main.js`.
3. `js/main.js` wires hooks: `hooks.onActionComplete`, `hooks.onNewDay`, `hooks.onPayday`, `hooks.onMilestone`, `hooks.onNPCMeet`.
4. `requestAnimationFrame(loop)` in `main.js` calls `renderFrame()` on every frame (~60fps). `renderFrame()` calls `renderHUD()`, `renderHeader()`, `renderActions()`, `renderActionBar()`.
5. Heavy rebuilds (action list, NPC panel, milestones) only trigger when tracked values change (location, active action ID, met NPC count).

### State object shape
```js
{
  meta: { version: 1, saveDate: null },
  character: { name: '' },
  time: { day: 1, secondsPlayed: 0 },
  resources: {
    faith:    { current: 50, max: 100 },  // passive regen 0.08/s
    contacts: 0,
    money:    { current: 300, nextPayday: 30 },
    wisdom:   0,
  },
  language: { xp: 0, level: 0 },   // 0–5
  location: 'apartment',            // string key into LOCATION_DEFS
  action: { id: null, startTime: null, duration: 0, label: '' },
  npcs: {
    kenji: { met: false, trust: 0, stage: 0 },
    yuki:  { met: false, trust: 0, stage: 0 },
    hiro:  { met: false, trust: 0, stage: 0 },
  },
  milestones: { completed: [] },    // array of milestone id strings
  stats: { converts: 0, actionsCompleted: 0, onsenVisited: false },
  flags: { muted: false, pendingNPCMeet: null, pendingMilestone: null },
}
```

### Timing
- `advanceTime()` increments `state.time.secondsPlayed` each engine tick
- `day = Math.floor(secondsPlayed / 60) + 1` → 1 in-game day = 60 real seconds
- Monthly support fires when `state.time.day >= state.resources.money.nextPayday`
- nextPayday starts at 30, increments +30 each payout → payout every ~30 minutes

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
Fonts: `Nunito` (English UI, weights 400/600/700/800) + `Noto Sans JP` (Japanese text)
Both loaded from Google Fonts in `index.html`.

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
- Level 0 (0 XP): kanji location names, no commuter_convo action
- Level 1 (20 XP): English location names, NPC names appear, commuter_convo unlocks
- Level 2 (50 XP): all action names in English, NPC open→studying stage accessible
- Level 3 (80 XP): NPC studying→believer stage accessible
- Level 4 (95 XP): (reserved for future: preach in Japanese action)
- Level 5 (100 XP): full fluency

UI: 5 pip dots under "語" icon in the HUD. Filled pips = current level.

---

## Actions (js/actions.js)

All costs are deducted at action START. Rewards applied at completion. One action at a time.

| ID | Location | Icon | Duration | Cost | Reward | NPC Chance |
|----|----------|------|----------|------|--------|-----------|
| pray | apartment | 🙏 | 30s | — | +15 faith, +1 wisdom | — |
| study_scripture | apartment | 📖 | 60s | -5 faith | +8 wisdom, +3 faith | — |
| study_japanese | apartment | 📝 | 90s | -5 faith | +10 langXP | — |
| hand_tracts | station | 📄 | 45s | -10 faith | +2 contacts | 30% Kenji |
| commuter_convo | station | 💬 | 60s | -15 faith | +1 contacts, +3 langXP | — |
| open_air_preach | park | 📢 | 120s | -20 faith | +5 contacts, +5 faith | 35% Hiro |
| casual_convo | park | ☕ | 45s | -5 faith | +1 contacts, +4 langXP | — |
| host_english | cafe | 🗣️ | 180s | -10 faith, -30 money | +8 contacts, +3 wisdom, +2 langXP | 45% Yuki |
| observe_shrine | shrine | ⛩️ | 60s | — | +5 wisdom, +2 langXP | 25% Hiro |
| onsen_visit | onsen | ♨️ | 180s | -50 money | +10 wisdom, +5 langXP | — |
| visit_kenji | any | 👔 | 90s | -10 faith | +12 Kenji trust | — |
| visit_yuki | any | 📚 | 90s | -10 faith | +12 Yuki trust | — |
| visit_hiro | any | 🌿 | 90s | -10 faith | +12 Hiro trust | — |
| deep_kenji | any | 💛 | 120s | -20 faith | +22 Kenji trust, +3 wisdom | — |
| deep_yuki | any | 💛 | 120s | -20 faith | +22 Yuki trust, +3 wisdom | — |
| deep_hiro | any | 💛 | 120s | -20 faith | +22 Hiro trust, +3 wisdom | — |

Unlock conditions:
- `commuter_convo`: language level >= 1
- `host_english`: wisdom >= 10
- `observe_shrine`: day >= 3
- `onsen_visit`: contacts >= 30
- `visit_[npc]`: npc.met === true
- `deep_[npc]`: npc.met === true AND npc.stage >= 2

NPC encounter: on action complete, if NPC not met, roll random. If hit → set met=true, set pendingNPCMeet flag. Engine fires `hooks.onNPCMeet` after `hooks.onActionComplete`.

Cancel action: refunds half the faith cost.

---

## NPCs (js/npcs.js)

**Kenji** (健二) — Salaryman, 34 — emoji 👔
- Met via: hand_tracts at station (30% chance)
- Intro: rushes past at station, nearly knocks tracts away, politely notices pamphlet
- Stage conditions: open (stage 3) requires wisdom >= 15; studying (stage 4) requires lang >= 2; believer (stage 5) requires lang >= 3

**Yuki** (由紀) — University student, 21 — emoji 📚
- Met via: host_english at café (45% chance)
- Intro: stays after English event ends, says your English feels "more kind"
- Stage conditions: open requires wisdom >= 15; studying requires lang >= 2; believer requires lang >= 3

**Hiro** (浩) — Retired, 68 — emoji 🌿
- Met via: open_air_preach at park (35% chance) OR observe_shrine at shrine (25% chance)
- Intro: old man on park bench, wife died last year, comes to park every day
- Stage conditions: open requires wisdom >= 15; studying requires lang >= 1; believer requires lang >= 3

**Shared stage data:**
```
Stage 0: Stranger     — trust needed: 0
Stage 1: Acquaintance — trust needed: 10
Stage 2: Friend       — trust needed: 28
Stage 3: Open         — trust needed: 55  + wisdom >= 15
Stage 4: Studying     — trust needed: 85  + lang level varies per NPC
Stage 5: Believer     — trust needed: 100 + lang >= 3
```
Stage advance is checked after every trust gain (addNPCTrust). Returns true if stage advanced.
Portrait CSS classes: `portrait-kenji` (blue), `portrait-yuki` (purple), `portrait-hiro` (green).

---

## Milestones (js/milestones.js)

Checked every engine tick. First uncompleted + passing milestone fires `hooks.onMilestone`.

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
[action-bar]        — hidden by default; shows active action progress + cancel button
[game-header]       — character name | "Day N" | ⚙ settings button
[.hud]              — 5 resource widgets: Faith ✦ | Contacts ◈ | Money ◎ | Wisdom ◆ | Language 語
[.location-view]    — 160px tall; CSS gradient bg + JP name + EN name overlaid
[.content-area]
  [.content-tabs]   — "Actions" | "People" | "★ Goals" — switches tab-panels
  [#tab-actions]    — .action-list (rebuilt on location/action/NPC-met change)
  [#tab-people]     — .people-list (3 NPC cards) + contacts-summary
  [#tab-milestones] — .milestones-list (15 rows, gold when complete)
[.location-tabs]    — bottom nav; 6 location buttons (locked ones dimmed)
[#toast]            — fixed, bottom-center; slides up on milestone/payday
[#modal]            — full-screen overlay; used for NPC first meetings + reset confirm
[#settings-overlay] — bottom sheet; mute + reset buttons
```

Key DOM IDs: `res-faith`, `res-contacts`, `res-money`, `res-wisdom`, `res-lang`,
`lang-pip` (5 of them), `header-name`, `header-day`, `location-bg`, `location-name-jp`,
`location-name-en`, `action-bar`, `action-bar-label`, `action-bar-fill`, `action-cancel`,
`action-list`, `people-list`, `contacts-summary`, `milestones-list`, `location-tabs`,
`toast`, `toast-icon`, `toast-title`, `toast-desc`, `modal`, `modal-card`,
`settings-overlay`, `settings-close`, `mute-btn`, `reset-btn`.

---

## Phase 2+ (NOT BUILT — ideas only)
- Second Tokyo district (Akihabara, Shibuya, Harajuku)
- Church planting: appoint elder → district runs semi-independently
- Multiple Japanese cities (Osaka, Kyoto, Sapporo)
- Persecution events (opposition, visa problems, loneliness)
- Co-worker/spouse NPC
- Background music tracks (BGM) — system scaffolded in audio.js, needs files
- Real illustrated location art — swap CSS gradients for images in `.location-bg`
- Real NPC portrait images — swap emoji+gradient for `<img>` in npc-avatar
- Prayer request system (contacts send prayer requests you respond to)
- Home church relationship (letters/calls back to supporters)

## Design decisions
- **Action requirements always visible** — gated actions show every unlock rule on the card with live progress (`getActionRequirements()` in `js/actions.js`, rendered in `js/ui.js`). New gated actions need a `REQUIREMENT_BUILDERS` entry; `unlockHint` in JSON is not enough alone.
- **Active-only** — no offline progress, secondsPlayed only increments while engine runs
- **One action at a time** — cancelling refunds half faith cost
- **Save** — auto-saves every 30 engine ticks + on every action complete
- **Reset** — settings sheet → confirmation modal → localStorage.removeItem → reload
- **Art** — CSS gradient backgrounds per location (`.bg-apartment`, etc.) — swap for images later
- **Audio** — procedural Web Audio API tones. `window._audio = audio` exposed for settings panel
- **Language mechanic** — UI shows JP kanji at low skill, translates progressively
- **NPC encounters** — random roll on action complete; modal introduced character on first meet

## Authentic Japan touches to preserve
- Onsens as relationship-building (costs money, big trust reward)
- English conversation events as a real outreach method
- Tract distribution at train stations (hand_tracts action)
- Long slow relationship arcs — trust thresholds are not trivial
- Shame culture / wa baked into stage conditions (need wisdom before someone opens up)
- Monthly support from home church (real mechanic, not infinite money)
- Japanese location/action names in the UI even for English speakers

## How to continue building
The codebase is clean and modular. A new session should read this file then read
whichever source file is relevant to the task.

- Tune **action duration / cost / reward**: edit `data/actions.json`, refresh browser
- Tune **day length / faith regen / payday**: edit `data/timing.json`, refresh browser
- Add **actions**: new entry in `data/actions.json` + unlock rule in `js/actions.js` (`ACTION_UNLOCK`) + requirements in `REQUIREMENT_BUILDERS` + name in `js/language.js` (`ACTION_TEXT`)
- Add **locations**: extend `LOCATION_DEFS` in `js/locations.js` + add bg CSS class in `css/style.css`
- Add **NPCs**: extend `NPC_DEFS` in `js/npcs.js` + add state entry in `js/state.js`
- Add **milestones**: extend `MILESTONE_DEFS` in `js/milestones.js`
- Add **BGM**: load `<audio>` element in `js/audio.js`, play on location change
- Add **real art**: set `background-image` on `.location-bg` elements per location
