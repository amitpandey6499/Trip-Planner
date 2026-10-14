import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

const isClerkConfigured = !!(process.env.CLERK_SECRET_KEY && process.env.CLERK_SECRET_KEY.startsWith('sk_'));

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Check for custom Demo token or when Clerk is not yet configured with valid key
  if (authHeader && authHeader.startsWith('Bearer demo_')) {
    req.auth = {
      userId: 'user_demo_123',
      sessionId: 'demo_session',
      email: 'demo@tripplanner.com',
      isDemo: true
    };
    return next();
  }

  // If client passes x-demo-user header
  if (req.headers['x-demo-user'] === 'true' || !isClerkConfigured) {
    // Graceful fallback for local evaluation / presentation
    const userId = req.headers['x-user-id'] || 'user_demo_123';
    req.auth = {
      userId,
      email: req.headers['x-user-email'] || 'demo@tripplanner.com',
      isDemo: true
    };
    return next();
  }

  // Use Clerk Express Require Auth
  try {
    return ClerkExpressRequireAuth()(req, res, next);
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired authentication token.'
    });
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer demo_')) {
    req.auth = {
      userId: 'user_demo_123',
      email: 'demo@tripplanner.com',
      isDemo: true
    };
    return next();
  }

  if (isClerkConfigured) {
    try {
      return ClerkExpressWithAuth()(req, res, next);
    } catch (e) {
      // Ignore if not authenticated
    }
  }

  // Fallback default
  req.auth = {
    userId: req.headers['x-user-id'] || 'user_demo_123',
    email: 'demo@tripplanner.com',
    isDemo: true
  };
  return next();
};
