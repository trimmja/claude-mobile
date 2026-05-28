# File map

```
ROADMAP.md            — design direction, locked decisions, multi-step roadmap (Steps 1–7)
PROGRESS.md           — what's actually shipped, ideas backlog
CHARACTERS.md         — NPC bios (read before any NPC change)
data/actions.json     — action defs: timeCost, energyCost, energyReward, cost, reward, npcChance
data/timing.json      — timePerPhase, energyPerDay, faithPerDay, payday config
data/stories.json     — story beat text keyed by action + conditions (editable content)
data/reflections.json — end-of-day reflections; conditional shape (specific matches weight 3× catch-alls) — see Phase C condition keys
data/stageAdvances.json — text shown when an NPC advances to a new relationship stage (per NPC, per stage)
data/npcEvents.json   — scripted arc events + random texture pools per NPC (loaded by gameData.js)
data/README.md        — how to edit the JSON files
index.html            — full game shell (all DOM structure, all IDs)
css/style.css         — all styles (dark theme, cherry blossom + gold palette)
js/main.js            — entry point: boot, intro screen, startGame(), engine hooks
js/gameData.js        — loads data/*.json at startup
js/state.js           — single mutable state object (source of truth, imported everywhere)
js/engine.js          — event-driven engine: doAction, endPhase, endDay; hooks
js/save.js            — localStorage save/load/reset (key: 'tokyo_called_v2')
js/language.js        — JP→EN translation, XP thresholds, addLangXP(), TAB_LABELS
js/resources.js       — spend/gain (incl. spendTime + spendEnergy + refillTime + refillEnergyDaily)
js/actions.js         — ACTION_DEFS, ACTION_UNLOCK, ACTION_VISIBLE, doAction, hasFittingAction
js/locations.js       — LOCATION_DEFS, LOCATION_ORDER, TRAVEL_COSTS, travelTo() — real navigation
js/npcs.js            — NPC_DEFS, getIntroText(), getStageAdvanceHint(), addNPCTrust()
js/stories.js         — getStoryBeat(actionId, state) → { text, rewards? }
js/reflections.js     — pickReflection() — picks end-of-day line matching state vs conditions
js/milestones.js      — MILESTONE_DEFS, checkMilestones() (called after each action + on new day)
js/journal.js         — addJournalEntry / getJournalEntries / markJournalRead
js/unlocks.js         — checkUnlocks() polls action unlock conditions and notifies on newly-unlocked actions
js/audio.js           — playTap/ActionComplete/Milestone/LevelUp/NPCMeet/Payday, toggleMute(); startStationAmbience()/stopStationAmbience()
js/ui.js              — all DOM rendering + phase strip + top-bar + bottom-sheet + end-of-day screen; renderFrame() on rAF
js/notifications.js   — sequential notification queue: events show one at a time, next blocks until current dismissed
js/version.js         — APP_VERSION (bump when deploying); hardRefreshApp()
js/parseDuration.js   — (legacy, unused — kept for possible future "real minutes" time UI)
manifest.json         — PWA config (display: standalone)
sw.js                 — caches all JS/CSS/HTML; bump CACHE version to match APP_VERSION; MP4/video files are bypassed
assets/images/npcs/   — NPC portrait images (kenji/yuki/hiro.png); kanji fallback if missing
assets/video/shinjuku.MP4 — looping 10s video of Shinjuku Station; used as animated background + ambient audio source
```
