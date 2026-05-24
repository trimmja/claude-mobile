# JBE — Progress & Roadmap

Tracks what's been built, what's planned, and ideas captured along the way.
The architecture reference lives in `CLAUDE.md`. The forward-looking design direction lives in `ROADMAP.md`. This file is the living tracker of what's actually shipped.

---

## ⚠️ Design pivot in progress — 2026-05-24

The project is moving from a real-time timer/idle engine to a turn-based **phase + energy simulation** (Morning/Afternoon/Evening, no timers, NPC moods, dynamic locations, emergent stories). See **`ROADMAP.md`** for full direction, locked design decisions, and the multi-step roadmap (Steps 1–7).

- **Step 1: Phase + energy engine** — IN PROGRESS this session. Replaces the wall-clock timer engine. All existing content (actions, NPCs, stories, milestones) preserved; only the timing engine and resource model change.
- Everything in "Phase 1A" below was built for the **old** timer engine. After Step 1 lands, story popups, NPC mechanics, and milestones all keep working, but balance and pacing notes below will need re-evaluation.
- Items in "Phase 2+" are now organized under ROADMAP Steps 2–7.

---

## 🔶 Phase 1A — Narrative depth & language immersion (mechanics built, content draft) [valid for old timer engine; will be re-evaluated after Step 1 simulation pivot lands]

Everything below is **coded and functional** but should be considered a first draft until it's been played through and approved. Story text was written by Claude and has not been reviewed by Jacob. Portrait images are placeholders. Balance is untested.

---

**NPC Reveal System** — ✅ mechanics solid
- NPCs hidden until encountered; visit/deep action cards invisible until met
- People tab shows empty state with hint when no NPCs met
- Met NPC cards: portrait slot (image + kanji fallback), name EN+JP, stage, trust bar, advance hint
- *No known issues — this one feels genuinely done*

**Story Popups** — ⚠️ infrastructure done, content is a first draft
- System: `data/stories.json` + `js/stories.js` condition-matching selector
- 90+ story beats written covering all actions, NPC stages, day ranges, language levels
- Popup slides up after action, shows NPC portrait for visit/deep actions, auto-dismisses 6s
- **Not yet reviewed:** Jacob has not read through the story text. Quality is unknown. Some beats may feel generic or off-tone.
- **Not yet played:** Whether the popup timing, frequency, and length feel right in practice is unknown

**Language Barrier as Living UI** — ⚠️ mechanics done, content draft
- Tab labels shift JP→EN at level 1 ✅
- Contacts HUD label shifts 知人→Contacts at level 1 ✅
- NPC first-meet intros have 3 language tiers (level 0 / 1 / 2+) written in — **text not reviewed**
- All visit/deep story beats now have 3 language tiers — **text not reviewed**

**NPC Language-Tiered Relationship System** — ⚠️ coded, balance untested
- `langWeight` per NPC in `NPC_DEFS` controls how much language matters to trust gain
  - Kenji: 1.0 (verbal) — 40% trust at lang 0, 100% at lang 2, bonus at lang 3+
  - Yuki: 1.0 (verbal) — same
  - Hiro: 0.3 (presence-based) — 82% trust even at lang 0
- All NPC interaction story beats now have 3 language tiers (lang 0 / lang 1 / lang 2+)
- Intro texts updated: Kenji gives business card at first meet; Yuki exchanges LINE IDs
- NPC actions locked to specific locations: Kenji → station (visit) + café (deep); Yuki → café; Hiro → park
- Action card names updated: "Coffee with Kenji", "Sit with Hiro", "Heart-to-Heart with Yuki", etc.
- **Character bios + arc + langWeight documented in `CHARACTERS.md`** — read before any NPC changes

**Stat Multipliers** — ⚠️ coded, balance untested
- Language level → bonus contacts on communication actions (×0.25 per level)
- Wisdom → bonus faith on spiritual actions (wisdom/100 × base)
- Language level → trust scaling on NPC actions (see langWeight system above)

**Portrait System** — ⚠️ infrastructure only, no real images
- `assets/images/npcs/{kenji,yuki,hiro}.png` — system ready, images not sourced yet
- Currently showing kanji fallback (健 / 由 / 浩) everywhere
- See `assets/images/npcs/README.md` for free asset sources

---

## 🗂 Ideas captured — not yet started

*From Jacob's notes during this session. Ordered roughly by dependency.*

**NPC Backstory & Future Role**
- Each NPC should have a story arc hinting at their future church role (elder, teacher, pastoral heart)
- Kenji → future church elder / leader
- Yuki → theologian / teacher (her linguistics background + faith = powerful)
- Hiro → pastoral heart, the one who remembers everyone's names
- Start planting these seeds in deeper story beats now

**Cultural Understanding as a Stat**
- A separate stat (or part of Wisdom) representing cultural fluency
- Affects: how NPCs respond, what actions are available, story text variations
- Makes Wisdom feel richer — split into spiritual wisdom vs. cultural wisdom, or keep unified with cultural effects tied to specific thresholds

**Branching Story / Rich Dialogue System**
- Currently: one story beat per action per condition match
- Future: branching based on choices, or sequential story beats that build on each other
- Design question: how do you build mass story text that feels rich and not generic?
  - Answer we landed on: conditional text table (Hades-style) — write ~200-300 sentences that recombine based on state
  - Full branching trees are a much larger commitment — do separately, don't retrofit

**NPC Speech Progressively More Readable**
- Jacob specifically wants: at low language level, when an NPC speaks to you in a story beat, it's mostly Japanese text you can't parse
- As language rises, you understand more — the text literally changes
- This is already done for first-meet intros; apply the same to story popup text
- Approach: `langMin` conditions on story entries already support this — just write the Japanese-heavy versions

**Deeper Stats-Make-Actions-Feel-Real**
- Beyond multipliers: stats should change what's *possible* in a scene, not just how effective you are
- Example: High wisdom unlocks a *different* story beat for "Pray" that reflects deeper spiritual maturity
- Example: High language → NPCs say things they wouldn't say at lower levels
- The condition system in stories.json already supports this; just need the content

---

## 📋 Phase 1B — Polish backlog (before Phase 2)

These are fixes/polish from the original Phase 1 review. None are urgent but all would improve the experience.

- **Touch targets** — ⚙ settings button and ✕ cancel button are ~20px (need 44px+ for iPhone)
- **Faith balance** — faith regens fast enough that costs feel trivial; consider raising costs or slowing regen
- **Payday countdown** — no way to know when support is coming; add "Support in X days" somewhere
- **Modal/toast stacking** — rapid events can layer ungracefully; add queue or dismiss-previous logic
- **Save format migration** — no version check on load; new state fields won't exist in old saves
- **Action completion is silent at milestone events** — story popup doesn't show when NPC-meet fires; but also doesn't show when a milestone fires simultaneously

---

## 🚀 Phase 2+ (future — only when asked)

*Moved here from CLAUDE.md. None of this is being built yet.*

- Second Tokyo district (Akihabara, Shibuya, Harajuku)
- Church planting: appoint elder → district runs semi-independently
- Multiple Japanese cities (Osaka, Kyoto, Sapporo)
- Persecution events (opposition, visa problems, loneliness)
- Co-worker/spouse NPC
- Background music tracks (BGM) — system scaffolded in audio.js, needs files
- Real illustrated location art — swap CSS gradients for images in `.location-bg`
- Real NPC portrait images (currently using kanji fallback)
- Prayer request system (contacts send prayer requests)
- Home church relationship (letters/calls back to supporters)

---

## 🎨 NPC Portrait Assets (outstanding)

Real images wanted. System is ready — just drop files in `assets/images/npcs/`.

Free sources:
- https://itch.io/game-assets/free/tag-visual-novel (search "characters", "Japanese")
- https://opengameart.org/content/npc-characters
- Prioritize: consistent art style, Japanese aesthetic, CC0 or free-for-use license

Needed:
- `kenji.png` — Salaryman, 34, weary but kind
- `yuki.png` — University student, 21, curious and earnest
- `hiro.png` — Retired man, 68, quiet grief, dignity
