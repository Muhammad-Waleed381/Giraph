import express from 'express';
import { DataSourceController } from '../controllers/datasource.js';

/**
 * Analysis routes
 * @param {string} uploadsDir - Directory for file uploads
 * @returns {express.Router} Router instance
 */
export function setupAnalysisRoutes(uploadsDir) {
    const router = express.Router();
    const dataSourceController = new DataSourceController(uploadsDir);
    
    // Schema analysis route
    router.post('/schema', dataSourceController.analyzeSchema.bind(dataSourceController));

    return router;
}