Brain dump for Jacob to jot down ideas or bugs.

## Done (2026-05-24 session, shipping as v17)

- Study scripture was net-negative on faith — fixed (cost.faith removed, reward.faith bumped to 5)
- Default location showed Shinjuku Station — fixed (resets to Apartment each morning)
- Added "no conflicting cost+reward on same stat" rule to CLAUDE.md
- Kenji becoming a believer was silent — fixed: stage advances now show NPC portrait + moment text via a new `data/stageAdvances.json` per-NPC per-stage; "✨ Kenji is now a Believer" announces and adds to Journal
- Notification queue (`js/notifications.js`) — sequential popups, no more end-of-day-vs-story-popup races
- Goals tab replaced with **Journal** (📖). Empty at start; entries added on milestones, NPC meets, stage advances, lang level-ups, action unlocks. Unread badge "(N)" on tab. Tap any entry to expand/collapse the body. Existing milestones backfilled into Journal on first load
- Travel + location system (REVERSES "locations are flavor"): `state.location` is where you ARE now; Activities tab shows a `📍 You are at: …` header + travel buttons (cost ⏳: Apartment/Station/Shrine = 1, Café/Park = 2, Onsen = 3); actions filter by current location; People tab buttons auto-travel before running visit/heart-to-heart; pray is the only location-agnostic action
- Unlock notifications: `commuter_convo`, `host_english`, `observe_shrine`, `onsen_visit` toast + journal-entry when they become available (existing saves backfilled silently — no retroactive spam)

## Someday / Maybe

- Name change? — deferred. Keep current name "Japan Evangelistic Band" for now.

## Brain-dump zone (Jacob adds here)

(add bugs and ideas as you find them — they'll get triaged into a new session)
