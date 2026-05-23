import { state } from './state.js';
import {
  ACTION_DEFS, actionsForLocation, actionProgress, startAction, cancelAction,
  getActionRequirements, actionUnlockCacheKey,
} from './actions.js';
import { LOCATION_DEFS, LOCATION_ORDER, goTo } from './locations.js';
import { NPC_DEFS, getStageName, getTrustPercent, getStageAdvanceHint, getIntroText } from './npcs.js';
import { MILESTONE_DEFS, completedCount } from './milestones.js';
import { locText, actionText, langLevel, langProgress, TAB_LABELS } from './language.js';
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
let lastLangLevelForUI = -1;

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

  // Language-aware UI labels — only update when level changes
  if (lv !== lastLangLevelForUI) {
    lastLangLevelForUI = lv;
    updateLanguageLabels(lv);
  }
}

function updateLanguageLabels(lv) {
  // Content tab labels
  document.querySelectorAll('.content-tab').forEach(tab => {
    const name = tab.dataset.tab;
    const text = TAB_LABELS[name];
    if (text) tab.textContent = lv >= 1 ? text.en : text.jp;
  });
  // Contacts HUD label
  const cl = $('hud-contacts-lbl');
  if (cl) cl.textContent = lv >= 1 ? 'Contacts' : '知人';
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
      const isDisabled = !isActive && !!activeId;

      const card = el('div', [
        'action-card',
        isActive   ? 'is-active'  : '',
        isLocked   ? 'locked'     : '',
        isDisabled ? 'disabled'   : '',
      ].filter(Boolean).join(' '));

      const iconEl = el('div', 'action-icon', def.icon);
      const infoEl = el('div', 'action-info');

      const jpEl = el('div', 'action-name-jp', texts.jp);
      const enEl = el('div', 'action-name-en', texts.en);
      infoEl.appendChild(jpEl);
      infoEl.appendChild(enEl);

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

  const metNPCs = Object.entries(NPC_DEFS).filter(([id]) => state.npcs[id].met);

  if (metNPCs.length === 0) {
    // Empty state — nobody met yet
    list.appendChild(el('div', 'empty-state',
      '<div class="empty-icon">🌆</div>' +
      '<p>Tokyo is full of people.<br>Hand out tracts at the station,<br>or try the park.</p>'
    ));
  } else {
    metNPCs.forEach(([id, def]) => {
      const npc  = state.npcs[id];
      const card = el('div', ['npc-card', def.cardClass, npc.stage === 5 ? 'believer' : ''].filter(Boolean).join(' '));

      // Portrait (image with kanji fallback)
      const avatar = buildNpcAvatar(id, def, 'npc-avatar');

      const info = el('div', 'npc-info');
      const nameLine = el('div', 'npc-name');
      nameLine.innerHTML = `${def.name} <span class="npc-name-jp">${def.nameJP}</span>`;
      info.appendChild(nameLine);
      info.appendChild(el('div', 'npc-role', def.role));
      info.appendChild(el('div', 'npc-stage-label', getStageName(id)));

      const barWrap = el('div', 'npc-bar-wrap');
      const barFill = el('div', 'npc-bar-fill');
      barFill.style.width = getTrustPercent(id).toFixed(0) + '%';
      barWrap.appendChild(barFill);
      info.appendChild(barWrap);

      // Stage advance hint
      const hint = getStageAdvanceHint(id);
      if (hint) {
        info.appendChild(el('div', 'npc-advance-hint', hint));
      }

      card.appendChild(avatar);
      card.appendChild(info);
      list.appendChild(card);
    });
  }

  // Contacts summary — always show
  const summary = $('contacts-summary');
  summary.innerHTML = `
    <div class="contacts-big">${state.resources.contacts}</div>
    <div class="contacts-sub">Total Contacts</div>
  `;
}

// Build an NPC avatar element with portrait image + JP kanji fallback
function buildNpcAvatar(npcId, def, className) {
  const wrap = el('div', className);
  // Portrait image — shows if file exists, hidden via onerror otherwise
  const img = document.createElement('img');
  img.src       = `assets/images/npcs/${npcId}.png`;
  img.alt       = def.name;
  img.className = 'npc-portrait-img';
  img.onerror   = () => img.style.display = 'none';
  // Kanji fallback
  const fallback = el('span', 'npc-portrait-fallback', def.nameJP[0]);
  wrap.appendChild(img);
  wrap.appendChild(fallback);
  return wrap;
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

// ─── STORY POPUP ─────────────────────────────────────────────────────────────
let storyPopupTimer = null;

// Show the story popup after an action completes.
// npcId: optional NPC to show portrait + name for.
// bonuses: optional { contacts?, faith?, npcTrust? } object.
export function showStoryPopup(text, icon, npcId, bonuses) {
  if (!text) return;

  const popup     = $('story-popup');
  const textEl    = $('story-popup-text');
  const npcEl     = $('story-popup-npc');
  const bonusEl   = $('story-popup-bonus');

  // Story text
  textEl.textContent = text;

  // NPC portrait header (if a specific NPC is involved)
  if (npcId && NPC_DEFS[npcId]) {
    const def = NPC_DEFS[npcId];
    npcEl.classList.remove('hidden');
    npcEl.innerHTML = '';

    const avatarWrap = buildNpcAvatar(npcId, def, 'story-npc-avatar');
    // Apply card colour class to the avatar wrapper
    avatarWrap.classList.add(def.cardClass);

    const infoDiv = el('div', 'story-npc-info');
    infoDiv.appendChild(el('div', 'story-npc-name', def.name));
    infoDiv.appendChild(el('div', 'story-npc-role', def.role));
    npcEl.appendChild(avatarWrap);
    npcEl.appendChild(infoDiv);
  } else {
    npcEl.classList.add('hidden');
  }

  // Bonus line
  const bonusParts = [];
  if (bonuses?.contacts) bonusParts.push(`+${bonuses.contacts} contacts (language)`);
  if (bonuses?.faith)    bonusParts.push(`+${bonuses.faith} faith (wisdom)`);
  if (bonuses?.npcTrust) bonusParts.push(`+${bonuses.npcTrust} trust (language)`);

  if (bonusParts.length > 0) {
    bonusEl.textContent = bonusParts.join(' · ');
    bonusEl.classList.remove('hidden');
  } else {
    bonusEl.classList.add('hidden');
  }

  // Show popup
  popup.classList.remove('hidden');

  // Auto-dismiss after 6s
  if (storyPopupTimer) clearTimeout(storyPopupTimer);
  storyPopupTimer = setTimeout(() => dismissStoryPopup(), 6000);
}

function dismissStoryPopup() {
  $('story-popup').classList.add('hidden');
  if (storyPopupTimer) { clearTimeout(storyPopupTimer); storyPopupTimer = null; }
}

export function bindStoryPopup() {
  const popup   = $('story-popup');
  const backdrop = $('story-popup-backdrop');
  const card    = popup?.querySelector('.story-popup-card');
  if (backdrop) backdrop.addEventListener('click', dismissStoryPopup);
  if (card)     card.addEventListener('click', dismissStoryPopup);
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
export function showModal(html, onClose) {
  const overlay = $('modal');
  const card    = $('modal-card');
  card.innerHTML = html;
  overlay.classList.remove('hidden');

  card.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      if (onClose) onClose();
    });
  });
}

export function showNPCMeetModal(npcId) {
  const def      = NPC_DEFS[npcId];
  const introText = getIntroText(npcId);

  // Build portrait HTML: image with kanji fallback
  const portraitHtml = `
    <div class="modal-portrait ${def.portraitClass}">
      <img src="assets/images/npcs/${npcId}.png"
           alt="${def.name}"
           class="npc-portrait-img modal-portrait-img"
           onerror="this.style.display='none'">
      <span class="npc-portrait-fallback modal-portrait-fallback">${def.nameJP[0]}</span>
    </div>
  `;

  showModal(`
    ${portraitHtml}
    <div class="modal-title">${def.name} <span class="modal-title-jp">${def.nameJP}</span></div>
    <div class="modal-subtitle">${def.role}</div>
    <div class="modal-body">${introText}</div>
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

  $('refresh-app-btn')?.addEventListener('click', () => hardRefreshApp());

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
