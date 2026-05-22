# Tokyo Called — Claude Context

## What this project is
A PWA idle/management game about being an American missionary in Tokyo, Japan.
Built by someone with real missionary experience in Japan — authenticity matters.
Playable on iPhone via GitHub Pages (Add to Home Screen as a standalone app).

## Live game
Deploy via: GitHub repo → Settings → Pages → branch `claude/environment-selection-iphone-EohwW` → root

## Tech stack
Pure HTML/CSS/Vanilla JS — no build step, no framework.
ES modules (`<script type="module">`). Works on GitHub Pages as-is.

## File map
```
index.html          — full game shell (all DOM structure)
css/style.css       — all styles (dark theme, cherry blossom + gold palette)
js/main.js          — entry point, boot sequence, engine hooks
js/state.js         — single mutable state object (source of truth)
js/engine.js        — setInterval game loop (1s ticks), hook callbacks
js/save.js          — localStorage save/load/reset
js/language.js      — JP→EN translation system, XP/level logic
js/resources.js     — resource ticks, spend/gain helpers, day advancement
js/actions.js       — all action definitions + startAction/completeAction
js/locations.js     — location definitions + unlock conditions
js/npcs.js          — NPC definitions, stage progression, trust logic
js/milestones.js    — milestone definitions + checkMilestones()
js/audio.js         — procedural Web Audio API sounds (no audio files needed)
js/ui.js            — all DOM rendering (renderFrame, showModal, showToast, etc.)
manifest.json       — PWA config
sw.js               — service worker (caches assets for offline load)
```

## Phase 1 — COMPLETE
One city (Tokyo), small but complete-feeling. What's built:

### Locations (6)
- Apartment — starting base, always unlocked
- Shinjuku Station — unlocked Day 1
- Yoyogi Park — unlocked Day 1
- English Conversation Café — unlocks at Wisdom ≥ 10
- Local Shrine — unlocks Day 3
- Onsen — unlocks at 30 contacts

### Resources (4)
- **Faith/Spirit** — passive regen (0.08/sec), spent on actions
- **Contacts** — grows via outreach actions
- **Money/Support** — starts ¥300, +¥500 every 30 in-game days (monthly support)
- **Wisdom/Knowledge** — grows via study actions

### Language system (5 levels, 0–100 XP)
Location names display in kanji at Level 0, translate as level grows.
Level 0: kanji only | Level 1: basic greetings/names | Level 2: all English + new actions
Level 3: Bible study in Japanese | Level 4: preach in Japanese | Level 5: full fluency

### NPCs (3 named, + anonymous contact count)
- **Kenji** — 34yo salaryman, met at Shinjuku Station
- **Yuki** — 21yo university student, met at English Café  
- **Hiro** — 68yo retired man, met at Yoyogi Park
- Each has 6 stages: Stranger → Acquaintance → Friend → Open → Studying → Believer
- First meeting triggers an intro modal with their backstory
- Trust required per stage; some stages require language level or wisdom thresholds

### Actions (16)
pray, study_scripture, study_japanese, hand_tracts, commuter_convo,
open_air_preach, casual_convo, host_english, observe_shrine, onsen_visit,
visit_kenji/yuki/hiro, deep_kenji/yuki/hiro

### Milestones (15)
First Conversation → Believer → Small Group → First Disciple + more

### Timing
1 in-game day = 60 real seconds of active play
Monthly support fires every 30 in-game days (~30 real minutes)

## Phase 2+ (NOT BUILT — ideas only)
- Second Tokyo district (Akihabara, Shibuya, etc.)
- Church planting: appoint elder → district runs itself
- Multiple Japanese cities
- Persecution events
- Co-worker/spouse NPC
- Background music tracks (currently uses procedural Web Audio only)
- Real illustrated location art (currently CSS gradients)
- Real NPC portrait images (currently emoji + CSS gradients)

## Design decisions
- **Active-only** — no offline progress, game only advances while app is open
- **Save** — localStorage, auto-saves every 30s + on action complete
- **Reset** — visible Reset Progress button in Settings (confirmation required)
- **Art** — CSS gradient backgrounds per location (can swap in real images later)
- **Audio** — procedural tones via Web Audio API (no files needed; user can add BGM later)
- **Language mechanic** — some NPC reactions/location names in Japanese kanji until player studies

## Authentic Japan touches to preserve
- Onsens as a relationship-building mechanic
- English conversation events as outreach method
- Tract distribution at train stations
- Long slow relationship arcs before trust/openness
- Japanese cultural values (wa, hierarchy, shame culture) baked into stage conditions
- Real location types: shrine, train station, park, café
- Monthly support from home church as a real mechanic

## How to continue building
Start a new session and Claude will read this file automatically.
Just describe what you want to add next — "add a second city", "add real music",
"add persecution events", "make the shrine location deeper", etc.

The codebase is clean and modular:
- Add new **actions**: extend `ACTION_DEFS` in `js/actions.js`
- Add new **locations**: extend `LOCATION_DEFS` in `js/locations.js`  
- Add new **NPCs**: extend `NPC_DEFS` in `js/npcs.js`
- Add new **milestones**: extend `MILESTONE_DEFS` in `js/milestones.js`
- Change **timing**: edit `advanceTime()` in `js/resources.js` (currently 60s/day)
