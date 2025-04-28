import express from 'express';
import { ImportController } from '../controllers/import.js';

/**
 * Import routes
 * @param {string} uploadsDir - Directory for file uploads
 * @returns {express.Router} Router instance
 */
export function setupImportRoutes(uploadsDir) {
    const router = express.Router();
    const importController = new ImportController(uploadsDir);
    
    // Import routes
    router.post('/', importController.importFromFile.bind(importController));
    router.post('/google', importController.importFromGoogle.bind(importController));
    
    // Legacy analyze and import route
    router.post('/analyze', importController.analyzeAndImport.bind(importController));
    
    // Route for continuing iterations of import process
    router.post('/iterate', importController.continueIteration.bind(importController));

    return router;
}