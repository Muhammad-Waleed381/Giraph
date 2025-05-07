import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database.js';
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import {
    signupUser,
    loginUser,
    findOrCreateGoogleUser,
    verifyUserEmail // Import the new service function
} from '../../services/authService.js';
import dotenv from 'dotenv'; // Import dotenv

dotenv.config(); // Load .env variables

// Basic email validation regex
const emailRegex = /^\S+@\S+\.\S+$/;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Get frontend URL

// --- Signup Controller (Direct Signup) ---
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // --- Input Validation ---
    if (!username || !email || !password) {
      return res.status(400).json(responseFormatter.error('Username, email, and password are required', 400));
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json(responseFormatter.error('Please use a valid email address.', 400));
    }
    if (password.length < 6) {
        return res.status(400).json(responseFormatter.error('Password must be at least 6 characters long', 400));
    }

    // --- Call Signup Service ---
    // Service now handles sending verification email
    const user = await signupUser(username, email, password);

    logger.info(`Signup initiated for ${email}. Verification email sent.`);
    // Return success message - user needs to verify email
    res.status(201).json(responseFormatter.success(user, 'Signup successful. Please check your email to verify your account.'));

  } catch (error) {
    logger.error('Error during user signup:', error.message);
    // Handle specific errors from the service (e.g., user exists)
    if (error.message.includes('already exists') || error.message === 'Email already registered' || error.message === 'Username already taken') {
        return res.status(409).json(responseFormatter.error(error.message, 409)); // Conflict
    }
    // General server error
    res.status(500).json(responseFormatter.error(error.message || 'Server error during signup', 500));
  }
};

// --- Login Controller ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Input Validation ---
    if (!email || !password) {
      return res.status(400).json(responseFormatter.error('Email and password are required', 400));
    }
     if (!emailRegex.test(email)) {
        return res.status(400).json(responseFormatter.error('Please provide a valid email address.', 400));
    }

    // --- Authenticate User using AuthService ---
    // loginUser service now checks for verification
    const { token, user } = await loginUser(email, password);

    // --- Send Response ---
    res.status(200).json(responseFormatter.success({ token, user }, 'Login successful'));

  } catch (error) {
    logger.error('Error during user login:', error.message);
    // Handle specific errors like invalid credentials or unverified email
    if (error.message === 'Invalid email or password' || error.message === 'Email not verified. Please check your inbox for the verification link.') {
      // Use 401 for invalid credentials, maybe 403 Forbidden for unverified? Let's use 401 for simplicity.
      return res.status(401).json(responseFormatter.error(error.message, 401)); // Unauthorized
    }
    // General server error
    res.status(500).json(responseFormatter.error('Server error during login', 500));
  }
};

// --- Email Verification Controller ---
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            // Although route defines token, check just in case
             return res.status(400).redirect(`${FRONTEND_URL}/login?error=Verification token missing.`);
            // return res.status(400).json(responseFormatter.error('Verification token is required.', 400));
        }

        const success = await verifyUserEmail(token);

        if (success) {
            logger.info(`Email verification successful for token: ${token}`);
            // Redirect to frontend login page with a success message
            res.redirect(`${FRONTEND_URL}/login?verified=true`);
        } else {
            logger.warn(`Email verification failed for token: ${token}`);
            // Redirect to frontend login page or a specific error page with a failure message
             res.status(400).redirect(`${FRONTEND_URL}/login?error=Invalid or expired verification link.`);
            // return res.status(400).json(responseFormatter.error('Invalid or expired verification link.', 400));
        }
    } catch (error) {
        logger.error('Error during email verification process:', error);
         res.status(500).redirect(`${FRONTEND_URL}/login?error=Server error during verification.`);
        // res.status(500).json(responseFormatter.error('Server error during email verification.', 500));
    }
};


// --- Get Session Status Controller ---
export const getSessionStatus = async (req, res) => {
  // The authenticateToken middleware already verified the token
  // and attached the user object (without password) to req.user
  try {
    // req.user should contain the authenticated user's data
    if (!req.user) {
        // This case should ideally be caught by the middleware, but added as a safeguard
        logger.warn('getSessionStatus called without authenticated user on request object.');
        return res.status(401).json(responseFormatter.error('Not authenticated', 401));
    }

    logger.info(`Session status requested for user: ${req.user.username}`);
    // Return the user information attached by the middleware
    res.status(200).json(responseFormatter.success(req.user, 'Session valid, user data retrieved'));

  } catch (error) {
    logger.error('Error retrieving session status:', error);
    res.status(500).json(responseFormatter.error('Server error retrieving session status', 500));
  }
};

// --- Logout Controller ---
export const logout = async (req, res) => {
  try {
    const username = req.user ? req.user.username : 'Unknown user';
    logger.info(`Logout request received for user: ${username}`);

    // Clear the HttpOnly cookie
    res.clearCookie('jwt_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Match secure flag with cookie setting
        sameSite: 'lax', // Match sameSite with cookie setting
        path: '/' // Match path with cookie setting
    });

    res.status(200).json(responseFormatter.success(null, 'Logout successful. Session cookie cleared.'));
  } catch (error) {
    logger.error('Error during user logout:', error);
    // Even if there's an error, attempt to clear the cookie if possible, 
    // though the error might prevent headers from being sent.
    // For safety, the client should also clear its state.
    res.status(500).json(responseFormatter.error('Server error during logout', 500));
  }
};

// --- Google OAuth Handlers (Keep existing or adapt as needed) ---

/**
 * Redirects the user to Google for authentication.
 * Typically called when the user clicks a "Sign in with Google" button.
 */
export const googleAuthRedirect = (passport) => {
    // The 'google' strategy name must match the one configured in passport.js
    return passport.authenticate('google', { scope: ['profile', 'email'] });
};

/**
 * Handles the callback from Google after successful authentication.
 * Google redirects the user back to this endpoint.
 */
export const googleAuthCallback = (passport) => {
    return passport.authenticate('google', { failureRedirect: '/login', session: false }); // Use session: false for JWT
};

/**
 * Post-Google authentication logic.
 * This middleware runs after googleAuthCallback successfully authenticates.
 * It generates a JWT for the authenticated user.
 */
export const postGoogleAuth = async (req, res) => {
    // Passport attaches the user object to req.user after successful authentication
    if (!req.user) {
        logger.error('Google auth callback succeeded but req.user is missing.');
        // Redirect to frontend login with an error query parameter
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed`);
    }

    try {
        // req.user should contain the user profile found or created by findOrCreateGoogleUser
        const user = req.user;

        // Generate JWT token for the Google-authenticated user
        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email
            // Add other relevant claims
        };

        const JWT_SECRET = process.env.JWT_SECRET || 'your-default-development-secret-key';
        const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h'; // e.g., '1h', '7d'
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        logger.info(`JWT generated successfully for Google user: ${user.username}`);

        // Set HttpOnly cookie
        // Ensure JWT_EXPIRATION is in a format that can be converted to milliseconds for maxAge
        let maxAgeMs;
        if (JWT_EXPIRATION.endsWith('h')) {
            maxAgeMs = parseInt(JWT_EXPIRATION, 10) * 60 * 60 * 1000;
        } else if (JWT_EXPIRATION.endsWith('d')) {
            maxAgeMs = parseInt(JWT_EXPIRATION, 10) * 24 * 60 * 60 * 1000;
        } else {
            maxAgeMs = 60 * 60 * 1000; // Default to 1 hour if format is unknown
        }
        
        res.cookie('jwt_token', token, { // Using 'jwt_token' as the cookie name
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
            sameSite: 'lax', // 'lax' is generally recommended for OAuth callbacks
            maxAge: maxAgeMs, 
            path: '/' // Cookie accessible for all paths
        });

        // Redirect user to a specific frontend page that will handle the session
        res.redirect(`${FRONTEND_URL}/auth/social-success`);

    } catch (error) {
        logger.error('Error processing Google authentication and setting cookie:', error);
        // Redirect to frontend login with an error query parameter
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_processing_failed`);
    }
};
