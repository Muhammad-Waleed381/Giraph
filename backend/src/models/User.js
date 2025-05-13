import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs'; // Corrected import
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

const SALT_WORK_FACTOR = 10;

class User {
    constructor(db) {
        if (db) {
            this.db = db;
        } else {
            // Fallback to getDatabase if not provided, though direct injection is preferred
            this.db = getDatabase(); 
        }
        this.collection = this.db.collection('users');
    }

    // Static method to get an instance with the default DB
    static async getInstance() {
        const db = getDatabase();
        return new User(db);
    }

    async #hashPassword(password) {
        if (!password) return null;
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        return await bcrypt.hash(password, salt);
    }

    async comparePassword(candidatePassword, userPasswordHash) {
        if (!candidatePassword || !userPasswordHash) return false;
        return await bcrypt.compare(candidatePassword, userPasswordHash);
    }

    async create(userData) {
        try {
            const {
                email, password, first_name, last_name, 
                auth_provider = 'local', auth_provider_id = null, 
                profile_picture = null, account_type = 'free',
                is_email_verified = false, // Default from userData or false
                email_verification_token = null, // Default from userData or null
                email_verification_token_expires_at = null // Default from userData or null
            } = userData;

            if (auth_provider === 'local' && !password) {
                throw new Error('Password is required for local registration.');
            }
            if (!email || !first_name || !last_name) {
                throw new Error('Email, first name, and last name are required.');
            }
            
            const existingUser = await this.findByEmail(email);
            if (existingUser) {
                throw new Error('User with this email already exists.');
            }

            const password_hash = auth_provider === 'local' ? await this.#hashPassword(password) : null;

            const newUserDocument = {
                email: email.toLowerCase(),
                password_hash,
                first_name,
                last_name,
                profile_picture,
                auth_provider,
                auth_provider_id,
                account_type,
                is_email_verified, // Use from userData
                email_verification_token, // Use from userData
                email_verification_token_expires_at, // Use from userData
                created_at: new Date(),
                last_login: null,
                // email_verified: false, // Consider adding email verification later
                // settings: {}, // For future user preferences
            };

            const result = await this.collection.insertOne(newUserDocument);
            const createdUser = await this.findById(result.insertedId); // Fetch the complete user object
            if (createdUser && createdUser.password_hash) {
                delete createdUser.password_hash; // Don't send hash to client
            }
            return createdUser;

        } catch (error) {
            logger.error('Error creating user:', error);
            throw error;
        }
    }

    async findById(id) {
        try {
            if (!ObjectId.isValid(id)) return null;
            return await this.collection.findOne({ _id: new ObjectId(id) });
        } catch (error) {
            logger.error('Error finding user by ID:', error);
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            return await this.collection.findOne({ email: email.toLowerCase() });
        } catch (error) {
            logger.error('Error finding user by email:', error);
            throw error;
        }
    }

    async findByAuthProviderId(provider, providerId) {
        try {
            return await this.collection.findOne({ auth_provider: provider, auth_provider_id: providerId });
        } catch (error) {
            logger.error(`Error finding user by ${provider} ID:`, error);
            throw error;
        }
    }
    
    async findOrCreate(profile, providerData) {
        // For OAuth (e.g., Google)
        try {
            const { provider, id: provider_id, emails, displayName, photos } = profile;
            const email = emails && emails.length > 0 ? emails[0].value : null;
            
            if (!email) {
                throw new Error(`Email not provided by ${provider}.`);
            }

            let user = await this.findByEmail(email);

            if (user) {
                // User exists with this email. Check if it's linked to this auth provider.
                if (user.auth_provider !== provider || user.auth_provider_id !== provider_id) {
                    // If user exists but with a different auth method, or not linked to this OAuth yet.
                    // You might want to link them or handle as a conflict.
                    // For now, let's assume we can update if it's the same email but different provider details.
                    // Or, if they signed up with email/password and now use Google with the same email.
                    // This logic can be refined based on specific requirements.
                    const updateData = {};
                    if (user.auth_provider === 'local' && !user.auth_provider_id) { // Link Google to local account
                        updateData.auth_provider = provider;
                        updateData.auth_provider_id = provider_id;
                        if (!user.profile_picture && photos && photos.length > 0) {
                            updateData.profile_picture = photos[0].value;
                        }
                    } else if (user.auth_provider !== provider || user.auth_provider_id !== provider_id) {
                        // This email is registered with another OAuth provider or has different ID.
                        // This case needs careful consideration based on business rules.
                        // For simplicity, we'll throw an error here.
                        logger.warn(`User with email ${email} exists but with different auth provider details. Current: ${user.auth_provider}, New: ${provider}`);
                        // Potentially allow linking or return an error. For now, just return the existing user.
                        // Or throw new Error('Account with this email already exists with a different login method.');
                    }
                     if (Object.keys(updateData).length > 0) {
                        await this.update(user._id, updateData);
                        user = await this.findById(user._id); // Re-fetch user
                    }
                }
                 // Ensure last_login is updated
                await this.updateLastLogin(user._id);
                const userToReturn = { ...user };
                delete userToReturn.password_hash;
                return userToReturn;
            } else {
                // User does not exist, create a new one
                const nameParts = displayName ? displayName.split(' ') : ['User', ''];
                const first_name = nameParts[0];
                const last_name = nameParts.slice(1).join(' ') || first_name; // Handle cases with no last name
                const profile_picture = photos && photos.length > 0 ? photos[0].value : null;

                const newUser = await this.create({
                    email,
                    first_name,
                    last_name,
                    profile_picture,
                    auth_provider: provider,
                    auth_provider_id: provider_id,
                    account_type: 'free' 
                });
                await this.updateLastLogin(newUser._id); // Also update last login for new user
                return newUser; // create method already deletes password_hash
            }
        } catch (error) {
            logger.error('Error in findOrCreate user:', error);
            throw error;
        }
    }

    async update(id, updateData) {
        try {
            if (!ObjectId.isValid(id)) throw new Error('Invalid user ID.');
            
            const updateDoc = { $set: { ...updateData, updatedAt: new Date() } };
            if (updateData.password) {
                updateDoc.$set.password_hash = await this.#hashPassword(updateData.password);
                delete updateDoc.$set.password; // Remove plain password from update
            }

            const result = await this.collection.updateOne({ _id: new ObjectId(id) }, updateDoc);
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating user:', error);
            throw error;
        }
    }
    
    async updateLastLogin(id) {
        try {
            if (!ObjectId.isValid(id)) return false;
            return await this.update(id, { last_login: new Date() });
        } catch (error) {
            logger.error('Error updating last login:', error);
            // Don't throw error here, as it's not critical for login flow
            return false;
        }
    }
}

export default User; 