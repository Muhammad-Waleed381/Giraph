import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDatabase } from './database.js';
import { logger } from '../utils/logger.js';
import * as authService from '../services/authService.js'; // Assuming authService will handle user creation/finding

// --- Basic User Serialization/Deserialization (Adapt if using sessions extensively) ---
// For JWT-based auth, these might be less critical if you don't rely on sessions
passport.serializeUser((user, done) => {
  // Serialize user ID or a minimal representation
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = getDatabase();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: id }, { projection: { password: 0 } }); // Exclude password
    done(null, user); // Attach user object (without password) to req.user
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error, null);
  }
});


// --- Google OAuth 2.0 Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, // Make sure these are in your .env file
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback', // Ensure this matches your Google Cloud Console setup and proxy settings if applicable
    scope: ['profile', 'email'], // Request user's profile and email
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // profile contains user information from Google (id, displayName, emails, photos, etc.)
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      const googleId = profile.id;
      const displayName = profile.displayName;
      const firstName = profile.name && profile.name.givenName ? profile.name.givenName : '';
      const lastName = profile.name && profile.name.familyName ? profile.name.familyName : '';
      // const profilePic = profile.photos && profile.photos[0] ? profile.photos[0].value : null; // Optional

      if (!email) {
        logger.warn('Google profile did not return an email.');
        return done(new Error('Email not provided by Google'), null);
      }

      // Find or create user in your database
      const user = await authService.findOrCreateGoogleUser({
        googleId,
        email,
        username: displayName || email.split('@')[0], // Use display name or derive from email
        firstName,
        lastName,
        // profilePic // Optional
      });

      if (!user) {
          logger.error(`Failed to find or create user for Google ID: ${googleId}`);
          return done(new Error('Could not process Google login'), null);
      }

      logger.info(`User authenticated via Google: ${user.username} (ID: ${user._id})`);
      return done(null, user); // Pass the user object to Passport

    } catch (error) {
      logger.error('Error during Google OAuth strategy execution:', error);
      return done(error, null);
    }
  }
));

export default passport;