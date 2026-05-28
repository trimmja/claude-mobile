# NPCs

**Bios, arcs, langWeights, and future church roles all live in `CHARACTERS.md`** — always read that first before touching NPC code or content. This file covers code/data only.

| NPC | Met via | npcChance |
|---|---|---|
| Kenji (健二) | hand_tracts at station | 30% |
| Yuki (由紀) | host_english at café | 45% |
| Hiro (浩) | open_air_preach at park / observe_shrine at shrine | 35% / 25% |

## NPC_DEF fields (js/npcs.js)
- `introByLang[]` — first-meet text indexed by language level (0/1/2+); picked by `getIntroText(npcId)`
- `stages[]` — stage name strings
- `trustNeeded[]` — trust threshold per stage
- `stageCondition[]` — extra condition functions per stage advance
- `stageConditionHints[]` — human-readable hint strings for those conditions

## Key functions
- `getIntroText(npcId)` — returns correct intro for current language level
- `getStageAdvanceHint(npcId)` — returns "X trust to next stage" or "Needs: Wisdom 15" or null
- `addNPCTrust(npcId, amount)` — applies trust + checks stage advance
- `adjustNPC(npcId, {mood, stress, burden})` — applies deltas with clamping (mood -5/+5, stress 0–10, burden 0–10)
- `calcVisitMoodDelta(npcId, actionType)` — returns mood delta for a visit, factoring in stress + lang level
- `initNPCMoodStats(npcId)` — migration helper; idempotent; sets defaults if fields missing
- `getNPCEvents(npcId)` — returns `{ scripted[], random[] }` from loaded `npcEvents.json`

## Stage thresholds (shared)
```
Stage 0: Stranger     — trust: 0
Stage 1: Acquaintance — trust: 10
Stage 2: Friend       — trust: 28
Stage 3: Open         — trust: 55  + wisdom >= 15
Stage 4: Studying     — trust: 85  + lang level (varies per NPC)
Stage 5: Believer     — trust: 100 + lang >= 3
Stage 6: Disciple     — (Phase D1, v35)
Stage 7: Servant      — (Phase D1, v35)
Stage 8: Elder        — (Phase D1, v35 / unlocked by D3 hostable events)
```

## NPC interaction system (language-tiered)

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

Every NPC visit and deep-conversation story entry in `stories.json` must have 3 language-tiered versions:
- `"langMax": 0` — phone translator, gestures, long silences, presence
- `"langMin": 1, "langMax": 1` — basics flow, simple questions, cautious exchange
- `"langMin": 2` — real conversation, things are learned and shared

Combine `langMin`/`langMax` with `stageMin`/`stageMax` as needed.

### NPC action locations (never `null` for NPC visit/deep actions)

| Action | Location | Reason |
|--------|----------|--------|
| visit_kenji | station | He's a commuter; station kiosk coffee. Station always available. |
| evening_kenji | cafe | Deeper relationship → proper sit-down café meetup after work |
| visit_yuki | cafe | Where she is; café unlocks same time as host_english |
| questions_yuki | cafe | Same venue, deeper depth — she brings her notebook of hard questions |
| visit_hiro | park | He's always on the bench |
| pray_hiro | park | The deep moment IS prayer — he asks you to pray out loud |

### Contact-info rule

NPCs need a plausible reason you can reach them after first meeting:
- **Kenji**: hands you his business card before hurrying off
- **Yuki**: LINE ID exchange at end of English event
- **Hiro**: always at the same park bench — no contact needed

### Action naming convention

NPC interaction cards use narrative names, not generic ones:
- `visit_*` → describes what you're actually doing ("Coffee with Kenji", "Sit with Hiro")
- Deep actions use **character-specific IDs and names** — no generic "deep_*" or "Heart-to-Heart" pattern:
  - `evening_kenji` → "Evening with Kenji" (late café, long conversation)
  - `questions_yuki` → "Questions with Yuki" (she brings her notebook)
  - `pray_hiro` → "Pray with Hiro" (the deep moment IS prayer)
- All NPC action IDs must be registered in `NPC_ACTION_MAP` in `actions.js` — this is how portraits and `lastSeenDay` are looked up (not by naming convention)
- JP labels: action-specific, not just "visit"

## New NPC checklist

When adding a new NPC, do ALL of these:
1. Add bio to `CHARACTERS.md` — personality, language notes, arc, church role, `langWeight`
2. Add state entry in `js/state.js`: `{ met: false, trust: 0, stage: 0 }`
3. Add `NPC_DEFS` entry in `js/npcs.js` — include `langWeight` + `introByLang[]` with 3 tiers (level 0 / 1 / 2+). Intro text at level 0 must include how the player can reach the NPC again.
4. Add `visit_{npc}` + a character-specific deep action ID to `data/actions.json` with correct `"location"` (not null). Name the deep action after what the relationship actually IS for that character.
5. Add unlock/visible rules in `js/actions.js` (ACTION_UNLOCK, ACTION_VISIBLE, REQUIREMENT_BUILDERS). Add both IDs to `NPC_VISIT_ACTIONS` set; add only the deep ID to `NPC_DEEP_ACTIONS` set. Add both to `NPC_ACTION_MAP`. Also add the deep action to `NPC_DEEP_ACTION` const in `ui.js`.
6. Add narrative labels to `js/language.js` ACTION_TEXT
7. Add `npcChance` to the relevant outreach action in `data/actions.json`
8. Write story beats in `data/stories.json` — 3 lang tiers × ~3 stage tiers ≈ ~9 beats per action
