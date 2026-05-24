import { state } from './state.js';

const DEFAULT_TIMING = {
  energyPerPhase: 6,
  faithPerDay: 3,
  paydayAmount: 500,
  paydayEveryDays: 6,
};

let timing = { ...DEFAULT_TIMING };

export function applyTimingFromData(data) {
  timing = {
    energyPerPhase:  data.energyPerPhase  ?? DEFAULT_TIMING.energyPerPhase,
    faithPerDay:     data.faithPerDay     ?? DEFAULT_TIMING.faithPerDay,
    paydayAmount:    data.paydayAmount    ?? DEFAULT_TIMING.paydayAmount,
    paydayEveryDays: data.paydayEveryDays ?? DEFAULT_TIMING.paydayEveryDays,
  };
  // Apply max energy from timing so changes in data/timing.json take effect.
  state.resources.energy.max = timing.energyPerPhase;
  if (state.resources.energy.current > timing.energyPerPhase) {
    state.resources.energy.current = timing.energyPerPhase;
  }
}

export function getTiming() {
  return timing;
}

// Called at the start of each phase. Refills energy to max.
export function refillEnergy() {
  state.resources.energy.current = state.resources.energy.max;
}

// Called at start of each new day.
export function applyStartOfDayFaith() {
  const f = state.resources.faith;
  f.current = Math.min(f.max, f.current + timing.faithPerDay);
}

// Returns true if payday fired this call.
export function checkPayday() {
  if (state.time.day >= state.resources.money.nextPayday) {
    state.resources.money.current += timing.paydayAmount;
    state.resources.money.nextPayday += timing.paydayEveryDays;
    return true;
  }
  return false;
}

// Try to spend energy. Returns false if insufficient.
export function spendEnergy(amount) {
  if (amount <= 0) return true;
  if (state.resources.energy.current < amount) return false;
  state.resources.energy.current -= amount;
  return true;
}

// Gain energy (clamped to max).
export function gainEnergy(amount) {
  const e = state.resources.energy;
  e.current = Math.min(e.max, e.current + amount);
}

// Spend a resource. Returns false if insufficient.
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

// Gain a resource (clamps to max where applicable)
export function gain(resource, amount) {
  if (resource === 'faith') {
    state.resources.faith.current = Math.min(
      state.resources.faith.max,
      state.resources.faith.current + amount
    );
  } else if (resource === 'contacts') {
    state.resources.contacts += amount;
  } else if (resource === 'money') {
    state.resources.money.current += amount;
  } else if (resource === 'wisdom') {
    state.resources.wisdom += amount;
  }
}

export function faithPercent() {
  return (state.resources.faith.current / state.resources.faith.max) * 100;
}

export function energyPercent() {
  const e = state.resources.energy;
  return e.max > 0 ? (e.current / e.max) * 100 : 0;
}

export function canAfford(costs) {
  if (costs.faith  && state.resources.faith.current  < costs.faith)  return false;
  if (costs.money  && state.resources.money.current  < costs.money)  return false;
  if (costs.wisdom && state.resources.wisdom         < costs.wisdom) return false;
  if (costs.energy && state.resources.energy.current < costs.energy) return false;
  return true;
}
