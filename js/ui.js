import { state } from './state.js';
import {
  ACTION_DEFS, allVisibleActions, getActionRequirements, actionUnlockCacheKey,
  hasFittingAction,
} from './actions.js';
import { LOCATION_DEFS } from './locations.js';
import { NPC_DEFS, getStageName, getTrustPercent, getStageAdvanceHint, getIntroText } from './npcs.js';
import { MILESTONE_DEFS, completedCount } from './milestones.js';
import { locText, actionText, langLevel, TAB_LABELS } from './language.js';
import { playTap } from './audio.js';
import { APP_VERSION, hardRefreshApp } from './version.js';
import { pickReflection } from './reflections.js';

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
  const e = state.resources.energy;
  $('res-faith').textContent    = Math.floor(state.resources.faith.current);
  $('res-energy').textContent   = `${e.current}/${e.max}`;
  $('res-contacts').textContent = state.resources.contacts;
  $('res-money').textContent    = '¥' + Math.floor(state.resources.money.current);
  $('res-wisdom').textContent   = Math.floor(state.resources.wisdom);

  const lv = langLevel();
  $('res-lang').textContent = 'Lv.' + lv;

  const pips = document.querySelectorAll('.lang-pip');
  pips.forEach((pip, i) => pip.classList.toggle('filled', i < lv));

  if (lv !== lastLangLevelForUI) {
    lastLangLevelForUI = lv;
    updateLanguageLabels(lv);
  }
}

function updateLanguageLabels(lv) {
  document.querySelectorAll('.content-tab').forEach(tab => {
    const name = tab.dataset.tab;
    const text = TAB_LABELS[name];
    const lblEl = tab.querySelector('.content-tab-lbl');
    if (text && lblEl) lblEl.textContent = lv >= 1 ? text.en : text.jp;
  });
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

  const def   = LOCATION_DEFS[state.location] || LOCATION_DEFS.apartment;
  const texts = locText(state.location);
  const bg    = $('location-bg');

  bg.className = 'location-bg ' + def.bgClass;

  $('location-name-jp').textContent = texts.jp;
  $('location-name-en').textContent = texts.en;
}

// ─── PHASE STRIP ────────────────────────────────────────────────────────────
const PHASE_DISPLAY = {
  morning:    { icon: '☀️', en: 'Morning',    jp: '朝' },
  afternoon:  { icon: '🌤', en: 'Afternoon',  jp: '昼' },
  evening:    { icon: '🌙', en: 'Evening',    jp: '夜' },
  reflecting: { icon: '✨', en: 'Reflecting', jp: '振り返り' },
};

export function renderPhaseStrip() {
  const phase = state.time.phase;
  const d = PHASE_DISPLAY[phase] || PHASE_DISPLAY.morning;
  $('phase-icon').textContent    = d.icon;
  $('phase-name-en').textContent = d.en;
  $('phase-name-jp').textContent = d.jp;

  const t = state.time;
  $('time-count').textContent = `${t.remaining}/${t.max}`;
  const tpct = t.max > 0 ? (t.remaining / t.max) * 100 : 0;
  $('time-bar-fill').style.width = tpct + '%';

  // End-phase button labelling + nudge state
  const btn = $('end-phase-btn');
  const nudge = $('phase-nudge');
  const noFit = !hasFittingAction() && phase !== 'reflecting';

  if (btn) {
    if (phase === 'morning')        btn.textContent = 'End Morning →';
    else if (phase === 'afternoon') btn.textContent = 'End Afternoon →';
    else if (phase === 'evening')   btn.textContent = 'End Evening →';
    else                            btn.textContent = '…';
    btn.classList.toggle('warn', noFit);
  }
  if (nudge) {
    nudge.classList.toggle('hidden', !noFit);
  }
}

// ─── ACTIONS LIST ───────────────────────────────────────────────────────────
let lastUnlockKey = '';
let lastPhase     = '';
let lastMetCount  = -1;

export function renderActions(force = false) {
  const list = $('action-list');
  const unlockKey = actionUnlockCacheKey();
  const phase = state.time.phase;
  const metCount = Object.values(state.npcs).filter(n => n.met).length;

  if (!force && unlockKey === lastUnlockKey && phase === lastPhase && metCount === lastMetCount) return;
  lastUnlockKey = unlockKey;
  lastPhase     = phase;
  lastMetCount  = metCount;

  list.innerHTML = '';

  const ids = allVisibleActions();
  if (ids.length === 0) {
    list.appendChild(el('div', 'empty-state', '<div class="empty-icon">🤫</div><p>Nothing to do here yet.</p>'));
    return;
  }

  // Sort: unlocked first, then locked
  ids.sort((a, b) => {
    const ua = ACTION_DEFS[a].unlocked() ? 0 : 1;
    const ub = ACTION_DEFS[b].unlocked() ? 0 : 1;
    return ua - ub;
  });

  ids.forEach(id => {
    list.appendChild(buildActionCard(id));
  });
}

function buildActionCard(id) {
  const def    = ACTION_DEFS[id];
  const texts  = actionText(id);
  const isLocked = !def.unlocked();
  const energy = state.resources.energy.current;
  const time   = state.time.remaining;
  const eCost  = def.energyCost ?? 0;
  const tCost  = def.timeCost ?? 0;
  const isDisabledEnergy = !isLocked && eCost > 0 && energy < eCost;
  const isDisabledTime   = !isLocked && tCost > 0 && time   < tCost;

  const card = el('div', [
    'action-card',
    isLocked         ? 'locked'          : '',
    isDisabledTime   ? 'disabled-time'   : '',
    isDisabledEnergy ? 'disabled-energy' : '',
  ].filter(Boolean).join(' '));
  card.dataset.actionId = id;

  const iconEl = el('div', 'action-icon', def.icon || '·');
  const infoEl = el('div', 'action-info');

  infoEl.appendChild(el('div', 'action-name-jp', texts.jp));
  infoEl.appendChild(el('div', 'action-name-en', texts.en));

  const meta = el('div', 'action-meta');

  // Location chip
  const locDef = def.location ? LOCATION_DEFS[def.location] : null;
  if (locDef) {
    const chip = el('span', 'location-chip');
    chip.innerHTML = `<span class="lc-icon">${locDef.icon}</span> ${locDef.nameEN}`;
    meta.appendChild(chip);
  }

  // Time cost
  if (tCost > 0) meta.appendChild(el('span', 'tag tag-time', '⏳ ' + tCost));

  // Energy cost / reward
  if (eCost > 0) {
    meta.appendChild(el('span', 'tag tag-energy', '⚡ ' + eCost));
  }
  if (def.energyReward) {
    meta.appendChild(el('span', 'tag tag-energy-up', '+⚡ ' + def.energyReward));
  }

  if (def.cost?.faith)      meta.appendChild(el('span', 'tag tag-cost',   '-' + def.cost.faith + ' Faith'));
  if (def.cost?.money)      meta.appendChild(el('span', 'tag tag-cost',   '-¥' + def.cost.money));
  if (def.reward?.faith)    meta.appendChild(el('span', 'tag tag-faith',  '+' + def.reward.faith   + ' Faith'));
  if (def.reward?.contacts) meta.appendChild(el('span', 'tag tag-trust',  '+' + def.reward.contacts + ' contacts'));
  if (def.reward?.wisdom)   meta.appendChild(el('span', 'tag tag-wisdom', '+' + def.reward.wisdom   + ' wisdom'));
  if (def.reward?.langXP)   meta.appendChild(el('span', 'tag tag-lang',   '+lang'));
  if (def.reward?.npcTrust) meta.appendChild(el('span', 'tag tag-trust',  '+trust'));

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

  card.appendChild(iconEl);
  card.appendChild(infoEl);

  return card;
}

// Briefly pulse the card that was just used.
export function flashActionCard(actionId) {
  const card = document.querySelector(`.action-card[data-action-id="${actionId}"]`);
  if (!card) return;
  card.classList.remove('flash');
  // force reflow so the animation can restart
  void card.offsetWidth;
  card.classList.add('flash');
}

// ─── PEOPLE TAB ─────────────────────────────────────────────────────────────
export function renderPeople() {
  const list = $('people-list');
  list.innerHTML = '';

  const metNPCs = Object.entries(NPC_DEFS).filter(([id]) => state.npcs[id].met);

  if (metNPCs.length === 0) {
    list.appendChild(el('div', 'empty-state',
      '<div class="empty-icon">🌆</div>' +
      '<p>Tokyo is full of people.<br>Hand out tracts at the station,<br>or try the park.</p>'
    ));
  } else {
    metNPCs.forEach(([id, def]) => {
      const npc  = state.npcs[id];
      const card = el('div', ['npc-card', def.cardClass, npc.stage === 5 ? 'believer' : ''].filter(Boolean).join(' '));

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

      const hint = getStageAdvanceHint(id);
      if (hint) info.appendChild(el('div', 'npc-advance-hint', hint));

      card.appendChild(avatar);
      card.appendChild(info);
      list.appendChild(card);
    });
  }

  const summary = $('contacts-summary');
  summary.innerHTML = `
    <div class="contacts-big">${state.resources.contacts}</div>
    <div class="contacts-sub">Total Contacts</div>
  `;
}

function buildNpcAvatar(npcId, def, className) {
  const wrap = el('div', className);
  const img = document.createElement('img');
  img.src       = `assets/images/npcs/${npcId}.png`;
  img.alt       = def.name;
  img.className = 'npc-portrait-img';
  img.onerror   = () => img.style.display = 'none';
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

// Click handler for the action list (delegation)
export function bindActionList(onAction) {
  $('action-list').addEventListener('click', e => {
    const card = e.target.closest('.action-card');
    if (!card) return;
    if (card.classList.contains('locked')) return;
    if (card.classList.contains('disabled-energy')) return;
    if (card.classList.contains('disabled-time')) return;
    const id = card.dataset.actionId;
    if (id) onAction(id);
  });
}

export function bindEndPhase(onEndPhase) {
  $('end-phase-btn').addEventListener('click', () => {
    onEndPhase();
    playTap();
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

export function showStoryPopup(text, icon, npcId, bonuses) {
  if (!text) return;

  const popup     = $('story-popup');
  const textEl    = $('story-popup-text');
  const npcEl     = $('story-popup-npc');
  const bonusEl   = $('story-popup-bonus');

  textEl.textContent = text;

  if (npcId && NPC_DEFS[npcId]) {
    const def = NPC_DEFS[npcId];
    npcEl.classList.remove('hidden');
    npcEl.innerHTML = '';

    const avatarWrap = buildNpcAvatar(npcId, def, 'story-npc-avatar');
    avatarWrap.classList.add(def.cardClass);

    const infoDiv = el('div', 'story-npc-info');
    infoDiv.appendChild(el('div', 'story-npc-name', def.name));
    infoDiv.appendChild(el('div', 'story-npc-role', def.role));
    npcEl.appendChild(avatarWrap);
    npcEl.appendChild(infoDiv);
  } else {
    npcEl.classList.add('hidden');
  }

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

  popup.classList.remove('hidden');
  if (storyPopupTimer) { clearTimeout(storyPopupTimer); storyPopupTimer = null; }
}

function dismissStoryPopup() {
  $('story-popup').classList.add('hidden');
  if (storyPopupTimer) { clearTimeout(storyPopupTimer); storyPopupTimer = null; }
}

export function bindStoryPopup() {
  const popup    = $('story-popup');
  const backdrop = $('story-popup-backdrop');
  const card     = popup?.querySelector('.story-popup-card');
  if (backdrop) backdrop.addEventListener('click', dismissStoryPopup);
  if (card)     card.addEventListener('click', dismissStoryPopup);
}

// ─── END-OF-DAY SCREEN ──────────────────────────────────────────────────────
export function showEndOfDayScreen(onContinue) {
  $('end-of-day-title').textContent = `Day ${state.time.day}`;

  const summary = $('end-of-day-summary');
  summary.innerHTML = '';

  const phases = state.dayLog?.phases || { morning: [], afternoon: [], evening: [] };
  let totalActions = 0;

  ['morning', 'afternoon', 'evening'].forEach(p => {
    const acts = phases[p] || [];
    totalActions += acts.length;
    const row = el('div', 'end-of-day-phase');
    const d = PHASE_DISPLAY[p];
    row.innerHTML = `
      <span class="eod-phase-icon">${d.icon}</span>
      <span class="eod-phase-name">${d.en}</span>
      <span class="eod-phase-actions">${acts.length === 0 ? '— quiet —' : summarizeActions(acts)}</span>
    `;
    summary.appendChild(row);
  });

  const totals = el('div', 'end-of-day-totals');
  totals.innerHTML = `
    <span class="eod-total-row">📌 <strong>${totalActions}</strong> actions</span>
    <span class="eod-total-row">◈ <strong>${state.resources.contacts}</strong> contacts</span>
    <span class="eod-total-row">語 <strong>Lv.${state.language.level}</strong></span>
    <span class="eod-total-row">✓ <strong>${state.milestones.completed.length}</strong> goals</span>
  `;
  summary.appendChild(totals);

  $('end-of-day-reflection').textContent = pickReflection();

  const continueBtn = $('end-of-day-continue');
  continueBtn.textContent = `Continue to Day ${state.time.day + 1} →`;

  $('end-of-day').classList.remove('hidden');

  // Replace listener each show to avoid stacking
  const newBtn = continueBtn.cloneNode(true);
  continueBtn.parentNode.replaceChild(newBtn, continueBtn);
  newBtn.addEventListener('click', () => {
    $('end-of-day').classList.add('hidden');
    onContinue();
  });
}

function summarizeActions(acts) {
  if (acts.length === 0) return '';
  const counts = {};
  acts.forEach(a => { counts[a.id] = (counts[a.id] || 0) + 1; });
  return Object.entries(counts).map(([id, n]) => {
    const label = actionText(id).en;
    return n > 1 ? `${label} ×${n}` : label;
  }).join(', ');
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
    renderActions(true);
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
  renderLocation();
  renderPhaseStrip();
  renderActions();
}
