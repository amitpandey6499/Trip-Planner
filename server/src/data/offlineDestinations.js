/**
 * Curated data for the OFFLINE PLANNER (used when Gemini is not configured or fails).
 *
 * - Places, eateries and areas are real and well known.
 * - Coordinates are approximate (good enough for map pins; Part 8 adds geocoding).
 * - `fee` = estimated entry / activity cost PER PERSON in ₹; `costForTwo` = estimated meal for two.
 *   All prices are rough estimates and are shown as "est." in the app.
 * - Eateries with `generic: true` describe a type of meal, not a specific restaurant.
 *
 * Names + aliases live in shared (OFFLINE_PLANNER_DESTINATIONS) so the wizard can warn early.
 *
 * Place fields:
 *   hub        which base the place is near (multi-base trips like Kerala / Andaman)
 *   zone       neighbourhood; places in the same zone are planned on the same day
 *   hours      time to spend there
 *   best       'morning' | 'afternoon' | 'evening' | 'any'
 *   fullDay    excursion that needs a whole day
 *   tags       which wizard interests it matches (shared INTERESTS)
 */
import { findOfflinePlannerDestination } from '@tripplanner/shared';

const place = (name, data) => ({ name, hub: 'main', best: 'any', fee: 0, category: 'Attraction', tags: [], ...data });
const eat = (name, data) => ({ name, hub: 'main', veg: false, vegOptions: true, ...data });

export const OFFLINE_DESTINATIONS = [
  {
    key: 'manali',
    name: 'Manali',
    region: 'Himachal Pradesh',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    hubs: [{ id: 'main', name: 'Manali', stayArea: 'Mall Road / Old Manali', lat: 32.2432, lng: 77.1892 }],
    stayPrices: { Budget: 1500, Moderate: 3500, Luxury: 9000 },
    transportPerDay: { Budget: 500, Moderate: 1500, Luxury: 3000 },
    arrival: { name: 'Arrive in Manali & check in', cost: { Budget: 300, Moderate: 800, Luxury: 1500 } },
    places: [
      place('Hadimba Devi Temple', { zone: 'town', hours: 1, best: 'morning', tags: ['History & Culture', 'Spiritual Places', 'Photography'], lat: 32.2483, lng: 77.1814, description: '16th-century wooden pagoda temple inside a cedar forest, dedicated to the goddess Hadimba.', tips: 'Go early to avoid the queue; photos with yaks outside are paid.' }),
      place('Mall Road & Tibetan Monastery', { zone: 'town', hours: 2, best: 'evening', category: 'Shopping', tags: ['Shopping', 'History & Culture', 'Food & Cuisine'], lat: 32.2426, lng: 77.1895, description: 'Busy main street for woollens and handicrafts, with the colourful Tibetan monastery close by.', tips: 'Try siddu and momos from the stalls.' }),
      place('Van Vihar National Park', { zone: 'town', hours: 1, fee: 30, tags: ['Nature & Outdoors', 'Relaxation'], lat: 32.238, lng: 77.191, description: 'Deodar forest park along the Beas river, with a small boating lake.', tips: 'A calm walk after lunch.' }),
      place('Old Manali & Manu Temple', { zone: 'old-manali', hours: 2, best: 'afternoon', tags: ['Hidden Gems', 'History & Culture', 'Food & Cuisine', 'Photography'], lat: 32.2573, lng: 77.1786, description: 'Village lanes with cafés, apple orchards and the old Manu Temple.', tips: 'Wear good shoes; the lanes are steep.' }),
      place('Vashisht Hot Springs & Temple', { zone: 'vashisht', hours: 1.5, tags: ['Relaxation', 'Spiritual Places', 'Hidden Gems'], lat: 32.2647, lng: 77.1886, description: 'Natural hot sulphur baths next to the stone Vashisht temple.', tips: 'Separate bathing areas for men and women; carry a towel.' }),
      place('Jogini Waterfall Trek', { zone: 'vashisht', hours: 2.5, best: 'morning', category: 'Activity', tags: ['Adventure', 'Nature & Outdoors', 'Photography'], lat: 32.2732, lng: 77.1937, description: 'Easy–moderate 3 km walk from Vashisht through orchards to a tall waterfall.', tips: 'Start before 10 AM; the trail gets slippery after rain.' }),
      place('Solang Valley & Atal Tunnel', { zone: 'solang', hours: 7, best: 'morning', fullDay: true, fee: 1500, category: 'Activity', tags: ['Adventure', 'Nature & Outdoors', 'Photography'], lat: 32.3167, lng: 77.1578, description: 'Ropeway, snow and meadow activities at Solang, then a drive through the 9 km Atal Tunnel to Sissu in Lahaul.', tips: 'Hire a local taxi for the day; activities depend on weather.' }),
      place('Naggar Castle & Roerich Art Gallery', { zone: 'naggar', hours: 5, best: 'morning', fullDay: true, fee: 150, tags: ['History & Culture', 'Hidden Gems', 'Photography'], lat: 32.1137, lng: 77.1696, description: 'A 15th-century stone-and-wood castle and the home of painter Nicholas Roerich, with views over the Kullu valley.', tips: 'About 22 km from Manali; combine with lunch at the castle café.' }),
    ],
    eateries: [
      eat("Johnson's Café", { zone: 'town', costForTwo: 1200, cuisine: 'Continental • Trout', lat: 32.244, lng: 77.1865 }),
      eat('Il Forno', { zone: 'town', costForTwo: 900, cuisine: 'Italian • Wood-fired pizza', lat: 32.246, lng: 77.183 }),
      eat('Café 1947', { zone: 'old-manali', costForTwo: 1000, cuisine: 'Café • Italian', lat: 32.2563, lng: 77.1802 }),
      eat('Chopsticks', { zone: 'town', costForTwo: 700, cuisine: 'Tibetan • Chinese', lat: 32.2433, lng: 77.1892 }),
      eat('Himachali veg thali at a Mall Road restaurant', { zone: 'town', generic: true, veg: true, costForTwo: 500, cuisine: 'Himachali • Vegetarian', lat: 32.2428, lng: 77.1893 }),
    ],
  },
  {
    key: 'goa',
    name: 'Goa',
    region: 'Goa',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    hubs: [{ id: 'main', name: 'Goa', stayArea: 'Calangute / Baga (North Goa)', lat: 15.5439, lng: 73.7553 }],
    stayPrices: { Budget: 1800, Moderate: 4500, Luxury: 12000 },
    transportPerDay: { Budget: 800, Moderate: 2000, Luxury: 3500 },
    arrival: { name: 'Arrive in Goa & check in', cost: { Budget: 600, Moderate: 1500, Luxury: 2500 } },
    places: [
      place('Baga & Calangute Beaches', { zone: 'north', hours: 2.5, best: 'afternoon', tags: ['Beaches', 'Nightlife', 'Relaxation'], lat: 15.5553, lng: 73.7517, description: 'Lively North Goa beaches with shacks and water sports.', tips: 'Water-sport prices are negotiable on the beach.' }),
      place('Saturday Night Market, Arpora', { zone: 'north', hours: 2, best: 'evening', category: 'Shopping', tags: ['Nightlife', 'Shopping', 'Food & Cuisine'], lat: 15.566, lng: 73.761, description: 'Open-air night market with food stalls, live music and crafts.', tips: 'Runs on Saturday evenings in season (about Nov–Apr).' }),
      place('Fort Aguada & Lighthouse', { zone: 'candolim', hours: 1.5, best: 'morning', fee: 25, tags: ['History & Culture', 'Photography'], lat: 15.4925, lng: 73.7735, description: '17th-century Portuguese fort and lighthouse above the Mandovi river mouth.', tips: 'Go early; there is little shade.' }),
      place('Anjuna Flea Market', { zone: 'anjuna', hours: 2, best: 'afternoon', category: 'Shopping', tags: ['Shopping', 'Hidden Gems'], lat: 15.5733, lng: 73.7413, description: 'Famous Wednesday market by the sea for clothes, jewellery and souvenirs.', tips: 'Held on Wednesdays in season; bargain politely.' }),
      place('Chapora Fort', { zone: 'anjuna', hours: 1, best: 'evening', tags: ['Photography', 'History & Culture'], lat: 15.6064, lng: 73.7364, description: 'Hilltop fort ruins with views over Vagator beach.', tips: 'Best at sunset; wear grippy shoes.' }),
      place('Basilica of Bom Jesus & Se Cathedral (Old Goa)', { zone: 'old-goa', hours: 2, best: 'morning', tags: ['History & Culture', 'Spiritual Places'], lat: 15.5009, lng: 73.9116, description: 'UNESCO-listed churches from the 16th century, including the tomb of St Francis Xavier.', tips: 'Dress modestly (shoulders and knees covered).' }),
      place('Fontainhas Latin Quarter walk', { zone: 'panaji', hours: 1.5, best: 'morning', tags: ['History & Culture', 'Photography', 'Hidden Gems'], lat: 15.4977, lng: 73.8317, description: 'Colourful Portuguese-era houses and narrow lanes in Panaji.', tips: 'Morning light is best for photos.' }),
      place('Mandovi River Sunset Cruise', { zone: 'panaji', hours: 1.5, best: 'evening', fee: 500, category: 'Activity', tags: ['Relaxation', 'Nightlife'], lat: 15.5009, lng: 73.8312, description: 'One-hour boat cruise with Goan music and dance on the Mandovi.', tips: 'Boats leave from the Panaji jetty; reach 20 minutes early.' }),
      place('Dona Paula Viewpoint', { zone: 'panaji', hours: 1, best: 'evening', tags: ['Photography', 'Relaxation'], lat: 15.4573, lng: 73.8053, description: 'Rocky headland where the Zuari and Mandovi rivers meet the sea.', tips: 'Short stop on the way back from Panaji.' }),
      place('Spice Plantation Tour (Ponda)', { zone: 'ponda', hours: 3, best: 'morning', fee: 500, category: 'Activity', tags: ['Food & Cuisine', 'Nature & Outdoors'], lat: 15.406, lng: 74.009, description: 'Guided walk through a spice farm with a traditional Goan buffet lunch.', tips: 'Most tours include lunch, so skip a separate lunch.' }),
      place('Dudhsagar Waterfalls Jeep Safari', { zone: 'dudhsagar', hours: 7, best: 'morning', fullDay: true, fee: 800, category: 'Activity', tags: ['Nature & Outdoors', 'Adventure', 'Photography'], lat: 15.3144, lng: 74.3143, description: 'Jeep ride through forest to one of India’s tallest waterfalls.', tips: 'Usually open about Oct–May; jeeps start from Kulem.' }),
      place('South Goa: Palolem Beach & Cabo de Rama', { zone: 'south', hours: 7, best: 'morning', fullDay: true, tags: ['Beaches', 'Relaxation', 'Hidden Gems'], lat: 15.01, lng: 74.0232, description: 'Quieter crescent-shaped beach in South Goa, with a clifftop fort on the way.', tips: 'About 2 hours from North Goa; leave by 8 AM.' }),
    ],
    eateries: [
      eat("Britto's", { zone: 'north', costForTwo: 1500, cuisine: 'Goan • Seafood', lat: 15.5568, lng: 73.7513 }),
      eat('Vinayak Family Restaurant', { zone: 'anjuna', costForTwo: 900, cuisine: 'Goan fish thali', lat: 15.5927, lng: 73.7652 }),
      eat('Gunpowder', { zone: 'anjuna', costForTwo: 1400, cuisine: 'South Indian • Goan', lat: 15.5946, lng: 73.7684 }),
      eat('Ritz Classic', { zone: 'panaji', costForTwo: 1000, cuisine: 'Goan seafood thali', lat: 15.4975, lng: 73.8291 }),
      eat('Viva Panjim', { zone: 'panaji', costForTwo: 1000, cuisine: 'Goan home-style', lat: 15.498, lng: 73.8323 }),
      eat('Vegetarian thali at a Udupi restaurant', { zone: 'panaji', generic: true, veg: true, costForTwo: 500, cuisine: 'South Indian • Vegetarian', lat: 15.4989, lng: 73.8278 }),
    ],
  },
  {
    key: 'jaipur',
    name: 'Jaipur',
    region: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80',
    hubs: [{ id: 'main', name: 'Jaipur', stayArea: 'C-Scheme / MI Road', lat: 26.9124, lng: 75.7873 }],
    stayPrices: { Budget: 1500, Moderate: 4000, Luxury: 11000 },
    transportPerDay: { Budget: 600, Moderate: 1600, Luxury: 3000 },
    arrival: { name: 'Arrive in Jaipur & check in', cost: { Budget: 300, Moderate: 700, Luxury: 1500 } },
    places: [
      place('Amber Fort', { zone: 'amer', hours: 3, best: 'morning', fee: 100, tags: ['History & Culture', 'Photography'], lat: 26.9855, lng: 75.8513, description: 'Hilltop Rajput fort-palace with the Sheesh Mahal mirror hall.', tips: 'Reach by 8–9 AM to beat heat and crowds.' }),
      place('Panna Meena ka Kund', { zone: 'amer', hours: 0.5, tags: ['Hidden Gems', 'Photography', 'History & Culture'], lat: 26.9858, lng: 75.856, description: 'Symmetrical 16th-century stepwell a short walk from Amber Fort.', tips: 'Walking down the steps is not allowed; photos from the edge.' }),
      place('Jal Mahal Viewpoint', { zone: 'amer', hours: 0.5, tags: ['Photography'], lat: 26.9534, lng: 75.8462, description: 'Palace in the middle of Man Sagar lake, seen from the roadside promenade.', tips: 'Quick stop on the Amber road.' }),
      place('Hawa Mahal', { zone: 'old-city', hours: 1, best: 'morning', fee: 50, tags: ['History & Culture', 'Photography'], lat: 26.9239, lng: 75.8267, description: 'The "Palace of Winds" with 953 small windows.', tips: 'The best front view is from the cafés across the road.' }),
      place('City Palace', { zone: 'old-city', hours: 2, fee: 200, tags: ['History & Culture'], lat: 26.9258, lng: 75.8237, description: 'Royal residence with museums, courtyards and the famous Peacock Gate.', tips: 'Keep the ticket; it is checked at several gates.' }),
      place('Jantar Mantar', { zone: 'old-city', hours: 1, fee: 50, tags: ['History & Culture', 'Hidden Gems'], lat: 26.9248, lng: 75.8246, description: 'UNESCO-listed 18th-century astronomical instruments, including a giant sundial.', tips: 'Take an audio guide or a local guide to understand the instruments.' }),
      place('Johari & Bapu Bazaar', { zone: 'old-city', hours: 2, best: 'evening', category: 'Shopping', tags: ['Shopping', 'Food & Cuisine'], lat: 26.9196, lng: 75.8267, description: 'Old-city markets for jewellery, block-print textiles and mojari shoes.', tips: 'Shops close around 9 PM; many close on Sundays.' }),
      place('Nahargarh Fort Sunset', { zone: 'nahargarh', hours: 2, best: 'evening', fee: 50, tags: ['Photography', 'History & Culture'], lat: 26.9373, lng: 75.8155, description: 'Ridge-top fort with the best sunset view over the Pink City.', tips: 'Go by cab; the road is narrow and steep.' }),
      place('Albert Hall Museum', { zone: 'central', hours: 1.5, fee: 40, tags: ['History & Culture'], lat: 26.9118, lng: 75.8195, description: 'Indo-Saracenic museum with an Egyptian mummy and Rajasthani art.', tips: 'The building is lit up beautifully after sunset.' }),
      place('Birla Mandir', { zone: 'south', hours: 1, best: 'evening', tags: ['Spiritual Places', 'Photography'], lat: 26.8921, lng: 75.8155, description: 'White marble Lakshmi-Narayan temple below Moti Dungri.', tips: 'Shoes off at the entrance; free entry.' }),
      place('Patrika Gate', { zone: 'south', hours: 1, best: 'morning', tags: ['Photography', 'Hidden Gems'], lat: 26.8418, lng: 75.8053, description: 'Colourful painted gateway at Jawahar Circle, popular for photos.', tips: 'Early morning is the least crowded.' }),
      place('Chokhi Dhani Cultural Village', { zone: 'tonk-road', hours: 3, best: 'evening', fee: 900, category: 'Activity', includesDinner: true, tags: ['History & Culture', 'Food & Cuisine', 'Nightlife'], lat: 26.7668, lng: 75.8369, description: 'Rajasthani village experience with folk dance, puppets and a traditional dinner.', tips: 'The ticket includes dinner, so no separate dinner is planned.' }),
    ],
    eateries: [
      eat('Laxmi Misthan Bhandar (LMB)', { zone: 'old-city', veg: true, costForTwo: 900, cuisine: 'Rajasthani • Sweets', lat: 26.9214, lng: 75.8256 }),
      eat('Rawat Mishthan Bhandar', { zone: 'central', veg: true, costForTwo: 300, cuisine: 'Pyaaz kachori • Sweets', lat: 26.9147, lng: 75.7895 }),
      eat('Natraj Restaurant', { zone: 'central', veg: true, costForTwo: 800, cuisine: 'North Indian • Rajasthani', lat: 26.9176, lng: 75.81 }),
      eat('Handi Restaurant', { zone: 'central', costForTwo: 1000, cuisine: 'Mughlai • Laal maas', lat: 26.9174, lng: 75.8079 }),
      eat('1135 AD', { zone: 'amer', costForTwo: 3000, cuisine: 'Royal Rajasthani (inside Amber Fort)', lat: 26.9856, lng: 75.8509 }),
    ],
  },
  {
    key: 'udaipur',
    name: 'Udaipur',
    region: 'Rajasthan',
    image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1200&q=80',
    hubs: [{ id: 'main', name: 'Udaipur', stayArea: 'Lal Ghat / Lake Pichola', lat: 24.5793, lng: 73.6831 }],
    stayPrices: { Budget: 1600, Moderate: 4500, Luxury: 15000 },
    transportPerDay: { Budget: 500, Moderate: 1400, Luxury: 2800 },
    arrival: { name: 'Arrive in Udaipur & check in', cost: { Budget: 300, Moderate: 700, Luxury: 1500 } },
    places: [
      place('City Palace', { zone: 'old-city', hours: 2.5, best: 'morning', fee: 300, tags: ['History & Culture', 'Photography'], lat: 24.5764, lng: 73.6835, description: 'Huge palace complex on the banks of Lake Pichola, now partly a museum.', tips: 'Open from about 9:30 AM; go early in summer.' }),
      place('Jagdish Temple', { zone: 'old-city', hours: 0.5, best: 'morning', tags: ['Spiritual Places', 'History & Culture'], lat: 24.5795, lng: 73.684, description: 'Richly carved 17th-century Vishnu temple near the City Palace.', tips: 'Free entry; climb the steps early before it gets hot.' }),
      place('Lake Pichola Boat Ride', { zone: 'old-city', hours: 1.5, best: 'evening', fee: 500, category: 'Activity', tags: ['Relaxation', 'Photography'], lat: 24.572, lng: 73.68, description: 'Boat ride past the Lake Palace with a stop at Jag Mandir island.', tips: 'The sunset ride is the most popular; book at the City Palace jetty.' }),
      place('Bagore Ki Haveli Dance Show', { zone: 'old-city', hours: 1.5, best: 'evening', fee: 150, tags: ['History & Culture', 'Nightlife'], lat: 24.5797, lng: 73.6828, description: 'Evening show of Rajasthani folk dance and puppets in an 18th-century haveli.', tips: 'Show is around 7 PM; arrive 30 minutes early for seats.' }),
      place('Ambrai Ghat', { zone: 'old-city', hours: 1, best: 'evening', tags: ['Photography', 'Relaxation', 'Hidden Gems'], lat: 24.5786, lng: 73.6801, description: 'Ghat with the classic view of the City Palace across the lake.', tips: 'Beautiful at night when the palace is lit.' }),
      place('Hathi Pol Market', { zone: 'old-city', hours: 1.5, best: 'afternoon', category: 'Shopping', tags: ['Shopping'], lat: 24.585, lng: 73.6895, description: 'Bazaar for miniature paintings, textiles and silver jewellery.', tips: 'Compare prices across shops before buying.' }),
      place('Saheliyon Ki Bari', { zone: 'north', hours: 1, best: 'morning', fee: 10, tags: ['Nature & Outdoors', 'History & Culture'], lat: 24.6025, lng: 73.6862, description: '18th-century garden of fountains and marble elephants.', tips: 'Fountains run more in the morning.' }),
      place('Fateh Sagar Lake & Moti Magri', { zone: 'north', hours: 1.5, best: 'evening', fee: 50, tags: ['Relaxation', 'Nature & Outdoors'], lat: 24.6, lng: 73.673, description: 'Lakeside promenade and the Maharana Pratap memorial on Moti Magri hill.', tips: 'Try the lakeside snacks in the evening.' }),
      place('Sajjangarh Monsoon Palace', { zone: 'sajjangarh', hours: 2, best: 'evening', fee: 150, tags: ['Photography', 'History & Culture'], lat: 24.5955, lng: 73.6365, description: 'Hilltop palace with sunset views over the lakes and Aravalli hills.', tips: 'Shared vans go up from the gate; last entry before sunset.' }),
      place('Vintage Car Museum', { zone: 'central', hours: 1, fee: 300, tags: ['Hidden Gems', 'History & Culture'], lat: 24.5895, lng: 73.6966, description: 'Royal family collection of classic cars, including Rolls-Royces.', tips: 'Combine with lunch nearby.' }),
      place('Kumbhalgarh Fort', { zone: 'kumbhalgarh', hours: 8, best: 'morning', fullDay: true, fee: 40, tags: ['History & Culture', 'Adventure', 'Photography'], lat: 25.1528, lng: 73.587, description: 'UNESCO hill fort with one of the world’s longest walls (about 36 km).', tips: 'About 85 km away; hire a cab for the day.' }),
    ],
    eateries: [
      eat('Ambrai Restaurant', { zone: 'old-city', costForTwo: 2500, cuisine: 'North Indian • Lakeside', lat: 24.5786, lng: 73.6801 }),
      eat('Upre by 1559 AD', { zone: 'old-city', costForTwo: 2500, cuisine: 'Rooftop • Indian & Continental', lat: 24.5773, lng: 73.6829 }),
      eat('Millets of Mewar', { zone: 'old-city', veg: true, costForTwo: 900, cuisine: 'Healthy vegetarian', lat: 24.5791, lng: 73.6845 }),
      eat('Natraj Dining Hall', { zone: 'central', veg: true, costForTwo: 600, cuisine: 'Rajasthani–Gujarati thali', lat: 24.5871, lng: 73.7018 }),
    ],
  },
  {
    key: 'varanasi',
    name: 'Varanasi',
    region: 'Uttar Pradesh',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    hubs: [{ id: 'main', name: 'Varanasi', stayArea: 'Dashashwamedh / Assi Ghat', lat: 25.3071, lng: 83.0104 }],
    stayPrices: { Budget: 1200, Moderate: 3500, Luxury: 10000 },
    transportPerDay: { Budget: 400, Moderate: 1200, Luxury: 2500 },
    arrival: { name: 'Arrive in Varanasi & check in', cost: { Budget: 300, Moderate: 700, Luxury: 1500 } },
    places: [
      place('Sunrise Boat Ride on the Ganges', { zone: 'ghats', hours: 1.5, best: 'morning', fee: 300, category: 'Activity', tags: ['Spiritual Places', 'Photography', 'Relaxation'], lat: 25.3047, lng: 83.0108, description: 'Rowing boat past the ghats as the city wakes up.', tips: 'Boats leave around 5:30–6 AM; agree the price before you sit.' }),
      place('Kashi Vishwanath Temple & Corridor', { zone: 'ghats', hours: 1.5, best: 'morning', tags: ['Spiritual Places', 'History & Culture'], lat: 25.3109, lng: 83.0107, description: 'One of the most sacred Shiva temples, with the new corridor to the river.', tips: 'Phones and bags are not allowed inside; use the lockers.' }),
      place('Manikarnika Ghat', { zone: 'ghats', hours: 0.5, tags: ['Spiritual Places', 'History & Culture'], lat: 25.3109, lng: 83.0137, description: 'The main cremation ghat, central to Varanasi’s beliefs about life and death.', tips: 'Be respectful and do not take photos of cremations.' }),
      place('Godowlia & Vishwanath Gali Food Walk', { zone: 'ghats', hours: 2, best: 'afternoon', category: 'Shopping', tags: ['Food & Cuisine', 'Shopping'], lat: 25.309, lng: 83.0057, description: 'Narrow lanes full of chaat, sweets, Banarasi paan and silk shops.', tips: 'Go slowly; the lanes are crowded with people and bikes.' }),
      place('Ganga Aarti at Dashashwamedh Ghat', { zone: 'ghats', hours: 1.5, best: 'evening', tags: ['Spiritual Places', 'Photography', 'History & Culture'], lat: 25.3071, lng: 83.0104, description: 'Evening fire ceremony with lamps, bells and chanting by the river.', tips: 'Starts around sunset; take a boat or a step seat 45 minutes early.' }),
      place('Assi Ghat Morning (Subah-e-Banaras)', { zone: 'assi', hours: 1.5, best: 'morning', tags: ['Spiritual Places', 'Relaxation', 'Hidden Gems'], lat: 25.2898, lng: 83.0068, description: 'Morning aarti, yoga and classical music at the southern end of the ghats.', tips: 'Starts before sunrise.' }),
      place('Tulsi Manas & Durga Temples', { zone: 'assi', hours: 1, tags: ['Spiritual Places'], lat: 25.2887, lng: 82.9993, description: 'Marble temple with the Ramcharitmanas carved on its walls, next to the red Durga temple.', tips: 'Closed in the early afternoon.' }),
      place('BHU & Bharat Kala Bhavan Museum', { zone: 'bhu', hours: 2, best: 'afternoon', fee: 50, tags: ['History & Culture', 'Hidden Gems'], lat: 25.2677, lng: 82.9913, description: 'Green university campus with a fine museum of Indian art and the New Vishwanath Temple.', tips: 'The museum is closed on Sundays.' }),
      place('Ramnagar Fort', { zone: 'bhu', hours: 1.5, best: 'afternoon', fee: 75, tags: ['History & Culture'], lat: 25.282, lng: 83.028, description: '18th-century sandstone fort of the Maharaja of Banaras, across the river.', tips: 'Combine with BHU on the same afternoon.' }),
      place('Banarasi Silk Weaving Visit', { zone: 'central', hours: 1.5, best: 'afternoon', category: 'Shopping', tags: ['Shopping', 'History & Culture', 'Hidden Gems'], lat: 25.3005, lng: 83.004, description: 'Watch hand-loom weavers make Banarasi silk sarees in the old weaving quarter.', tips: 'You are not obliged to buy; ask before taking photos.' }),
      place('Sarnath', { zone: 'sarnath', hours: 3, best: 'morning', fee: 40, tags: ['History & Culture', 'Spiritual Places'], lat: 25.381, lng: 83.023, description: 'Where the Buddha gave his first sermon — Dhamek Stupa, temples and the Ashoka lion capital museum.', tips: 'The museum is closed on Fridays.' }),
    ],
    eateries: [
      eat('Kashi Chat Bhandar', { zone: 'ghats', veg: true, costForTwo: 300, cuisine: 'Chaat • Tamatar chaat', lat: 25.3094, lng: 83.0058 }),
      eat('Blue Lassi', { zone: 'ghats', veg: true, costForTwo: 250, cuisine: 'Lassi', lat: 25.3112, lng: 83.0124 }),
      eat('Deena Chat Bhandar', { zone: 'ghats', veg: true, costForTwo: 300, cuisine: 'Chaat', lat: 25.3089, lng: 83.0062 }),
      eat('Pizzeria Vaatika Café', { zone: 'assi', veg: true, costForTwo: 700, cuisine: 'Café • Pizza • Apple pie', lat: 25.29, lng: 83.0075 }),
      eat('Baati Chokha Restaurant', { zone: 'central', veg: true, costForTwo: 600, cuisine: 'UP thali • Litti chokha', lat: 25.3266, lng: 82.9876 }),
    ],
  },
  {
    key: 'kerala',
    name: 'Kerala',
    region: 'Kerala (Munnar & Alleppey)',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    hubs: [
      { id: 'munnar', name: 'Munnar', stayArea: 'Munnar town', lat: 10.0889, lng: 77.0595 },
      { id: 'alleppey', name: 'Alleppey', stayArea: 'Alleppey (Alappuzha)', lat: 9.4981, lng: 76.3388 },
    ],
    hubTransfer: { name: 'Drive Munnar → Alleppey', hours: 4.5, cost: { Budget: 2500, Moderate: 4000, Luxury: 6000 }, tips: 'About 170 km; leave after breakfast. Bus is cheaper but slower.' },
    stayPrices: { Budget: 1500, Moderate: 4000, Luxury: 11000 },
    transportPerDay: { Budget: 600, Moderate: 1600, Luxury: 3000 },
    arrival: { name: 'Arrive in Munnar & check in', cost: { Budget: 600, Moderate: 1500, Luxury: 2500 } },
    places: [
      place('Eravikulam National Park (Rajamala)', { hub: 'munnar', zone: 'rajamala', hours: 3, best: 'morning', fee: 200, tags: ['Wildlife', 'Nature & Outdoors', 'Photography'], lat: 10.1374, lng: 77.0474, description: 'Grassland hills home to the rare Nilgiri tahr.', tips: 'Usually closed around Feb–March for the tahr calving season.' }),
      place('Tea Museum (KDHP)', { hub: 'munnar', zone: 'town', hours: 1.5, fee: 125, tags: ['History & Culture', 'Food & Cuisine'], lat: 10.0981, lng: 77.0625, description: 'See how tea is processed, with a tasting at the end.', tips: 'Closed on Mondays.' }),
      place('Tea Plantation Walk', { hub: 'munnar', zone: 'town', hours: 2, best: 'morning', fee: 300, category: 'Activity', tags: ['Nature & Outdoors', 'Photography', 'Hidden Gems'], lat: 10.08, lng: 77.06, description: 'Guided walk through rolling tea estates around Munnar.', tips: 'Carry a light rain jacket.' }),
      place('Mattupetty Dam & Echo Point', { hub: 'munnar', zone: 'mattupetty', hours: 2, best: 'afternoon', tags: ['Nature & Outdoors', 'Relaxation', 'Photography'], lat: 10.1066, lng: 77.1238, description: 'Reservoir surrounded by hills, with boating and the Echo Point lake.', tips: 'Boating is paid separately at the dam.' }),
      place('Top Station Viewpoint', { hub: 'munnar', zone: 'mattupetty', hours: 2, best: 'morning', tags: ['Photography', 'Nature & Outdoors'], lat: 10.1253, lng: 77.2462, description: 'Highest point on the Munnar–Kodaikanal road with views into Tamil Nadu.', tips: 'Mist clears best in the morning.' }),
      place('Attukal Waterfalls', { hub: 'munnar', zone: 'town', hours: 1, tags: ['Nature & Outdoors'], lat: 10.0718, lng: 77.052, description: 'Waterfall between hills, best after the monsoon.', tips: 'Rocks are slippery; stay on the path.' }),
      place('Backwater Shikara Ride', { hub: 'alleppey', zone: 'backwaters', hours: 3, best: 'morning', fee: 600, category: 'Activity', tags: ['Relaxation', 'Nature & Outdoors', 'Photography'], lat: 9.4981, lng: 76.3388, description: 'Small canopy boat through narrow village canals that houseboats cannot enter.', tips: 'Morning rides are cooler and quieter.' }),
      place('Alappuzha Beach & Lighthouse', { hub: 'alleppey', zone: 'beach', hours: 1.5, best: 'evening', fee: 25, tags: ['Beaches', 'Relaxation'], lat: 9.4931, lng: 76.3165, description: 'Long beach with an old pier and a climbable lighthouse.', tips: 'Sea currents are strong; avoid swimming.' }),
      place('Marari Beach', { hub: 'alleppey', zone: 'beach', hours: 2, best: 'afternoon', tags: ['Beaches', 'Relaxation', 'Hidden Gems'], lat: 9.5983, lng: 76.2981, description: 'Quiet fishing-village beach lined with coconut palms.', tips: 'Good for a lazy afternoon.' }),
      place('Kumarakom Bird Sanctuary', { hub: 'alleppey', zone: 'kumarakom', hours: 2.5, best: 'morning', fee: 50, tags: ['Wildlife', 'Nature & Outdoors'], lat: 9.6253, lng: 76.428, description: 'Mangrove sanctuary on Vembanad Lake with migratory birds.', tips: 'Best early morning; Nov–Feb for migratory birds.' }),
      place('Ambalappuzha Sri Krishna Temple', { hub: 'alleppey', zone: 'backwaters', hours: 1, best: 'morning', tags: ['Spiritual Places', 'History & Culture'], lat: 9.3826, lng: 76.3609, description: 'Traditional Kerala temple famous for its sweet milk payasam.', tips: 'Kerala dress code: men wear a mundu, no shirt inside.' }),
    ],
    eateries: [
      eat('Rapsy Restaurant', { hub: 'munnar', zone: 'town', costForTwo: 500, cuisine: 'Kerala • Biryani', lat: 10.0886, lng: 77.0598 }),
      eat('Kerala veg meals on banana leaf (Munnar town)', { hub: 'munnar', zone: 'town', generic: true, veg: true, costForTwo: 400, cuisine: 'Kerala meals • Vegetarian', lat: 10.0884, lng: 77.0602 }),
      eat('Karimeen fry at a backwater restaurant', { hub: 'alleppey', zone: 'backwaters', generic: true, costForTwo: 900, cuisine: 'Kerala seafood', lat: 9.4995, lng: 76.34 }),
      eat('Kerala sadya / veg meals (Alleppey)', { hub: 'alleppey', zone: 'beach', generic: true, veg: true, costForTwo: 450, cuisine: 'Kerala meals • Vegetarian', lat: 9.4966, lng: 76.3275 }),
    ],
  },
  {
    key: 'andaman',
    name: 'Andaman',
    region: 'Andaman & Nicobar Islands',
    image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80',
    hubs: [
      { id: 'port-blair', name: 'Port Blair', stayArea: 'Aberdeen Bazaar, Port Blair', lat: 11.667, lng: 92.74 },
      { id: 'havelock', name: 'Havelock (Swaraj Dweep)', stayArea: 'Havelock beach area', lat: 11.9761, lng: 92.9876 },
    ],
    hubTransfer: { name: 'Ferry Port Blair → Havelock (Swaraj Dweep)', hours: 2, perPerson: 1500, tips: 'Book government or private ferry tickets in advance; carry ID.' },
    stayPrices: { Budget: 2000, Moderate: 5000, Luxury: 14000 },
    transportPerDay: { Budget: 700, Moderate: 1800, Luxury: 3000 },
    arrival: { name: 'Arrive in Port Blair & check in', cost: { Budget: 400, Moderate: 800, Luxury: 1500 } },
    places: [
      place('Cellular Jail & Light-and-Sound Show', { hub: 'port-blair', zone: 'city', hours: 2.5, best: 'evening', fee: 330, tags: ['History & Culture'], lat: 11.6744, lng: 92.7477, description: 'Colonial-era prison of the freedom struggle, with an evening sound-and-light show.', tips: 'Book show tickets early; the English show is usually the later one.' }),
      place('Ross Island (Netaji Subhas Chandra Bose Dweep)', { hub: 'port-blair', zone: 'harbour', hours: 2.5, best: 'morning', fee: 550, tags: ['History & Culture', 'Photography', 'Nature & Outdoors'], lat: 11.6764, lng: 92.7637, description: 'British-era ruins taken over by trees, with deer and peacocks.', tips: 'Boats leave from Rajiv Gandhi Water Sports Complex; closed on Wednesdays.' }),
      place('North Bay Island Coral Trip', { hub: 'port-blair', zone: 'harbour', hours: 3, best: 'morning', fee: 1200, category: 'Activity', tags: ['Adventure', 'Beaches', 'Nature & Outdoors'], lat: 11.7058, lng: 92.7552, description: 'Glass-bottom boat and snorkelling over coral reefs.', tips: 'Usually combined with Ross Island on the same boat.' }),
      place('Samudrika Naval Marine Museum', { hub: 'port-blair', zone: 'city', hours: 1, fee: 50, tags: ['History & Culture', 'Hidden Gems'], lat: 11.669, lng: 92.7442, description: 'Museum about the islands’ tribes, marine life and geography.', tips: 'Closed on Mondays.' }),
      place("Corbyn's Cove Beach", { hub: 'port-blair', zone: 'south', hours: 1.5, best: 'afternoon', tags: ['Beaches', 'Relaxation'], lat: 11.6436, lng: 92.7476, description: 'Palm-fringed beach close to Port Blair town.', tips: 'Good for an easy afternoon swim when the sea is calm.' }),
      place('Chidiya Tapu Sunset', { hub: 'port-blair', zone: 'south', hours: 2, best: 'evening', tags: ['Photography', 'Nature & Outdoors', 'Wildlife'], lat: 11.4972, lng: 92.7106, description: 'Forest-covered southern tip of the island, known for birds and sunsets.', tips: 'About 25 km from town; leave by 4 PM.' }),
      place('Elephant Beach Snorkelling', { hub: 'havelock', zone: 'north', hours: 4, best: 'morning', fee: 2000, category: 'Activity', tags: ['Adventure', 'Beaches'], lat: 12.009, lng: 92.962, description: 'Boat or forest-trek to a beach with shallow coral reefs.', tips: 'Boats stop if the sea is rough; go in the morning.' }),
      place('Radhanagar Beach', { hub: 'havelock', zone: 'west', hours: 3, best: 'afternoon', tags: ['Beaches', 'Relaxation', 'Photography'], lat: 11.9842, lng: 92.9505, description: 'Wide white-sand beach often listed among Asia’s best.', tips: 'Stay for sunset; lifeguards mark the safe swimming area.' }),
      place('Kalapathar Beach', { hub: 'havelock', zone: 'east', hours: 1.5, best: 'morning', tags: ['Beaches', 'Hidden Gems', 'Photography'], lat: 11.988, lng: 93.032, description: 'Quiet beach with black rocks and turquoise water.', tips: 'Sunrise is beautiful here.' }),
      place('Try Scuba Dive', { hub: 'havelock', zone: 'east', hours: 3, best: 'morning', fee: 4500, category: 'Activity', tags: ['Adventure'], lat: 11.98, lng: 93.0, description: 'Beginner dive with an instructor — no certificate needed.', tips: 'Do not fly within 24 hours after diving.' }),
    ],
    eateries: [
      eat('New Lighthouse Restaurant', { hub: 'port-blair', zone: 'city', costForTwo: 1200, cuisine: 'Seafood', lat: 11.6726, lng: 92.7466 }),
      eat('Annapurna Cafeteria', { hub: 'port-blair', zone: 'city', veg: true, costForTwo: 600, cuisine: 'South Indian • Vegetarian', lat: 11.6667, lng: 92.7383 }),
      eat('Full Moon Café', { hub: 'havelock', zone: 'east', costForTwo: 1500, cuisine: 'Seafood • Café', lat: 11.9786, lng: 92.9998 }),
      eat('Vegetarian thali in Havelock market', { hub: 'havelock', zone: 'east', generic: true, veg: true, costForTwo: 500, cuisine: 'Indian • Vegetarian', lat: 11.9775, lng: 92.9925 }),
    ],
  },
  {
    key: 'rishikesh',
    name: 'Rishikesh',
    region: 'Uttarakhand',
    image: 'https://images.unsplash.com/photo-1596761224213-9a4f4e70e4c6?auto=format&fit=crop&w=1200&q=80',
    note: 'Rishikesh is a vegetarian town: meat and alcohol are not served.',
    hubs: [{ id: 'main', name: 'Rishikesh', stayArea: 'Tapovan / Laxman Jhula', lat: 30.1255, lng: 78.3297 }],
    stayPrices: { Budget: 1200, Moderate: 3500, Luxury: 12000 },
    transportPerDay: { Budget: 400, Moderate: 1200, Luxury: 2500 },
    arrival: { name: 'Arrive in Rishikesh & check in', cost: { Budget: 300, Moderate: 800, Luxury: 1500 } },
    places: [
      place('Laxman Jhula Area & Tapovan Cafés', { zone: 'tapovan', hours: 1.5, tags: ['Photography', 'Food & Cuisine', 'Hidden Gems'], lat: 30.1255, lng: 78.3297, description: 'Riverside area of temples, cafés and shops around the famous suspension bridge.', tips: 'Watch out for monkeys near food.' }),
      place('Morning Yoga Class', { zone: 'tapovan', hours: 1.5, best: 'morning', fee: 500, category: 'Activity', tags: ['Relaxation', 'Spiritual Places'], lat: 30.127, lng: 78.325, description: 'Drop-in class in the "Yoga Capital of the World".', tips: 'Most schools accept beginners; bring your own mat if you can.' }),
      place('Neer Garh Waterfall', { zone: 'tapovan', hours: 2, best: 'morning', fee: 30, tags: ['Nature & Outdoors', 'Adventure'], lat: 30.135, lng: 78.3388, description: 'Short hike to a series of small waterfalls and pools.', tips: 'About 20 minutes uphill from the road; wear grippy shoes.' }),
      place('Ram Jhula & Parmarth Niketan', { zone: 'ram-jhula', hours: 1.5, best: 'afternoon', tags: ['Spiritual Places', 'Photography'], lat: 30.1235, lng: 78.3156, description: 'Suspension bridge leading to ashrams and the Swarg Ashram area.', tips: 'Shared jeeps and walks connect it with Laxman Jhula.' }),
      place('Ganga Aarti at Parmarth Niketan', { zone: 'ram-jhula', hours: 1.5, best: 'evening', tags: ['Spiritual Places', 'History & Culture'], lat: 30.1196, lng: 78.3127, description: 'Evening aarti with chanting and lamps on the riverbank.', tips: 'Starts around sunset; reach 45 minutes early.' }),
      place('Beatles Ashram (Chaurasi Kutia)', { zone: 'ram-jhula', hours: 1.5, best: 'morning', fee: 150, tags: ['History & Culture', 'Hidden Gems', 'Photography'], lat: 30.1162, lng: 78.3191, description: 'Forest ashram where the Beatles stayed in 1968, now full of murals.', tips: 'Inside the Rajaji tiger reserve area; open in the daytime only.' }),
      place('Triveni Ghat', { zone: 'town', hours: 1, best: 'evening', tags: ['Spiritual Places'], lat: 30.1029, lng: 78.297, description: 'Main bathing ghat in town with its own evening aarti.', tips: 'Less touristy than the Parmarth aarti.' }),
      place('River Rafting (Shivpuri to Rishikesh)', { zone: 'shivpuri', hours: 3.5, best: 'morning', fee: 1000, category: 'Activity', tags: ['Adventure', 'Nature & Outdoors'], lat: 30.1458, lng: 78.3984, description: '16 km white-water rafting on the Ganges with grade II–III rapids.', tips: 'Season is roughly Sep–Jun; book a registered operator.' }),
      place('Kunjapuri Temple Sunrise', { zone: 'kunjapuri', hours: 3, best: 'morning', tags: ['Spiritual Places', 'Photography', 'Nature & Outdoors'], lat: 30.1806, lng: 78.3307, description: 'Hilltop temple with sunrise views of the Himalayan peaks.', tips: 'Leave around 5 AM by cab; carry a jacket.' }),
      place('Bungee Jumping (Mohan Chatti)', { zone: 'mohanchatti', hours: 3, best: 'morning', fee: 3700, category: 'Activity', tags: ['Adventure'], lat: 30.174, lng: 78.432, description: 'India’s highest fixed-platform bungee jump over a river gorge.', tips: 'Weight and age rules apply; book online in advance.' }),
    ],
    eateries: [
      eat('Chotiwala', { zone: 'ram-jhula', veg: true, costForTwo: 600, cuisine: 'North Indian thali', lat: 30.1226, lng: 78.3159 }),
      eat('The Beatles Café', { zone: 'tapovan', veg: true, costForTwo: 800, cuisine: 'Café • River view', lat: 30.1262, lng: 78.3268 }),
      eat('Little Buddha Café', { zone: 'tapovan', veg: true, costForTwo: 800, cuisine: 'Café • Multi-cuisine', lat: 30.1258, lng: 78.3275 }),
    ],
  },
];

/** Curated data for a destination typed by the user ("Goa", "Panjim", "Kerala (Munnar & Alleppey)"), or null. */
export const findOfflineDestination = (destination) => {
  const match = findOfflinePlannerDestination(destination);
  return match ? OFFLINE_DESTINATIONS.find((d) => d.name === match.name) ?? null : null;
};

export const OFFLINE_DESTINATION_NAMES = OFFLINE_DESTINATIONS.map((d) => d.name);
