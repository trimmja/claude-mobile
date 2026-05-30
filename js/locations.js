import { state } from './state.js';
import { spendTime } from './resources.js';

// Locations are real now — `state.location` is where you ARE, not flavor.
// Each action is only available when its `location` matches state.location.
// Move between locations via `travelTo()`. Cost is time-only (no energy).
//
// Cost is "to get there" — independent of where you came from. Simpler than
// a full pairwise matrix and easy for a 9-year-old to grok.
export const TRAVEL_COSTS = {
  apartment: 1,   // go home
  station:   1,   // local — you pass it daily
  shrine:    1,   // neighborhood shrine
  cafe:      2,   // across town
  park:      2,   // Yoyogi from anywhere is a trip
  onsen:     3,   // special excursion
};

// `short` = compact name for travel pills. `accent` = the location's signature
// color, used as --acc on the "You are here" anchor card (Direction D redesign).
export const LOCATION_DEFS = {
  apartment: {
    id: 'apartment',
    icon: '🏠',
    nameJP: 'アパート',
    nameEN: 'Your Apartment',
    short: 'Home',
    accent: '#A78BFA',
    bgClass: 'bg-apartment',
  },
  station: {
    id: 'station',
    icon: '🚉',
    nameJP: '駅',
    nameEN: 'Shinjuku Station',
    short: 'Station',
    accent: '#60A5FA',
    bgClass: 'bg-station',
  },
  park: {
    id: 'park',
    icon: '🌸',
    nameJP: '公園',
    nameEN: 'Yoyogi Park',
    short: 'Park',
    accent: '#34D399',
    bgClass: 'bg-park',
  },
  cafe: {
    id: 'cafe',
    icon: '☕',
    nameJP: 'カフェ',
    nameEN: 'English Café',
    short: 'Café',
    accent: '#D08A3E',
    bgClass: 'bg-cafe',
  },
  shrine: {
    id: 'shrine',
    icon: '⛩️',
    nameJP: '神社',
    nameEN: 'Local Shrine',
    short: 'Shrine',
    accent: '#F87171',
    bgClass: 'bg-shrine',
  },
  onsen: {
    id: 'onsen',
    icon: '♨️',
    nameJP: '温泉',
    nameEN: 'Onsen',
    short: 'Onsen',
    accent: '#2DD4BF',
    bgClass: 'bg-onsen',
  },
};

export const LOCATION_ORDER = ['apartment', 'station', 'park', 'cafe', 'shrine', 'onsen'];

export function currentLocation() {
  return LOCATION_DEFS[state.location] || LOCATION_DEFS.apartment;
}

export function locationFlavor(locId) {
  return LOCATION_DEFS[locId] || null;
}

export function travelCostTo(locId) {
  return TRAVEL_COSTS[locId] ?? 1;
}

// Attempts to move the player to `locId`. Returns { ok, reason }.
// Fails if the destination is invalid, you're already there, or you can't afford the time.
// `free` = skip the time cost (used for the end-of-day trip home, when the evening's
// time is already spent). Location still changes.
export function travelTo(locId, free = false) {
  if (!LOCATION_DEFS[locId])    return { ok: false, reason: 'unknown' };
  if (state.location === locId) return { ok: false, reason: 'sameLocation' };

  const cost = travelCostTo(locId);
  if (!free && !spendTime(cost)) return { ok: false, reason: 'time' };

  state.location = locId;
  return { ok: true, cost: free ? 0 : cost };
}
