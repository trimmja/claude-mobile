import { state } from './state.js';

// Passive faith regeneration (called each engine tick = 1 second)
export function tick() {
  // Faith slowly regenerates (0.08 per second = ~5 per minute)
  const f = state.resources.faith;
  if (f.current < f.max) {
    f.current = Math.min(f.max, f.current + 0.08);
  }

  // Monthly support payout
  if (state.time.day >= state.resources.money.nextPayday) {
    state.resources.money.current += 500;
    state.resources.money.nextPayday += 30;
    return true; // signals payday event
  }
  return false;
}

// Day advancement: 1 in-game day = 60 real seconds of play
export function advanceTime() {
  state.time.secondsPlayed++;
  const newDay = Math.floor(state.time.secondsPlayed / 60) + 1;
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
