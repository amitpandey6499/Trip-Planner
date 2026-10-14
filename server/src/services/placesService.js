import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read destinations catalog
const loadDestinations = () => {
  try {
    const filePath = path.join(__dirname, '../data/destinations.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading destinations:', err.message);
  }
  return [];
};

// Curated hotels database
const curatedHotels = {
  manali: [
    {
      id: 'h_manali_1',
      name: 'The Orchard Greens',
      rating: 4.5,
      reviewCount: 320,
      pricePerNight: 3500,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      amenities: ['Free WiFi', 'Mountain View', 'Breakfast Included', 'Heated Rooms'],
      budgetTier: 'Moderate',
      address: 'Log Huts Area, Manali, HP',
      distance: '1.2 km from Mall Road',
      coordinates: { lat: 32.2432, lng: 77.1892 }
    },
    {
      id: 'h_manali_2',
      name: 'Snow Valley Resort',
      rating: 4.6,
      reviewCount: 450,
      pricePerNight: 4200,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      amenities: ['Free WiFi', 'Mountain View', 'Buffet Breakfast', 'Spa'],
      budgetTier: 'Luxury',
      address: 'Log Huts, Manali, HP',
      distance: '1.8 km from Mall Road',
      coordinates: { lat: 32.2471, lng: 77.1856 }
    },
    {
      id: 'h_manali_3',
      name: 'Hotel Himalayan',
      rating: 4.4,
      reviewCount: 210,
      pricePerNight: 2800,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      amenities: ['Budget Friendly', 'Clean Rooms', 'Free WiFi', 'Balcony'],
      budgetTier: 'Budget',
      address: 'Hadimba Road, Manali, HP',
      distance: '800 m from Hadimba Temple',
      coordinates: { lat: 32.2410, lng: 77.1840 }
    },
    {
      id: 'h_manali_4',
      name: 'The Manali Inn',
      rating: 4.5,
      reviewCount: 280,
      pricePerNight: 3800,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
      amenities: ['River View', 'Breakfast', 'Parking', 'Gym'],
      budgetTier: 'Moderate',
      address: 'Rangree, Manali, HP',
      distance: '2.5 km from Mall Road',
      coordinates: { lat: 32.2285, lng: 77.1880 }
    }
  ],
  goa: [
    {
      id: 'h_goa_1',
      name: 'Taj Exotica Resort & Spa',
      rating: 4.8,
      reviewCount: 910,
      pricePerNight: 12000,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80',
      amenities: ['Beachfront', 'Infinity Pool', 'Private Balcony', 'Golf Course'],
      budgetTier: 'Luxury',
      address: 'Benaulim Beach, South Goa',
      distance: 'Direct Beachfront access',
      coordinates: { lat: 15.2635, lng: 73.9182 }
    },
    {
      id: 'h_goa_2',
      name: 'The Acacia Hotel & Spa',
      rating: 4.4,
      reviewCount: 390,
      pricePerNight: 3800,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=600&q=80',
      amenities: ['Near Candolim Beach', 'Swimming Pool', 'Free WiFi'],
      budgetTier: 'Moderate',
      address: 'Candolim, North Goa',
      distance: '500 m from Candolim Beach',
      coordinates: { lat: 15.5160, lng: 73.7680 }
    }
  ]
};

// Curated restaurants database
const curatedRestaurants = {
  manali: [
    {
      id: 'r_manali_1',
      name: "Johnson's Café",
      rating: 4.6,
      reviewCount: 520,
      cuisine: 'Cafe • Continental • Trout',
      costForTwo: 800,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Wood-fired Pizza', 'Local Trout Fish', 'Cocktails'],
      address: 'Circuit House Road, Manali',
      distance: '600 m from Mall Road',
      coordinates: { lat: 32.2440, lng: 77.1865 }
    },
    {
      id: 'r_manali_2',
      name: 'IL Forno',
      rating: 4.5,
      reviewCount: 410,
      cuisine: 'Italian • Pizza • Pasta',
      costForTwo: 600,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Authentic Wood Fired', 'Garden Seating', 'Vegetarian Friendly'],
      address: 'Hadimba Road, Manali',
      distance: '400 m from Hadimba Temple',
      coordinates: { lat: 32.2460, lng: 77.1830 }
    },
    {
      id: 'r_manali_3',
      name: 'Casa Bella Vista',
      rating: 4.4,
      reviewCount: 290,
      cuisine: 'Cafe • European',
      costForTwo: 500,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Organic Salad', 'Vegan Options', 'Bakery'],
      address: 'Log Huts Road, Old Manali',
      distance: '1.1 km from Mall Road',
      coordinates: { lat: 32.2482, lng: 77.1812 }
    },
    {
      id: 'r_manali_4',
      name: "Drifter's Cafe",
      rating: 4.6,
      reviewCount: 380,
      cuisine: 'Cafe • Indian • Continental',
      costForTwo: 450,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Live Music', 'Board Games', 'Budget Friendly'],
      address: 'Manu Temple Road, Old Manali',
      distance: '1.5 km from Mall Road',
      coordinates: { lat: 32.2530, lng: 77.1790 }
    }
  ]
};

export const searchDestinations = (query, category) => {
  let list = loadDestinations();

  if (category && category.toLowerCase() !== 'all') {
    list = list.filter(d => 
      d.category.toLowerCase() === category.toLowerCase() ||
      d.tags.some(t => t.toLowerCase() === category.toLowerCase())
    );
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    list = list.filter(d => 
      d.name.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return list;
};

export const getDestinationDetails = (slug) => {
  const list = loadDestinations();
  return list.find(d => d.id === slug || d.name.toLowerCase() === slug.toLowerCase());
};

export const getHotelsForDestination = async (destination, budgetTier) => {
  const key = (destination || '').trim().toLowerCase();
  
  // If Google Places API is available
  if (process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY !== 'your_google_places_api_key') {
    try {
      const resp = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
          query: `Hotels in ${destination}`,
          key: process.env.GOOGLE_PLACES_API_KEY
        }
      });
      if (resp.data && resp.data.results && resp.data.results.length > 0) {
        return resp.data.results.slice(0, 6).map((item, idx) => ({
          id: item.place_id || `place_${idx}`,
          name: item.name,
          rating: item.rating || 4.5,
          pricePerNight: budgetTier === 'Luxury' ? 7500 : 3200,
          currency: 'INR',
          address: item.formatted_address,
          budgetTier: budgetTier || 'Moderate',
          amenities: ['Free WiFi', 'Breakfast', 'Housekeeping'],
          imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
          coordinates: item.geometry ? item.geometry.location : null
        }));
      }
    } catch (err) {
      console.warn('Google Places API error, using curated data:', err.message);
    }
  }

  // Fallback to curated
  if (curatedHotels[key]) {
    return curatedHotels[key];
  }

  // Generic generator
  return [
    {
      id: `h_${key}_1`,
      name: `Grand ${destination} Palace Hotel`,
      rating: 4.6,
      pricePerNight: 3500,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
      amenities: ['Free WiFi', 'Mountain View', 'Breakfast Included'],
      budgetTier: 'Moderate',
      address: `Main Boulevard, ${destination}`,
      distance: '1.0 km from Center'
    },
    {
      id: `h_${key}_2`,
      name: `${destination} Heritage Villa`,
      rating: 4.5,
      pricePerNight: 2800,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
      amenities: ['Budget Friendly', 'Garden Courtyard', 'WiFi'],
      budgetTier: 'Budget',
      address: `Heritage Road, ${destination}`,
      distance: '1.5 km from Center'
    }
  ];
};

export const getRestaurantsForDestination = async (destination) => {
  const key = (destination || '').trim().toLowerCase();

  if (curatedRestaurants[key]) {
    return curatedRestaurants[key];
  }

  return [
    {
      id: `r_${key}_1`,
      name: `${destination} Heritage Diner`,
      rating: 4.6,
      cuisine: 'Traditional Indian • Multi-cuisine',
      costForTwo: 700,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Vegetarian Friendly', 'Authentic Taste'],
      address: `Market Lane, ${destination}`
    },
    {
      id: `r_${key}_2`,
      name: `The Bistro at ${destination}`,
      rating: 4.5,
      cuisine: 'Cafe • Continental • Bakery',
      costForTwo: 550,
      currency: 'INR',
      imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
      dietaryTags: ['Fresh Bakes', 'Artisan Coffee'],
      address: `Clock Tower Road, ${destination}`
    }
  ];
};
