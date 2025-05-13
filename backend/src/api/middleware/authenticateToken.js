import jwt from 'jsonwebtoken';
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import User from '../../models/User.js'; // Import User model
import dotenv from 'dotenv'; // Import dotenv for environment variable configuration

dotenv.config(); // Ensure environment variables are loaded

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-dev-secret-key-make-sure-this-is-strong'; 
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'jwt_token';

export const authenticateToken = async (req, res, next) => {
  let token = null;

  // 1. Try to get token from HttpOnly cookie
  if (req.cookies && req.cookies[JWT_COOKIE_NAME]) {
    token = req.cookies[JWT_COOKIE_NAME];
    logger.debug('[AuthToken] Token found in cookie.');
  } else {
    // 2. Fallback: Try to get token from Authorization header (e.g., for testing or non-browser clients)
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
        logger.debug('[AuthToken] Token found in Authorization header.');
      } else {
        logger.warn('[AuthToken] Authorization header found but not in Bearer format.');
      }
    } else {
        logger.debug('[AuthToken] Token NOT found in cookie or Authorization header.');
    }
  }

  if (token == null) {
    logger.warn('Authentication attempt failed: No token provided.');
    return res.status(401).json(responseFormatter.error('Authentication required: No token provided', 401));
  }

  try {
    const decodedPayload = jwt.verify(token, JWT_SECRET);
    logger.debug(`[AuthToken] Token decoded. User ID from token: ${decodedPayload.userId}`);

    // Attach the raw decoded payload to req.auth for now.
    // The route controller (e.g., getCurrentUser) can then fetch full user details if needed.
    // This avoids a DB call in the middleware for every authenticated request if only userId is needed.
    req.auth = decodedPayload; // Contains userId, email, first_name from token payload
    
    // Optional: If you need to ensure the user still exists in DB for every request, uncomment below
    /*
    const userModel = await User.getInstance();
    const user = await userModel.findById(decodedPayload.userId);
    if (!user) {
        logger.warn(`[AuthToken] User ID ${decodedPayload.userId} from token not found in DB.`);
        return res.status(401).json(responseFormatter.error('Authentication failed: User from token not found', 401));
    }
    // If fetching user, you might attach a sanitized user object to req.user
    // delete user.password_hash;
    // req.user = user;
    */

    logger.info(`User authenticated via token: ${decodedPayload.email} (ID: ${decodedPayload.userId})`);
    next();
  } catch (err) {
    logger.error('[AuthToken] Token verification failed:', err);
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(responseFormatter.error('Authentication failed: Token expired', 401, { errorName: err.name, message: err.message }));
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(responseFormatter.error('Authentication failed: Invalid token', 401, { errorName: err.name, message: err.message })); // Changed to 401 from 403 for consistency
    }
    return res.status(500).json(responseFormatter.error('Server error during authentication', 500, { errorName: err.name, message: err.message }));
  }
};

// Helper for dotenv
function dotenvConfig() { 
    const dotenv = require('dotenv');
    dotenv.config();
}
