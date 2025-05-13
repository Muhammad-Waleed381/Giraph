import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js'; // Import the User model
import { logger } from '../utils/logger.js';
// Removed: import { getDatabase } from './database.js';
// Removed: import * as authService from '../services/authService.js'; // Will use User model directly or via a lean service layer

// --- Basic User Serialization/Deserialization ---
passport.serializeUser((user, done) => {
  done(null, user._id); // Serialize user by their MongoDB ObjectId
});

passport.deserializeUser(async (id, done) => {
  try {
    const userModel = await User.getInstance(); // Get an instance of User model
    const user = await userModel.findById(id);
    if (user && user.password_hash) {
        delete user.password_hash; // Ensure password hash is not exposed
    }
    done(null, user); // Attach user object (without password_hash) to req.user
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error, null);
  }
});


// --- Google OAuth 2.0 Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    scope: ['profile', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userModel = await User.getInstance(); // Get an instance of User model
      
      // The User model's findOrCreate method is designed to handle this logic
      const user = await userModel.findOrCreate(profile, { accessToken, refreshToken });

      if (!user) {
          logger.error(`Failed to find or create user via Google for profile ID: ${profile.id}`);
          return done(new Error('Could not process Google login. User not found or created.'), null);
      }

      logger.info(`User authenticated/retrieved via Google: ${user.email} (ID: ${user._id})`);
      return done(null, user); // Pass the user object to Passport

    } catch (error) {
      logger.error('Error during Google OAuth strategy execution:', error);
      return done(error, null);
    }
  }
));

export default passport;