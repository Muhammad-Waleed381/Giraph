import express from 'express';
import { GoogleController } from '../controllers/google.js';

/**
 * Google API routes
 * @returns {express.Router} Router instance
 */
export function setupGoogleRoutes() {
    const router = express.Router();
    const googleController = new GoogleController();
    
    // Google Sheets Routes
    router.get('/auth', googleController.getAuthUrl.bind(googleController));
    router.get('/callback', googleController.handleCallback.bind(googleController));
    router.get('/sheets', googleController.listSpreadsheets.bind(googleController));
    router.get('/sheets/:id/tabs', googleController.getSheetTabs.bind(googleController));
    router.get('/sheets/data', googleController.getSheetData.bind(googleController));
    router.post('/sheets/analyze', googleController.analyzeGoogleSheet.bind(googleController));
    router.post('/sheets/import', googleController.importSheetData.bind(googleController));

    return router;
}