import { state } from './state.js';
import { parseDuration } from './parseDuration.js';

const DEFAULT_TIMING = {
  faithRegenPerSecond: 0.08,
  secondsPerDay: 60,
  paydayAmount: 500,
  paydayEveryDays: 30,
};

let timing = { ...DEFAULT_TIMING };

export function applyTimingFromData(data) {
  timing = {
    faithRegenPerSecond: data.faithRegenPerSecond ?? DEFAULT_TIMING.faithRegenPerSecond,
    secondsPerDay: data.dayLength != null
      ? parseDuration(data.dayLength) / 1000
      : (data.secondsPerDay ?? DEFAULT_TIMING.secondsPerDay),
    paydayAmount: data.paydayAmount ?? DEFAULT_TIMING.paydayAmount,
    paydayEveryDays: data.paydayEveryDays ?? DEFAULT_TIMING.paydayEveryDays,
  };
}

// Passive faith regeneration (called each engine tick = 1 second)
export function tick() {
  const f = state.resources.faith;
  if (f.current < f.max) {
    f.current = Math.min(f.max, f.current + timing.faithRegenPerSecond);
  }

  // Monthly support payout
  if (state.time.day >= state.resources.money.nextPayday) {
    state.resources.money.current += timing.paydayAmount;
    state.resources.money.nextPayday += timing.paydayEveryDays;
    return true; // signals payday event
  }
  return false;
}

// Day advancement — length from data/timing.json
export function advanceTime() {
  state.time.secondsPlayed++;
  const newDay = Math.floor(state.time.secondsPlayed / timing.secondsPerDay) + 1;
  if (newDay !== state.time.day) {
    state.time.day = newDay;
    return true; // new day
  }
  return false;
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

export function canAfford(costs) {
  if (costs.faith  && state.resources.faith.current  < costs.faith)  return false;
  if (costs.money  && state.resources.money.current  < costs.money)  return false;
  if (costs.wisdom && state.resources.wisdom         < costs.wisdom) return false;
  return true;
}
