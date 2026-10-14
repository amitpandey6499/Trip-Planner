import { getDbStatus } from '../config/db.js';

export const userController = {
  // GET /api/user/profile
  getProfile(req, res) {
    const userId = req.auth ? req.auth.userId : 'user_demo_123';
    return res.status(200).json({
      success: true,
      data: {
        id: userId,
        name: 'Aarav Sharma',
        email: 'demo@tripplanner.com',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        joinedDate: 'October 2026',
        preferredPace: 'Balanced',
        dietary: 'Vegetarian Friendly',
        collegeProject: {
          institution: 'ABES Institute of Technology (ABESIT), Ghaziabad',
          session: '2026-27',
          projectName: 'TripPlanner — AI-Powered Smart Trip Planner'
        }
      }
    });
  },

  // GET /api/system/status
  getStatus(req, res) {
    return res.status(200).json({
      success: true,
      status: 'operational',
      database: getDbStatus(),
      services: {
        geminiAI: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key'),
        clerkAuth: !!(process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith('sk_')),
        googlePlaces: !!(process.env.GOOGLE_PLACES_API_KEY && process.env.GOOGLE_PLACES_API_KEY !== 'your_google_places_api_key'),
        arcjetSecurity: !!process.env.ARCJET_KEY
      },
      academicSession: '2026-27'
    });
  }
};
