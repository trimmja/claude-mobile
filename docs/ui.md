# UI

The game screen is the **Direction D ("Immersive, Anchored")** redesign (shipped v36).
A full-bleed location scene sits behind everything; chrome floats on glass. Three views
(**Scene / People / Journal**) switch via a bottom segmented nav; the day-beat header and
the action dock are Scene-only, while the stats bar is always present.

## CSS design tokens (css/style.css)
```css
--bg: #0B0B16           /* near-black base behind the scene */
--surface: #1A1A2E      /* solid cards (modals, end-of-day, settings, toast) */
--surface-2: #252540
--surface-3: #303058
--text: #F0EDE8
--text-muted: #8080A8
--text-dim: #454568
--sakura: #FF8FAB       /* primary accent — buttons, time bar, current travel pill (== design pink) */
--sakura-light: #FFB3C6 /* chips, eyebrows, rec hint */
--gold: #F0C040         /* milestones, conversion, journal unread dot, Elder accent */
--faith: #A78BFA  --trust: #34D399  --money: #FBBF24  --wisdom: #60A5FA  --lang: #FB7185
--energy: #FCD34D       /* energy stat + ⚡ chips */
--positive: #86E0AC     /* gain chips / reward row */
--danger: #F87171  --success: #34D399
/* Direction D glass */
--glass: rgba(22,22,40,.58)            /* + blur(16px) saturate(160%) */
--glass-border: rgba(255,255,255,.12)
--glass-shadow: 0 4px 18px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.12)
```
**Location accent colors** (drive `--acc` on the anchor card; set per-location in `LOCATION_DEFS`):
apartment `#A78BFA` · station `#60A5FA` · park `#34D399` · café `#D08A3E` · shrine `#F87171` · onsen `#2DD4BF`.

**Fonts** (Google Fonts in `index.html`): `Nunito` (all UI), `Noto Sans JP` (kanji glyphs/fallbacks),
`Zen Old Mincho` (the editorial day-beat phrase only), `Zen Maru Gothic` (JP place/word labels on cards).

## UI layout (index.html)

`#game-screen` carries a mode class — `mode-scene` / `mode-people` / `mode-journal` — that
drives which view is visible (set by `setView()` in `js/ui.js`).

```
[.scene-layer]        — full-bleed scene behind everything (z0)
  [#location-bg]      — CSS-gradient fallback layer (class swapped per location)
  [#location-img]     — still PNG for non-station locations; cross-fades on change
  [#location-vid]     — looping MP4 for Shinjuku Station only; muted for iOS autoplay
  [.scene-scrim]      — Direction D vertical gradient scrim for text legibility
[#station-ambience]   — hidden <audio>; ambient station sound when at station
[.top-chrome]         — absolute, top; z20 (above overlays). Holds:
  [#day-beat]         — SCENE ONLY (hidden in mode-people/journal). Editorial header:
    [#beat-eyebrow]   — "Day N · Weekday phase" (uppercase, pink, wide tracking)
    [.beat-phrase]    — Zen Old Mincho serif line (#beat-phrase-en) + phase kanji (#beat-phrase-jp)
    [.beat-timeline]  — ⏳ + phase name + pink time bar (#beat-time-fill) + "N of M left"
    [.beat-right]     — ⛅ spiritDry indicator (≥5 only) + ⚙ gear (#header-settings)
  [.stats-bar]        — ALWAYS visible (margin-top:0 in overlay modes so it pins to the top).
                        5 glass cells: ✦ Faith · ⚡ Energy N/M · ◆ Wisdom · 語 Lv.N · ¥ Support
[.scene-bottom]       — SCENE ONLY (hidden in overlay modes); absolute bottom; z10. Stacks:
  [#travel-row]       — .travel-rail of glass pills (glyph + short name + ⏳cost); current=solid pink;
                        the recommended location's pill gets a ★ ring when you're not there
  [#location-anchor]  — "● You are here" card: thumbnail + name/JP + accent bar (--acc) + "Travel ↑"
  [.dock]             — [.dock-head] label "What fits this <phase>" + "· swipe →" hint + [#end-phase-btn];
                        [#phase-nudge]; [#action-list] = horizontal scroll-snap .dock-card row
[#tab-people]         — .overlay (z15). Title "Your People 人々" + [#contacts-top] (◈ contacts) + .people-list
[#tab-journal]        — .overlay. Title "Journal 日記" + .journal-list of .jcard (always-expanded; unread dot)
[#content-tabs]       — .seg-nav (z30, glass pill): 🗺️ Scene | 👥 People | 📖 Journal (shows "(N)" when unread)
[#toast]              — fixed bottom-center; milestone/payday/phase-auto-advance
[#npc-state-card]     — bottom-anchored card w/ portrait; end-of-day NPC threshold moments
[#story-popup]        — Direction D bottom sheet (grip + body + reward/setback/shift chip rows)
[#modal]              — NPC meet / stage-advance / conversion / reset confirm / go-home (🌙 "It's getting late" + Go Home)
[#travel-overlay]     — top-most (z130) cinematic travel transition: full-bleed <video#travel-vid> + scrim + #travel-caption
[#end-of-day]         — full-overlay reflection screen
[#settings-overlay]   — bottom sheet; refresh + mute + reset
```

**Travel transition (v37):** every trip plays `showTravelOverlay(toLocId, onComplete)` — a full-screen
~5s train video (`#travel-overlay`, src from `TRAVEL_VIDEOS` in `js/ui.js`) with a "🚃 Traveling to X…"
caption, then commits the move. Not skippable for now (a toggle is planned). Routed through
`main.runTravel()` (rail pills, People "Visit", and the end-of-day Go Home button all use it).

**Go-home gate (v37):** when the evening ends while you're not home, the day won't end until you go
home. `showGoHomeModal(onGoHome)` is a forced modal (🌙, "It's getting late", single **Go Home 🏠**
button — no backdrop/close). Tapping it plays the travel overlay home; arriving fires the reflection.

**Dock cards** (`.dock-card`): icon, name, JP subtitle (Zen Maru Gothic), 2-line clamped description
(from `ACTION_DESC` in `language.js`), and a meta chip row — ⏳time · ⚡energy · gain · cost. The
**recommended** card (`.rec`) gets a pink ring + `★ Recommended` tag and is sorted to the front; it
only appears when the player is AT the recommendation's location (see `js/recommend.js`).

**View switching:** the segmented nav calls `setView(tab)` → toggles `#game-screen` mode class +
overlay `.hidden`. People/Journal hide the day-beat + dock so only the (useful) stats bar floats over
the overlay — no day-text bleed-through behind the glass cards.

**People "Visit" button** navigates (switch to Scene + travel to that NPC's location); the actual
visit happens by tapping their card in the dock there.

**End-of-day screen** (`#end-of-day`) shows: "Day N" header, per-phase summary of actions taken,
totals (actions / contacts / lang level / goals), one reflection line from `data/reflections.json`,
Continue button.
