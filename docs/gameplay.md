# Gameplay systems

## Locations

**Locations are real — `state.location` is where you ARE.** Actions are filtered by it (a station action only appears when you're at the station). The `.location-view` background reflects your current location.

You change location with **Travel**.

| ID | Icon | JP | EN | BG class |
|----|------|----|----|----------|
| apartment | 🏠 | アパート | Your Apartment | bg-apartment (purple) |
| station   | 🚉 | 駅       | Shinjuku Station | bg-station (blue) |
| park      | 🌸 | 公園     | Yoyogi Park    | bg-park (green) |
| cafe      | ☕ | カフェ   | English Café   | bg-cafe (brown) |
| shrine    | ⛩️ | 神社     | Local Shrine   | bg-shrine (red) |
| onsen     | ♨️ | 温泉     | Onsen          | bg-onsen (teal) |

Per-location unlock conditions (e.g. café requires wisdom 10) are baked into the individual **action** unlocks instead. E.g. `host_english` requires wisdom ≥ 10; the café-located action is hidden behind that, but the café "location" itself isn't gated.

## Travel (js/locations.js)

Travel is how `state.location` changes. It costs **time only** (never energy). Cost is destination-based and independent of where you came from:

| Destination | Time |
|-------------|------|
| Apartment (home) | 1 |
| Station | 1 |
| Shrine | 1 |
| Café | 2 |
| Park (Yoyogi) | 2 |
| Onsen | 3 |

**Where you wake up:** `engine.endDay()` resets `state.location = 'apartment'` — each new morning starts at home.

**Travel UI:** Always-visible row inside `.top-bar` (between the HUD and the scene, above `.location-view`). Shows one Travel button per other location with ⏳cost; disabled when you can't afford it. Tapping calls `engine.doTravel(locId)`. Current location is shown in the `.location-info` overlay on the scene itself.

**People-tab tap-to-visit:** Each met NPC card has "Visit" and (if unlocked) "Heart-to-Heart" buttons. Tapping handles travel automatically: if the relevant action's location differs from `state.location`, travel runs first, then the action runs. Button shows `→ ☕ ⏳2` chip when travel is needed.

**Action filtering:** `allVisibleActions()` filters by `state.location`. An action's `location` field must equal `state.location` for the card to appear. A `null` location means "available anywhere" — currently only `pray` (1 time / 0 energy filler — missionaries pray everywhere).

**Actions no longer auto-update location.** Only `doTravel()` writes to `state.location`.

**The `hasFittingAction()` shortcut:** Returns true if there's at least 1 time left (since travel costs 1 minimum, you can always go somewhere). Only returns false when the time bar is genuinely empty.

## Actions (js/actions.js)

Actions resolve **instantly** when tapped (with a brief CSS card-flash animation + story popup). Costs and rewards apply in the same call inside `doAction()`. No "in-flight" action state, no progress bar, no cancel.

**Each action costs both time AND energy** (in different ratios — see `data/actions.json`). Time gates the phase, energy gates the day. Examples:
- `pray` = 1 time, 0 energy (always-available filler)
- `rest` = 3 time, +3 energy (half-phase recovery)
- `open_air_preach` = 2 time, 3 energy (short + intense)
- `visit_hiro` = 3 time, 1 energy (long + restful — Hiro is presence-based)
- `host_english` = 4 time, 3 energy (whole evening)

**Visibility vs. unlock vs. fits-now:** Actions have three separate concepts:
- `visible()` — if false, card is completely hidden (NPC actions before NPC is met)
- `unlocked()` — if false, card shows as locked/greyed with requirements visible
- `disabled-time` / `disabled-energy` — visually dimmed when current time/energy can't afford the cost

**`hasFittingAction()`** in `actions.js` returns whether any visible+unlocked+affordable action exists. UI uses this to glow the End Phase button + show "— nothing more fits this phase —" nudge.

**Stat bonuses (applied in `applyRewards()`):**
- Communication actions (`hand_tracts`, `commuter_convo`, `casual_convo`, `host_english`): +contacts scaled to language level
- Spiritual actions (`pray`, `study_scripture`, `observe_shrine`): +faith scaled to wisdom
- NPC visit/deep actions: +trust scaled to language level (langWeight)

Adding a new action: entry in `data/actions.json` (with `timeCost` + `energyCost`) + rule in `ACTION_UNLOCK` + rule in `ACTION_VISIBLE` (if NPC-gated) + entry in `REQUIREMENT_BUILDERS` (if it has visible requirements) + name in `js/language.js` `ACTION_TEXT`.

## Language progression (js/language.js)

XP thresholds: `[0, 20, 50, 80, 95, 100]`
- Level 0: kanji UI labels, no commuter_convo, NPC intros mostly in Japanese
- Level 1: English UI labels + tab names, commuter_convo unlocks, NPC intros mixed
- Level 2: NPC open→studying stage accessible, NPC intros fully in English
- Level 3: NPC studying→believer stage accessible
- Level 4: (reserved)
- Level 5: full fluency

`TAB_LABELS` exported from `language.js` — used by `renderHUD()` to update tab text when level changes.

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
