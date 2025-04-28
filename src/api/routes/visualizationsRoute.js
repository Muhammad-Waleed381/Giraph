import express from 'express';
import { VisualizationController } from '../controllers/visualization.js';

/**
 * Visualizations routes
 * @param {string} uploadsDir - Directory for file uploads
 * @returns {express.Router} Router instance
 */
export function setupVisualizationRoutes(uploadsDir) {
    const router = express.Router();
    const visualizationController = new VisualizationController(uploadsDir);
    
    // Visualization routes
    router.post('/recommend', visualizationController.getRecommendations.bind(visualizationController));
    router.post('/generate', visualizationController.generateVisualizations.bind(visualizationController));
    router.post('/regenerate', visualizationController.regenerateVisualization.bind(visualizationController));
    
    // Collection-specific visualization routes
    router.get('/collection/:name', visualizationController.getCollectionVisualizations.bind(visualizationController));

    return router;
}