import { getReachOptions } from '../services/reachService.js';
import { getTripWeather } from '../services/weatherService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** Part 11 — weather for the trip dates and how to get there. */
export const travelController = {
  // GET /api/travel/weather?destination=&start=&end=&lat=&lng=
  weather: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await getTripWeather(req.validQuery) });
  }),

  // GET /api/travel/reach?from=&to=&date=&travelers=
  reach: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await getReachOptions(req.validQuery) });
  }),
};
