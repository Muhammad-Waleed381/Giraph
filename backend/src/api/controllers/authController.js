import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../../config/database.js';
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import {
    signupUser as signupUserService,
    loginUser as loginUserService,
    generateTokenForOAuthUser,
    getUserById as getUserByIdService,
    verifyUserEmail as verifyUserEmailService
} from '../../services/authService.js';
import dotenv from 'dotenv'; // Import dotenv

dotenv.config(); // Load .env variables

// Basic email validation regex
const emailRegex = /^\S+@\S+\.\S+$/;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Get frontend URL
const JWT_COOKIE_NAME = process.env.JWT_COOKIE_NAME || 'jwt_token';
const BACKEND_URL = process.env.BACKEND_APP_URL || 'http://localhost:3001'; // Define BACKEND_URL

// --- Signup Controller ---
export const signup = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json(responseFormatter.error('First name, last name, email, and password are required', 400));
    }
    if (!emailRegex.test(email)) {
        return res.status(400).json(responseFormatter.error('Please use a valid email address.', 400));
    }
    if (password.length < 6) {
        return res.status(400).json(responseFormatter.error('Password must be at least 6 characters long', 400));
    }

    // signupUserService now handles sending the email AND returns the link
    const { user, verificationLink } = await signupUserService({ first_name, last_name, email, password });

    logger.info(`Signup for ${email} successful. Verification link for testing: ${verificationLink}`);
    
    res.status(201).json(responseFormatter.success(
        { 
            user,
            message: 'Signup successful. Please check your email to verify your account. For testing, the verification link is also provided below.',
            verificationLink // Including the link in the response for easier testing
        },
         'Signup successful. Please verify your email.'
    ));

  } catch (error) {
    logger.error('Error during user signup:', error.message);
    if (error.message.includes('User with this email already exists')) {
        return res.status(409).json(responseFormatter.error(error.message, 409));
    }
    // Ensure the custom message from responseFormatter is used.
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Server error during signup';
    res.status(statusCode).json(responseFormatter.error(message, statusCode));
  }
};

// --- Login Controller ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(responseFormatter.error('Email and password are required', 400));
    }
     if (!emailRegex.test(email)) {
        return res.status(400).json(responseFormatter.error('Please provide a valid email address.', 400));
    }

    const { token, user } = await loginUserService(email, password);

    res.cookie(JWT_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });

    res.status(200).json(responseFormatter.success({ user }, 'Login successful'));

  } catch (error) {
    logger.error('Error during user login:', error.message);
    if (error.message === 'Invalid email or password.' || error.message.includes('registered via an external provider')) {
      return res.status(401).json(responseFormatter.error(error.message, 401));
    }
    res.status(500).json(responseFormatter.error('Server error during login', 500));
  }
};

// --- Get Current Authenticated User (/me) ---
export const getCurrentUser = async (req, res) => {
  // The authenticateToken middleware (which should be applied to this route)
  // will attach user payload from JWT to req.auth.userId (or similar based on middleware setup)
  try {
    if (!req.auth || !req.auth.userId) {
        logger.warn('getCurrentUser called without authenticated user on request object.');
        return res.status(401).json(responseFormatter.error('Not authenticated or user ID missing from token', 401));
    }

    const user = await getUserByIdService(req.auth.userId);
    if (!user) {
        logger.warn(`User with ID ${req.auth.userId} not found, but token was valid.`);
        return res.status(404).json(responseFormatter.error('User not found', 404));
    }

    logger.info(`Current user data requested for user ID: ${req.auth.userId}`);
    res.status(200).json(responseFormatter.success(user, 'Current user data retrieved successfully'));

  } catch (error) {
    logger.error('Error retrieving current user data:', error);
    res.status(500).json(responseFormatter.error('Server error retrieving user data', 500));
  }
};

// --- Logout Controller ---
export const logout = async (req, res) => {
  try {
    const username = req.auth ? req.auth.email : 'Unknown user'; // Assuming email is in req.auth
    logger.info(`Logout request received for user: ${username}`);

    res.clearCookie(JWT_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });

    res.status(200).json(responseFormatter.success(null, 'Logout successful. Session cookie cleared.'));
  } catch (error) {
    logger.error('Error during user logout:', error);
    res.status(500).json(responseFormatter.error('Server error during logout', 500));
  }
};

// --- Email Verification Controller ---
export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json(responseFormatter.error('Verification token is required.', 400));
        }

        await verifyUserEmailService(token);
        
        // Redirect to a frontend page indicating success
        // In a real app, you might redirect to login or a specific "verified" page
        // For now, just a success message and redirect to login with a success query param
        logger.info(`Email verification successful for token: ${token}`);
        res.redirect(`${FRONTEND_URL}/login?verified=true`);

    } catch (error) {
        logger.error('Error during email verification:', error.message);
        // Redirect to a frontend page indicating failure
        if (error.message === 'Invalid or expired verification token.') {
            return res.redirect(`${FRONTEND_URL}/login?verified=false&error=invalid_token`);
        }
        // Generic error page or message
        res.redirect(`${FRONTEND_URL}/login?verified=false&error=verification_failed`);
    }
};

// --- Google OAuth Handlers ---
export const googleAuthRedirect = (passport) => {
    return passport.authenticate('google', { scope: ['profile', 'email'], session: false });
};

export const googleAuthCallback = (passport) => {
    // `session: false` because we are using JWTs and not server-side sessions with Passport.
    // Passport will verify the Google user and, if successful, attach `req.user` for the next middleware.
    return passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`, session: false });
};

export const postGoogleAuth = async (req, res) => {
    if (!req.user) {
        logger.error('Google auth callback succeeded but req.user is missing.');
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_failed_user_missing`);
    }

    try {
        const userFromPassport = req.user; // User object from User.findOrCreate
        
        // Update last login for this user
        const userModel = await (await import('../../models/User.js')).default.getInstance();
        await userModel.updateLastLogin(userFromPassport._id);

        const token = generateTokenForOAuthUser(userFromPassport);

        logger.info(`JWT generated successfully for Google user: ${userFromPassport.email}`);
        
        res.cookie(JWT_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        // Redirect to a frontend page that handles successful social login
        // This page can then fetch user details or simply acknowledge success
        res.redirect(`${FRONTEND_URL}/dashboard?source=google_login`); 

    } catch (error) {
        logger.error('Error processing Google authentication and generating token:', error);
        res.redirect(`${FRONTEND_URL}/login?error=google_auth_processing_failed`);
    }
};
