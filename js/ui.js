import { state } from './state.js';
import {
  ACTION_DEFS, actionsForLocation, actionProgress, startAction, cancelAction,
  getActionRequirements, actionUnlockCacheKey,
} from './actions.js';
import { LOCATION_DEFS, LOCATION_ORDER, goTo } from './locations.js';
import { NPC_DEFS, getStageName, getTrustPercent } from './npcs.js';
import { MILESTONE_DEFS, completedCount } from './milestones.js';
import { locText, actionText, langLevel, langProgress } from './language.js';
import { playTap } from './audio.js';
import { APP_VERSION, hardRefreshApp } from './version.js';

// ─── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

// ─── HUD ────────────────────────────────────────────────────────────────────
export function renderHUD() {
  $('res-faith').textContent    = Math.floor(state.resources.faith.current);
  $('res-contacts').textContent = state.resources.contacts;
  $('res-money').textContent    = '¥' + Math.floor(state.resources.money.current);
  $('res-wisdom').textContent   = Math.floor(state.resources.wisdom);

  const lv = langLevel();
  $('res-lang').textContent = 'Lv.' + lv;

  // Language pips (5 pips)
  const pips = document.querySelectorAll('.lang-pip');
  pips.forEach((pip, i) => {
    pip.classList.toggle('filled', i < lv);
  });
}

// ─── HEADER ─────────────────────────────────────────────────────────────────
export function renderHeader() {
  $('header-name').textContent = state.character.name || '—';
  $('header-day').textContent  = 'Day ' + state.time.day;
}

// ─── LOCATION VIEW ──────────────────────────────────────────────────────────
let lastLocation = null;
export function renderLocation() {
  if (state.location === lastLocation) return;
  lastLocation = state.location;

  const def   = LOCATION_DEFS[state.location];
  const texts = locText(state.location);
  const bg    = $('location-bg');

  // swap bg class
  bg.className = 'location-bg ' + def.bgClass;

  $('location-name-jp').textContent = texts.jp;
  $('location-name-en').textContent = texts.en;
}

// ─── LOCATION TABS ──────────────────────────────────────────────────────────
export function renderLocationTabs() {
  const nav = $('location-tabs');
  nav.innerHTML = '';

  LOCATION_ORDER.forEach(id => {
    const def    = LOCATION_DEFS[id];
    const locked = !def.unlocked();
    const btn    = el('button', 'loc-tab' + (locked ? ' locked-tab' : '') + (state.location === id ? ' active' : ''));
    btn.innerHTML = `<span class="loc-tab-icon">${def.tabIcon}</span><span class="loc-tab-lbl">${def.tabLabel}</span>`;
    if (!locked) {
      btn.addEventListener('click', () => {
        if (state.location !== id) {
          goTo(id);
          renderLocation();
          renderLocationTabs();
          renderActions();
          playTap();
        }
      });
    } else {
      btn.title = def.unlockHint ? 'Unlock: ' + def.unlockHint : 'Locked';
    }
    nav.appendChild(btn);
  });
}

// ─── ACTION BAR (top) ───────────────────────────────────────────────────────
export function renderActionBar() {
  const bar = $('action-bar');
  if (!state.action.id) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');

  const prog  = actionProgress();
  const texts = actionText(state.action.id);

  $('action-bar-label').textContent = texts.en;
  $('action-bar-fill').style.width  = (prog * 100).toFixed(1) + '%';
}

// ─── ACTIONS LIST ───────────────────────────────────────────────────────────
let lastActionLocation = null;
let lastActionId       = null;
let lastMetCount       = -1;
let lastUnlockKey      = '';

export function renderActions() {
  const list    = $('action-list');
  const locId   = state.location;
  const activeId = state.action.id;
  const metCount = Object.values(state.npcs).filter(n => n.met).length;

  const unlockKey = actionUnlockCacheKey();

  // Full rebuild when location, action, NPC met, or unlock progress changes
  if (locId !== lastActionLocation || activeId !== lastActionId || metCount !== lastMetCount || unlockKey !== lastUnlockKey) {
    lastActionLocation = locId;
    lastActionId       = activeId;
    lastMetCount       = metCount;
    lastUnlockKey      = unlockKey;
    list.innerHTML = '';

    const ids = actionsForLocation(locId);
    if (ids.length === 0) {
      list.appendChild(el('div', 'empty-state', '<div class="empty-icon">🤫</div><p>Nothing to do here yet.</p>'));
      return;
    }

    ids.forEach(id => {
      const def    = ACTION_DEFS[id];
      const texts  = actionText(id);
      const isActive = activeId === id;
      const isLocked = !def.unlocked();
      const isDisabled = !isActive && !!activeId; // another action running

      const card = el('div', [
        'action-card',
        isActive   ? 'is-active'  : '',
        isLocked   ? 'locked'     : '',
        isDisabled ? 'disabled'   : '',
      ].filter(Boolean).join(' '));

      // icon
      const iconEl = el('div', 'action-icon', def.icon);

      // info
      const infoEl = el('div', 'action-info');

      const jpEl = el('div', 'action-name-jp', texts.jp);
      const enEl = el('div', 'action-name-en', texts.en);
      infoEl.appendChild(jpEl);
      infoEl.appendChild(enEl);

      // meta tags
      const meta = el('div', 'action-meta');
      if (def.cost?.faith)  meta.appendChild(el('span', 'tag tag-cost',  '-' + def.cost.faith  + ' Faith'));
      if (def.cost?.money)  meta.appendChild(el('span', 'tag tag-cost',  '-¥' + def.cost.money));
      if (def.reward?.faith)    meta.appendChild(el('span', 'tag tag-faith',  '+' + def.reward.faith   + ' Faith'));
      if (def.reward?.contacts) meta.appendChild(el('span', 'tag tag-trust',  '+' + def.reward.contacts + ' contacts'));
      if (def.reward?.wisdom)   meta.appendChild(el('span', 'tag tag-wisdom', '+' + def.reward.wisdom   + ' wisdom'));
      if (def.reward?.langXP)   meta.appendChild(el('span', 'tag tag-lang',   '+lang'));
      if (def.reward?.npcTrust) meta.appendChild(el('span', 'tag tag-trust',  '+trust'));
      meta.appendChild(el('span', 'tag tag-time', fmtDuration(def.duration)));
      infoEl.appendChild(meta);

      const requirements = getActionRequirements(id);
      if (requirements?.length) {
        const reqBox = el('div', 'action-requirements');
        requirements.forEach(req => {
          reqBox.appendChild(el(
            'div',
            'action-req-line' + (req.met ? ' met' : ' unmet'),
            (req.met ? '✓ ' : '○ ') + req.label + ' — ' + req.detail,
          ));
        });
        infoEl.appendChild(reqBox);
      }

      // progress bar for active action
      const progBar = el('div', 'action-prog');
      progBar.style.width = '0%';

      card.appendChild(iconEl);
      card.appendChild(infoEl);
      card.appendChild(progBar);

      if (!isLocked && !isDisabled && !isActive) {
        card.addEventListener('click', () => {
          if (startAction(id)) {
            playTap();
            renderActions();
            renderActionBar();
          }
        });
      }

      list.appendChild(card);
    });
  }

  // Update progress bar on active card without rebuilding
  if (activeId) {
    const prog = actionProgress();
    const bar  = list.querySelector('.action-card.is-active .action-prog');
    if (bar) bar.style.width = (prog * 100).toFixed(1) + '%';
  }
}

// ─── CANCEL BUTTON ──────────────────────────────────────────────────────────
export function bindCancelButton() {
  $('action-cancel').addEventListener('click', () => {
    cancelAction();
    renderActions();
    renderActionBar();
  });
}

// ─── PEOPLE TAB ─────────────────────────────────────────────────────────────
export function renderPeople() {
  const list = $('people-list');
  list.innerHTML = '';

  Object.entries(NPC_DEFS).forEach(([id, def]) => {
    const npc    = state.npcs[id];
    const unmet  = !npc.met;
    const card   = el('div', ['npc-card', def.cardClass, unmet ? 'npc-unmet' : '', npc.stage === 5 ? 'believer' : ''].filter(Boolean).join(' '));

    const avatar = el('div', 'npc-avatar', def.emoji);
    const info   = el('div', 'npc-info');

    info.appendChild(el('div', 'npc-name', unmet ? '???' : def.name));
    info.appendChild(el('div', 'npc-role', unmet ? (state.language.level >= 1 ? def.role : '???') : def.role));

    if (!unmet) {
      info.appendChild(el('div', 'npc-stage-label', getStageName(id)));

      const barWrap = el('div', 'npc-bar-wrap');
      const barFill = el('div', 'npc-bar-fill');
      barFill.style.width = getTrustPercent(id).toFixed(0) + '%';
      barWrap.appendChild(barFill);
      info.appendChild(barWrap);
    }

    card.appendChild(avatar);
    card.appendChild(info);
    list.appendChild(card);
  });

  // Contacts summary
  const summary = $('contacts-summary');
  summary.innerHTML = `
    <div class="contacts-big">${state.resources.contacts}</div>
    <div class="contacts-sub">Total Contacts</div>
  `;
}

// ─── MILESTONES TAB ──────────────────────────────────────────────────────────
export function renderMilestones() {
  const list = $('milestones-list');
  list.innerHTML = '';

  const done  = completedCount();
  const total = MILESTONE_DEFS.length;

  const header = el('div', 'milestones-header');
  header.innerHTML = `<div class="milestones-count"><span>${done}</span> / ${total} completed</div>`;
  list.appendChild(header);

  MILESTONE_DEFS.forEach(def => {
    const completed = state.milestones.completed.includes(def.id);
    const row = el('div', 'milestone-row' + (completed ? ' done' : ''));
    row.innerHTML = `
      <span class="m-icon">${def.icon}</span>
      <span class="m-name">${def.name}${def.desc ? '<br><small style="font-weight:400;font-size:11px;color:var(--text-dim)">' + def.desc + '</small>' : ''}</span>
      ${completed ? '<span class="m-check">✓</span>' : ''}
    `;
    list.appendChild(row);
  });
}

// ─── CONTENT TABS ───────────────────────────────────────────────────────────
export function bindContentTabs() {
  document.querySelectorAll('.content-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      $('tab-' + name).classList.remove('hidden');

      if (name === 'people')     renderPeople();
      if (name === 'milestones') renderMilestones();
      playTap();
    });
  });
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer = null;

export function showToast(icon, title, desc = '') {
  const toast = $('toast');
  $('toast-icon').textContent  = icon;
  $('toast-title').textContent = title;
  $('toast-desc').textContent  = desc;

  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
export function showModal(html, onClose) {
  const overlay = $('modal');
  const card    = $('modal-card');
  card.innerHTML = html;
  overlay.classList.remove('hidden');

  // Bind close buttons inside the modal
  card.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      if (onClose) onClose();
    });
  });
}

export function showNPCMeetModal(npcId) {
  const def = NPC_DEFS[npcId];
  showModal(`
    <div class="modal-portrait ${def.portraitClass}">${def.emoji}</div>
    <div class="modal-title">${def.name}</div>
    <div class="modal-subtitle">${def.role}</div>
    <div class="modal-body">${def.intro}</div>
    <button class="modal-btn modal-btn-primary" data-close>Nice to meet you</button>
  `, () => {
    renderPeople();
    renderActions();
  });
}

export function showConfirmModal(title, body, onConfirm) {
  showModal(`
    <div class="modal-title">${title}</div>
    <div class="modal-body" style="font-style:normal;color:var(--text-muted)">${body}</div>
    <button class="modal-btn modal-btn-danger" id="confirm-yes">Yes, reset everything</button>
    <button class="modal-btn modal-btn-secondary" style="margin-top:8px" data-close>Cancel</button>
  `);
  $('confirm-yes').addEventListener('click', () => {
    $('modal').classList.add('hidden');
    onConfirm();
  });
}

// ─── SETTINGS ───────────────────────────────────────────────────────────────
export function bindSettings(onReset) {
  const versionEl = $('app-version');
  if (versionEl) {
    versionEl.textContent = `Build ${APP_VERSION} · trimmja.github.io/japan-evangelistic-band`;
  }

  $('refresh-app-btn')?.addEventListener('click', () => {
    hardRefreshApp();
  });

  $('header-settings').addEventListener('click', () => {
    $('settings-overlay').classList.remove('hidden');
  });

  $('settings-close').addEventListener('click', () => {
    $('settings-overlay').classList.add('hidden');
  });

  $('settings-overlay').addEventListener('click', e => {
    if (e.target === $('settings-overlay')) $('settings-overlay').classList.add('hidden');
  });

  $('mute-btn').addEventListener('click', () => {
    const { toggleMute } = window._audio;
    const muted = toggleMute();
    $('mute-btn').textContent = muted ? '🔇 Unmute' : '🔊 Mute Music';
  });

  $('reset-btn').addEventListener('click', () => {
    $('settings-overlay').classList.add('hidden');
    showConfirmModal(
      'Reset Progress',
      'This will erase all your progress and start fresh. Are you sure?',
      onReset
    );
  });
}

// ─── FULL RENDER (called on rAF) ────────────────────────────────────────────
export function renderFrame() {
  renderHUD();
  renderHeader();
  renderActions();
  renderActionBar();
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fmtDuration(ms) {
  const s = ms / 1000;
  return s >= 60 ? Math.round(s / 60) + 'm' : s + 's';
}
