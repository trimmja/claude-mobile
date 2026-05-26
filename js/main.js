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
import * as audio from './audio.js';
import { ACTION_DEFS, NPC_ACTION_MAP } from './actions.js';
import { getStoryText, getStoryBeat } from './stories.js';
import { NPC_DEFS, getStageAdvanceText, getIntroText, adjustNPC, getNPCEvents, initNPCMoodStats } from './npcs.js';
import { addJournalEntry } from './journal.js';
import { refillTime, refillEnergyDaily } from './resources.js';
import {
  renderFrame, renderHUD, renderHeader, renderLocation, renderPhaseStrip,
  renderActions, renderPeople, renderJournal, invalidateTravelRow,
  showToast, showNPCMeetModal, showStoryPopup, showConversionModal,
  bindStoryPopup, bindJournalList,
  bindContentTabs, bindSettings, bindActionList, bindEndPhase, bindTravelRow,
  bindPeopleList, flashActionCard, showEndOfDayScreen, bindSheetHandle, bindSceneOpenBtn,
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
  renderLocation();
  renderPhaseStrip();
  renderActions(true);
  renderHUD();
  renderHeader();

  // Bind UI interactions
  bindSheetHandle();
  bindSceneOpenBtn();
  bindContentTabs();
  bindSettings(resetGame);
  bindStoryPopup();
  bindJournalList();
  bindTravelRow(handleTravel);
  bindPeopleList(handleNpcAction);

  // Click an action card → run it
  bindActionList(handleAction);

  // End-phase button
  bindEndPhase(handleEndPhase);

  // ─── Notification renderers ────────────────────────────────────────────────
  // Every renderer must call `done()` when its UI is dismissed so the queue advances.
  registerNotificationRenderer('story', (e, done) => {
    showStoryPopup(e.text, e.icon, e.npcId, e.bonuses, done);
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
  registerNotificationRenderer('endOfDay', (e, done) => {
    showEndOfDayScreen(() => { handleEndDay(); done(); });
  });

  // ─── Engine hooks → enqueue notifications ──────────────────────────────────
  hooks.onActionComplete = ({ id, bonuses, beat }) => {
    audio.playActionComplete();
    flashActionCard(id);

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
      enqueueNotification({ type: 'story', text, icon: def?.icon, npcId, bonuses });
    }
  };

  hooks.onNPCStageAdvance = ({ npcId, newStage }) => {
    const def = NPC_DEFS[npcId];
    if (!def) return;
    const stageName = def.stages[newStage] || `Stage ${newStage}`;
    const moment    = getStageAdvanceText(npcId, newStage);
    const headline  = `✨ ${def.name} is now ${stageName}.`;

    audio.playMilestone();
    addJournalEntry({
      id: `stage_${npcId}_${newStage}`,
      icon: newStage === 5 ? '✝️' : '✨',
      title: `${def.name} — ${stageName}`,
      body: moment || headline,
      type: 'stageAdvance',
      npcId,
    });
    renderJournal();

    if (newStage === 5) {
      // Conversion — show dedicated full-screen modal instead of story popup.
      // state.stats.converts is already incremented by addNPCTrust in npcs.js.
      enqueueNotification({ type: 'conversion', npcId, text: moment });
    } else {
      const text = moment ? `${headline} ${moment}` : headline;
      enqueueNotification({ type: 'story', text, icon: '✨', npcId, bonuses: null });
    }
  };

  hooks.onLangLevelUp = (newLevel) => {
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

  // Step 2: NPC mood / life-events system
  hooks.onBetweenPhases = () => {
    // No per-phase changes needed — all NPC stat changes are event-driven
  };

  hooks.onEndOfDay = () => {
    checkNPCEndOfDay();
  };

  hooks.onNewDay = () => {
    renderHeader();
    renderPhaseStrip();
    renderActions(true);
    invalidateTravelRow();
  };

  hooks.onTravel = () => {
    invalidateTravelRow();
    renderActions(true);
    renderPeople();
  };

  hooks.onPhaseChange = ({ to, auto }) => {
    renderPhaseStrip();
    renderActions(true);
    invalidateTravelRow();
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

  // If we loaded into a pending end-of-day state, show the screen immediately.
  if (state.flags.pendingEndOfDay) {
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

    if (updatedNpc.mood < -4) {
      enqueueNotification({
        type: 'toast',
        icon: def?.emoji || '👤',
        title: `${def?.name || npcId} is pulling back`,
        desc: `You haven't connected with ${def?.name || npcId} in a while.`,
      });
    }

    if (updatedNpc.burden > 8) {
      enqueueNotification({
        type: 'toast',
        icon: '✨',
        title: `Something in ${def?.name || npcId} seems ready`,
        desc: 'A deeper conversation might matter right now.',
      });
    }

    if (npcId === 'kenji' && updatedNpc.stress > 7) {
      enqueueNotification({
        type: 'toast',
        icon: '👔',
        title: `Kenji's messages have been short`,
        desc: 'Work must be crushing him right now.',
      });
    }
  }
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

function handleAction(actionId) {
  const result = doAction(actionId);
  if (!result.ok) {
    // Silently ignore — UI already prevents clicking when locked/no-energy
    return;
  }
  audio.playTap();
}

function handleTravel(locId) {
  const result = doTravel(locId);
  if (!result.ok) return;
  audio.playTap();
}

function handleEndPhase() {
  endPhase();
}

function handleEndDay() {
  endDay();
}

// People-tab action: if the NPC's action is at a different location, travel first, then act.
// Travel and action are independent — travel may succeed and the action then fail for energy
// reasons; that's intentional (you committed to going). UI prevents clicks unless both fit.
function handleNpcAction(actionId) {
  const def = ACTION_DEFS[actionId];
  if (!def) return;
  if (def.location && def.location !== state.location) {
    const travelResult = doTravel(def.location);
    if (!travelResult.ok) return;
  }
  handleAction(actionId);
}

// ─── Run ─────────────────────────────────────────────────────────────────────
boot();
