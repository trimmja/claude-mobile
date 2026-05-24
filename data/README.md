# Game data (edit in plain English)

These JSON files control balance numbers. **Save the file, then refresh the game** in your browser (or reload the PWA on iPhone via Settings → ↻ Load latest update).

The game uses a **phase + time + energy** model:
- Each day has 3 phases (Morning / Afternoon / Evening).
- Each phase has a **time budget** (default 6 units) that refills every phase.
- Across the whole day you have an **energy budget** (default 14) that refills only at the next morning.
- Every action costs both time AND energy.

---

## `actions.json` — every action the player can take

Each action entry has:

| Field | What it does |
|-------|----------------|
| `location` | Which place the action belongs to (apartment / station / park / cafe / shrine / onsen). Flavor only — shown as a chip on the card. |
| `icon` | Emoji on the action card. |
| `timeCost` | Time units this action takes from the current phase. Typical: 1–4. |
| `energyCost` | Energy from the daily pool. Typical: 0–3. |
| `energyReward` | Optional — energy this action gives back (e.g. `rest`). |
| `cost` | Other resources spent when the action runs (`faith`, `money`, `wisdom`). |
| `reward` | Resources gained (`faith`, `contacts`, `money`, `wisdom`, `langXP`, `npcTrust`). |
| `npcChance` | Optional — `{ "id": "kenji", "chance": 0.3 }` means 30% chance to meet that NPC on completion. |
| `unlockHint` | Optional — human-readable text shown next to a locked card. |

**Example — make prayer slightly stronger:**

```json
"pray": {
  "location": "apartment",
  "icon": "🙏",
  "timeCost": 1,
  "energyCost": 0,
  "cost": {},
  "reward": { "faith": 18, "wisdom": 2 }
}
```

**Example — a new restorative action:**

```json
"tea_break": {
  "location": "apartment",
  "icon": "🍵",
  "timeCost": 2,
  "energyCost": 0,
  "energyReward": 2,
  "cost": {},
  "reward": { "faith": 1 }
}
```

(For a new action to actually appear, also add entries in `js/actions.js` `ACTION_UNLOCK` and `js/language.js` `ACTION_TEXT`. Unlock rules and labels are in code, not data.)

### Design guideline

**Time and energy should diverge** — not every action should cost the same of both. Mix the costs to make different actions feel different:
- Short + intense: low time, high energy (`open_air_preach`)
- Long + restful: high time, low energy (`visit_hiro`, `onsen_visit`)
- Quick filler: 1 time, 0 energy (`pray`)
- Real recovery: high time, negative energy (`rest`)
- Big commitment: high both (`host_english`, `deep_*`)

---

## `timing.json` — day pacing

| Field | What it does |
|-------|----------------|
| `timePerPhase` | Time units each phase has. Default `6`. |
| `energyPerDay` | Total energy budget that refills only at start of new day. Default `14`. |
| `faithPerDay` | Faith restored at the start of each day. Default `3`. |
| `paydayAmount` | Money from home church each payday. Default `500`. |
| `paydayEveryDays` | In-game days between paydays. Default `6`. (Days only advance when you complete all 3 phases.) |

---

## `stories.json` — story popups after each action

Structure:
```json
{
  "action_id": [
    { "conditions": { "dayMax": 7 }, "text": "..." },
    { "conditions": { "langMin": 2, "npcMet": "kenji" }, "text": "..." },
    { "conditions": {}, "text": "catch-all fallback" }
  ]
}
```

Supported conditions: `dayMin`, `dayMax`, `wisdomMin`, `langMin`, `langMax`, `npcMet`, `stageMin_<npcId>`, `stageMax_<npcId>`.

Selection: specific matches (any condition key) take priority over catch-all; picks randomly among matching specifics; falls back to catch-all.

---

## `reflections.json` — end-of-day reflection lines

Just a list under `lines`. One random line is shown on the end-of-day screen. Keep them short, atmospheric, and quiet — this is a contemplative beat, not a sermon.

```json
{
  "lines": [
    "Tokyo settles. Somewhere a vending machine hums in an empty alley.",
    "..."
  ]
}
```

---

## Tips

- Keys starting with `_` (like `_readme`) are ignored — notes for you only.
- Don't trail commas in JSON — it's strict; one comma can break the whole file. Use [jsonlint.com](https://jsonlint.com/) if in doubt.
- If a JSON file fails to load, the game falls back to the defaults baked into the JS files; check the browser console for warnings.
