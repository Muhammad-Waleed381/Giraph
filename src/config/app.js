import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config();

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize Express app with middleware
 */
export function initializeApp() {
    const app = express();
    const port = process.env.PORT || 3000;

    // Configure middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Create uploads directory path
    const uploadsDir = path.join(path.dirname(path.dirname(__dirname)), 'uploads');
    
    return { app, port, uploadsDir };
}

/**
 * Start the Express server
 */
export function startServer(app, port) {
    return app.listen(port, () => {
        logger.info(`Server running on port ${port}`);
    });
}

/**
 * Register signal handlers for graceful shutdown
 */
export function registerShutdownHandlers(closeDatabase) {
    process.on('SIGTERM', async () => {
        logger.info('SIGTERM signal received. Closing MongoDB connection...');
        await closeDatabase();
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        logger.info('SIGINT signal received. Closing MongoDB connection...');
        await closeDatabase();
        process.exit(0);
    });
}