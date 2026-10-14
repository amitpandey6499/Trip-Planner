import { INTERESTS } from '../constants.js';

/**
 * Destination tags (Explore page data) use different words than the wizard's interest list.
 * This maps them so "Plan Trip" from a destination card pre-selects valid interests.
 */
const TAG_TO_INTEREST = {
  mountains: 'Nature & Outdoors',
  nature: 'Nature & Outdoors',
  lakes: 'Nature & Outdoors',
  backwaters: 'Nature & Outdoors',
  adventure: 'Adventure',
  'scuba diving': 'Adventure',
  'river rafting': 'Adventure',
  trekking: 'Adventure',
  heritage: 'History & Culture',
  culture: 'History & Culture',
  cultural: 'History & Culture',
  forts: 'History & Culture',
  palaces: 'History & Culture',
  history: 'History & Culture',
  food: 'Food & Cuisine',
  beaches: 'Beaches',
  islands: 'Beaches',
  shopping: 'Shopping',
  wildlife: 'Wildlife',
  nightlife: 'Nightlife',
  relaxation: 'Relaxation',
  yoga: 'Spiritual Places',
  spiritual: 'Spiritual Places',
  photography: 'Photography',
  'hidden gems': 'Hidden Gems',
};

export const tagsToInterests = (tags = []) => {
  const result = new Set();
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    if (INTERESTS.includes(tag)) result.add(tag);
    const mapped = TAG_TO_INTEREST[tag.trim().toLowerCase()];
    if (mapped) result.add(mapped);
  }
  return [...result];
};
