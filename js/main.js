import { state } from './state.js';
import {
  APP_VERSION,
  cleanCacheBustParam,
  shouldDeferServiceWorker,
  shouldSkipControllerReload,
} from './version.js';
import { loadGameData } from './gameData.js';
import { loadGame, saveGame, resetGame } from './save.js';
import { doAction, doTravel, endPhase, endDay, hooks } from './engine.js';
import { travelCostTo } from './locations.js';
import * as audio from './audio.js';
import { ACTION_DEFS, NPC_ACTION_MAP } from './actions.js';
import { getStoryText, getStoryBeat } from './stories.js';
import { NPC_DEFS, getStageAdvanceText, getIntroText, adjustNPC, getNPCEvents, initNPCMoodStats } from './npcs.js';
import { addJournalEntry } from './journal.js';
import { refillTime, refillEnergyDaily, adjustSpiritDry } from './resources.js';
import {
  renderFrame, renderStatsBar, renderDayBeat, renderScene, renderAnchor,
  renderTravelRail, renderDock, renderPeople, renderJournal, invalidateTravelRail, setView,
  showToast, showNPCMeetModal, showStoryPopup, showConversionModal, showStageAdvanceModal, showNpcStateCard,
  bindStoryPopup, bindNav, bindSettings, bindActionList, bindEndPhase, bindTravelRail,
  bindPeopleList, flashActionCard, showEndOfDayScreen,
  showTravelOverlay, showGoHomeModal,
} from './ui.js';
import { enqueueNotification, registerNotificationRenderer } from './notifications.js';
import { silentBackfillUnlocks } from './unlocks.js';

window._audio = audio;

let swReloading = false;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (shouldSkipControllerReload()) return;
    if (swReloading) return;
    swReloading = true;
    location.reload();
  });

  navigator.serviceWorker
    .register(`./sw.js?v=${APP_VERSION}`)
    .then(reg => reg.update())
    .catch(() => {});
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function boot() {
  cleanCacheBustParam();

  try {
    await loadGameData();
  } catch (err) {
    console.warn('Game data JSON could not load; actions may be empty.', err);
  }

  if (shouldDeferServiceWorker()) {
    window.addEventListener('load', () => registerServiceWorker(), { once: true });
  } else {
    registerServiceWorker();
  }

  const hasSaved = loadGame();

  // For existing v16-or-earlier saves loading v17: don't fire retroactive unlock toasts.
  if (hasSaved) silentBackfillUnlocks();

  if (hasSaved && state.character.name) {
    startGame();
  } else {
    // Ensure time + energy at max on fresh start
    refillTime();
    refillEnergyDaily();
    showIntro();
  }
}

// ─── Intro screen ────────────────────────────────────────────────────────────
function showIntro() {
  const screen  = document.getElementById('intro-screen');
  const nameInput = document.getElementById('character-name');
  const startBtn  = document.getElementById('start-btn');

  screen.classList.remove('hidden');
  document.getElementById('game-screen').classList.add('hidden');

  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    state.character.name = name;
    saveGame();
    startGame();
  });

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') startBtn.click();
  });

  nameInput.focus();
}

// ─── Start game ──────────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('intro-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  // Initial render
  renderScene();
  renderAnchor();
  renderDayBeat();
  renderTravelRail();
  renderDock(true);
  renderStatsBar();

  // Bind UI interactions
  bindNav();
  bindSettings(resetGame);
  bindStoryPopup();
  bindTravelRail(handleTravel);
  bindPeopleList(handleVisit);

  // Click an action card → run it
  bindActionList(handleAction);

  // End-phase button
  bindEndPhase(handleEndPhase);

  // ─── Notification renderers ────────────────────────────────────────────────
  // Every renderer must call `done()` when its UI is dismissed so the queue advances.
  registerNotificationRenderer('story', (e, done) => {
    showStoryPopup(e.text, e.icon, e.npcId, e.bonuses, e.reward, done, e.setback, e.npcShift);
  });
  registerNotificationRenderer('toast', (e, done) => {
    showToast(e.icon, e.title, e.desc, done);
  });
  registerNotificationRenderer('npcMeet', (e, done) => {
    showNPCMeetModal(e.npcId, done);
  });
  registerNotificationRenderer('conversion', (e, done) => {
    showConversionModal(e.npcId, e.text, done);
  });
  registerNotificationRenderer('stageAdvance', (e, done) => {
    showStageAdvanceModal(e.npcId, e.newStage, e.text, done);
  });
  registerNotificationRenderer('npcStateShift', (e, done) => {
    showNpcStateCard(e.npcId, e.headline, e.desc, done);
  });
  registerNotificationRenderer('endOfDay', (e, done) => {
    showEndOfDayScreen(() => { handleEndDay(); done(); });
  });
  registerNotificationRenderer('goHome', (e, done) => {
    // Releasing the queue, then running the (visual) travel + reflection chain.
    showGoHomeModal(() => { done(); runTravel('apartment'); });
  });

  // ─── Engine hooks → enqueue notifications ──────────────────────────────────
  hooks.onActionComplete = ({ id, bonuses, beat, reward, setback, npcShift }) => {
    audio.playActionComplete();
    if (setback) audio.playSetback();
    flashActionCard(id);

    // Setback → journal entry so the moment is remembered. icon/title scoped to the beat.
    if (setback && beat?.text) {
      const def = ACTION_DEFS[id];
      addJournalEntry({
        id: `setback_${id}_${state.time.day}_${state.time.phase}_${state.stats.actionsCompleted}`,
        icon: '⛅',
        title: `Setback — ${actionLabel(id)}`,
        body: beat.text,
        type: 'setback',
      });
      renderJournal();
    }

    // Skip the routine story popup if a bigger moment is about to land:
    // NPC first-meet modal, or NPC stage advance. Those will take the stage.
    const willMeetNPC      = !!state.flags.pendingNPCMeet;
    const willAdvanceStage = state.flags.pendingStageAdvances.length > 0;
    if (willMeetNPC || willAdvanceStage) return;

    // Use text from pre-selected beat (avoids re-selecting a different beat), or fall back.
    const text = beat?.text ?? getStoryText(id, state);
    if (text) {
      const def = ACTION_DEFS[id];
      const npcId = NPC_ACTION_MAP[id] ?? null;
      enqueueNotification({ type: 'story', text, icon: def?.icon, npcId, bonuses, reward, setback, npcShift });
    }
  };

  function actionLabel(id) {
    // Try ACTION_DEFS first for the rich icon+name, fall back to id.
    const def = ACTION_DEFS[id];
    return def?.icon ? `${def.icon} ${id.replace(/_/g, ' ')}` : id;
  }

  hooks.onNPCStageAdvance = ({ npcId, newStage }) => {
    const def = NPC_DEFS[npcId];
    if (!def) return;
    const stageName = def.stages[newStage] || `Stage ${newStage}`;
    const moment    = getStageAdvanceText(npcId, newStage);
    const headline  = `✨ ${def.name} is now ${stageName}.`;

    addJournalEntry({
      id: `stage_${npcId}_${newStage}`,
      icon: newStage === 5 ? '✝️' : newStage === 8 ? '⭐' : '✨',
      title: `${def.name} — ${stageName}`,
      body: moment || headline,
      type: 'stageAdvance',
      npcId,
    });
    renderJournal();

    if (newStage === 5) {
      // Conversion — gold modal + triumphant milestone sound.
      // state.stats.converts is already incremented by addNPCTrust in npcs.js.
      audio.playMilestone();
      enqueueNotification({ type: 'conversion', npcId, text: moment });
    } else if (newStage === 8) {
      // Elder — sakura+gold modal + fuller chord. The "they're a leader now" cue.
      audio.playElderChord();
      enqueueNotification({ type: 'stageAdvance', npcId, newStage, text: moment });
    } else {
      // Stages 1–4 (relationship), 6–7 (discipleship): sakura-ringed modal + warm chord.
      audio.playStageAdvance();
      enqueueNotification({ type: 'stageAdvance', npcId, newStage, text: moment });
    }
  };

  hooks.onLangLevelUp = (newLevel) => {
    // Phase C: mark the day so the reflection picker can choose a level-up line.
    if (state.dayLog) state.dayLog.langLevelUpToday = true;
    addJournalEntry({
      id: `lang_${newLevel}`,
      icon: '語',
      title: `Japanese Level ${newLevel}`,
      body: `Your Japanese has reached level ${newLevel}. The world translates a little more.`,
      type: 'langLevelUp',
    });
    renderJournal();
    enqueueNotification({
      type: 'toast',
      icon: '語',
      title: `Japanese Level ${newLevel}`,
      desc: 'You understand more now.',
    });
  };

  hooks.onEndOfDayReady = () => {
    enqueueNotification({ type: 'endOfDay' });
  };

  hooks.onGoHomeReady = () => {
    enqueueNotification({ type: 'goHome' });
  };

  // Step 2: NPC mood / life-events system
  hooks.onBetweenPhases = () => {
    // No per-phase changes needed — all NPC stat changes are event-driven
  };

  hooks.onEndOfDay = () => {
    checkNPCEndOfDay();
    checkDryDay();
  };

  hooks.onNewDay = () => {
    renderDayBeat();
    renderDock(true);
    invalidateTravelRail();
  };

  hooks.onTravel = () => {
    invalidateTravelRail();
    renderDock(true);
    renderPeople();
  };

  hooks.onPhaseChange = ({ to, auto }) => {
    renderDayBeat();
    renderDock(true);
    invalidateTravelRail();
    if (auto) {
      const labels = {
        morning:   ['☀️', 'Morning',   'A new morning begins'],
        afternoon: ['🌤', 'Afternoon', 'Time slipped past noon'],
        evening:   ['🌙', 'Evening',   'The day is winding down'],
      };
      const [icon, title, desc] = labels[to] || ['•', to, ''];
      enqueueNotification({ type: 'toast', icon, title, desc });
    }
  };

  hooks.onPayday = () => {
    audio.playPayday();
    enqueueNotification({ type: 'toast', icon: '💰', title: 'Support Arrived', desc: '+¥500 from your home church' });
  };

  hooks.onMilestone = (def) => {
    audio.playMilestone();
    addJournalEntry({
      id: `milestone_${def.id}`,
      icon: def.icon,
      title: def.name,
      body: def.desc || `You reached this milestone.`,
      type: 'milestone',
    });
    renderJournal();
    enqueueNotification({ type: 'toast', icon: def.icon, title: def.name, desc: def.desc || '' });
  };

  hooks.onNPCMeet = (npcId) => {
    audio.playNPCMeet();
    const def = NPC_DEFS[npcId];
    if (def) {
      addJournalEntry({
        id: `meet_${npcId}`,
        icon: def.emoji || '👤',
        title: `Met ${def.name}`,
        body: getIntroText(npcId),
        type: 'npcMeet',
        npcId,
      });
      renderJournal();
    }
    enqueueNotification({ type: 'npcMeet', npcId });
  };

  // If we loaded mid-"go home" (evening ended away from home), re-show the prompt —
  // it must clear before the day can end. Otherwise, if a reflection is pending, show it.
  if (state.flags.pendingGoHome) {
    enqueueNotification({ type: 'goHome' });
  } else if (state.flags.pendingEndOfDay) {
    enqueueNotification({ type: 'endOfDay' });
  }

  // rAF render loop
  function loop() {
    renderFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ─── NPC end-of-day processing ───────────────────────────────────────────────
// Runs once per day when the evening phase ends.
// 1. Check scripted arc events (fire first matching one per NPC per day).
// 2. Roll a random texture event (only if no scripted event fired AND NPC not visited today).
// 3. Fire threshold notification toasts for low mood / high burden / high stress.
function checkNPCEndOfDay() {
  const today = state.time.day;

  for (const npcId of Object.keys(state.npcs)) {
    const npc = state.npcs[npcId];
    if (!npc.met) continue;

    const events = getNPCEvents(npcId);
    const visitedToday = npc.lastSeenDay === today;
    let scriptedFired = false;

    // 1. Scripted events — fire first matching unfired one
    for (const ev of (events.scripted || [])) {
      if (npc.firedEvents.includes(ev.id)) continue;
      if (!npcEventConditionsMet(ev.conditions)) continue;

      // Apply deltas
      adjustNPC(npcId, { mood: ev.mood, stress: ev.stress, burden: ev.burden });
      npc.firedEvents.push(ev.id);
      scriptedFired = true;

      // Show LINE-style notification if provided
      if (ev.notification) {
        const def = NPC_DEFS[npcId];
        enqueueNotification({
          type: 'toast',
          icon: def?.emoji || '💬',
          title: def?.name || npcId,
          desc: ev.notification,
        });
      }
      break; // max one scripted event per NPC per day
    }

    // 2. Random texture event — silent, discovered at next visit through story beats
    if (!scriptedFired && !visitedToday && events.random?.length) {
      const roll = Math.random();
      let cumulative = 0;
      for (const ev of events.random) {
        cumulative += (ev.probability || 0);
        if (roll < cumulative) {
          adjustNPC(npcId, { mood: ev.mood, stress: ev.stress, burden: ev.burden });
          break;
        }
      }
    }

    // 3. Threshold notifications (re-read stats after events may have changed them)
    const updatedNpc = state.npcs[npcId];
    const def = NPC_DEFS[npcId];
    const name = def?.name || npcId;

    if (updatedNpc.mood < -4) {
      enqueueNotification({
        type: 'npcStateShift',
        npcId,
        headline: `${name} is pulling back.`,
        desc: `You haven't connected with ${name} in a while.`,
      });
    }

    if (updatedNpc.burden > 8) {
      enqueueNotification({
        type: 'npcStateShift',
        npcId,
        headline: `Something in ${name} seems ready.`,
        desc: 'A deeper conversation might matter right now.',
      });
    }

    if (npcId === 'kenji' && updatedNpc.stress > 7) {
      enqueueNotification({
        type: 'npcStateShift',
        npcId,
        headline: `Kenji's messages have been short.`,
        desc: 'Work must be crushing him right now.',
      });
    }
  }
}

// A day with zero people-facing actions ticks spiritDry up by 1.
// People-facing = any tract/preach/convo/host action OR any NPC visit/deep action.
// This is the "you didn't engage with anyone all day" feedback — comes through
// in next-day story beats rather than its own notification.
const PEOPLE_FACING_ACTIONS = new Set([
  'hand_tracts', 'open_air_preach', 'commuter_convo', 'casual_convo', 'host_english',
  'visit_kenji', 'visit_yuki', 'visit_hiro',
  'evening_kenji', 'questions_yuki', 'pray_hiro',
]);

function checkDryDay() {
  const phases = state.dayLog?.phases || {};
  const allActs = [...(phases.morning || []), ...(phases.afternoon || []), ...(phases.evening || [])];
  const hadContact = allActs.some(a => PEOPLE_FACING_ACTIONS.has(a.id));
  if (!hadContact) adjustSpiritDry(1);
}

/**
 * Check whether a scripted event's conditions are met against current state.
 * Supports: dayMin, dayMax, stageMin_{npcId}, stageMax_{npcId}
 */
function npcEventConditionsMet(conditions) {
  if (!conditions) return true;
  const { dayMin, dayMax } = conditions;
  if (dayMin !== undefined && state.time.day < dayMin) return false;
  if (dayMax !== undefined && state.time.day > dayMax) return false;
  for (const [key, val] of Object.entries(conditions)) {
    const minM = key.match(/^stageMin_(\w+)$/);
    const maxM = key.match(/^stageMax_(\w+)$/);
    if (minM && (state.npcs[minM[1]]?.stage ?? -1) < val) return false;
    if (maxM && (state.npcs[maxM[1]]?.stage ?? 99) > val) return false;
  }
  return true;
}

// Centralized travel: plays the ~5s train overlay, then commits the move. Every
// trip (rail pill, People "Visit", end-of-day Go Home) routes through here.
function runTravel(locId) {
  if (locId === state.location) return;
  const goingHomeToEnd = state.flags.pendingGoHome && locId === 'apartment';
  // Don't show the overlay for a trip that can't be afforded (rail already disables
  // these; this guards the People "Visit" path). The end-of-day trip home is free.
  if (!goingHomeToEnd && state.time.remaining < travelCostTo(locId)) return;
  audio.playTap();
  showTravelOverlay(locId, () => {
    doTravel(locId, { free: goingHomeToEnd });
    // When free (going home to end the day), doTravel's own "time === 0" check fires
    // endPhase, which takes the at-home reflection branch — no extra wiring needed.
  });
}

function handleAction(actionId) {
  // While the go-home prompt is pending and you're still out, any action attempt just
  // re-surfaces the prompt — you can't act until you've gone home.
  if (state.flags.pendingGoHome && state.location !== 'apartment') {
    enqueueNotification({ type: 'goHome' });
    return;
  }
  const result = doAction(actionId);
  if (!result.ok) {
    // Silently ignore — UI already prevents clicking when locked/no-energy
    return;
  }
  audio.playTap();
}

function handleTravel(locId) {
  runTravel(locId);
}

function handleEndPhase() {
  endPhase();
}

function handleEndDay() {
  endDay();
}

// People-view "Visit" button: switch to the Scene and travel to where the NPC is.
// The actual visiting happens by tapping their card in the dock there (matches the
// Direction D design — Visit navigates, it doesn't auto-run the action).
function handleVisit(npcId) {
  const home = ACTION_DEFS[`visit_${npcId}`]?.location;
  setView('actions');
  if (home && home !== state.location) {
    runTravel(home);   // plays the travel overlay; best-effort if time is short
  } else {
    audio.playTap();
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────
boot();
