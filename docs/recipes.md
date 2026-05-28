# Recipes & design decisions

## Design decisions (locked in)

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

## How to continue building

- **Tune action balance**: edit `data/actions.json` (timeCost, energyCost, energyReward, cost.faith, reward.*), push, refresh.
- **Tune day pacing**: edit `data/timing.json` (timePerPhase, energyPerDay, faithPerDay, paydayEveryDays), push, refresh.
- **Add/edit story text**: edit `data/stories.json` only — no JS needed.
- **Add/edit end-of-day reflection lines**: edit `data/reflections.json`.
- **Add an action**: entry in `data/actions.json` (with `timeCost` + `energyCost`) + `ACTION_UNLOCK` + `ACTION_VISIBLE` (if NPC-gated) + `REQUIREMENT_BUILDERS` (if it has visible requirements) + `ACTION_TEXT` in `language.js`.
- **Add NPC portrait**: drop `{npcId}.png` in `assets/images/npcs/` — appears everywhere automatically.
- **Add a location** (flavor): extend `LOCATION_DEFS` in `locations.js` + bg CSS class in `style.css`. Reference it as a string in any action's `location` field.
- **Add an NPC**: follow the New NPC checklist in `docs/npcs.md`.
- **Add milestones**: extend `MILESTONE_DEFS` in `milestones.js`.
- **Add BGM**: load `<audio>` in `audio.js`, play on phase change or day change.
- **Add real location art**: set `background-image` on `.location-bg` elements in CSS.
- **Add a new system that runs between phases** (NPC mood, weather, etc.): hook into `engine.hooks.onBetweenPhases` in `main.js`.
- **Add a new system that runs at end of day** (events, persecution, etc.): hook into `engine.hooks.onEndOfDay` in `main.js`.

## Authentic Japan touches to preserve
- Onsens as relationship-building (costs money, big trust reward)
- English conversation events as a real outreach method
- Tract distribution at train stations (hand_tracts action)
- Long slow relationship arcs — trust thresholds are not trivial
- Shame culture / wa baked into stage conditions (need wisdom before someone opens up)
- Monthly support from home church (real mechanic, not infinite money)
- Japanese location/action names in the UI even for English speakers
