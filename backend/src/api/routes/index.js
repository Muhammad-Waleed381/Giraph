import express from 'express';
import { setupDataSourceRoutes } from './datasourcesRoute.js';
import { setupCollectionRoutes } from './collectionsRoute.js';
import { setupVisualizationRoutes } from './visualizationsRoute.js';
import { setupDashboardRoutes } from './dashboardsRoute.js';
import { setupImportRoutes } from './importRoute.js';
import { setupGoogleRoutes } from './googleRoute.js';
import { setupInsightRoutes } from './insightsRoute.js';
import { setupQueryRoutes } from './queryRoute.js';
import { setupAnalysisRoutes } from './analysisRoute.js';
import authRoutes from './authRoutes.js'; // Import auth routes
import { errorHandler } from '../middleware/errorHandler.js';
import { GoogleSheetsHandler } from '../../utils/googleSheetsHandler.js';


/**
 * Setup API routes
 * @param {Object} app - Express app
 * @param {string} uploadsDir - Directory for file uploads
 */
export function setupRoutes(app, uploadsDir) {
    // Create a single instance of the Google Sheets Handler
    const googleSheetsHandler = new GoogleSheetsHandler();

    // Register all modular routes with appropriate prefixes
    app.use('/api/auth', authRoutes); // Add auth routes
    app.use('/api/datasources', setupDataSourceRoutes(uploadsDir));
    app.use('/api/collections', setupCollectionRoutes());
    app.use('/api/visualizations', setupVisualizationRoutes(uploadsDir));
    app.use('/api/dashboards', setupDashboardRoutes());
    app.use('/api/import', setupImportRoutes(uploadsDir, googleSheetsHandler));
    app.use('/api/google', setupGoogleRoutes(googleSheetsHandler));
    app.use('/api/insights', setupInsightRoutes());
    app.use('/api/query', setupQueryRoutes());
    app.use('/api/analysis', setupAnalysisRoutes(uploadsDir));
    
    // Handle 404 for API routes
    app.use('/api/*', (req, res) => {
        res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            message: `The requested endpoint '${req.originalUrl}' does not exist`
        });
    });
    
    // Error handling middleware
    app.use(errorHandler);
    
    return app;
}