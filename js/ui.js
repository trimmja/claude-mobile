import { state } from './state.js';
import {
  ACTION_DEFS, allVisibleActions, getActionRequirements, actionUnlockCacheKey,
  hasFittingAction,
} from './actions.js';
import { LOCATION_DEFS, LOCATION_ORDER, travelCostTo, currentLocation } from './locations.js';
import { NPC_DEFS, getStageName, getTrustPercent, getStageAdvanceHint, getIntroText } from './npcs.js';
import { locText, actionText, langLevel, TAB_LABELS } from './language.js';
import { playTap } from './audio.js';
import { APP_VERSION, hardRefreshApp } from './version.js';
import { pickReflection } from './reflections.js';
import { getJournalEntries, markJournalRead, unreadJournalCount } from './journal.js';

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
let lastUnreadForUI    = -1;

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

  const unread = unreadJournalCount();
  if (lv !== lastLangLevelForUI || unread !== lastUnreadForUI) {
    lastLangLevelForUI = lv;
    lastUnreadForUI    = unread;
    updateLanguageLabels(lv);
  }
}

function updateLanguageLabels(lv) {
  const unread = unreadJournalCount();
  document.querySelectorAll('.content-tab').forEach(tab => {
    const name = tab.dataset.tab;
    const text = TAB_LABELS[name];
    const lblEl = tab.querySelector('.content-tab-lbl');
    if (!text || !lblEl) return;
    let label = lv >= 1 ? text.en : text.jp;
    if (name === 'journal' && unread > 0) label += ` (${unread})`;
    lblEl.textContent = label;
  });
  const cl = $('hud-contacts-lbl');
  if (cl) cl.textContent = lv >= 1 ? 'Contacts' : '知人';
}

// ─── HEADER ─────────────────────────────────────────────────────────────────
export function renderHeader() {
  $('header-name').textContent = state.character.name || '—';
  $('header-day').textContent  = 'Day ' + state.time.day;
}

// ─── BOTTOM SHEET PANEL ─────────────────────────────────────────────────────
let _panelOpen = false;

export function togglePanel(forceOpen) {
  _panelOpen = (forceOpen !== undefined) ? forceOpen : !_panelOpen;
  const sheet = $('bottom-sheet');
  if (sheet) sheet.classList.toggle('sheet-open', _panelOpen);
}

export function bindSheetHandle() {
  const handle = $('sheet-handle');
  if (handle) handle.addEventListener('click', () => togglePanel());
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

  // Load scene image; fall back silently to gradient if image missing
  const img = $('location-img');
  if (img) {
    const newSrc = `assets/images/locations/${def.id}.png`;
    const sameSrc = img.getAttribute('src') === newSrc;
    if (sameSrc) {
      // Same source — just make sure it's visible if it loaded successfully
      img.style.opacity = (img.complete && img.naturalWidth > 0) ? '1' : '0';
    } else {
      // New location — cross-fade to new scene
      img.style.opacity = '0';
      img.src = newSrc;
      img.onerror = () => { img.style.opacity = '0'; };
      img.onload  = () => { img.style.opacity = '1'; };
    }
  }

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
  const tpct = t.max > 0 ? (t.remaining / t.max) * 100 : 0;
  $('time-count').textContent    = `${t.remaining}/${t.max}`;
  $('time-bar-fill').style.width = tpct + '%';

  // ── Also update the always-visible scene overlay pill ──
  const sIcon = $('scene-phase-icon');
  const sName = $('scene-phase-name');
  const sFill = $('scene-time-fill');
  const sCnt  = $('scene-time-count');
  if (sIcon) sIcon.textContent  = d.icon;
  if (sName) sName.textContent  = d.en;
  if (sFill) sFill.style.width  = tpct + '%';
  if (sCnt)  sCnt.textContent   = `${t.remaining}/${t.max}`;

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

// ─── TRAVEL ROW ─────────────────────────────────────────────────────────────
let lastTravelKey = '';

export function renderTravelRow() {
  const row = $('travel-row');
  if (!row) return;

  const t = state.time.remaining;
  const key = `${state.location}|${t}`;
  if (key === lastTravelKey) return;
  lastTravelKey = key;

  row.innerHTML = '';

  const here = currentLocation();
  const header = el('div', 'travel-here',
    `<span class="travel-here-label">📍 You are at</span>
     <span class="travel-here-name">${here.icon} ${here.nameEN}</span>`);
  row.appendChild(header);

  const dests = el('div', 'travel-dests');
  LOCATION_ORDER.forEach(locId => {
    if (locId === state.location) return;
    const def  = LOCATION_DEFS[locId];
    const cost = travelCostTo(locId);
    const canAfford = t >= cost;
    const btn = el('button',
      'travel-btn' + (canAfford ? '' : ' disabled-time'),
      `<span class="travel-btn-icon">${def.icon}</span>
       <span class="travel-btn-name">${def.nameEN}</span>
       <span class="travel-btn-cost">⏳${cost}</span>`);
    btn.dataset.travelTo = locId;
    if (!canAfford) btn.disabled = true;
    dests.appendChild(btn);
  });
  row.appendChild(dests);
}

export function bindTravelRow(onTravel) {
  const row = $('travel-row');
  if (!row) return;
  row.addEventListener('click', e => {
    const btn = e.target.closest('.travel-btn');
    if (!btn || btn.disabled) return;
    const locId = btn.dataset.travelTo;
    if (locId) onTravel(locId);
  });
}

// Force the travel row to rebuild on next render (used after location changes).
export function invalidateTravelRow() { lastTravelKey = ''; }

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

      // Interact buttons — auto-travel + run the action
      const actions = el('div', 'npc-actions');
      const visitId = `visit_${id}`;
      const deepId  = `deep_${id}`;
      const visitDef = ACTION_DEFS[visitId];
      const deepDef  = ACTION_DEFS[deepId];
      if (visitDef) {
        actions.appendChild(buildNpcActionBtn(visitId, visitDef, 'Visit'));
      }
      if (deepDef && deepDef.unlocked()) {
        actions.appendChild(buildNpcActionBtn(deepId, deepDef, 'Heart-to-Heart'));
      }
      info.appendChild(actions);

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

function buildNpcActionBtn(actionId, def, label) {
  const locDef = LOCATION_DEFS[def.location];
  const here = state.location;
  const needsTravel = def.location && def.location !== here;
  const travelCost  = needsTravel ? travelCostTo(def.location) : 0;
  const totalTime   = (def.timeCost || 0) + travelCost;

  const t = state.time.remaining;
  const e = state.resources.energy.current;
  const faithOK = !def.cost?.faith  || state.resources.faith.current  >= def.cost.faith;
  const moneyOK = !def.cost?.money  || state.resources.money.current  >= def.cost.money;
  const wisdomOK = !def.cost?.wisdom || state.resources.wisdom        >= def.cost.wisdom;
  const affordable = t >= totalTime && e >= (def.energyCost || 0) && faithOK && moneyOK && wisdomOK;

  const btn = el('button', 'npc-act-btn' + (affordable ? '' : ' disabled'));
  btn.dataset.npcAction = actionId;
  btn.innerHTML = `
    <span class="npc-act-label">${label}</span>
    <span class="npc-act-meta">
      ${needsTravel ? `<span class="npc-act-travel">→ ${locDef?.icon || ''} ⏳${travelCost}</span>` : ''}
      <span class="npc-act-cost">⏳${def.timeCost}${def.energyCost ? ` ⚡${def.energyCost}` : ''}</span>
    </span>
  `;
  if (!affordable) btn.disabled = true;
  return btn;
}

export function bindPeopleList(onNpcAction) {
  const list = $('people-list');
  if (!list) return;
  list.addEventListener('click', e => {
    const btn = e.target.closest('.npc-act-btn');
    if (!btn || btn.disabled) return;
    const actionId = btn.dataset.npcAction;
    if (actionId) onNpcAction(actionId);
  });
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

// ─── JOURNAL TAB ────────────────────────────────────────────────────────────
const PHASE_SHORT = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', reflecting: 'Evening' };
const expandedJournalIds = new Set();

export function renderJournal() {
  const list = $('journal-list');
  if (!list) return;
  list.innerHTML = '';

  const entries = getJournalEntries();
  if (entries.length === 0) {
    list.appendChild(el('div', 'journal-empty',
      `<div class="empty-icon">📖</div>
       <p>Your journal is empty.</p>
       <p class="journal-empty-sub">Important moments will be recorded here as you live them.</p>`
    ));
    return;
  }

  entries.forEach(entry => {
    const isOpen = expandedJournalIds.has(entry.id);
    const row = el('div', 'journal-row' + (isOpen ? ' open' : ''));
    row.dataset.entryId = entry.id;
    const phaseLabel = PHASE_SHORT[entry.phase] || '';
    row.innerHTML = `
      <div class="j-summary">
        <span class="j-icon">${entry.icon || '·'}</span>
        <div class="j-meta">
          <div class="j-title">${entry.title}</div>
          <div class="j-day">Day ${entry.day}${phaseLabel ? ' · ' + phaseLabel : ''}</div>
        </div>
        <span class="j-chevron">${isOpen ? '▾' : '▸'}</span>
      </div>
      <div class="j-body">${entry.body || ''}</div>
    `;
    list.appendChild(row);
  });
}

// Tap-to-expand handler — wired once at boot.
export function bindJournalList() {
  const list = $('journal-list');
  if (!list) return;
  list.addEventListener('click', e => {
    const row = e.target.closest('.journal-row');
    if (!row) return;
    const id = row.dataset.entryId;
    if (!id) return;
    if (expandedJournalIds.has(id)) expandedJournalIds.delete(id);
    else                            expandedJournalIds.add(id);
    renderJournal();
    playTap();
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

      // Opening any tab also opens the panel if it's collapsed
      togglePanel(true);

      if (name === 'people')  renderPeople();
      if (name === 'journal') { markJournalRead(); renderJournal(); }
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
let toastOnDismiss = null;

export function showToast(icon, title, desc = '', onDismiss = null) {
  const toast = $('toast');
  $('toast-icon').textContent  = icon;
  $('toast-title').textContent = title;
  $('toast-desc').textContent  = desc;

  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastOnDismiss = onDismiss;
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    const cb = toastOnDismiss;
    toastOnDismiss = null;
    if (cb) cb();
  }, 2800);
}

// ─── STORY POPUP ─────────────────────────────────────────────────────────────
let storyPopupTimer = null;
let storyPopupOnDismiss = null;

export function showStoryPopup(text, icon, npcId, bonuses, onDismiss = null) {
  if (!text) { if (onDismiss) onDismiss(); return; }
  storyPopupOnDismiss = onDismiss;

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
  const cb = storyPopupOnDismiss;
  storyPopupOnDismiss = null;
  if (cb) cb();
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

export function showNPCMeetModal(npcId, onDismiss = null) {
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
    if (onDismiss) onDismiss();
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
// Each render is wrapped so a single throw doesn't kill the whole loop —
// keeps the game responsive if one render breaks. Errors are logged.
function safeRender(name, fn) {
  try { fn(); } catch (e) { console.error(`[render:${name}]`, e); }
}

export function renderFrame() {
  safeRender('HUD',         renderHUD);
  safeRender('Header',      renderHeader);
  safeRender('Location',    renderLocation);
  safeRender('PhaseStrip',  renderPhaseStrip);
  safeRender('TravelRow',   renderTravelRow);
  safeRender('Actions',     () => renderActions());
}
