import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import {
    signup,
    login,
    getSessionStatus,
    logout,
    googleAuthRedirect,
    googleAuthCallback,
    postGoogleAuth,
    verifyEmail // Import the new controller
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authenticateToken.js'; // Corrected filename
import { responseFormatter } from '../../utils/responseFormatter.js';
import { logger } from '../../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-development-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // URL to redirect after successful Google login

// --- Standard Auth Routes ---
router.post('/signup', signup); // Use the updated signup controller
router.post('/login', login);                 // Existing login route (now checks verification)
router.get('/verify-email/:token', verifyEmail); // Add email verification route
router.get('/status', authenticateToken, getSessionStatus);
router.post('/logout', authenticateToken, logout);

// --- Google OAuth Routes ---

// 1. Initiate Google OAuth flow
router.get('/google', googleAuthRedirect(passport));

// 2. Google OAuth Callback
router.get('/google/callback',
    googleAuthCallback(passport), // Authenticates using the 'google' strategy
    postGoogleAuth                // Generates JWT and sends response after successful Google auth
);

export default router;
