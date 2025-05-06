import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb'; // Import ObjectId
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import { getDatabase } from '../../config/database.js';

// Assume JWT_SECRET is stored in environment variables for security
// Ensure the default fallback key matches the one used for signing in authService.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-development-secret-key'; // Use a strong, environment-specific secret!

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    logger.warn('Authentication attempt failed: No token provided');
    return res.status(401).json(responseFormatter.error('Authentication required: No token provided', 401)); // Unauthorized
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Optional: Verify user still exists in DB (more secure)
    const db = getDatabase();
    const usersCollection = db.collection('users');

    // Convert the userId string from the token back to an ObjectId for the query
    let userIdObject;
    try {
        userIdObject = new ObjectId(decoded.userId);
    } catch (e) {
        logger.warn(`Authentication failed: Invalid ObjectId format in token: ${decoded.userId}`);
        return res.status(401).json(responseFormatter.error('Authentication failed: Invalid user identifier in token', 401));
    }

    const user = await usersCollection.findOne({ _id: userIdObject }); // Use the ObjectId

    if (!user) {
        // Log the ObjectId string that was searched for
        logger.warn(`Authentication failed: User ID ${decoded.userId} (ObjectId: ${userIdObject.toHexString()}) from token not found`);
        return res.status(401).json(responseFormatter.error('Authentication failed: User not found', 401));
    }

    // Attach user info (excluding password) to the request object
    req.user = {
        _id: user._id,
        username: user.username,
        email: user.email,
        // Add any other non-sensitive fields you want accessible
    };
    logger.info(`User authenticated: ${req.user.username}`);
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
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
