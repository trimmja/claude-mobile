# JBE — Progress

Status of what's shipped + ideas backlog. Architecture lives in `CLAUDE.md`. Design direction lives in `ROADMAP.md`. NPC bios live in `CHARACTERS.md`.

---

## Shipped systems — status

| System | Mechanics | Content | Played? |
|---|---|---|---|
| Phase + time + energy engine (Step 1) | ✅ | n/a | ✅ |
| Travel + location system | ✅ | n/a | ✅ |
| Notification queue | ✅ | n/a | ✅ |
| Journal tab | ✅ | n/a | ✅ |
| Stage-advance notifications | ✅ | ⚠️ first draft | ✅ |
| NPC reveal system | ✅ | n/a | ✅ |
| Story popups (90+ beats) | ✅ | ⚠️ text not reviewed | ⚠️ |
| Language barrier UI | ✅ | ⚠️ text not reviewed | ⚠️ |
| NPC language-tiered trust (langWeight) | ✅ | n/a | ⚠️ balance untested |
| Stat multipliers (lang→contacts, wisdom→faith) | ✅ | n/a | ⚠️ balance untested |
| Portrait system | infrastructure only | ❌ no real images | n/a |
| Immersive scene UI — floating button + panel (v20–v28) | ✅ | n/a | ✅ |
| NPC mood/stress/burden system (Step 2, v29) | ✅ | ⚠️ first draft | ❌ not yet |
| Character-specific deep action names (v30) | ✅ | n/a | ❌ not yet |
| Variable outcome rewards — pray/preach/study (v30) | ✅ | ⚠️ first draft | ❌ not yet |
| Conversion popup — Stage 5 gold modal (v30) | ✅ | ✅ | ❌ not yet |

---

## Polish backlog (small open fixes)

- **Station video asset** — code for video background + ambient audio is wired (v24) but current shinjuku.MP4 doesn't loop well. Need a better video clip, or decide on a different approach (still image? looping GIF? different scene?). Infrastructure stays; just swap the asset.
- **Touch targets** — ⚙ settings + ✕ cancel buttons are ~20px; need 44px+ for iPhone
- **Faith balance** — faith regen feels fast enough that costs are trivial; consider raising costs or slowing regen
- **Payday countdown** — no way to know when support arrives; add "Support in X days" somewhere

---

## Ideas captured (not yet started)

*Jacob's design notes. Order is roughly by dependency.*

**NPC backstory & future church role** — Each NPC arc should hint at their eventual role: Kenji → elder/leader, Yuki → theologian/teacher, Hiro → pastoral heart. Plant seeds in deeper story beats now.

**Cultural Understanding as a stat** — Separate from Wisdom, or part of it? Affects how NPCs respond, what actions unlock, story variations. Makes Wisdom feel richer.

**Branching / sequential story system** — Currently one beat per action per condition match. Future: branches based on choices, or sequential beats that build. Approach landed on: conditional text table (Hades-style) — ~200–300 sentences that recombine based on state. Full branching trees = much larger commitment, do separately.

**NPC speech progressively more readable** — At low language level, NPC dialogue is mostly Japanese text you can't parse. As language rises, the text literally changes. Already done for first-meet intros; apply to story popup text. The `langMin` condition already supports this.

**Stats should change what's *possible*, not just effectiveness** — High wisdom unlocks a different "Pray" beat; high language → NPCs say things they wouldn't at lower levels. Condition system already supports this; just needs content.

**Name change?** — deferred. Keep "Japan Evangelistic Band" for now.

---

## NPC portrait assets (still wanted)

System ready — just drop files in `assets/images/npcs/`. Needed:
- `kenji.png` — Salaryman, 34, weary but kind
- `yuki.png` — University student, 21, curious and earnest
- `hiro.png` — Retired man, 68, quiet grief, dignity

Free sources: https://itch.io/game-assets/free/tag-visual-novel · https://opengameart.org/content/npc-characters · prioritize consistent art style + CC0/free-use license.
