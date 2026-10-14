import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storeFilePath = path.join(__dirname, '../data/tripsStore.json');

let pool = null;
let isMySqlConnected = false;

// Initialize Store File if needed
const initStoreFile = () => {
  if (!fs.existsSync(storeFilePath)) {
    const dir = path.dirname(storeFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Seed initial demo data
    const initialData = {
      users: [
        {
          id: 'user_demo_123',
          email: 'demo@tripplanner.com',
          name: 'Aarav Sharma',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
        }
      ],
      trips: [
        {
          id: 'trip_demo_manali_4d',
          userId: 'user_demo_123',
          destination: 'Manali',
          title: 'Manali Trip',
          startDate: '2026-11-12',
          endDate: '2026-11-15',
          durationDays: 4,
          travelersCount: 2,
          totalBudget: 15000,
          budgetCategory: 'Moderate',
          status: 'Upcoming',
          destinationImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80',
          createdAt: new Date().toISOString()
        }
      ],
      itineraries: {}
    };

    // Load Manali itinerary from sample
    try {
      const samplePath = path.join(__dirname, '../data/sampleItineraries.json');
      if (fs.existsSync(samplePath)) {
        const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
        if (sample.manali) {
          initialData.itineraries['trip_demo_manali_4d'] = sample.manali;
        }
      }
    } catch (e) {
      console.warn('Failed to pre-seed Manali itinerary:', e.message);
    }

    fs.writeFileSync(storeFilePath, JSON.stringify(initialData, null, 2), 'utf8');
  }
};

const getStore = () => {
  initStoreFile();
  try {
    return JSON.parse(fs.readFileSync(storeFilePath, 'utf8'));
  } catch (e) {
    return { users: [], trips: [], itineraries: {} };
  }
};

const saveStore = (data) => {
  fs.writeFileSync(storeFilePath, JSON.stringify(data, null, 2), 'utf8');
};

// Initialize DB Connection
export const initDB = async () => {
  initStoreFile();

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tripplanner_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    isMySqlConnected = true;
    console.log(`[DB] MySQL database connected successfully to ${dbConfig.database}@${dbConfig.host}`);
  } catch (err) {
    isMySqlConnected = false;
    console.warn(`[DB] MySQL connection notice: ${err.message}.`);
    console.log(`[DB] Operating with Persistent JSON Store fallback at: ${storeFilePath}`);
    console.log(`[DB] All trips, user data, and itineraries will persist cleanly.`);
  }

  return { isMySqlConnected };
};

export const getDbStatus = () => ({
  type: isMySqlConnected ? 'MySQL' : 'Persistent Storage (Demo / Standalone)',
  connected: true,
  isMySql: isMySqlConnected
});

// Universal Database operations
export const db = {
  async getTripsByUser(userId) {
    if (isMySqlConnected) {
      try {
        const [rows] = await pool.query(
          `SELECT id, destination, title, start_date as startDate, end_date as endDate, 
                  duration_days as durationDays, travelers_count as travelersCount, 
                  total_budget as totalBudget, budget_category as budgetCategory, 
                  status, destination_image as destinationImage, created_at as createdAt 
           FROM trips WHERE user_id = ? ORDER BY created_at DESC`,
          [userId]
        );
        return rows;
      } catch (err) {
        console.error('MySQL query error, using local fallback:', err.message);
      }
    }
    const store = getStore();
    return store.trips.filter(t => t.userId === userId || userId === 'all');
  },

  async getTripById(tripId, userId = null) {
    if (isMySqlConnected) {
      try {
        const [rows] = await pool.query(
          `SELECT * FROM trips WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`,
          userId ? [tripId, userId] : [tripId]
        );
        if (rows.length > 0) {
          const trip = rows[0];
          // Get days and activities
          const [days] = await pool.query(
            `SELECT * FROM itinerary_days WHERE trip_id = ? ORDER BY day_number ASC`,
            [tripId]
          );
          for (const day of days) {
            const [acts] = await pool.query(
              `SELECT * FROM itinerary_activities WHERE day_id = ? ORDER BY order_index ASC`,
              [day.id]
            );
            day.activities = acts;
          }
          trip.days = days;
          return trip;
        }
      } catch (err) {
        console.error('MySQL fetch trip error, fallback to store:', err.message);
      }
    }
    const store = getStore();
    const trip = store.trips.find(t => t.id === tripId);
    if (!trip) return null;
    const itinerary = store.itineraries[tripId] || null;
    return { ...trip, itinerary };
  },

  async saveTrip(tripData, itineraryData) {
    const store = getStore();
    const existingIndex = store.trips.findIndex(t => t.id === tripData.id);

    if (existingIndex >= 0) {
      store.trips[existingIndex] = { ...store.trips[existingIndex], ...tripData, updatedAt: new Date().toISOString() };
    } else {
      store.trips.unshift({ ...tripData, createdAt: new Date().toISOString() });
    }

    if (itineraryData) {
      store.itineraries[tripData.id] = itineraryData;
    }
    saveStore(store);

    if (isMySqlConnected) {
      try {
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        try {
          // Ensure user exists
          await connection.query(
            `INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name=VALUES(name)`,
            [tripData.userId, 'user@tripplanner.com', 'Demo User', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80']
          );

          // Insert or update trip
          await connection.query(
            `INSERT INTO trips (id, user_id, destination, title, start_date, end_date, duration_days, travelers_count, total_budget, budget_category, status, destination_image)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title=VALUES(title), total_budget=VALUES(total_budget), status=VALUES(status)`,
            [
              tripData.id,
              tripData.userId,
              tripData.destination,
              tripData.title,
              tripData.startDate || new Date().toISOString().split('T')[0],
              tripData.endDate || new Date().toISOString().split('T')[0],
              tripData.durationDays || 4,
              tripData.travelersCount || 2,
              tripData.totalBudget || 15000,
              tripData.budgetCategory || 'Moderate',
              tripData.status || 'Upcoming',
              tripData.destinationImage || ''
            ]
          );

          await connection.commit();
        } catch (txErr) {
          await connection.rollback();
          console.error('MySQL transaction error:', txErr.message);
        } finally {
          connection.release();
        }
      } catch (sqlErr) {
        console.error('MySQL save error:', sqlErr.message);
      }
    }

    return tripData;
  },

  async deleteTrip(tripId, userId) {
    const store = getStore();
    const initialLen = store.trips.length;
    store.trips = store.trips.filter(t => t.id !== tripId || (userId && t.userId !== userId));
    delete store.itineraries[tripId];
    saveStore(store);

    if (isMySqlConnected) {
      try {
        await pool.query(`DELETE FROM trips WHERE id = ? ${userId ? 'AND user_id = ?' : ''}`, 
          userId ? [tripId, userId] : [tripId]
        );
      } catch (err) {
        console.error('MySQL delete error:', err.message);
      }
    }

    return store.trips.length < initialLen;
  },

  async updateTrip(tripId, updateData, userId = null) {
    const store = getStore();
    const trip = store.trips.find(t => t.id === tripId && (!userId || t.userId === userId));
    if (!trip) return null;

    Object.assign(trip, updateData, { updatedAt: new Date().toISOString() });
    saveStore(store);

    if (isMySqlConnected) {
      try {
        const fields = [];
        const values = [];
        if (updateData.title) { fields.push('title = ?'); values.push(updateData.title); }
        if (updateData.status) { fields.push('status = ?'); values.push(updateData.status); }
        if (updateData.totalBudget) { fields.push('total_budget = ?'); values.push(updateData.totalBudget); }

        if (fields.length > 0) {
          values.push(tripId);
          await pool.query(`UPDATE trips SET ${fields.join(', ')} WHERE id = ?`, values);
        }
      } catch (err) {
        console.error('MySQL update error:', err.message);
      }
    }

    return trip;
  }
};

export default db;
