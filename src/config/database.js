import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

// Initialize MongoDB client
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
const client = new MongoClient(mongoURI);
let db = null;

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase() {
    try {
        await client.connect();
        db = client.db('data_warehouse');
        logger.info('Connected to MongoDB successfully');
        return db;
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
}

/**
 * Get database instance
 */
export function getDatabase() {
    if (!db) {
        throw new Error('Database connection not established. Call connectToDatabase() first.');
    }
    return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
    try {
        await client.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
}