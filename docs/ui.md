# UI

## CSS design tokens (css/style.css)
```css
--bg: #0F0F1A           /* deep navy background */
--surface: #1A1A2E      /* card background */
--surface-2: #252540    /* elevated card */
--surface-3: #303058    /* inputs, track backgrounds */
--text: #F0EDE8         /* warm white */
--text-muted: #8080A8
--text-dim: #454568
--sakura: #FF8FAB       /* cherry blossom pink — primary accent; also time bar */
--sakura-light: #FFB3C6
--gold: #F0C040         /* gold — milestones, achievements */
--faith: #A78BFA        /* purple */
--trust: #34D399        /* green */
--money: #FBBF24        /* amber */
--wisdom: #60A5FA       /* blue */
--lang: #FB7185         /* coral/red */
--energy: #FCD34D       /* warm yellow — energy bar + ⚡ tags */
--danger: #F87171
--success: #34D399
```
Fonts: `Nunito` (English UI) + `Noto Sans JP` (Japanese text) — Google Fonts in `index.html`.

## UI layout (index.html)

```
[#story-popup]      — bottom-sheet popup; slides up after action; tap to dismiss
[#end-of-day]       — full-overlay reflection screen; appears when evening ends
[game-header]       — character name | "Day N" | ⚙ settings button
[.hud]              — 6 resource widgets: Faith ✦ | Energy ⚡ N/M | Contacts ◈ | Money ◎ | Wisdom ◆ | Language 語
[.top-bar]          — always-visible bar between HUD and scene; two columns:
  [.top-bar-phase]  — phase icon + phase name (EN) + pink scene-time bar fill + "N/M" count
  [#travel-row]     — one Travel button per other location with ⏳cost; disabled when time too low
[.location-view]    — fills remaining vertical space; immersive scene background
  [#location-img]   — still PNG for non-station locations; cross-fades on location change
  [#location-vid]   — looping MP4 for Shinjuku Station only; muted for iOS autoplay; opacity-fades in/out
  [#location-bg]    — CSS-gradient fallback layer (class swapped per location)
  [#scene-open-btn] — floating pill button "↑ Activities" near bottom of scene; tap to open panel; hidden when panel is open
  [.location-info]  — JP/EN location name overlaid at bottom of scene
[#station-ambience] — hidden <audio> element; plays ambient station sound at volume 0.35 when at station
[#sheet-scrim]      — dark overlay (z-index 19) behind the sheet when open; dims scene + top-bar; tap to close panel
[#bottom-sheet]     — slides up over the scene; fully hidden (translateY 100%) when closed — no peek strip
  [.sheet-handle]   — close-only row at top of sheet; tap to close; shows "↓ tap to close" pill when sheet is open
  [.content-area]   — scrollable panel area
    [#tab-actions]  — phase strip (icon + time bar + End Phase button) + nudge + action list
    [#tab-people]   — .people-list (only met NPCs; empty state if none) + contacts-summary
    [#tab-journal]  — .journal-list (empty on day 1; entries added on milestones, NPC meets, stage advances, lang level-ups; tap to expand body)
  [.content-tabs]   — bottom nav inside the sheet: Activities | People | Journal (📖 — shows "(N)" badge when unread entries)
[#toast]            — fixed, bottom-center; slides up on milestone/payday/phase-auto-advance
[#modal]            — full-screen overlay; NPC first meetings + reset confirm
[#settings-overlay] — bottom sheet; mute + reset buttons
```

**Phase strip** appears in **two places**: (1) `.top-bar` — always visible above the scene, shows phase icon + EN name + pink time bar + `N/M` count. (2) Inside the Activities tab (bottom sheet) — same data plus JP phase name and the End Phase button (glows when no action fits).

**End-of-day screen** (`#end-of-day`) shows: "Day N" header, per-phase summary of actions taken, totals (actions / contacts / lang level / goals), one random reflection line from `data/reflections.json`, Continue button.
