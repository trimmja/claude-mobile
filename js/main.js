import { state } from './state.js';
import { APP_VERSION } from './version.js';
import { loadGameData } from './gameData.js';
import { loadGame, saveGame, resetGame } from './save.js';
import { startEngine, hooks } from './engine.js';
import * as audio from './audio.js';
import {
  renderFrame, renderHUD, renderHeader, renderLocation,
  renderLocationTabs, renderActions, renderPeople, renderMilestones,
  showToast, showNPCMeetModal, bindContentTabs, bindCancelButton, bindSettings,
} from './ui.js';

// Expose audio for settings panel
window._audio = audio;

let swReloading = false;

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
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
  try {
    await loadGameData();
  } catch (err) {
    console.warn('Game data JSON could not load; actions may be empty.', err);
  }

  registerServiceWorker();

  const hasSaved = loadGame();

  if (hasSaved && state.character.name) {
    startGame();
  } else {
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
  renderLocationTabs();
  renderActions();
  renderHUD();
  renderHeader();

  // Bind UI interactions
  bindContentTabs();
  bindCancelButton();
  bindSettings(resetGame);

  // Wire engine hooks
  hooks.onActionComplete = (actionId) => {
    audio.playActionComplete();
    renderActions();
    renderActionBar();
    renderLocationTabs(); // some locations may newly unlock
    saveGame();
  };

  hooks.onNewDay = (day) => {
    renderHeader();
    renderLocationTabs();
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

  // Start engine
  startEngine();

  // rAF render loop
  function loop() {
    renderFrame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ─── Run ─────────────────────────────────────────────────────────────────────
boot();
