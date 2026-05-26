import { state } from './state.js';

const DEFAULT_TIMING = {
  timePerPhase: 6,
  energyPerDay: 14,
  faithPerDay: 3,
  paydayAmount: 500,
  paydayEveryDays: 6,
};

let timing = { ...DEFAULT_TIMING };

export function applyTimingFromData(data) {
  timing = {
    timePerPhase:    data.timePerPhase    ?? DEFAULT_TIMING.timePerPhase,
    energyPerDay:    data.energyPerDay    ?? DEFAULT_TIMING.energyPerDay,
    faithPerDay:     data.faithPerDay     ?? DEFAULT_TIMING.faithPerDay,
    paydayAmount:    data.paydayAmount    ?? DEFAULT_TIMING.paydayAmount,
    paydayEveryDays: data.paydayEveryDays ?? DEFAULT_TIMING.paydayEveryDays,
  };

  // Sync time max to config; clamp remaining
  state.time.max = timing.timePerPhase;
  if (state.time.remaining > timing.timePerPhase) state.time.remaining = timing.timePerPhase;

  // Sync energy max to config; clamp current
  state.resources.energy.max = timing.energyPerDay;
  if (state.resources.energy.current > timing.energyPerDay) {
    state.resources.energy.current = timing.energyPerDay;
  }
}

export function getTiming() {
  return timing;
}

// Phase boundary — reset time for the new phase. Energy NOT touched.
export function refillTime() {
  state.time.remaining = state.time.max;
}

// Day boundary — reset energy back to daily max.
export function refillEnergyDaily() {
  state.resources.energy.current = state.resources.energy.max;
}

// Day start — faith gentle restore.
export function applyStartOfDayFaith() {
  const f = state.resources.faith;
  f.current = Math.min(f.max, f.current + timing.faithPerDay);
}

export function checkPayday() {
  if (state.time.day >= state.resources.money.nextPayday) {
    state.resources.money.current += timing.paydayAmount;
    state.resources.money.nextPayday += timing.paydayEveryDays;
    return true;
  }
  return false;
}

export function spendTime(amount) {
  if (amount <= 0) return true;
  if (state.time.remaining < amount) return false;
  state.time.remaining -= amount;
  return true;
}

export function gainTime(amount) {
  state.time.remaining = Math.min(state.time.max, state.time.remaining + amount);
}

export function spendEnergy(amount) {
  if (amount <= 0) return true;
  if (state.resources.energy.current < amount) return false;
  state.resources.energy.current -= amount;
  return true;
}

export function gainEnergy(amount) {
  const e = state.resources.energy;
  e.current = Math.min(e.max, e.current + amount);
}

export function spend(resource, amount) {
  if (resource === 'faith') {
    if (state.resources.faith.current < amount) return false;
    state.resources.faith.current -= amount;
    return true;
  }
  if (resource === 'money') {
    if (state.resources.money.current < amount) return false;
    state.resources.money.current -= amount;
    return true;
  }
  if (resource === 'wisdom') {
    if (state.resources.wisdom < amount) return false;
    state.resources.wisdom -= amount;
    return true;
  }
  return false;
}

// Add amount to a resource. Negative amounts are allowed (subtract) and floor at 0.
// Faith additionally clamps to max.
export function gain(resource, amount) {
  if (resource === 'faith') {
    const f = state.resources.faith;
    f.current = Math.max(0, Math.min(f.max, f.current + amount));
  } else if (resource === 'contacts') {
    state.resources.contacts = Math.max(0, state.resources.contacts + amount);
  } else if (resource === 'money') {
    state.resources.money.current = Math.max(0, state.resources.money.current + amount);
  } else if (resource === 'wisdom') {
    state.resources.wisdom = Math.max(0, state.resources.wisdom + amount);
  }
}

// Clarity mirror of gain() — call lose(stat, n) when intent is a deliberate loss.
// Equivalent to gain(stat, -n). Always uses positive `amount` at the call site.
export function lose(resource, amount) {
  gain(resource, -Math.abs(amount));
}

// Player-side spiritual dryness (0–10). Ticks up on hostile/hollow outcomes,
// down on pray/rest/onsen. Above threshold, biases preaching/tract beats toward
// hostile/hollow options. Migration-safe — defaults to 0 if missing.
export function adjustSpiritDry(delta) {
  const c = state.character;
  const curr = typeof c.spiritDry === 'number' ? c.spiritDry : 0;
  c.spiritDry = Math.max(0, Math.min(10, curr + delta));
}

export function faithPercent() {
  return (state.resources.faith.current / state.resources.faith.max) * 100;
}

export function energyPercent() {
  const e = state.resources.energy;
  return e.max > 0 ? (e.current / e.max) * 100 : 0;
}

export function timePercent() {
  return state.time.max > 0 ? (state.time.remaining / state.time.max) * 100 : 0;
}

export function canAfford(costs) {
  if (costs.faith  && state.resources.faith.current  < costs.faith)  return false;
  if (costs.money  && state.resources.money.current  < costs.money)  return false;
  if (costs.wisdom && state.resources.wisdom         < costs.wisdom) return false;
  if (costs.energy && state.resources.energy.current < costs.energy) return false;
  if (costs.time   && state.time.remaining           < costs.time)   return false;
  return true;
}
