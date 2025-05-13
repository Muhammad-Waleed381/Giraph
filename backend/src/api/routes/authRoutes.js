import express from 'express';
import passport from '../../config/passport.js';
import {
    signup,
    login,
    getCurrentUser,
    logout,
    googleAuthRedirect,
    googleAuthCallback,
    postGoogleAuth,
    verifyEmail
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// --- Standard Auth Routes ---
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, getCurrentUser);

// Email verification route
router.get('/verify-email/:token', verifyEmail);

// --- Google OAuth Routes ---

// 1. Initiate Google OAuth flow
router.get('/google', googleAuthRedirect(passport));

// 2. Google OAuth Callback
router.get('/google/callback',
    googleAuthCallback(passport),
    postGoogleAuth
);

export default router;
