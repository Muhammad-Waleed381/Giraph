import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb'; // Import ObjectId
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import { getDatabase } from '../../config/database.js';

// Assume JWT_SECRET is stored in environment variables for security
// Ensure the default fallback key matches the one used for signing in authService.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-development-secret-key'; // Use a strong, environment-specific secret!

export const authenticateToken = async (req, res, next) => {
  // Log incoming request details for /api/auth/session
  if (req.path === '/session') { // Only log verbosely for the session check endpoint initially
    logger.debug(`[AuthToken /session] Request received. Path: ${req.path}`);
    logger.debug(`[AuthToken /session] Headers: ${JSON.stringify(req.headers)}`);
    logger.debug(`[AuthToken /session] Cookies: ${JSON.stringify(req.cookies)}`);
  }

  let token = null;

  // 1. Try to get token from HttpOnly cookie first
  if (req.cookies && req.cookies.jwt_token) {
    token = req.cookies.jwt_token;
    if (req.path === '/session') logger.info('[AuthToken /session] Token found in cookie.');
  } else {
    if (req.path === '/session') logger.warn('[AuthToken /session] Token NOT found in cookie.');
    // 2. If not in cookie, try to get token from Authorization header (for other auth methods or direct API calls)
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
        if (req.path === '/session') logger.info('[AuthToken /session] Token found in Authorization header.');
      }
    }
  }

  if (token == null) {
    if (req.path === '/session') logger.warn('[AuthToken /session] Authentication attempt failed: No token provided.');
    logger.warn('Authentication attempt failed: No token provided in cookie or Authorization header');
    return res.status(401).json(responseFormatter.error('Authentication required: No token provided', 401)); // Unauthorized
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (req.path === '/session') logger.info(`[AuthToken /session] Token decoded. User ID from token: ${decoded.userId}`);

    // Optional: Verify user still exists in DB (more secure)
    const db = getDatabase();
    const usersCollection = db.collection('users');

    // Convert the userId string from the token back to an ObjectId for the query
    let userIdObject;
    try {
        userIdObject = new ObjectId(decoded.userId);
    } catch (e) {
        logger.error(`[AuthToken] Authentication failed: Invalid ObjectId format in token: ${decoded.userId}`, e);
        logger.warn(`Authentication failed: Invalid ObjectId format in token: ${decoded.userId}`);
        return res.status(401).json(responseFormatter.error('Authentication failed: Invalid user identifier in token', 401));
    }

    const user = await usersCollection.findOne({ _id: userIdObject }); // Use the ObjectId

    if (!user) {
        if (req.path === '/session') logger.warn(`[AuthToken /session] User not found in DB for ID: ${decoded.userId} (ObjectId: ${userIdObject.toHexString()})`);
        // Log the ObjectId string that was searched for
        logger.warn(`Authentication failed: User ID ${decoded.userId} (ObjectId: ${userIdObject.toHexString()}) from token not found`);
        return res.status(401).json(responseFormatter.error('Authentication failed: User not found', 401));
    }

    if (req.path === '/session') logger.info(`[AuthToken /session] User found in DB: ${user.username}, ID: ${user._id.toHexString()}`);
    // Attach user info (excluding password) to the request object
    req.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        // Add any other non-sensitive fields you want accessible
    };
    // logger.info(`User authenticated: ${req.user.username}`); // General log, can be noisy
    logger.info(`User authenticated: ${req.user.username}`);
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    logger.error('[AuthToken] Token verification or DB lookup failed:', err);
    // Log the full error object for better debugging
    logger.error('Token verification failed:', err);
    if (err.name === 'TokenExpiredError') {
        // Pass error details to the formatter
        return res.status(401).json(responseFormatter.error('Authentication failed: Token expired', 401, { errorName: err.name, message: err.message }));
    }
    if (err.name === 'JsonWebTokenError') {
        // Pass error details to the formatter
        return res.status(403).json(responseFormatter.error('Authentication failed: Invalid token', 403, { errorName: err.name, message: err.message })); // Forbidden
    }
    // General server error during token verification
    // Pass error details to the formatter
    return res.status(500).json(responseFormatter.error('Server error during authentication', 500, { errorName: err.name, message: err.message }));
  }
};
