import express from 'express';
import { InsightController } from '../controllers/insight.js';

/**
 * Insights routes
 * @returns {express.Router} Router instance
 */
export function setupInsightRoutes() {
    const router = express.Router();
    const insightController = new InsightController();
    
    // Insights routes
    router.get('/:collectionName', insightController.getInsights.bind(insightController));
    router.get('/forecast/:collectionName', insightController.generateForecast.bind(insightController));
    router.get('/anomalies/:collectionName', insightController.detectAnomalies.bind(insightController));

    return router;
}