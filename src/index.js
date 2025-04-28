import { initializeApp, startServer, registerShutdownHandlers } from './config/app.js';
import { connectToDatabase, closeDatabase } from './config/database.js';
import { setupRoutes } from './api/routes/index.js';
import { logger } from './utils/logger.js';
import path from 'path';

/**
 * Main application entry point
 */
async function main() {
    try {
        // Initialize Express app with middleware
        const { app, port, uploadsDir } = initializeApp();
        
        // Connect to MongoDB
        await connectToDatabase();
        
        // Register shutdown handlers
        registerShutdownHandlers(closeDatabase);
        
        // Setup API routes
        setupRoutes(app, uploadsDir);
        
        // Start server
        startServer(app, port);
        
        logger.info('Application initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// Run the application
main();