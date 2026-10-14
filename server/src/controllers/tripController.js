import { v4 as uuidv4 } from 'uuid';
import { generateItinerary } from '../services/aiService.js';
import db from '../config/db.js';

export const tripController = {
  // POST /api/trips/generate
  async generate(req, res, next) {
    try {
      const {
        destination,
        startDate,
        endDate,
        durationDays,
        totalBudget,
        budgetCategory,
        travelersCount,
        interests,
        travelStyle,
        accommodationType,
        dietaryPreference,
        specialNotes
      } = req.body;

      if (!destination || !destination.trim()) {
        return res.status(400).json({ success: false, error: 'Destination is required.' });
      }

      // Calculate duration if dates provided
      let calculatedDuration = durationDays;
      if (startDate && endDate && !durationDays) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        calculatedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
      calculatedDuration = Math.min(Math.max(parseInt(calculatedDuration || 3, 10), 1), 14);

      const validatedPreferences = {
        destination: destination.trim(),
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || null,
        durationDays: calculatedDuration,
        totalBudget: Math.max(parseInt(totalBudget || 15000, 10), 1000),
        budgetCategory: budgetCategory || 'Moderate',
        travelersCount: Math.max(parseInt(travelersCount || 2, 10), 1),
        interests: Array.isArray(interests) ? interests : ['Nature & Outdoors', 'Food & Cuisine'],
        travelStyle: travelStyle || 'Balanced',
        accommodationType: accommodationType || 'Mid-Range Hotel',
        dietaryPreference: dietaryPreference || 'No Restrictions',
        specialNotes: specialNotes || ''
      };

      const itinerary = await generateItinerary(validatedPreferences);

      return res.status(200).json({
        success: true,
        data: itinerary,
        preferences: validatedPreferences
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/trips (Save trip)
  async save(req, res, next) {
    try {
      const userId = req.auth ? req.auth.userId : 'user_demo_123';
      const { tripData, itinerary } = req.body;

      if (!tripData || !tripData.destination) {
        return res.status(400).json({ success: false, error: 'Trip data and destination are required.' });
      }

      const tripId = tripData.id || `trip_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const newTrip = {
        id: tripId,
        userId,
        destination: tripData.destination,
        title: tripData.title || `${tripData.destination} Trip`,
        startDate: tripData.startDate || new Date().toISOString().split('T')[0],
        endDate: tripData.endDate || null,
        durationDays: tripData.durationDays || (itinerary?.days?.length || 4),
        travelersCount: tripData.travelersCount || 2,
        totalBudget: tripData.totalBudget || itinerary?.budgetBreakdown?.totalEstimated || 15000,
        budgetCategory: tripData.budgetCategory || 'Moderate',
        status: tripData.status || 'Upcoming',
        destinationImage: tripData.destinationImage || itinerary?.destinationImage || 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80'
      };

      await db.saveTrip(newTrip, itinerary);

      return res.status(201).json({
        success: true,
        message: 'Trip saved successfully',
        data: newTrip
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/trips
  async getAll(req, res, next) {
    try {
      const userId = req.auth ? req.auth.userId : 'user_demo_123';
      const trips = await db.getTripsByUser(userId);
      return res.status(200).json({
        success: true,
        count: trips.length,
        data: trips
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/trips/:id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.auth ? req.auth.userId : null;
      const trip = await db.getTripById(id, userId);

      if (!trip) {
        return res.status(404).json({ success: false, error: 'Trip not found.' });
      }

      return res.status(200).json({
        success: true,
        data: trip
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/trips/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.auth ? req.auth.userId : 'user_demo_123';
      const updateData = req.body;

      const updated = await db.updateTrip(id, updateData, userId);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Trip updated successfully',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/trips/:id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.auth ? req.auth.userId : 'user_demo_123';

      const deleted = await db.deleteTrip(id, userId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Trip not found or unauthorized.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Trip deleted successfully'
      });
    } catch (err) {
      next(err);
    }
  }
};
