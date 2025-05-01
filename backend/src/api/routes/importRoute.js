import express from 'express';
import { ImportController } from '../controllers/import.js';

/**
 * Import routes
 * @param {string} uploadsDir - Directory for file uploads
 * @param {GoogleSheetsHandler} googleSheetsHandler - Shared Google Sheets handler instance
 * @returns {express.Router} Router instance
 */
export function setupImportRoutes(uploadsDir, googleSheetsHandler) {
    const router = express.Router();
    const importController = new ImportController(uploadsDir, googleSheetsHandler);
    
    // Import routes
    router.post('/', importController.importFromFile.bind(importController));
    router.post('/google', importController.importFromGoogle.bind(importController));
    
    // Legacy analyze and import route
    router.post('/analyze', importController.analyzeAndImport.bind(importController));
    
    // Route for continuing iterations of import process
    router.post('/iterate', importController.continueIteration.bind(importController));

    return router;
}