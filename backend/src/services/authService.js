import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Import crypto
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from '../utils/emailService.js'; // Import sendEmail
import dotenv from 'dotenv';
import { ObjectId } from 'mongodb';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.warn('JWT_SECRET environment variable is not set. Using a default secret for development only. Please set a strong secret in production.');
}
const SECRET_KEY = JWT_SECRET || 'your-default-development-secret-key';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '1h';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000'; // Added for verification link

/**
 * Registers a new user, sends verification email.
 * @param {string} username - User's chosen username.
 * @param {string} email - User's email address.
 * @param {string} password - User's raw password.
 * @returns {Promise<object>} - Created user details (excluding password).
 * @throws {Error} If registration fails (e.g., email/username exists).
 */
export const signupUser = async (username, email, password) => {
    const db = getDatabase();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        const message = existingUser.email === email ? 'Email already registered' : 'Username already taken';
        throw new Error(message);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 3600000); // Token expires in 1 hour

    // Create new user document
    const newUser = {
        username,
        email,
        password: hashedPassword,
        isEmailVerified: false, // Set to false initially
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: verificationTokenExpires,
        createdAt: new Date(),
    };

    try {
        const insertResult = await usersCollection.insertOne(newUser);
        const userId = insertResult.insertedId;

        // Send verification email
        const verificationUrl = `${BACKEND_URL}/api/auth/verify-email/${verificationToken}`;
        logger.info(`Generated verification URL: ${verificationUrl}`); // Added log
        const emailSubject = 'Verify Your Email Address';
        const emailText = `Hello ${username},

Please verify your email address by clicking the following link:
${verificationUrl}

This link will expire in 1 hour.

If you did not sign up for this account, please ignore this email.

Thanks,
The Giraph Team`;
        const emailHtml = `<p>Hello ${username},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">Verify Email</a></p><p>This link will expire in 1 hour.</p><p>If you did not sign up for this account, please ignore this email.</p><p>Thanks,<br>The Giraph Team</p>`;

        await sendEmail(email, emailSubject, emailText, emailHtml);
        logger.info(`Verification email sent to ${email}`);


        logger.info(`User signed up successfully: ${username}. Verification needed.`);

        // Return user details (excluding sensitive info)
        const { password: _, emailVerificationToken: __, emailVerificationTokenExpires: ___, ...userDetails } = newUser;
        userDetails._id = userId;
        return userDetails; // Return user details, but indicate verification is needed

    } catch (error) {
        logger.error(`Signup error for email ${email}:`, error);
        // Clean up user if email sending fails? Maybe not, allow resend? For now, log and throw.
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw new Error(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`);
        }
        // Rethrow email sending errors or other DB errors
        throw new Error(error.message || 'Server error during signup');
    }
};


/**
 * Verifies a user's email using the provided token.
 * @param {string} token - The email verification token.
 * @returns {Promise<boolean>} - True if verification is successful, false otherwise.
 */
export const verifyUserEmail = async (token) => {
    const db = getDatabase();
    const usersCollection = db.collection('users');

    try {
        const user = await usersCollection.findOne({
            emailVerificationToken: token,
            emailVerificationTokenExpires: { $gt: new Date() } // Check if token is not expired
        });

        if (!user) {
            logger.warn(`Invalid or expired email verification token received: ${token}`);
            return false; // Token not found or expired
        }

        // Update user: set verified, remove token fields
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: { isEmailVerified: true },
                $unset: { emailVerificationToken: "", emailVerificationTokenExpires: "" }
            }
        );

        logger.info(`Email verified successfully for user: ${user.username}`);
        return true;

    } catch (error) {
        logger.error(`Error during email verification for token ${token}:`, error);
        return false;
    }
};


/**
 * Authenticates a user by email and password.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<{token: string, user: object}>} - JWT token and user details.
 * @throws {Error} If authentication fails or email is not verified.
 */
export const loginUser = async (email, password) => {
    try {
        const db = getDatabase();
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // *** Check if email is verified ***
        if (!user.isEmailVerified) {
            logger.warn(`Login attempt failed for unverified email: ${email}`);
            // Optionally: Resend verification email here?
            throw new Error('Email not verified. Please check your inbox for the verification link.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // ... (JWT generation and user details preparation remain the same) ...
        const payload = {
            userId: user._id,
            username: user.username,
            email: user.email
        };
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: JWT_EXPIRATION });

        const userDetails = {
            _id: user._id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
            // Add other non-sensitive fields as needed
        };

        logger.info(`User logged in successfully: ${user.username}`);
        return { token, user: userDetails };

    } catch (error) {
        logger.error(`Login error for email ${email}:`, error.message);
        // Re-throw specific errors for the controller to handle
        if (error.message === 'Invalid email or password' || error.message === 'Email not verified. Please check your inbox for the verification link.') {
            throw error;
        }
        // General server error
        throw new Error('Server error during login');
    }
};

// ... (findOrCreateGoogleUser remains the same, assuming Google verifies email) ...

export const findOrCreateGoogleUser = async ({ googleId, email, username, firstName, lastName }) => {
    try {
        const db = getDatabase();
        const usersCollection = db.collection('users');

        // 1. Find user by Google ID first
        let user = await usersCollection.findOne({ googleId: googleId });

        if (user) {
            logger.info(`Found existing user by Google ID: ${user.username}`);
            // Optionally update user details (name, etc.) if they've changed in Google
            // await usersCollection.updateOne({ _id: user._id }, { $set: { firstName, lastName } });
            // Return user details (excluding password if it exists, though Google users might not have one)
            const { password, ...userDetails } = user;
            return userDetails;
        }

        // 2. If not found by Google ID, check if a user exists with that email
        user = await usersCollection.findOne({ email: email });

        if (user) {
            // User exists but hasn't linked Google account yet.
            // Link the Google ID to the existing account.
            logger.info(`Linking Google ID ${googleId} to existing user: ${user.username}`);
            await usersCollection.updateOne(
                { _id: user._id },
                { $set: { googleId: googleId, /* optionally update names */ firstName: firstName || user.firstName, lastName: lastName || user.lastName } }
            );
            // Return updated user details (excluding password)
            const { password, ...userDetails } = { ...user, googleId }; // Add googleId to the returned object
            return userDetails;
        }

        // 3. If no user found by Google ID or email, create a new user
        logger.info(`Creating new user via Google OAuth for email: ${email}`);
        const newUserDocument = {
            googleId,
            email,
            username, // Use the provided username (display name or derived)
            firstName: firstName || '',
            lastName: lastName || '',
            // password: null, // No password for Google-only users initially
            isEmailVerified: true, // Assume email is verified by Google
            createdAt: new Date(),
            // Add any other default fields your user model requires
        };

        const result = await usersCollection.insertOne(newUserDocument);

        // Fetch the created user to return it (excluding potential password field)
        const createdUser = await usersCollection.findOne({ _id: result.insertedId }, { projection: { password: 0 } });

        logger.info(`Successfully created new Google user: ${createdUser.username}`);
        return createdUser;

    } catch (error) {
        logger.error('Error in findOrCreateGoogleUser:', error);
        // Handle potential duplicate key errors during insert if constraints are set
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            logger.error(`Duplicate key error on field: ${field}`);
            // May need more sophisticated handling here, e.g., trying to link again
        }
        return null; // Indicate failure
    }
};
