# JBE — Progress & Roadmap

Tracks what's been built, what's planned, and ideas captured along the way.
The architecture reference lives in `CLAUDE.md`. This file is the living tracker.

---

## ✅ Phase 1A — Narrative depth & language immersion (complete)

**NPC Reveal System**
- NPCs are completely hidden until encountered (no greyed-out placeholders)
- Visit/deep-talk action cards are invisible until NPC is met
- People tab shows empty state with hint when no one met yet
- Met NPC cards show: portrait slot (image + kanji fallback), name EN + JP, stage, trust bar, advance hint ("12 trust to next stage" / "Needs: Wisdom 15")

**Story Popups**
- Every action completion slides up a story beat from the bottom
- `data/stories.json` — 60+ curated story beats, keyed to: day, wisdom, language level, who you've met, NPC stage
- `js/stories.js` — condition-matching selector; catch-all fallback if no specific match
- Popup shows NPC portrait header for visit/deep actions
- Skipped when NPC first-meet modal is about to appear
- Auto-dismisses after 6 seconds or tap to dismiss

**Language Barrier as Living UI**
- Tab labels show 行動 / 人々 / 目標 at level 0, English at level 1+
- Contacts HUD shows 知人 at level 0, "Contacts" at level 1+
- NPC first-meet intros written in 3 language tiers (level 0 / 1 / 2+)
  - Level 0: mostly Japanese, player catches a few words
  - Level 1: mix of both
  - Level 2+: full English exchange

**Stat Multipliers**
- Language level → bonus contacts on communication actions
- Wisdom → bonus faith on spiritual actions
- Language level → bonus NPC trust on visit/deep actions
- Bonuses appear in story popup

**Portrait System Ready**
- `assets/images/npcs/{kenji,yuki,hiro}.png` — add images, they appear everywhere automatically
- Kanji fallback (健 / 由 / 浩) while no images exist
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
