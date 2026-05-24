import { state } from './state.js';

// Locations are flavor now — they no longer gate which actions are available.
// Each action card carries its own location chip. The .location-view background
// reflects the last action's location for atmospheric continuity.
export const LOCATION_DEFS = {
  apartment: {
    id: 'apartment',
    icon: '🏠',
    nameJP: 'アパート',
    nameEN: 'Your Apartment',
    bgClass: 'bg-apartment',
  },
  station: {
    id: 'station',
    icon: '🚉',
    nameJP: '駅',
    nameEN: 'Shinjuku Station',
    bgClass: 'bg-station',
  },
  park: {
    id: 'park',
    icon: '🌸',
    nameJP: '公園',
    nameEN: 'Yoyogi Park',
    bgClass: 'bg-park',
  },
  cafe: {
    id: 'cafe',
    icon: '☕',
    nameJP: 'カフェ',
    nameEN: 'English Café',
    bgClass: 'bg-cafe',
  },
  shrine: {
    id: 'shrine',
    icon: '⛩️',
    nameJP: '神社',
    nameEN: 'Local Shrine',
    bgClass: 'bg-shrine',
  },
  onsen: {
    id: 'onsen',
    icon: '♨️',
    nameJP: '温泉',
    nameEN: 'Onsen',
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
