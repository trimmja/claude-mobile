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
import { ACTION_DEFS } from './actions.js';
import { getStoryText } from './stories.js';
import { NPC_DEFS, getStageAdvanceText, getIntroText } from './npcs.js';
import { addJournalEntry } from './journal.js';
import { refillTime, refillEnergyDaily } from './resources.js';
import {
  renderFrame, renderHUD, renderHeader, renderLocation, renderPhaseStrip,
  renderActions, renderPeople, renderJournal, invalidateTravelRow,
  showToast, showNPCMeetModal, showStoryPopup, bindStoryPopup, bindJournalList,
  bindContentTabs, bindSettings, bindActionList, bindEndPhase, bindTravelRow,
  bindPeopleList, flashActionCard, showEndOfDayScreen, bindSheetHandle,
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
  registerNotificationRenderer('endOfDay', (e, done) => {
    showEndOfDayScreen(() => { handleEndDay(); done(); });
  });

  // ─── Engine hooks → enqueue notifications ──────────────────────────────────
  hooks.onActionComplete = ({ id, bonuses }) => {
    audio.playActionComplete();
    flashActionCard(id);

    // Skip the routine story popup if a bigger moment is about to land:
    // NPC first-meet modal, or NPC stage advance. Those will take the stage.
    const willMeetNPC      = !!state.flags.pendingNPCMeet;
    const willAdvanceStage = state.flags.pendingStageAdvances.length > 0;
    if (willMeetNPC || willAdvanceStage) return;

    const text = getStoryText(id, state);
    if (text) {
      const def = ACTION_DEFS[id];
      const visitMatch = id.match(/^(?:visit|deep)_(\w+)$/);
      const npcId = visitMatch ? visitMatch[1] : null;
      enqueueNotification({ type: 'story', text, icon: def?.icon, npcId, bonuses });
    }
  };

  hooks.onNPCStageAdvance = ({ npcId, newStage }) => {
    const def = NPC_DEFS[npcId];
    if (!def) return;
    const stageName = def.stages[newStage] || `Stage ${newStage}`;
    const moment    = getStageAdvanceText(npcId, newStage);
    const headline  = `✨ ${def.name} is now ${stageName}.`;
    const text      = moment ? `${headline} ${moment}` : headline;
    audio.playMilestone();
    addJournalEntry({
      id: `stage_${npcId}_${newStage}`,
      icon: '✨',
      title: `${def.name} — ${stageName}`,
      body: moment || headline,
      type: 'stageAdvance',
      npcId,
    });
    renderJournal();
    enqueueNotification({ type: 'story', text, icon: '✨', npcId, bonuses: null });
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
