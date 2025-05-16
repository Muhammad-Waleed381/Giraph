import express from 'express';
import { DataSourceController } from '../controllers/datasource.js';
import { configureFileUpload, handleMulterError } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

/**
 * Data Sources routes
 * @param {string} uploadsDir - Directory for file uploads
 * @returns {express.Router} Router instance
 */
export function setupDataSourceRoutes(uploadsDir) {
    const router = express.Router();
    const dataSourceController = new DataSourceController(uploadsDir);
    
    // Configure file upload middleware
    const upload = configureFileUpload(uploadsDir);
    
    // Data source listing and management
    router.get('/', dataSourceController.getAllDataSources.bind(dataSourceController));
    router.delete('/:id', dataSourceController.deleteDataSource.bind(dataSourceController));
    
    // File Upload Routes
    router.post('/files', upload.single('file'), handleMulterError, dataSourceController.uploadFile.bind(dataSourceController));
    router.get('/files', dataSourceController.getUploadedFiles.bind(dataSourceController));
    router.delete('/files/:fileId', dataSourceController.deleteFile.bind(dataSourceController));

    // Collection Routes - Added for query functionality
    router.get('/collections', dataSourceController.getUserCollections.bind(dataSourceController));

    return router;
}