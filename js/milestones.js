import { state } from './state.js';

export const MILESTONE_DEFS = [
  {
    id: 'first_conversation',
    icon: '💬',
    name: 'First Conversation',
    check: () => state.resources.contacts >= 1,
  },
  {
    id: 'bible_accepted',
    icon: '📖',
    name: 'Someone Accepts a Bible',
    check: () => Object.values(state.npcs).some(n => n.stage >= 1),
  },
  {
    id: 'lang_level_1',
    icon: '🗣️',
    name: 'Ohayō Gozaimasu',
    desc: 'Reached Japanese Level 1',
    check: () => state.language.level >= 1,
  },
  {
    id: 'first_coffee',
    icon: '☕',
    name: 'First Coffee Together',
    check: () => Object.values(state.npcs).some(n => n.met && n.trust >= 12),
  },
  {
    id: 'first_month',
    icon: '📅',
    name: 'First Month Survived',
    check: () => state.time.day >= 30,
  },
  {
    id: 'wisdom_15',
    icon: '📚',
    name: 'The Word Takes Root',
    desc: 'Wisdom reached 15',
    check: () => state.resources.wisdom >= 15,
  },
  {
    id: 'lang_level_2',
    icon: '🌏',
    name: 'Getting Through',
    desc: 'Reached Japanese Level 2',
    check: () => state.language.level >= 2,
  },
  {
    id: 'first_home_visit',
    icon: '🏡',
    name: 'A Japanese Home',
    check: () => Object.values(state.npcs).some(n => n.trust >= 30),
  },
  {
    id: 'first_bible_study',
    icon: '✝️',
    name: 'First Bible Study',
    check: () => Object.values(state.npcs).some(n => n.stage >= 4),
  },
  {
    id: 'onsen',
    icon: '♨️',
    name: 'The Onsen',
    desc: 'Nothing opens hearts like hot water',
    check: () => state.stats.onsenVisited,
  },
  {
    id: 'first_convert',
    icon: '🕊️',
    name: 'First Convert',
    check: () => state.stats.converts >= 1,
  },
  {
    id: 'lang_level_4',
    icon: '📣',
    name: 'Preaching in Japanese',
    desc: 'Reached Japanese Level 4',
    check: () => state.language.level >= 4,
  },
  {
    id: 'hundred_contacts',
    icon: '👥',
    name: '100 Contacts',
    check: () => state.resources.contacts >= 100,
  },
  {
    id: 'small_group',
    icon: '🙌',
    name: 'A Small Group',
    check: () => state.stats.converts >= 2 && state.resources.wisdom >= 50,
  },
  {
    id: 'first_disciple',
    icon: '⭐',
    name: 'First Disciple',
    check: () => state.stats.converts >= 1 && state.time.day >= 50,
  },
];

// Returns the first un-notified completed milestone, or null
export function checkMilestones() {
  for (const def of MILESTONE_DEFS) {
    if (!state.milestones.completed.includes(def.id) && def.check()) {
      state.milestones.completed.push(def.id);
      return def;
    }
  }
  return null;
}

export function completedCount() {
  return state.milestones.completed.length;
}
