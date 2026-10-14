import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizeItinerary } from '@tripplanner/shared';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load sample data
const loadSampleItineraries = () => {
  try {
    const filePath = path.join(__dirname, '../data/sampleItineraries.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn('Could not read sampleItineraries.json:', err.message);
  }
  return {};
};

// Destination curated coordinates and images map
const destinationAssets = {
  manali: {
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 32.2432, lng: 77.1892 }
  },
  jaipur: {
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 26.9124, lng: 75.7873 }
  },
  goa: {
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 15.2993, lng: 74.1240 }
  },
  udaipur: {
    image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 24.5854, lng: 73.7125 }
  },
  varanasi: {
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 25.3176, lng: 82.9739 }
  },
  kerala: {
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 9.4981, lng: 76.3388 }
  },
  andaman: {
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 11.9761, lng: 92.9876 }
  },
  rishikesh: {
    image: 'https://images.unsplash.com/photo-1596761224213-9a4f4e70e4c6?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 30.0869, lng: 78.2676 }
  }
};

/**
 * Generate Itinerary via Google Gemini API
 */
const generateWithGemini = async (preferences) => {
  const { apiKey, model: modelName } = config.gemini;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Model name comes from GEMINI_MODEL in server/.env (Part 6 moves this to the new @google/genai SDK).
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7
    }
  });

  const prompt = `
You are an expert AI Travel Specialist for "TripPlanner". Generate a comprehensive, realistic, day-wise travel itinerary formatted as strict valid JSON.

USER PREFERENCES:
- Destination: ${preferences.destination}
- Duration: ${preferences.durationDays} days
- Total Budget: INR ₹${preferences.totalBudget} (${preferences.budgetCategory || 'Moderate'} category)
- Travelers: ${preferences.travelersCount} people
- Primary Interests: ${(preferences.interests || []).join(', ') || 'Sightseeing, Culture, Food'}
- Travel Style: ${preferences.travelStyle || 'Balanced'}
- Accommodation: ${preferences.accommodationType || 'Hotel'}
- Dietary Preferences: ${preferences.dietaryPreference || 'Any'}
- Special Notes: ${preferences.specialNotes || 'None'}

REQUIREMENTS:
1. Return ONLY valid JSON with no markdown backticks or commentary.
2. Structure:
{
  "destination": "${preferences.destination}",
  "title": "Concise attractive trip title",
  "summary": "1-2 sentence overview of the trip experience",
  "budgetBreakdown": {
    "accommodation": number,
    "activitiesAndSightseeing": number,
    "foodAndDining": number,
    "localTransport": number,
    "totalEstimated": number,
    "currency": "INR"
  },
  "days": [
    {
      "dayNumber": 1,
      "title": "Day theme (e.g. Arrival & Heritage Walk)",
      "description": "Short description of the day",
      "estimatedDailyExpense": number,
      "activities": [
        {
          "placeName": "Name of real attraction or activity",
          "timeSlot": "e.g. 09:00 AM - 11:30 AM",
          "category": "Attraction | Restaurant | Transit",
          "estimatedDuration": "e.g. 2 hours",
          "description": "Engaging description with history or scenic detail",
          "imageUrl": "valid scenic unsplash image url",
          "cost": number (estimated cost in INR),
          "tips": "Practical tip for visitors",
          "coordinates": { "lat": number, "lng": number }
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Hotel name",
      "rating": 4.5,
      "pricePerNight": number,
      "currency": "INR",
      "budgetTier": "Budget | Moderate | Luxury",
      "amenities": ["WiFi", "Breakfast", "Mountain View"],
      "address": "Area/Street name",
      "imageUrl": "unsplash hotel image url",
      "distance": "Distance from key center"
    }
  ],
  "restaurants": [
    {
      "name": "Restaurant name",
      "rating": 4.6,
      "cuisine": "Cuisine type",
      "costForTwo": number,
      "currency": "INR",
      "dietaryTags": ["Veg Friendly", "Local Specialties"],
      "address": "Location / Road",
      "imageUrl": "unsplash food/cafe image url"
    }
  ]
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text);
  parsed.source = 'gemini';
  return parsed;
};

/**
 * Intelligent Fallback Generator
 * Generates custom itineraries based on destination & user preferences when Gemini is offline.
 */
const generateFallbackItinerary = (preferences) => {
  const samples = loadSampleItineraries();
  const destKey = (preferences.destination || '').trim().toLowerCase();

  // If we have an exact sample match like Manali
  if (samples[destKey] && preferences.durationDays === 4) {
    const copy = JSON.parse(JSON.stringify(samples[destKey]));
    copy.travelersCount = preferences.travelersCount || 2;
    copy.totalBudget = preferences.totalBudget || copy.totalBudget;
    copy.source = 'sample';
    return copy;
  }

  // Otherwise synthesize a personalized multi-day itinerary
  const destination = preferences.destination || 'Jaipur';
  const duration = parseInt(preferences.durationDays || 3, 10);
  const travelers = parseInt(preferences.travelersCount || 2, 10);
  const totalBudget = parseInt(preferences.totalBudget || 15000, 10);
  const asset = destinationAssets[destKey] || {
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80',
    center: { lat: 26.9124, lng: 75.7873 }
  };

  const days = [];
  const baseLat = asset.center.lat;
  const baseLng = asset.center.lng;

  const defaultDayThemes = [
    { title: 'Arrival & Iconic Highlights', desc: 'Settle in, soak in the local vibe, and visit iconic landmarks.' },
    { title: 'Cultural Immersion & Hidden Gems', desc: 'Discover heritage sights, local artisans, and panoramic viewpoints.' },
    { title: 'Adventure & Scenic Excursion', desc: 'Experience thrilling excursions, natural valleys, or lakeside trails.' },
    { title: 'Local Cuisine & Market Discovery', desc: 'Shop traditional handicrafts, sample street culinary delights, and relax.' },
    { title: 'Nature Walks & Spiritual Sanctuaries', desc: 'Peaceful sunrise retreat, temples, and tranquil nature paths.' },
    { title: 'Farewell Views & Departure', desc: 'Last-minute souvenir hunting and memorable goodbye meals before departure.' }
  ];

  const dailyBudget = Math.round(totalBudget / duration);

  for (let d = 1; d <= duration; d++) {
    const themeIndex = (d - 1) % defaultDayThemes.length;
    const theme = defaultDayThemes[themeIndex];

    days.push({
      dayNumber: d,
      title: `Day ${d} - ${theme.title}`,
      description: theme.desc,
      estimatedDailyExpense: dailyBudget,
      activities: [
        {
          id: `act-${d}-1`,
          placeName: `${destination} Landmark ${d}A`,
          timeSlot: '09:30 AM - 11:30 AM',
          category: 'Attraction',
          estimatedDuration: '2 hours',
          description: `Explore prime cultural highlights and magnificent architecture in ${destination}.`,
          imageUrl: asset.image,
          coordinates: { lat: baseLat + (d * 0.008), lng: baseLng + (d * 0.006) },
          cost: Math.round(dailyBudget * 0.15),
          tips: 'Arrive early to beat the crowds and enjoy ideal morning photography.'
        },
        {
          id: `act-${d}-2`,
          placeName: `Traditional Dining & Bistro`,
          timeSlot: '01:00 PM - 02:30 PM',
          category: 'Restaurant',
          estimatedDuration: '1.5 hours',
          description: `Savor authentic regional flavors and refreshing beverages at renowned local eatery.`,
          imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
          coordinates: { lat: baseLat + (d * 0.005), lng: baseLng - (d * 0.004) },
          cost: Math.round(dailyBudget * 0.25),
          tips: 'Try the house specialties recommended by the chef.'
        },
        {
          id: `act-${d}-3`,
          placeName: `${destination} Scenic Point & Sunset Hub`,
          timeSlot: '04:00 PM - 06:30 PM',
          category: 'Attraction',
          estimatedDuration: '2.5 hours',
          description: `Breathtaking sunset panoramas, river walks, and evening bazaar strolls.`,
          imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
          coordinates: { lat: baseLat - (d * 0.004), lng: baseLng + (d * 0.008) },
          cost: Math.round(dailyBudget * 0.1),
          tips: 'Great photography light during golden hour between 5 PM and 6 PM.'
        }
      ]
    });
  }

  // Synthesize Budget Breakdown
  const accommodationCost = Math.round(totalBudget * 0.42);
  const activitiesCost = Math.round(totalBudget * 0.25);
  const diningCost = Math.round(totalBudget * 0.21);
  const transportCost = totalBudget - (accommodationCost + activitiesCost + diningCost);

  return {
    destination,
    title: `${duration}-Day Trip to ${destination}`,
    summary: `A personalized ${duration}-day journey crafted for ${travelers} travelers focusing on ${(preferences.interests || ['Sightseeing']).join(', ')}.`,
    durationDays: duration,
    travelersCount: travelers,
    totalBudget,
    budgetCategory: preferences.budgetCategory || 'Moderate',
    currency: 'INR',
    destinationImage: asset.image,
    source: 'offline',
    budgetBreakdown: {
      accommodation: accommodationCost,
      activitiesAndSightseeing: activitiesCost,
      foodAndDining: diningCost,
      localTransport: transportCost,
      totalEstimated: totalBudget,
      currency: 'INR'
    },
    days,
    hotels: [
      {
        id: `h_${destKey}_1`,
        name: `Grand ${destination} Heritage Stay`,
        rating: 4.6,
        pricePerNight: Math.round(accommodationCost / duration),
        currency: 'INR',
        budgetTier: preferences.budgetCategory || 'Moderate',
        amenities: ['Free WiFi', 'Breakfast Included', 'Scenic Balcony', '24/7 Concierge'],
        address: `Central City Lane, ${destination}`,
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
        distance: '1.2 km from City Center',
        coordinates: { lat: baseLat + 0.002, lng: baseLng + 0.003 }
      },
      {
        id: `h_${destKey}_2`,
        name: `${destination} Boutique Retreat & Spa`,
        rating: 4.7,
        pricePerNight: Math.round((accommodationCost / duration) * 1.2),
        currency: 'INR',
        budgetTier: 'Luxury',
        amenities: ['Infinity Pool', 'Spa & Wellness', 'Complimentary High Tea', 'Free WiFi'],
        address: `Valley Road, ${destination}`,
        imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
        distance: '2.5 km from City Center',
        coordinates: { lat: baseLat - 0.003, lng: baseLng + 0.005 }
      }
    ],
    restaurants: [
      {
        id: `r_${destKey}_1`,
        name: `The Royal ${destination} Kitchen`,
        rating: 4.6,
        cuisine: 'Traditional Indian • Fine Dining',
        costForTwo: 900,
        currency: 'INR',
        dietaryTags: ['Pure Vegetarian Options', 'Authentic Thali', 'Outdoor Terrace'],
        address: `Palace Road, ${destination}`,
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        coordinates: { lat: baseLat + 0.004, lng: baseLng - 0.002 }
      },
      {
        id: `r_${destKey}_2`,
        name: `Spice Garden & Cafe`,
        rating: 4.5,
        cuisine: 'Cafe • Continental • Fresh Brews',
        costForTwo: 650,
        currency: 'INR',
        dietaryTags: ['Organic Coffee', 'Wood-fired Pizza', 'Vegan Friendly'],
        address: `Old Town Square, ${destination}`,
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        coordinates: { lat: baseLat - 0.002, lng: baseLng + 0.001 }
      }
    ]
  };
};

/**
 * Main service method
 */
/**
 * Main entry point. Always returns an itinerary that follows the shared contract
 * (normalizeItinerary): right number of days, dated days, budget that adds up.
 *
 * Order: Gemini (if a key is set) → curated sample → offline generator.
 * A Gemini answer that breaks the contract is rejected and the fallback is used.
 */
export const generateItinerary = async (preferences) => {
  const expectDays = preferences.durationDays;

  if (config.gemini.apiKey) {
    try {
      console.log(`[AI] Generating itinerary with ${config.gemini.model} for ${preferences.destination}...`);
      const raw = await generateWithGemini(preferences);
      return normalizeItinerary(raw, preferences, { expectDays });
    } catch (err) {
      console.warn(`[AI] Gemini result not usable (${err.message}). Using the offline generator instead.`);
    }
  }

  if (!config.isTest) console.log(`[AI] Using offline generator for ${preferences.destination}.`);
  return normalizeItinerary(generateFallbackItinerary(preferences), preferences, { expectDays });
};
