import { state } from './state.js';
import {
  APP_VERSION,
  cleanCacheBustParam,
  shouldDeferServiceWorker,
  shouldSkipControllerReload,
} from './version.js';
import { loadGameData } from './gameData.js';
import { loadGame, saveGame, resetGame } from './save.js';
import { doAction, endPhase, endDay, hooks } from './engine.js';
import * as audio from './audio.js';
import { ACTION_DEFS } from './actions.js';
import { getStoryText } from './stories.js';
import { refillEnergy } from './resources.js';
import {
  renderFrame, renderHUD, renderHeader, renderLocation, renderPhaseStrip,
  renderActions, renderPeople, renderMilestones,
  showToast, showNPCMeetModal, showStoryPopup, bindStoryPopup,
  bindContentTabs, bindSettings, bindActionList, bindEndPhase,
  flashActionCard, showEndOfDayScreen,
} from './ui.js';

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

  if (hasSaved && state.character.name) {
    startGame();
  } else {
    // Ensure energy is at max on fresh start
    refillEnergy();
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
  bindContentTabs();
  bindSettings(resetGame);
  bindStoryPopup();

  // Click an action card → run it
  bindActionList(handleAction);

  // End-phase button
  bindEndPhase(handleEndPhase);

  // Wire engine hooks
  hooks.onActionComplete = ({ id, bonuses }) => {
    audio.playActionComplete();
    flashActionCard(id);

    // Show story popup unless an NPC first-meet is about to pop
    if (!state.flags.pendingNPCMeet) {
      const text = getStoryText(id, state);
      if (text) {
        const def = ACTION_DEFS[id];
        const visitMatch = id.match(/^(?:visit|deep)_(\w+)$/);
        const npcId = visitMatch ? visitMatch[1] : null;
        showStoryPopup(text, def?.icon, npcId, bonuses);
      }
    }
  };

  hooks.onPhaseChange = () => {
    renderPhaseStrip();
    renderActions(true);
  };

  hooks.onEndOfDayReady = () => {
    // Small delay so the last story popup has a beat to settle visually
    setTimeout(() => {
      showEndOfDayScreen(handleEndDay);
    }, 200);
  };

  hooks.onNewDay = () => {
    renderHeader();
    renderPhaseStrip();
    renderActions(true);
  };

  hooks.onPayday = () => {
    audio.playPayday();
    showToast('💰', 'Support Arrived', '+¥500 from your home church');
  };

  hooks.onMilestone = (def) => {
    audio.playMilestone();
    showToast(def.icon, def.name, def.desc || '');
    renderMilestones();
  };

  hooks.onNPCMeet = (npcId) => {
    audio.playNPCMeet();
    showNPCMeetModal(npcId);
  };

  // If we loaded into a pending end-of-day state, show the screen immediately.
  if (state.flags.pendingEndOfDay) {
    showEndOfDayScreen(handleEndDay);
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

function handleEndPhase() {
  endPhase();
}

function handleEndDay() {
  endDay();
}

// ─── Run ─────────────────────────────────────────────────────────────────────
boot();
