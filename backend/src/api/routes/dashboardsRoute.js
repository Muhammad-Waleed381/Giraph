import express from 'express';
import { DashboardController } from '../controllers/dashboard.js';

/**
 * Dashboards routes
 * @returns {express.Router} Router instance
 */
export function setupDashboardRoutes() {
    const router = express.Router();
    const dashboardController = new DashboardController();
    
    // Dashboard management routes
    router.post('/', dashboardController.createDashboard.bind(dashboardController));
    router.get('/', dashboardController.getAllDashboards.bind(dashboardController));
    router.get('/:id', dashboardController.getDashboard.bind(dashboardController));
    router.put('/:id', dashboardController.updateDashboard.bind(dashboardController));
    router.delete('/:id', dashboardController.deleteDashboard.bind(dashboardController));

    return router;
}