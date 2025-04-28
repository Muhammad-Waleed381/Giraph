import express from 'express';
import { QueryController } from '../controllers/query.js';

/**
 * Query routes
 * @returns {express.Router} Router instance
 */
export function setupQueryRoutes() {
    const router = express.Router();
    const queryController = new QueryController();
    
    // Natural language query route
    router.post('/', queryController.processQuery.bind(queryController));

    return router;
}