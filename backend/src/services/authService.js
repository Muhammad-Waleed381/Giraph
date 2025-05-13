import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Import crypto
import User from '../models/User.js'; // Import the User model
import { logger } from '../utils/logger.js';
import { sendVerificationEmail } from '../utils/emailService.js'; // Import email service
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.warn('JWT_SECRET environment variable is not set. Using a default secret. Set a strong secret in production!');
}
const SECRET_KEY = JWT_SECRET || 'your-default-dev-secret-key-make-sure-this-is-strong';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '7d'; // Extended for dev convenience, adjust for prod

/**
 * Registers a new user.
 * @param {object} userData - Contains first_name, last_name, email, password.
 * @returns {Promise<{token: string, user: object}>} - JWT token and created user details (excluding password_hash).
 * @throws {Error} If registration fails (e.g., email exists).
 */
export const signupUser = async (userData) => {
    const userModel = await User.getInstance();
    try {
        const { first_name, last_name, email, password } = userData;
        if (!first_name || !last_name || !email || !password) {
            throw new Error('First name, last name, email, and password are required.');
        }

        const email_verification_token = crypto.randomBytes(32).toString('hex');
        const email_verification_token_expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const newUser = await userModel.create({
            first_name,
            last_name,
            email,
            password, // The model will hash this
            auth_provider: 'local',
            is_email_verified: false,
            email_verification_token,
            email_verification_token_expires_at
        });

        // Construct verification link to be returned and used in email
        const verificationLink = `${process.env.BACKEND_APP_URL || 'http://localhost:3001'}/api/auth/verify-email/${email_verification_token}`;

        try {
            await sendVerificationEmail(newUser.email, email_verification_token); // sendVerificationEmail constructs the link internally now
            logger.info(`Verification email sent to ${newUser.email}`);
        } catch (emailError) {
            logger.error(`Failed to send verification email to ${newUser.email}:`, emailError.message);
        }

        logger.info(`User signed up: ${newUser.email}. Verification token generated.`);
        // Return user and the full verificationLink for the controller
        return { user: newUser, verificationLink: verificationLink }; 

    } catch (error) {
        logger.error(`Signup error for email ${userData.email}:`, error.message);
        throw error; 
    }
};

/**
 * Authenticates a user by email and password.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<{token: string, user: object}>} - JWT token and user details.
 * @throws {Error} If authentication fails.
 */
export const loginUser = async (email, password) => {
    const userModel = await User.getInstance();
    try {
        const user = await userModel.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password.');
        }

        // Check if email is verified for local accounts
        if (user.auth_provider === 'local' && !user.is_email_verified) {
            // Optionally, you could resend verification here or provide a link
            // For now, just a clear message.
            // We can also include the verification token in the error details if we want to allow resending from frontend.
            const verificationLink = `${process.env.BACKEND_APP_URL || 'http://localhost:3001'}/api/auth/verify-email/${user.email_verification_token}`;
            logger.warn(`Login attempt for unverified email: ${email}. Verification link: ${verificationLink}`);
            throw new Error('Please verify your email before logging in. Check your inbox for the verification link or see console for testing link.');
        }

        if (user.auth_provider !== 'local' || !user.password_hash) {
            throw new Error(`This account is registered via ${user.auth_provider || 'an external provider'}. Please log in using that method.`);
        }

        const isPasswordValid = await userModel.comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password.');
        }

        await userModel.updateLastLogin(user._id);

        const userToReturn = { ...user };
        delete userToReturn.password_hash;
        delete userToReturn.email_verification_token; // Ensure these are not sent
        delete userToReturn.email_verification_token_expires_at;

        const payload = {
            userId: userToReturn._id.toString(),
            email: userToReturn.email,
            first_name: userToReturn.first_name,
            is_email_verified: userToReturn.is_email_verified // Include verification status in JWT
        };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRATION });

        logger.info(`User logged in successfully: ${userToReturn.email}`);
        return { token, user: userToReturn };

    } catch (error) {
        logger.error(`Login error for email ${email}:`, error.message);
        throw error;
    }
};

/**
 * Generates a JWT token for a user (typically after OAuth login).
 * @param {object} user - The user object (should not contain password_hash).
 * @returns {string} - JWT token.
 */
export const generateTokenForOAuthUser = (user) => {
    if (!user || !user._id || !user.email) {
        throw new Error('Valid user object with _id and email is required to generate token.');
    }
    
    // Ensure password hash isn't somehow present in the user object passed here
    const safeUser = {...user};
    delete safeUser.password_hash;

    const payload = {
        userId: safeUser._id.toString(),
        email: safeUser.email,
        first_name: safeUser.first_name,
        // Potentially add auth_provider to payload if needed on frontend
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRATION });
    logger.info(`Token generated for OAuth user: ${safeUser.email}`);
    return token;
};

/**
 * Fetches a user by their ID, ensuring password hash is not returned.
 * @param {string} userId - The ID of the user to fetch.
 * @returns {Promise<object|null>} User object without password_hash, or null if not found.
 */
export const getUserById = async (userId) => {
    const userModel = await User.getInstance();
    try {
        const user = await userModel.findById(userId);
        if (user) {
            delete user.password_hash; // Crucial: never send password hash
            return user;
        }
        return null;
    } catch (error) {
        logger.error(`Error fetching user by ID ${userId}:`, error);
        throw error;
    }
};

/**
 * Verifies a user's email using a verification token.
 * @param {string} token - The email verification token.
 * @returns {Promise<object>} The verified user object (excluding sensitive fields).
 * @throws {Error} If token is invalid, expired, or user not found.
 */
export const verifyUserEmail = async (token) => {
    const userModel = await User.getInstance();
    try {
        const user = await userModel.collection.findOne({
            email_verification_token: token,
            email_verification_token_expires_at: { $gt: new Date() } // Check if token is not expired
        });

        if (!user) {
            throw new Error('Invalid or expired verification token.');
        }

        // Mark email as verified and clear token fields
        const updateResult = await userModel.update(user._id, {
            is_email_verified: true,
            email_verification_token: null,
            email_verification_token_expires_at: null
        });

        if (!updateResult) {
            throw new Error('Failed to update user verification status.');
        }

        const verifiedUser = await userModel.findById(user._id);
        delete verifiedUser.password_hash; // Ensure hash isn't returned
        // Also remove verification token details from the returned user object if they are still there by any chance
        delete verifiedUser.email_verification_token;
        delete verifiedUser.email_verification_token_expires_at;

        logger.info(`Email verified successfully for user: ${verifiedUser.email}`);
        return verifiedUser;

    } catch (error) {
        logger.error(`Email verification error for token ${token}:`, error.message);
        throw error;
    }
};

// Removed findOrCreateGoogleUser as it's handled by User.findOrCreate in passport.js
