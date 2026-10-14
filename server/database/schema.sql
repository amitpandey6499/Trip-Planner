-- TripPlanner Database Schema
-- College Mini Project: ABES Engineering College, Ghaziabad
-- Academic Session: 2026-27

CREATE DATABASE IF NOT EXISTS tripplanner_db;
USE tripplanner_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Trips Table
CREATE TABLE IF NOT EXISTS trips (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    travelers_count INT DEFAULT 1,
    total_budget DECIMAL(10,2) NOT NULL,
    budget_category ENUM('Budget', 'Moderate', 'Luxury') DEFAULT 'Moderate',
    status ENUM('Upcoming', 'Completed', 'Saved') DEFAULT 'Upcoming',
    destination_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_trips (user_id),
    INDEX idx_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Trip Preferences Table
CREATE TABLE IF NOT EXISTS trip_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id VARCHAR(255) NOT NULL,
    interests JSON,
    travel_style VARCHAR(100) DEFAULT 'Balanced',
    accommodation_type VARCHAR(100) DEFAULT 'Hotel',
    dietary_preference VARCHAR(100) DEFAULT 'No Restrictions',
    special_notes TEXT,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    INDEX idx_trip_pref (trip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Itinerary Days Table
CREATE TABLE IF NOT EXISTS itinerary_days (
    id VARCHAR(255) PRIMARY KEY,
    trip_id VARCHAR(255) NOT NULL,
    day_number INT NOT NULL,
    date DATE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_daily_cost DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    INDEX idx_trip_days (trip_id, day_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Itinerary Activities / Places Table
CREATE TABLE IF NOT EXISTS itinerary_activities (
    id VARCHAR(255) PRIMARY KEY,
    day_id VARCHAR(255) NOT NULL,
    order_index INT NOT NULL,
    place_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Attraction',
    time_slot VARCHAR(50),
    estimated_duration VARCHAR(50),
    description TEXT,
    image_url TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    estimated_cost DECIMAL(10,2) DEFAULT 0,
    practical_tips TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE,
    INDEX idx_day_activities (day_id, order_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Recommended Hotels Table
CREATE TABLE IF NOT EXISTS hotels (
    id VARCHAR(255) PRIMARY KEY,
    destination VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 4.5,
    price_per_night DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    amenities JSON,
    budget_tier ENUM('Budget', 'Moderate', 'Luxury') DEFAULT 'Moderate',
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    INDEX idx_hotel_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Recommended Restaurants Table
CREATE TABLE IF NOT EXISTS restaurants (
    id VARCHAR(255) PRIMARY KEY,
    destination VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 4.5,
    cuisine VARCHAR(100),
    cost_for_two DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    dietary_tags JSON,
    address VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    INDEX idx_restaurant_destination (destination)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Saved User Destinations Table
CREATE TABLE IF NOT EXISTS saved_destinations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    destination_slug VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_destination (user_id, destination_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
