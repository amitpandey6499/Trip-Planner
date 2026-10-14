import {
  Bird,
  Camera,
  Compass,
  Flame,
  Gem,
  HeartHandshake,
  Landmark,
  Music,
  ShoppingBag,
  Sparkles,
  SunMedium,
  TreePine,
  Utensils,
} from 'lucide-react';

/** Icons for the shared INTERESTS list (the list itself lives in @tripplanner/shared). */
export const INTEREST_ICONS = {
  'Nature & Outdoors': TreePine,
  Adventure: Compass,
  'History & Culture': Landmark,
  'Food & Cuisine': Utensils,
  Beaches: SunMedium,
  Shopping: ShoppingBag,
  Wildlife: Bird,
  Nightlife: Music,
  Relaxation: HeartHandshake,
  Photography: Camera,
  'Spiritual Places': Flame,
  'Hidden Gems': Gem,
};

export const interestIcon = (interest) => INTEREST_ICONS[interest] ?? Sparkles;
