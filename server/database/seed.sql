-- TripPlanner Seed Data
-- ABESIT Mini Project 2026-27

USE tripplanner_db;

-- 1. Demo User
INSERT INTO users (id, email, name, avatar_url)
VALUES 
('user_demo_123', 'demo@tripplanner.com', 'Aarav Sharma', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. Hotels in Manali, Goa, Jaipur, Udaipur
INSERT INTO hotels (id, destination, name, rating, price_per_night, image_url, amenities, budget_tier, address, latitude, longitude)
VALUES
('h_manali_1', 'Manali', 'The Orchard Greens', 4.5, 3500.00, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80', '["Free WiFi", "Mountain View", "Breakfast Included", "Heated Rooms"]', 'Moderate', 'Log Huts Area, Manali, HP', 32.2432, 77.1892),
('h_manali_2', 'Manali', 'Snow Valley Resort', 4.6, 4200.00, 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80', '["Free WiFi", "Mountain View", "Buffet Breakfast", "Spa"]', 'Luxury', 'Log Huts, Manali, HP', 32.2471, 77.1856),
('h_manali_3', 'Manali', 'Hotel Himalayan', 4.4, 2800.00, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80', '["Budget Friendly", "Clean Rooms", "WiFi", "Balcony"]', 'Budget', 'Hadimba Road, Manali, HP', 32.2410, 77.1840),
('h_manali_4', 'Manali', 'The Manali Inn', 4.5, 3800.00, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80', '["River View", "Breakfast", "Parking", "Gym"]', 'Moderate', 'Rangree, Manali, HP', 32.2285, 77.1880),

('h_jaipur_1', 'Jaipur', 'ITC Rajputana, Luxury Collection', 4.8, 7500.00, 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80', '["Royal Palace Architecture", "Swimming Pool", "Spa", "Free WiFi"]', 'Luxury', 'Palace Road, Jaipur, RJ', 26.9205, 75.7925),
('h_jaipur_2', 'Jaipur', 'Umaid Bhawan Heritage Hotel', 4.5, 3200.00, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80', '["Rooftop Pool", "Rajasthani Decor", "Free WiFi", "Breakfast"]', 'Moderate', 'Bani Park, Jaipur, RJ', 26.9298, 75.7960),

('h_goa_1', 'Goa', 'Taj Exotica Resort & Spa', 4.8, 12000.00, 'https://images.unsplash.com/photo-1580837119756-563d608dd119?auto=format&fit=crop&w=600&q=80', '["Beachfront", "Infinity Pool", "Private Balcony", "Golf Course"]', 'Luxury', 'Benaulim Beach, South Goa', 15.2635, 73.9182),
('h_goa_2', 'Goa', 'The Acacia Hotel & Spa', 4.4, 3800.00, 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&w=600&q=80', '["Near Candolim Beach", "Swimming Pool", "Free WiFi"]', 'Moderate', 'Candolim, North Goa', 15.5160, 73.7680)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. Restaurants in Manali, Goa, Jaipur
INSERT INTO restaurants (id, destination, name, rating, cuisine, cost_for_two, image_url, dietary_tags, address, latitude, longitude)
VALUES
('r_manali_1', 'Manali', 'Johnson\'s Café', 4.6, 'Cafe • Continental • Trout', 800.00, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80', '["Wood-fired Pizza", "Local Trout Fish", "Cocktails"]', 'Circuit House Road, Manali', 32.2440, 77.1865),
('r_manali_2', 'Manali', 'IL Forno', 4.5, 'Italian • Pizza • Pasta', 600.00, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80', '["Authentic Wood Fired", "Garden Seating", "Vegetarian Friendly"]', 'Hadimba Road, Manali', 32.2460, 77.1830),
('r_manali_3', 'Manali', 'Casa Bella Vista', 4.4, 'Cafe • European • Bakery', 500.00, 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=600&q=80', '["Organic Ingredients", "Vegan Options", "Cozy Ambience"]', 'Log Huts Road, Old Manali', 32.2482, 77.1812),
('r_manali_4', 'Manali', 'Drifter\'s Cafe', 4.6, 'Cafe • Indian • Continental', 450.00, 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80', '["Live Music", "Board Games", "Budget Friendly"]', 'Manu Temple Road, Old Manali', 32.2530, 77.1790),

('r_jaipur_1', 'Jaipur', 'Chokhi Dhani Ethnic Restaurant', 4.7, 'Traditional Rajasthani Thali', 1200.00, 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=80', '["Pure Vegetarian", "Cultural Folk Dance", "Authentic Dal Baati"]', 'Tonk Road, Jaipur', 26.7661, 75.8362),
('r_jaipur_2', 'Jaipur', 'The Verandah at Rambagh', 4.8, 'Royal Indian & Mediterranean', 2500.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80', '["Palace Lawn Seating", "High Tea", "Fine Dining"]', 'Bhawani Singh Road, Jaipur', 26.8988, 75.8080)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. Sample Trip: 4-Day Trip to Manali
INSERT INTO trips (id, user_id, destination, title, start_date, end_date, duration_days, travelers_count, total_budget, budget_category, status, destination_image)
VALUES
('trip_demo_manali_4d', 'user_demo_123', 'Manali', '4-Day Trip to Manali', '2026-11-12', '2026-11-15', 4, 2, 15000.00, 'Moderate', 'Upcoming', 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80')
ON DUPLICATE KEY UPDATE title=VALUES(title);

INSERT INTO trip_preferences (trip_id, interests, travel_style, accommodation_type, dietary_preference, special_notes)
VALUES
('trip_demo_manali_4d', '["Nature & Outdoors", "Adventure", "Food & Cuisine"]', 'Balanced', 'Mid-Range Hotel', 'Vegetarian & Non-Veg', 'Want to experience snow and scenic photography spots.')
ON DUPLICATE KEY UPDATE travel_style=VALUES(travel_style);

-- Itinerary Days for Manali
INSERT INTO itinerary_days (id, trip_id, day_number, date, title, description, estimated_daily_cost)
VALUES
('day_manali_1', 'trip_demo_manali_4d', 1, '2026-11-12', 'Arrival & Local Sightseeing', 'Reach Manali, settle in, visit historic temples and explore Mall Road.', 3500.00),
('day_manali_2', 'trip_demo_manali_4d', 2, '2026-11-13', 'Solang Valley & Atal Tunnel Adventure', 'Thrilling alpine adventure with snow activities, ropeway, and crossing the Pir Panjal range.', 4500.00),
('day_manali_3', 'trip_demo_manali_4d', 3, '2026-11-14', 'Old Manali & Vashisht Hot Springs', 'Bohemian cafes, ancient wooden Manu temple, hot sulfur baths, and cedar woods.', 3200.00),
('day_manali_4', 'trip_demo_manali_4d', 4, '2026-11-15', 'Naggar Castle & Souvenir Shopping', 'Heritage castle visit, panoramic Beas river valley views, and departing memories.', 2800.00)
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- Itinerary Activities for Day 1
INSERT INTO itinerary_activities (id, day_id, order_index, place_name, category, time_slot, estimated_duration, description, image_url, latitude, longitude, estimated_cost, practical_tips)
VALUES
('act_m1_1', 'day_manali_1', 1, 'Arrival at Manali & Hotel Check-in', 'Transit', '09:00 AM', '1.5 hours', 'Reach Manali bus terminus / private cab. Check in at hotel, freshen up and enjoy welcome herbal mountain tea.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80', 32.2396, 77.1887, 500.00, 'Keep luggage locked and take hotel card with emergency contact numbers.'),
('act_m1_2', 'day_manali_1', 2, 'Hadimba Devi Temple', 'Attraction', '11:00 AM - 12:00 PM', '1 hour', 'Famous 16th-century wooden pagoda temple built in deodar sanctuary forest dedicated to goddess Hadimba.', 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=500&q=80', 32.2483, 77.1814, 50.00, 'Dress respectfully. Yak rides and Angora rabbit photos available outside.'),
('act_m1_3', 'day_manali_1', 3, 'Mall Road & Tibetan Monastery', 'Attraction', '01:00 PM - 03:00 PM', '2 hours', 'Explore vibrant local markets, handmade woolens, traditional shawls, prayer wheels, and Tibetan handicraft stalls.', 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=500&q=80', 32.2426, 77.1895, 800.00, 'Try hot steamed momos and siddu from street vendors near the fountain.'),
('act_m1_4', 'day_manali_1', 4, 'Van Vihar National Park', 'Attraction', '04:00 PM - 06:00 PM', '2 hours', 'Serene municipal park carpeted with soaring deodar pine trees right along the roaring Beas river.', 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=500&q=80', 32.2380, 77.1910, 100.00, 'Great sunset photo opportunities by the riverbank stones.')
ON DUPLICATE KEY UPDATE place_name=VALUES(place_name);

-- Itinerary Activities for Day 2
INSERT INTO itinerary_activities (id, day_id, order_index, place_name, category, time_slot, estimated_duration, description, image_url, latitude, longitude, estimated_cost, practical_tips)
VALUES
('act_m2_1', 'day_manali_2', 1, 'Depart Hotel for Solang Valley', 'Transit', '09:00 AM', '1 hour', 'Scenic drive passing through pine-flanked hairpins towards Solang Valley.', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80', 32.2432, 77.1892, 600.00, 'Carry warm windbreakers and sunglasses to protect against snow glare.'),
('act_m2_2', 'day_manali_2', 2, 'Solang Valley', 'Attraction', '10:00 AM', '2 hours', 'Famous meadow with jaw-dropping views of glaciers and snow-capped peaks.', 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=500&q=80', 32.3167, 77.1578, 1200.00, 'Rent snow suits and boots directly at the government-approved counter.'),
('act_m2_3', 'day_manali_2', 3, 'Adventure Activities & Cable Car', 'Attraction', '12:00 PM', '1.5 hours', 'Ride the Solang ropeway cable car to Mt. Phatru for panoramic Himalayan ridge views.', 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&w=500&q=80', 32.3180, 77.1550, 1500.00, 'Paragliding depends on clear wind conditions.'),
('act_m2_4', 'day_manali_2', 4, 'Lunch at Mountain Dhaba', 'Restaurant', '02:00 PM', '1 hour', 'Hot Rajma Chawal, Kadhi, and steaming Maggi with cardamom tea in alpine breeze.', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80', 32.3150, 77.1600, 400.00, 'Cash is preferred as network signals can be intermittent.'),
('act_m2_5', 'day_manali_2', 5, 'Atal Tunnel (Rohtang Pass bypass)', 'Attraction', '04:00 PM', '1 hour', 'Marvel of engineering: World’s longest highway tunnel above 10,000 feet connecting Kullu with Lahaul Valley.', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80', 32.3639, 77.1353, 200.00, 'Photography inside tunnel strictly prohibited; breathtaking lookouts on North portal.'),
('act_m2_6', 'day_manali_2', 6, 'Sissu Waterfall Viewpoint', 'Attraction', '05:30 PM', '1 hour', 'Stunning Lahaul valley landscape with the spectacular Sissu waterfall dropping into the Chandra river.', 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=500&q=80', 32.4772, 77.1235, 100.00, 'Temperature drops rapidly after 5 PM, layer up.'),
('act_m2_7', 'day_manali_2', 7, 'Return to Hotel in Manali', 'Transit', '07:00 PM', '1.5 hours', 'Drive back to Manali through illuminated tunnel portal, evening relaxation.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80', 32.2432, 77.1892, 500.00, 'Rest early for Day 3.')
ON DUPLICATE KEY UPDATE place_name=VALUES(place_name);
