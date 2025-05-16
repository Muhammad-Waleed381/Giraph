import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

class DataSourceModel {
    constructor(db) {
        if (db) {
            this.db = db;
        } else {
            // Fallback to getDatabase if not provided
            this.db = getDatabase();
        }
        this.collection = this.db.collection('data_sources');
        
        // Ensure indexes are created
        this._createIndexes();
    }

    // Static method to get an instance with the default DB
    static async getInstance() {
        const db = getDatabase();
        return new DataSourceModel(db);
    }

    async _createIndexes() {
        try {
            // Create basic indexes
            await this.collection.createIndex({ user_id: 1 });
            await this.collection.createIndex({ collection_name: 1 });
            await this.collection.createIndex({ type: 1 });
            
            // Create compound indexes
            await this.collection.createIndex({ user_id: 1, collection_name: 1 });
            await this.collection.createIndex({ user_id: 1, status: 1 });
            await this.collection.createIndex({ user_id: 1, status: 1, collection_name: 1 });
            logger.debug('DataSource indexes created or verified');
        } catch (error) {
            logger.error('Error creating DataSource indexes:', error);
            // Don't throw - indexes are helpful but not critical to function
        }
    }

    /**
     * Find data sources by user ID and status
     * @param {string} userId - User ID to filter by
     * @param {Array<string>} statuses - Array of statuses to include
     * @returns {Promise<Array>} - Data sources that match the criteria
     */
    async findByUserAndStatus(userId, statuses = ['imported', 'completed', 'processed']) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            // Convert string ID to ObjectId if needed
            const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
            
            return await this.collection.find({
                user_id: userObjectId,
                status: { $in: statuses },
                collection_name: { $exists: true, $ne: null, $ne: '' }
            }).toArray();
        } catch (error) {
            logger.error('Error finding data sources by user and status:', error);
            throw error;
        }
    }

    /**
     * Get distinct collection names for a user
     * @param {string} userId - User ID to filter by
     * @param {Array<string>} statuses - Array of statuses to include
     * @returns {Promise<Array<string>>} - Array of distinct collection names
     */
    async getDistinctCollections(userId, statuses = ['imported', 'completed', 'processed']) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            // Add debugging for the userId
            logger.info(`getDistinctCollections called with userId: ${userId} (type: ${typeof userId})`);
            
            let userObjectId;
            try {
                // Convert string ID to ObjectId if needed
                userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;
                logger.info(`Converted to ObjectId: ${userObjectId.toString()}`);
            } catch (idError) {
                logger.error(`Error converting userId to ObjectId: ${idError.message}`);
                // Continue with the string version as fallback
                userObjectId = userId;
            }
            
            // Try to find documents with various user_id formats to ensure we find matches
            const query = {
                // Try both ObjectId and string formats in an $or query to be safe
                $or: [
                    { user_id: userObjectId },
                    // If userId is string and valid ObjectId format, also try as string
                    ...(typeof userId === 'string' ? [{ user_id: userId }] : [])
                ],
                status: { $in: statuses },
                collection_name: { $exists: true, $ne: null, $ne: '' }
            };
            
            logger.info(`Executing query: ${JSON.stringify(query)}`);
            
            // First, count matching documents to see if any exist at all
            const count = await this.collection.countDocuments(query);
            logger.info(`Found ${count} matching documents before fetching collections`);
            
            // Find documents and extract collection names
            const dataSources = await this.collection.find(query)
                .project({ collection_name: 1 })
                .limit(100) // Limit to 100 documents to be safe
                .toArray();
            
            logger.info(`Retrieved ${dataSources.length} documents`);
            
            // Extract unique collection names
            const collectionsSet = new Set();
            dataSources.forEach(doc => {
                if (doc.collection_name) {
                    collectionsSet.add(doc.collection_name);
                }
            });
            
            const collections = Array.from(collectionsSet);
            logger.info(`Extracted ${collections.length} unique collection names`);
            
            return collections;
        } catch (error) {
            logger.error(`Error getting distinct collections: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all collection names
     * @param {Array<string>} statuses - Array of statuses to include
     * @returns {Promise<Array<string>>} - Array of all collection names
     */
    async getAllCollections(statuses = ['imported', 'completed', 'processed']) {
        try {
            logger.info('Getting all collections regardless of user');
            
            // Query for all collections with valid status and non-empty collection_name
            const query = {
                status: { $in: statuses },
                collection_name: { $exists: true, $ne: null, $ne: '' }
            };
            
            logger.info(`Executing query: ${JSON.stringify(query)}`);
            
            // First, count matching documents to see if any exist at all
            const count = await this.collection.countDocuments(query);
            logger.info(`Found ${count} matching documents before fetching collections`);
            
            // Find documents and extract collection names
            const dataSources = await this.collection.find(query)
                .project({ collection_name: 1 })
                .limit(100) // Limit to 100 documents to be safe
                .toArray();
            
            logger.info(`Retrieved ${dataSources.length} documents`);
            
            // Extract unique collection names
            const collectionsSet = new Set();
            dataSources.forEach(doc => {
                if (doc.collection_name) {
                    collectionsSet.add(doc.collection_name);
                }
            });
            
            const collections = Array.from(collectionsSet);
            logger.info(`Extracted ${collections.length} unique collection names`);
            
            // Get additional collections from the database
            const db = this.db;
            const dbCollections = await db.listCollections().toArray();
            
            // List of sensitive collections that should not be exposed to users
            const sensitiveCollections = [
                'users', 'sessions', 'user_sessions', 'auth_tokens', 
                'passwords', 'password_reset', 'api_keys', 'system_settings',
                'admin_users', 'permissions', 'roles', 'dashboards'
            ];
            
            // Filter collections, excluding system collections, data_sources, and sensitive collections
            const dbCollectionNames = dbCollections
                .map(col => col.name)
                .filter(name => 
                    !name.startsWith('system.') && 
                    name !== 'data_sources' &&
                    !sensitiveCollections.includes(name)
                );
            
            logger.info(`Found ${dbCollectionNames.length} additional collections from the database`);
            
            // Combine collections from data_sources and directly from the database
            const allCollections = [...new Set([...collections, ...dbCollectionNames])];
            logger.info(`Combined total of ${allCollections.length} unique collections`);
            
            return allCollections;
        } catch (error) {
            logger.error(`Error getting all collections: ${error.message}`);
            throw error;
        }
    }
}

// Export a singleton instance
let instance = null;

export default {
    getInstance: async () => {
        if (!instance) {
            try {
                instance = await DataSourceModel.getInstance();
            } catch (error) {
                logger.error('Error getting DataSourceModel instance:', error);
                throw error;
            }
        }
        return instance;
    }
}; 