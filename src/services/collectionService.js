import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';

/**
 * Service for managing MongoDB collections
 */
export class CollectionService {
    /**
     * Get all collections with info
     */
    async getAllCollections() {
        try {
            const db = getDatabase();
            const collections = await db.listCollections().toArray();
            
            // Fetch additional info for each collection
            const collectionsInfo = await Promise.all(collections.map(async (col) => {
                try {
                    const info = await this.getCollectionInfo(col.name);
                    return {
                        name: col.name,
                        count: info.count || 0,
                        schema: info.schema || {}
                        // Add other relevant info if needed, e.g., size, indexes
                    };
                } catch (infoError) {
                    logger.error(`Error getting info for collection ${col.name}:`, infoError);
                    return { 
                        name: col.name, 
                        count: 0, 
                        schema: {}, 
                        error: 'Failed to retrieve details' 
                    };
                }
            }));
            
            return collectionsInfo;
        } catch (error) {
            logger.error('Error in getAllCollections:', error);
            throw error;
        }
    }
    
    /**
     * Get information about a specific collection
     */
    async getCollectionInfo(collectionName) {
        try {
            const db = getDatabase();
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            const sample = await collection.find().limit(1).toArray();
            const schema = sample.length > 0 ? Object.keys(sample[0]).reduce((acc, key) => {
                acc[key] = typeof sample[0][key];
                return acc;
            }, {}) : {};
            
            return {
                count,
                schema
            };
        } catch (error) {
            logger.error(`Error getting collection info for ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Get collection by name
     */
    async getCollection(collectionName) {
        try {
            const db = getDatabase();
            const collectionsList = await db.listCollections({ name: collectionName }).toArray();
            
            if (collectionsList.length === 0) {
                throw new Error(`Collection '${collectionName}' not found`);
            }
            
            const info = await this.getCollectionInfo(collectionName);
            
            return {
                name: collectionName,
                ...info
            };
        } catch (error) {
            logger.error(`Error getting collection ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Get data from a collection with filtering, sorting, etc.
     */
    async getCollectionData(collectionName, options = {}) {
        try {
            const { limit = 100, skip = 0, sort, filter } = options;
            
            logger.info(`Fetching data from collection ${collectionName} with params:`, { limit, skip, sort, filter });
            
            const db = getDatabase();
            
            // Check if collection exists
            const collectionsList = await db.listCollections({ name: collectionName }).toArray();
            if (collectionsList.length === 0) {
                throw new Error(`Collection '${collectionName}' not found`);
            }
            
            const collection = db.collection(collectionName);
            
            // Parse query parameters
            const queryOptions = {
                limit: parseInt(limit),
                skip: parseInt(skip),
                sort: {} // Initialize sort object
            };
            
            // Parse sort parameter safely
            if (sort) {
                try {
                    if (typeof sort === 'string') {
                        queryOptions.sort = JSON.parse(sort);
                    } else {
                        queryOptions.sort = sort;
                    }
                } catch (sortError) {
                    logger.warn('Invalid sort parameter format. Using default sort.');
                    queryOptions.sort = { _id: 1 };
                }
            } else {
                queryOptions.sort = { _id: 1 }; // Default sort
            }
            
            // Parse filter parameter safely
            let queryFilter = {};
            if (filter) {
                try {
                    if (typeof filter === 'string') {
                        queryFilter = JSON.parse(filter);
                    } else {
                        queryFilter = filter;
                    }
                } catch (filterError) {
                    logger.warn('Invalid filter parameter format. Ignoring filter.');
                    queryFilter = {};
                }
            }
            
            // Execute query
            const data = await collection.find(queryFilter, queryOptions).toArray();
            const total = await collection.countDocuments(queryFilter);
            
            return {
                data,
                metadata: {
                    collection: collectionName,
                    total,
                    limit: queryOptions.limit,
                    skip: queryOptions.skip,
                    filter: queryFilter,
                    sort: queryOptions.sort,
                    hasMore: total > (queryOptions.skip + data.length)
                }
            };
        } catch (error) {
            logger.error(`Error fetching data from collection ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Delete a collection
     */
    async deleteCollection(collectionName, options = {}) {
        try {
            const { force = false } = options;
            
            logger.info(`Request to delete collection: ${collectionName}`);
            
            const db = getDatabase();
            
            // Check if collection exists
            const collectionsList = await db.listCollections({ name: collectionName }).toArray();
            if (collectionsList.length === 0) {
                throw new Error(`Collection '${collectionName}' not found`);
            }
            
            // Get document count to warn about large collections
            const collection = db.collection(collectionName);
            const count = await collection.countDocuments();
            
            // If collection has more than 1000 documents and force is not true, return a warning
            if (count > 1000 && !force) {
                return {
                    requiresConfirmation: true,
                    documentCount: count,
                    message: `Collection '${collectionName}' contains ${count} documents. Use 'force=true' to confirm deletion.`
                };
            }
            
            // Delete the collection
            const dropResult = await collection.drop();
            
            if (dropResult) {
                logger.info(`Collection '${collectionName}' deleted successfully`);
                return {
                    success: true,
                    documentCount: count,
                    message: `Collection '${collectionName}' deleted successfully`
                };
            } else {
                logger.error(`Failed to drop collection '${collectionName}'`);
                throw new Error(`Failed to drop collection '${collectionName}'`);
            }
        } catch (error) {
            logger.error(`Error deleting collection ${collectionName}:`, error);
            throw error;
        }
    }
}