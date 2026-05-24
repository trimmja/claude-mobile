# JBE — Roadmap

**Status as of 2026-05-24:** The project is pivoting from a real-time timer/idle engine to a turn-based **phase + energy simulation** inspired by Dwarf Fortress. This document is the durable record of that direction. Update it whenever a roadmap-level decision changes.

Read `CLAUDE.md` for code/architecture rules. Read `PROGRESS.md` for what's actually shipped. Read `CHARACTERS.md` for NPC bios. This file is the **direction** layer that sits above all three.

---

## 1. Why the pivot

**Pain point:** Real-time timed actions (15–90 seconds each) feel slow and boring on iPhone, even after pacing tweaks. The "idle game" feel doesn't fit a contemplative missionary theme — waiting for a bar to fill isn't authentic to the experience the game is trying to represent.

**Vision:** Move toward a **simulation-driven missionary life** — choices that resolve immediately, Energy as the limiter instead of time, NPCs with hidden inner states that change, locations with dynamic conditions, and emergent stories that combine authored beats with procedural conditions. Inspired by Dwarf Fortress's "losing is fun" / "stories emerge from systems" philosophy, but with the authored heart kept intact.

**Constraints that don't change:**
- Authentic to real missionary life in Japan (Jacob's lived experience)
- Mobile-first PWA on iPhone via GitHub Pages
- Pure vanilla JS / no build step / no framework
- Authored story beats remain — procedural layer is additive, not replacing

---

## 2. Source of the direction

The pivot was sketched in a conversation with Grok (originally captured in `Grok design conversation.md`, since deleted because summarized here).

**Grok's key proposals adopted:**
1. **Remove or minimize timers** — actions resolve immediately
2. **Energy / Spiritual Vitality as the limiter** instead of wall-clock time
3. **Daily cycle** with Morning / Afternoon / Evening phases
4. **Deeper NPC simulation** — hidden moods/needs, not just trust counters
5. **Procedural + authored stories** — outcomes depend on stats + NPC state + environment + past choices
6. **Dynamic location conditions** — weather, crowd level, time of day
7. **Apartment / base-building lite** — upgrade your space to host gatherings
8. **End-of-day reflection** — quiet summary screen, on-theme for the missionary experience

**Grok's framing on the middle ground we want:**
> "Keep your authentic missionary heart and NPC depth while borrowing DF's simulation spirit for more emergence and reduced grind."

---

## 3. Design decisions (locked in during 2026-05-24 planning)

These were resolved through Q&A. They are the ground rules for Step 1 and most of what follows.

| Decision | Choice | Rationale |
|---|---|---|
| Day structure | 3 phases (Morning/Afternoon/Evening) × Energy budget per phase | Phases give narrative rhythm; Energy lets the player do multiple lightweight things per phase |
| UI flow | Activity cards include their location; bottom location tabs removed | Phase becomes the primary mental model, not location |
| Dual resources | Time (per-phase) + Energy (per-day) | Time gates phase length; energy gates daily total. Different ratios on different actions force real choices. |
| Time refill | Refills at the start of each phase | Each phase has its own time budget — independent of energy |
| Energy refill | Refills ONLY at start of new day | Saving energy actually compounds across phases (fixes "no point saving" issue) |
| End of day | Explicit reflection screen | Surfaces emergent events; matches missionary theme |
| Phase end | Explicit "End Phase" button + auto-end when time hits 0 | Time, not energy, drives phase boundary |
| Phase skip | Allowed (End Phase with zero actions taken) | Freedom to skip ahead |
| Action animation | Brief 0.5–1s flash | Responsive feel without timer wait |
| Saves | Wipe on `meta.version < 2`; graceful migration within v2 | Early playtesting — clean break is fine |
| Time budget | 6 time units per phase (tunable in `data/timing.json`) | Abstract units; can map to real-world minutes later without changing model |
| Energy budget | 14 energy per day (tunable) | Roughly 7–9 actions per day at average cost; forces tradeoffs |
| Rest action | Costs 3 time + 0 energy, gives +3 energy | Half-a-phase commitment for real recovery; can't be spammed because of time cost |
| Pray as filler | 1 time + 0 energy + small faith | Always-available "quiet moment" action; absorbs leftover time naturally |

---

## 4. The multi-step roadmap

Build incrementally. Don't one-shot. Pause between steps to validate.

### Step 1: Phase-based day engine + Energy ← **CURRENT**

Replace the real-time tick engine with a turn-based phase engine. Introduce Energy as the per-phase limiter. Keep all existing actions, NPCs, stories, milestones — they just resolve instantly with an energy cost instead of a timer.

**Why first:** The wall-clock action timer is the spine of the current engine. Until it's replaced, no other DF-style system has a "when does it happen" hook to attach to. NPC moods, weather, world events, persecution, base-building — all need a turn-based clock to fire on.

**Architects in advance** (empty placeholders for future steps):
- `state.world` (empty object) — future weather + events
- `state.npcs.*.lastSeenDay` (null) — future mood/decay computation
- `hooks.onBetweenPhases` / `hooks.onEndOfDay` — empty wiring for future systems

**Out of scope for Step 1:** NPC moods, procedural stories, weather, base-building, multi-district, persecution.

### Step 2: NPC moods + decay

Add hidden internal state per NPC: `mood`, `stress`, `openness`, plus drift logic that runs in `onBetweenPhases`. Mood gently scales trust gain — a stressed Kenji is more open to honest conversation but less likely to commit; a lonely Hiro takes any presence as meaningful.

Each NPC's mood profile is rooted in `CHARACTERS.md` (Kenji's overwork, Yuki's intellectual restlessness, Hiro's grief). No new UI required — moods show up in story text via new condition keys.

### Step 3: Procedural story layer

Extend the condition vocabulary in `data/stories.json` to support new keys: `moodMin_X`, `weatherIs`, `phaseIs`, `consecutiveDaysSeen_X`, etc. Story selection logic in `js/stories.js` learns to score matches by specificity (more conditions matched = better fit) rather than pure random. Authored beats stay — just more combinations now produce unique moments.

### Step 4: Dynamic location conditions

Roll `state.world` each morning: weather (`sunny` / `rainy` / `snowy` / `humid`), crowd level per location, time-of-year flavor. Affects action outcomes (rainy day at station = fewer contacts but deeper conversations; festival day at park = high crowds, lots of contacts but no deep moments).

### Step 5: Apartment improvements (first base-building loop)

Spend money on apartment upgrades: better study chair (+wisdom bonus), prayer corner (+faith regen), hosting space (unlocks "host friend for dinner" actions), language tapes (+lang XP per study). Visible "your apartment" view that gradually fills with detail. First taste of meta-progression beyond personal stats.

### Step 6: Second district

Duplicate the location + NPC pattern to a new area (e.g., Akihabara or Shibuya). Travel between districts costs Energy. Tests whether the foundation scales — if Step 1 was architected right, this should be mostly content work, not engine work.

### Step 7: Persecution / hardship events

Fired from `onEndOfDay`. Visa anxiety, opposition from a shrine priest, a contact's family pulling them away, your own spiritual dryness. Force tough choices and surface real missionary stress. This is where the "losing is fun" DF feel finally arrives — setbacks become as memorable as wins.

### Beyond Step 7 (long-term ideas, no commitments)

- Co-worker / spouse NPC who interacts WITH you across phases (not just on visits)
- Inter-NPC interactions (Kenji mentions Yuki to you, invites Hiro to study)
- Church planting: appoint an elder, district runs semi-independently
- Multiple cities (Osaka, Kyoto, Sapporo)
- Real illustrated location art (currently CSS gradients)
- Real NPC portrait images (currently kanji fallback)
- Prayer request system, home church relationship system, BGM

---

## 5. Architectural principles to preserve through every step

These are why the foundation matters. Step 1 enforces them. Every subsequent step must honor them.

1. **State as single source of truth.** All systems mutate one `state` object. New fields are added to state, not stored elsewhere.
2. **Hooks for emergence.** New systems plug into the existing engine via hooks (`onBetweenPhases`, `onEndOfDay`, `onActionComplete`, `onNewDay`, `onMilestone`, `onNPCMeet`). Don't bypass them.
3. **Authored content stays authored.** Procedural layers combine authored beats — they never replace them. `stories.json` remains hand-written.
4. **Data over code.** Tuning lives in `data/*.json` (actions, timing, stories, reflections, future: weather, moods). Code defines mechanics; data defines balance.
5. **Mobile-first.** Every UI change is tested on iPhone before merge. Touch targets ≥ 44px. No hover-only states.
6. **Authenticity is the spine.** When in doubt, ask: "does this match a real missionary experience in Japan?" If not, cut it or rework it.

---

## 6. Decision log

Append new entries here as roadmap-level decisions are made. Date format YYYY-MM-DD.

- **2026-05-24** — Pivoted from real-time timer/idle to phase + energy simulation (this document). Locked decisions in Section 3. Step 1 plan written.
- **2026-05-24 (later same day)** — Step 1 refinement after first playtest: introduced **Time** as a per-phase resource alongside **Energy** as a daily resource. Fixed two issues — (1) `rest` could loop infinitely because it had no real cost, (2) per-phase energy refill made conservation pointless. New model: actions cost both time and energy; rest costs time (half a phase) but recovers energy; pray is the 1-time / 0-energy "filler" action. Phase auto-advances when time runs out (with a toast). Bumped APP_VERSION to 16. Save format still v2 — gracefully migrates by initializing missing fields.
