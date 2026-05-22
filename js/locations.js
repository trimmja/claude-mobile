import { state } from './state.js';

export const LOCATION_DEFS = {
  apartment: {
    id: 'apartment',
    tabIcon: '🏠',
    tabLabel: 'アパート',
    bgClass: 'bg-apartment',
    unlocked: () => true,
    unlockHint: '',
  },
  station: {
    id: 'station',
    tabIcon: '🚉',
    tabLabel: '駅',
    bgClass: 'bg-station',
    unlocked: () => state.time.day >= 1,
    unlockHint: '',
  },
  park: {
    id: 'park',
    tabIcon: '🌸',
    tabLabel: '公園',
    bgClass: 'bg-park',
    unlocked: () => state.time.day >= 1,
    unlockHint: '',
  },
  cafe: {
    id: 'cafe',
    tabIcon: '☕',
    tabLabel: 'カフェ',
    bgClass: 'bg-cafe',
    unlocked: () => state.resources.wisdom >= 10,
    unlockHint: 'Wisdom 10',
  },
  shrine: {
    id: 'shrine',
    tabIcon: '⛩️',
    tabLabel: '神社',
    bgClass: 'bg-shrine',
    unlocked: () => state.time.day >= 3,
    unlockHint: 'Day 3',
  },
  onsen: {
    id: 'onsen',
    tabIcon: '♨️',
    tabLabel: '温泉',
    bgClass: 'bg-onsen',
    unlocked: () => state.resources.contacts >= 30,
    unlockHint: '30 contacts',
  },
};

export const LOCATION_ORDER = ['apartment', 'station', 'park', 'cafe', 'shrine', 'onsen'];

export function currentLocation() {
  return LOCATION_DEFS[state.location];
}

export function goTo(locationId) {
  if (!LOCATION_DEFS[locationId]) return;
  if (!LOCATION_DEFS[locationId].unlocked()) return;
  state.location = locationId;
}
