import express from 'express'; 
import { DataSourceController } from '../controllers/dataSourceController.js';
import { isAuthenticated } from '../../middleware/authMiddleware.js'; // Assuming auth middleware

export function setupDataSourceRoutes(dataSourceService) {
    const router = express.Router();
    // Ensure DataSourceController is instantiated correctly, potentially with dependencies
    const dataSourceController = new DataSourceController(dataSourceService);

    // Route to get user-specific collections
    router.get('/collections', isAuthenticated, dataSourceController.getUserCollections.bind(dataSourceController));

    return router;
} 