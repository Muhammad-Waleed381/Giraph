import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { FileLoader } from './utils/fileLoader.js';
import { GeminiInterface } from './utils/geminiInterface.js';
import { DatabaseHandler } from './utils/dbHandler.js';
import { GoogleSheetsHandler } from './utils/googleSheetsHandler.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import multer from 'multer';
import { cleanHeaderName } from './utils/commonUtils.js';
import crypto from 'crypto';

// --- Simple In-Memory Cache for Recommendations --- 
const recommendationCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Function to clean up expired cache entries (can be called periodically or on access)
function cleanupRecommendationCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of recommendationCache.entries()) {
        if (now - timestamp > CACHE_TTL_MS) {
            recommendationCache.delete(key);
            logger.info(`Removed expired recommendation cache entry: ${key}`);
        }
    }
}
// Simple interval cleanup
setInterval(cleanupRecommendationCache, 5 * 60 * 1000); // Clean every 5 minutes
// --------------------------------------------------

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        cb(null, `${cleanFilename}-${uniqueSuffix}${ext}`);
    }
});

// File filter to accept only CSV and Excel files
const fileFilter = (req, file, cb) => {
    // Accept csv, xls, xlsx files
    if (
        file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        // Handle other common csv/excel mime types that some clients might send
        file.mimetype === 'application/csv' ||
        file.mimetype === 'text/x-csv' ||
        file.mimetype === 'application/x-csv' ||
        file.mimetype === 'application/excel' ||
        file.mimetype === 'application/x-excel' ||
        file.originalname.endsWith('.csv') ||
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.xlsx')
    ) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type. Only CSV and Excel files are allowed. Got: ${file.mimetype}`), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1 // Only allow one file at a time
    }
});

// Error handling for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                message: 'The uploaded file exceeds the 50MB size limit.'
            });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected file',
                message: 'Please upload only one file at a time.'
            });
        }
    }
    next(err);
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Initialize components
const gemini = new GeminiInterface();
const dbHandler = new DatabaseHandler(process.env.MONGODB_URI);
const googleSheets = new GoogleSheetsHandler();

// Connect to MongoDB
await dbHandler.connect();

// File Upload Endpoint
app.post('/api/datasources/files', upload.single('file'), handleMulterError, async (req, res) => {
    try {
        logger.info('File upload request received');
        
        if (!req.file) {
            logger.error('No file received in upload request');
            return res.status(400).json({ 
                error: 'No file uploaded',
                message: 'Please select a file to upload'
            });
        }
        
        logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        
        // Check if file is empty
        if (req.file.size === 0) {
            // Delete the empty file
            const fs = await import('fs/promises');
            await fs.unlink(req.file.path);
            
            return res.status(400).json({
                error: 'Empty file',
                message: 'The uploaded file is empty'
            });
        }
        
        // Detect file format and basic validation
        let fileFormat = '';
        if (req.file.originalname.endsWith('.csv') || req.file.mimetype.includes('csv')) {
            fileFormat = 'CSV';
        } else if (req.file.originalname.endsWith('.xlsx') || req.file.mimetype.includes('openxmlformats')) {
            fileFormat = 'Excel (XLSX)';
        } else if (req.file.originalname.endsWith('.xls') || req.file.mimetype.includes('excel')) {
            fileFormat = 'Excel (XLS)';
        } else {
            fileFormat = 'Unknown';
        }
        
        const fileInfo = {
            id: req.file.filename,
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            sizeFormatted: formatFileSize(req.file.size),
            mimetype: req.file.mimetype,
            format: fileFormat,
            uploadedAt: new Date().toISOString()
        };
        
        // Return file information to client
        res.status(200).json({
            success: true,
            message: 'File uploaded successfully',
            fileInfo: fileInfo
        });
    } catch (error) {
        logger.error('Error handling file upload:', error);
        
        // If an error occurs, try to delete the uploaded file
        if (req.file && req.file.path) {
            try {
                const fs = await import('fs/promises');
                await fs.unlink(req.file.path);
                logger.info(`Deleted incomplete upload: ${req.file.path}`);
            } catch (unlinkError) {
                logger.error('Error deleting incomplete upload:', unlinkError);
            }
        }
        
        res.status(500).json({ 
            error: 'File upload failed',
            message: error.message 
        });
    }
});

// Get uploaded files
app.get('/api/datasources/files', async (req, res) => {
    try {
        const fs = await import('fs/promises');
        
        // Read all files in the uploads directory
        const files = await fs.readdir(uploadsDir);
        
        // Get file information for each file
        const fileInfoPromises = files.map(async (filename) => {
            const filePath = path.join(uploadsDir, filename);
            const stats = await fs.stat(filePath);
            
            // Get file extension
            const ext = path.extname(filename).toLowerCase();
            
            // Determine file type
            let fileType;
            if (ext === '.csv') {
                fileType = 'CSV';
            } else if (ext === '.xlsx' || ext === '.xls') {
                fileType = 'Excel';
            } else {
                fileType = 'Unknown';
            }
            
            return {
                id: `file:${filename}`,
                name: filename,
                path: filePath,
                type: 'file_upload',
                fileType: fileType,
                size: stats.size,
                sizeFormatted: formatFileSize(stats.size),
                uploadedAt: stats.mtime.toISOString()
            };
        });
        
        const fileInfos = await Promise.all(fileInfoPromises);
        
        // Sort by upload date (newest first)
        fileInfos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        res.json({
            success: true,
            files: fileInfos
        });
    } catch (error) {
        logger.error('Error listing uploads:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Delete an uploaded file
app.delete('/api/datasources/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (!fileId) {
            return res.status(400).json({ 
                success: false,
                error: 'File ID is required' 
            });
        }
        
        // Prevent directory traversal attacks
        const normalizedFileId = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, '');
        const filePath = path.join(uploadsDir, normalizedFileId);
        
        // Check if file exists
        const fs = await import('fs/promises');
        try {
            await fs.access(filePath);
        } catch (error) {
            logger.error(`File not found: ${filePath}`);
            return res.status(404).json({ 
                success: false,
                error: 'File not found' 
            });
        }
        
        // Delete the file
        await fs.unlink(filePath);
        logger.info(`File deleted: ${filePath}`);
        
        res.json({ 
            success: true,
            message: 'File deleted successfully' 
        });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get all data sources (combined endpoint)
app.get('/api/datasources', async (req, res) => {
    try {
        logger.info('Request to list all data sources');
        
        // Get all collections
        const collections = await dbHandler.db.listCollections().toArray();
        const collectionInfo = await Promise.all(collections.map(async col => {
            const collection = dbHandler.db.collection(col.name);
            const count = await collection.countDocuments();
            const sample = await collection.find().limit(1).toArray();
            const columns = sample.length > 0 ? Object.keys(sample[0]).filter(k => k !== '_id') : [];
            
            return {
                id: `collection:${col.name}`,
                name: col.name,
                type: 'mongodb_collection',
                documentCount: count,
                columns: columns,
                lastModified: col.info ? col.info.lastModified : null
            };
        }));
        
        // Get all uploads
        const fs = await import('fs/promises');
        let uploads = [];
        try {
            const files = await fs.readdir(uploadsDir);
            
            uploads = await Promise.all(files.map(async (filename) => {
                const filePath = path.join(uploadsDir, filename);
                const stats = await fs.stat(filePath);
                
                // Get file extension
                const ext = path.extname(filename).toLowerCase();
                
                // Determine file type
                let fileType;
                if (ext === '.csv') {
                    fileType = 'CSV';
                } else if (ext === '.xlsx' || ext === '.xls') {
                    fileType = 'Excel';
                } else {
                    fileType = 'Unknown';
                }
                
                return {
                    id: `file:${filename}`,
                    name: filename,
                    path: filePath,
                    type: 'file_upload',
                    fileType: fileType,
                    size: stats.size,
                    sizeFormatted: formatFileSize(stats.size),
                    uploadedAt: stats.mtime.toISOString()
                };
            }));
        } catch (error) {
            logger.error('Error listing uploads:', error);
            uploads = []; // Continue even if uploads directory can't be read
        }
        
        // Get Google Sheets if authenticated
        let googleSheetSources = [];
        try {
            if (googleSheets.oauth2Client && googleSheets.oauth2Client.credentials) {
                const spreadsheets = await googleSheets.listSpreadsheets();
                googleSheetSources = spreadsheets.map(sheet => ({
                    id: `googlesheet:${sheet.id}`,
                    name: sheet.name,
                    type: 'google_sheet',
                    webViewLink: sheet.webViewLink,
                    createdTime: sheet.createdTime,
                    modifiedTime: sheet.modifiedTime
                }));
            }
        } catch (error) {
            logger.error('Error listing Google Sheets:', error);
            googleSheetSources = []; // Continue even if Google Sheets can't be listed
        }
        
        // Combine all data sources
        const allSources = [
            ...collectionInfo,
            ...uploads,
            ...googleSheetSources
        ];
        
        res.json({
            success: true,
            sources: allSources
        });
    } catch (error) {
        logger.error('Error in /api/datasources:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Delete any data source
app.delete('/api/datasources/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({ 
                success: false,
                error: 'Source ID is required' 
            });
        }
        
        // Parse the ID to determine the source type
        if (id.startsWith('file:')) {
            // Delete file
            const fileId = id.replace('file:', '');
            const normalizedFileId = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, '');
            const filePath = path.join(uploadsDir, normalizedFileId);
            
            const fs = await import('fs/promises');
            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
                logger.info(`File deleted: ${filePath}`);
                return res.json({ 
                    success: true, 
                    message: 'File deleted successfully' 
                });
            } catch (error) {
                logger.error(`File not found or could not be deleted: ${filePath}`, error);
                return res.status(404).json({ 
                    success: false,
                    error: 'File not found or could not be deleted' 
                });
            }
        } else if (id.startsWith('collection:')) {
            // Delete collection
            const collectionName = id.replace('collection:', '');
            try {
                await dbHandler.db.collection(collectionName).drop();
                logger.info(`Collection '${collectionName}' deleted successfully`);
                return res.json({
                    success: true,
                    message: `Collection '${collectionName}' deleted successfully`
                });
            } catch (error) {
                logger.error(`Error deleting collection ${collectionName}:`, error);
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to delete collection' 
                });
            }
        } else if (id.startsWith('googlesheet:')) {
            // Google Sheets cannot be deleted through our API
            return res.status(400).json({ 
                success: false,
                error: 'Deleting Google Sheets is not supported through this API' 
            });
        } else {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid data source ID format' 
            });
        }
    } catch (error) {
        logger.error('Error in /api/datasources/:id:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Schema Analysis Endpoint - Analyze file structure without importing
app.post('/api/analyze/schema', async (req, res) => {
    const { filePath, fileId, sampleSize = 100 } = req.body;

    try {
        logger.info('Received schema analysis request:', req.body);
        
        let normalizedPath;
        
        // Handle either direct filePath or uploaded fileId
        if (filePath) {
            normalizedPath = path.normalize(filePath);
            logger.info(`Using provided file path: ${normalizedPath}`);
        } else if (fileId) {
            normalizedPath = path.join(uploadsDir, fileId);
            logger.info(`Using uploaded file: ${normalizedPath}`);
        } else {
            logger.error('No filePath or fileId provided in request');
            return res.status(400).json({ 
                error: 'Missing file information', 
                message: 'Either filePath or fileId is required' 
            });
        }
        
        // Check if file exists
        if (!existsSync(normalizedPath)) {
            logger.error(`File not found at path: ${normalizedPath}`);
            return res.status(400).json({ 
                error: 'File not found',
                path: normalizedPath,
                message: 'Please check if the file exists and the path is correct'
            });
        }

        // Check file permissions
        try {
            readFileSync(normalizedPath, 'utf-8');
        } catch (error) {
            logger.error(`Cannot read file at path: ${normalizedPath}`, error);
            return res.status(400).json({ 
                error: 'Cannot read file',
                path: normalizedPath,
                message: error.message
            });
        }
        
        logger.info('Analyzing file schema:', normalizedPath);
        const { data, metadata } = await FileLoader.loadFile(normalizedPath, sampleSize);
        logger.info('File loaded successfully. Metadata:', metadata);
        
        logger.info('Generating MongoDB schema using Gemini AI...');
        const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        logger.info('Schema generated:', schema);
        
        // Create a user-friendly response with column information
        const columnInfo = {};
        for (const [field, fieldSchema] of Object.entries(schema.schema)) {
            columnInfo[field] = {
                type: fieldSchema.type,
                description: fieldSchema.description,
                isRequired: fieldSchema.required || false, 
                isUnique: fieldSchema.unique || false,
                isIndex: fieldSchema.index || false,
                nullCount: metadata.nullCounts[field] || 0,
                suitableForVisualization: isSuitableForVisualization(field, fieldSchema.type)
            };
        }
        
        const schemaInfo = {
            suggestedCollectionName: schema.collection_name,
            totalRows: metadata.totalRows,
            sampleSize: metadata.sampleSize,
            columns: columnInfo,
            sampleData: metadata.sampleData.slice(0, 5) // First 5 rows as sample
        };
        
        res.json(schemaInfo);
    } catch (error) {
        logger.error('Error in /api/analyze/schema:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

// New Schema Analysis Endpoint with consistent API structure
app.post('/api/analysis/schema', async (req, res) => {
    const { filePath, fileId, sampleSize = 100 } = req.body;

    try {
        logger.info('Received schema analysis request to /api/analysis/schema:', req.body);
        
        let normalizedPath;
        
        // Handle either direct filePath or uploaded fileId
        if (filePath) {
            normalizedPath = path.normalize(filePath);
            logger.info(`Using provided file path: ${normalizedPath}`);
        } else if (fileId) {
            normalizedPath = path.join(uploadsDir, fileId);
            logger.info(`Using uploaded file: ${normalizedPath}`);
        } else {
            logger.error('No filePath or fileId provided in request');
            return res.status(400).json({ 
                success: false,
                error: 'Missing file information', 
                message: 'Either filePath or fileId is required' 
            });
        }
        
        // Check if file exists
        if (!existsSync(normalizedPath)) {
            logger.error(`File not found at path: ${normalizedPath}`);
            return res.status(400).json({ 
                success: false,
                error: 'File not found',
                path: normalizedPath,
                message: 'Please check if the file exists and the path is correct'
            });
        }

        // Check file permissions
        try {
            readFileSync(normalizedPath, 'utf-8');
        } catch (error) {
            logger.error(`Cannot read file at path: ${normalizedPath}`, error);
            return res.status(400).json({ 
                success: false,
                error: 'Cannot read file',
                path: normalizedPath,
                message: error.message
            });
        }
        
        logger.info('Analyzing file schema:', normalizedPath);
        const { data, metadata } = await FileLoader.loadFile(normalizedPath, sampleSize);
        logger.info('File loaded successfully. Metadata:', metadata);
        
        logger.info('Generating MongoDB schema using Gemini AI...');
        const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        logger.info('Schema generated:', schema);
        
        // Create a user-friendly response with column information
        const columnInfo = {};
        for (const [field, fieldSchema] of Object.entries(schema.schema)) {
            columnInfo[field] = {
                type: fieldSchema.type,
                description: fieldSchema.description,
                isRequired: fieldSchema.required || false, 
                isUnique: fieldSchema.unique || false,
                isIndex: fieldSchema.index || false,
                nullCount: metadata.nullCounts[field] || 0,
                suitableForVisualization: isSuitableForVisualization(field, fieldSchema.type)
            };
        }
        
        const schemaInfo = {
            success: true,
            suggestedCollectionName: schema.collection_name,
            totalRows: metadata.totalRows,
            sampleSize: metadata.sampleSize,
            columns: columnInfo,
            sampleData: metadata.sampleData.slice(0, 5), // First 5 rows as sample
            fileInfo: {
                path: normalizedPath,
                id: fileId || path.basename(normalizedPath)
            }
        };
        
        res.json(schemaInfo);
    } catch (error) {
        logger.error('Error in /api/analysis/schema:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Helper function to determine if a column is suitable for visualization
function isSuitableForVisualization(field, type) {
    // Numeric fields are good for measures (y-axis, sizes, etc)
    if (type === 'double' || type === 'int' || type === 'number' || type === 'decimal') {
        return {
            suitable: true,
            recommendedUses: ['measure', 'y-axis', 'value', 'size'],
            reason: 'Numeric fields work well for measures in charts'
        };
    }
    
    // Date fields are good for time-series
    if (type === 'date' || type === 'timestamp') {
        return {
            suitable: true,
            recommendedUses: ['dimension', 'x-axis', 'time-series'],
            reason: 'Date fields work well for time-series visualizations'
        };
    }
    
    // String/text fields are good for categories
    if (type === 'string' || type === 'text') {
        return {
            suitable: true,
            recommendedUses: ['dimension', 'category', 'label', 'group-by'],
            reason: 'Text fields work well as categories or labels'
        };
    }
    
    // Boolean fields
    if (type === 'boolean') {
        return {
            suitable: true,
            recommendedUses: ['filter', 'segment'],
            reason: 'Boolean fields work well for filtering or segmenting data'
        };
    }
    
    // For other types
    return {
        suitable: false,
        recommendedUses: [],
        reason: 'This data type may not be ideal for visualizations'
    };
}

// Visualization Recommendations Endpoint (New Structure)
app.post('/api/visualizations/recommend', async (req, res) => {
    const { filePath, fileId, collectionName, sampleSize = 100 } = req.body;

    try {
        logger.info('Received visualization recommendations request:', req.body);
        
        let metadata;
        let schema;
        let sourceInfo = {};
        
        if (collectionName) {
            // Using existing collection
            logger.info(`Analyzing existing collection: ${collectionName}`);
            const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
            if (!collectionInfo) {
                return res.status(404).json({ success: false, error: `Collection '${collectionName}' not found` });
            }
            if (collectionInfo.count === 0) {
                return res.status(400).json({ success: false, error: 'Collection is empty' });
            }
            const sampleData = await dbHandler.getSampleData(collectionName, sampleSize);
            metadata = {
                totalRows: collectionInfo.count,
                columns: Object.keys(collectionInfo.schema || {}),
                sampleData: sampleData,
                sampleSize: sampleData.length,
                schema: collectionInfo.schema // Include schema for context
            };
            schema = { // Construct schema object expected by Gemini
                collection_name: collectionName,
                schema: collectionInfo.schema
            };
            sourceInfo = { type: 'collection', name: collectionName };
        } else {
            // Using file path or ID
            let normalizedPath;
            if (filePath) {
                normalizedPath = path.normalize(filePath);
                logger.info(`Using provided file path: ${normalizedPath}`);
                sourceInfo = { type: 'file', path: normalizedPath };
            } else if (fileId) {
                normalizedPath = path.join(uploadsDir, fileId);
                logger.info(`Using uploaded file: ${normalizedPath}`);
                 sourceInfo = { type: 'file', id: fileId, path: normalizedPath };
            } else {
                logger.error('No file or collection information provided');
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing information', 
                    message: 'Either file information (filePath/fileId) or collectionName is required' 
                });
            }

            // Check file existence and permissions
            if (!existsSync(normalizedPath)) {
                return res.status(400).json({ success: false, error: 'File not found', path: normalizedPath });
            }
            try { readFileSync(normalizedPath); } catch (e) { 
                return res.status(400).json({ success: false, error: 'Cannot read file', path: normalizedPath, message: e.message });
            }
            
            // Load file and generate schema
            logger.info('Loading file for recommendations:', normalizedPath);
            const fileData = await FileLoader.loadFile(normalizedPath, sampleSize);
            metadata = fileData.metadata;
            
            logger.info('Generating schema from file metadata');
            schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        }
        
        // Generate visualization recommendations
        logger.info('Generating visualization recommendations via Gemini...');
        const recommendationsResult = await gemini.generateVisualizationRecommendations(metadata, schema);
        logger.info('Visualization recommendations generated successfully.');
        
        // --- Caching Logic --- 
        const recommendationCacheId = crypto.randomBytes(16).toString('hex');
        const detailedRecommendations = recommendationsResult.visualizations.map(vis => ({
             // Store all relevant details needed for generation later
                id: vis.id,
             title: vis.title,
             description: vis.description,
             type: vis.type,
             dimensions: vis.data ? vis.data.dimensions : [],
             echartsConfigHints: vis.echarts_config ? {
                 title: vis.echarts_config.title,
                 tooltip: vis.echarts_config.tooltip || { trigger: 'axis' },
                 legend: vis.echarts_config.legend,
                 xAxis: vis.echarts_config.xAxis,
                 yAxis: vis.echarts_config.yAxis
             } : {}
             // Note: We don't store the static preview data in the cache
         }));
         
         recommendationCache.set(recommendationCacheId, { 
             timestamp: Date.now(),
             collectionName: schema.collection_name, // Store associated collection
             recommendations: detailedRecommendations 
         });
         logger.info(`Stored recommendations under cache ID: ${recommendationCacheId}`);
         // ---------------------
        
        // Prepare simplified response suitable for frontend recommendations
        const responsePayload = {
            recommendationCacheId: recommendationCacheId, // <-- Return the cache ID
            source_info: sourceInfo,
            dataset_info: recommendationsResult.dataset_info,
            analysis_summary: recommendationsResult.analysis_summary,
            // Return simplified recommendations for UI display (as before)
            recommended_visualizations: recommendationsResult.visualizations.map(vis => ({
                id: vis.id, // This is the ID within the set
                title: vis.title,
                description: vis.description,
                type: vis.type,
                suggestedDimensions: vis.data ? vis.data.dimensions : [],
                echartsConfigHints: vis.echarts_config ? {
                    title: vis.echarts_config.title,
                    tooltip: vis.echarts_config.tooltip || { trigger: 'axis' }, 
                    legend: vis.echarts_config.legend,
                    xAxis: vis.echarts_config.xAxis,
                    yAxis: vis.echarts_config.yAxis
                } : {},
                preview: generatePreviewForVisualization(vis.type)
            }))
        };
        
        res.json({ success: true, recommendations: responsePayload }); // Embed under 'recommendations'
    } catch (error) {
        logger.error('Error in /api/visualizations/recommend:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack // Include stack in dev mode maybe
        });
    }
});

// Helper function to generate simple preview data for visualizations
function generatePreviewForVisualization(type) {
    // Generate simple sample data for visualization previews
    switch (type) {
        case 'bar_chart':
        case 'bar':
            return {
                preview: true,
                data: [
                    { category: 'A', value: 120 },
                    { category: 'B', value: 200 },
                    { category: 'C', value: 150 },
                    { category: 'D', value: 80 },
                    { category: 'E', value: 170 }
                ]
            };
        case 'line_chart':
        case 'line':
            return {
                preview: true,
                data: Array.from({ length: 7 }, (_, i) => ({
                    date: `Day ${i+1}`,
                    value: Math.floor(Math.random() * 100 + 50)
                }))
            };
        case 'pie_chart':
        case 'pie':
            return {
                preview: true,
                data: [
                    { name: 'Category A', value: 30 },
                    { name: 'Category B', value: 50 },
                    { name: 'Category C', value: 20 }
                ]
            };
        case 'scatter_chart':
        case 'scatter':
            return {
                preview: true,
                data: Array.from({ length: 10 }, () => ({
                    x: Math.random() * 100,
                    y: Math.random() * 100
                }))
            };
        default:
            return {
                preview: true,
                message: "Preview not available for this visualization type"
            };
    }
}

// Generate Visualizations Endpoint (New Structure)
app.post('/api/visualizations/generate', async (req, res) => {
    // Input options: 
    // 1. recommendationCacheId + selectedRecommendationIds
    // 2. collectionName + visualizations: [{ id, type, title, ... }]
    const { recommendationCacheId, selectedRecommendationIds, collectionName: collectionNameFromBody, visualizations: visualizationsFromBody } = req.body;

    let collectionName; 
    let visualizationsToGenerate = [];

    try {
        logger.info('Received visualization generation request:', req.body);

        // --- Logic to determine input type and prepare visualizations --- 
        if (recommendationCacheId && Array.isArray(selectedRecommendationIds)) {
            logger.info(`Generating based on cache ID: ${recommendationCacheId} and selected IDs: ${selectedRecommendationIds.join(', ')}`);
            
            // Retrieve from cache
            const cachedData = recommendationCache.get(recommendationCacheId);
            if (!cachedData) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Recommendations not found or expired', 
                    message: `Cache ID ${recommendationCacheId} is invalid or has expired.` 
                });
            }
            
            collectionName = cachedData.collectionName; // Get collection name from cache
            const allCachedRecommendations = cachedData.recommendations;
            
            // Filter based on selected IDs and reconstruct needed details
            visualizationsToGenerate = allCachedRecommendations
                .filter(rec => selectedRecommendationIds.includes(rec.id))
                .map(rec => ({ // Rebuild structure needed for generation loop
                    id: rec.id,
                    type: rec.type,
                    title: rec.title,
                    description: rec.description,
                    dimensions: rec.dimensions, // Use dimensions from cache
                    optionsOverride: rec.echartsConfigHints // Can use hints as base override if needed
                }));
            
             if (visualizationsToGenerate.length !== selectedRecommendationIds.length) {
                 logger.warn(`Some selected IDs not found in cache ${recommendationCacheId}`);
                 // Decide if this is an error or just generate the ones found
             }
             if (visualizationsToGenerate.length === 0) {
                 return res.status(400).json({ success: false, error: 'No matching recommendations found for selected IDs in cache.' });
             }

        } else if (collectionNameFromBody && Array.isArray(visualizationsFromBody)) {
            logger.info(`Generating based on provided visualization details for collection: ${collectionNameFromBody}`);
            collectionName = collectionNameFromBody;
            visualizationsToGenerate = visualizationsFromBody;
        } else {
            // Neither valid input format was provided
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid parameters', 
                message: 'Request must contain either (recommendationCacheId and selectedRecommendationIds) or (collectionName and visualizations array).' 
            });
        }
        // --- End of input preparation logic ---

        // Ensure we have a collection name at this point
        if (!collectionName) {
             return res.status(400).json({ success: false, error: 'Collection name could not be determined.' });
        }
        
        // Check if collection exists (using the determined collectionName)
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({ success: false, error: `Collection '${collectionName}' not found` });
        }
        if (collectionInfo.count === 0) {
             return res.status(400).json({ success: false, error: `Collection '${collectionName}' is empty, cannot generate visualizations.` });
        }
        // --- >>>> Get the schema from collectionInfo
        const schemaForQuery = collectionInfo.schema;

        const collection = dbHandler.db.collection(collectionName);
        const generatedCharts = [];

        logger.info('Generating data queries and ECharts options for visualizations...');
        // Use the prepared 'visualizationsToGenerate' array for the loop
        for (const visConfig of visualizationsToGenerate) {
             let chartOption = null;
             let error = null;
            try {
                logger.info(`Processing visualization request: ${visConfig.title || visConfig.type}`);
                
                // Prepare visualization object for query generation
                const visForQuery = {
                     id: visConfig.id || new Date().getTime().toString(),
                     type: visConfig.type,
                     title: visConfig.title,
                     description: visConfig.description,
                     echarts_config: visConfig.optionsOverride || { title: { text: visConfig.title } } 
                 };
                 
                 // Use dimensions from the prepared visConfig
                 if (visConfig.dimensions) {
                     visForQuery.data = { dimensions: visConfig.dimensions };
                 }

                // 1. Generate query configuration using Gemini
                // --- >>>> Pass the schema to the query generation function
                const queryConfigResult = await gemini.generateVisualizationDataQuery(visForQuery, dbHandler, collectionName, schemaForQuery);
                logger.info('Query config generated:', JSON.stringify(queryConfigResult));
                
                if (!queryConfigResult || !queryConfigResult.pipeline || !Array.isArray(queryConfigResult.pipeline)) {
                    throw new Error(`Invalid query configuration received from AI for ${visForQuery.title}.`);
                }

                // 2. Execute the MongoDB query
                const queryResults = await dbHandler.executeQuery(collection, { aggregate: queryConfigResult.pipeline });
                logger.info(`Query executed for ${visForQuery.title}. Results count: ${queryResults.length}`);
                
                // 3. Construct the final ECharts option object
                chartOption = {
                    ...(queryConfigResult.visualization?.option || {}),
                    ...(visConfig.optionsOverride || {}),
                    title: { text: visConfig.title || visForQuery.title, ...(visConfig.optionsOverride?.title || queryConfigResult.visualization?.option?.title || {}) },
                    tooltip: { ...(queryConfigResult.visualization?.option?.tooltip || { trigger: 'axis' }), ...(visConfig.optionsOverride?.tooltip || {}) },
                    legend: { ...(queryConfigResult.visualization?.option?.legend || {}), ...(visConfig.optionsOverride?.legend || {}) },
                    grid: { ...(queryConfigResult.visualization?.option?.grid || { containLabel: true }), ...(visConfig.optionsOverride?.grid || {}) }, 
                    dataset: {
                        source: queryResults, 
                        dimensions: queryConfigResult.visualization?.data?.dimensions 
                    },
                    series: queryConfigResult.visualization?.option?.series || [] 
                };
                
                 if (chartOption.series.length === 0 && queryResults.length > 0) {
                     logger.warn(`AI did not provide series configuration for ${visConfig.title}. Applying basic series.`);
                     const firstDimension = queryConfigResult.visualization?.data?.dimensions[0];
                     const otherDimensions = queryConfigResult.visualization?.data?.dimensions.slice(1);
                     chartOption.series = otherDimensions.map(dim => ({ type: visConfig.type || 'bar' })); 
                 }
                 
            } catch (e) {
                logger.error(`Error processing visualization ${visConfig.title || visConfig.id}:`, e);
                error = { message: e.message, stack: e.stack };
            }
            generatedCharts.push({ 
                 id: visConfig.id, 
                 title: visConfig.title,
                 type: visConfig.type,
                 options: chartOption, 
                 error: error
            });
        }
        
        const output = {
            success: true,
            collection: collectionName,
            generatedVisualizations: generatedCharts
        };
        
        res.json(output);
    } catch (error) {
        logger.error('Error in /api/visualizations/generate:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// API Routes
app.post('/api/analyze', async (req, res) => {
    const { filePath, fileId, sampleSize = 100, dropCollection = false } = req.body;

    try {
        logger.info('Received analyze request:', req.body);
        
        let normalizedPath;
        
        // Handle either direct filePath or uploaded fileId
        if (filePath) {
            // Direct file path provided
            normalizedPath = path.normalize(filePath);
            logger.info(`Using provided file path: ${normalizedPath}`);
        } else if (fileId) {
            // FileId from previous upload
            normalizedPath = path.join(uploadsDir, fileId);
            logger.info(`Using uploaded file: ${normalizedPath}`);
        } else {
            logger.error('No filePath or fileId provided in request');
            return res.status(400).json({ 
                error: 'Missing file information', 
                message: 'Either filePath or fileId is required' 
            });
        }
        
        // Check if file exists
        if (!existsSync(normalizedPath)) {
            logger.error(`File not found at path: ${normalizedPath}`);
            return res.status(400).json({ 
                error: 'File not found',
                path: normalizedPath,
                message: 'Please check if the file exists and the path is correct'
            });
        }

        // Check file permissions
        try {
            readFileSync(normalizedPath, 'utf-8');
        } catch (error) {
            logger.error(`Cannot read file at path: ${normalizedPath}`, error);
            return res.status(400).json({ 
                error: 'Cannot read file',
                path: normalizedPath,
                message: error.message
            });
        }
        
        logger.info('Analyzing data file:', normalizedPath);
        // Use FileLoader.loadFile as a static method
        const { data, metadata } = await FileLoader.loadFile(normalizedPath, sampleSize);
        logger.info('File loaded successfully. Metadata:', metadata);
        
        logger.info('Generating MongoDB schema using Gemini AI...');
        const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        logger.info('Schema generated:', schema);
        
        // Drop the collection if requested
        if (dropCollection && schema.collection_name) {
            try {
                logger.info(`Dropping collection ${schema.collection_name} as requested`);
                await dbHandler.db.collection(schema.collection_name).drop();
                logger.info(`Collection ${schema.collection_name} dropped successfully`);
            } catch (error) {
                // Ignore if collection doesn't exist
                if (error.code !== 26) { // 26 is the error code for collection not found
                    logger.warn(`Error dropping collection: ${error.message}`);
                }
            }
        }
        
        logger.info('Creating MongoDB collection with schema...');
        const collection = await dbHandler.createCollectionWithSchema(schema);
        logger.info('Collection created successfully');
        
        logger.info('Importing data into MongoDB...');
        const insertedCount = await dbHandler.insertData(collection, data, schema);
        logger.info(`Data imported successfully. Inserted ${insertedCount} documents.`);
        
        logger.info('Generating visualization recommendations...');
        const visualizations = await gemini.generateVisualizationRecommendations(metadata, schema);
        logger.info('Visualizations generated:', visualizations);
        
        // Generate and execute MongoDB queries for each visualization
        logger.info('Generating data queries for visualizations...');
        for (const vis of visualizations.visualizations) {
            try {
                logger.info(`Processing visualization: ${vis.title}`);
                const collectionName = schema.collection_name;
                
                // Generate query configuration
                const queryConfig = await gemini.generateVisualizationDataQuery(vis, dbHandler, collectionName);
                logger.info('Query config generated:', queryConfig);
                
                if (!queryConfig || !queryConfig.pipeline || !Array.isArray(queryConfig.pipeline)) {
                    logger.warn(`Invalid query configuration for ${vis.title}. Using default query.`);
                    // Use a simple default query if the generated one is invalid
                    queryConfig.pipeline = [
                        { $limit: 50 }
                    ];
                }
                
                // Execute query
                const visCollection = dbHandler.db.collection(collectionName);
                const queryResults = await dbHandler.executeQuery(visCollection, { aggregate: queryConfig.pipeline });
                logger.info(`Query executed. Results count: ${queryResults.length}`);
                
                if (queryResults.length === 0) {
                    logger.warn(`No data returned for visualization: ${vis.title}. Using sample data instead.`);
                    // If no results, create some sample data for demonstration
                    if (vis.type === 'bar_chart' || vis.type === 'bar') {
                        queryResults.push({ category: 'Sample A', value: 120 });
                        queryResults.push({ category: 'Sample B', value: 200 });
                        queryResults.push({ category: 'Sample C', value: 150 });
                    } else if (vis.type === 'line_chart' || vis.type === 'line') {
                        for (let i = 0; i < 10; i++) {
                            queryResults.push({ 
                                date: new Date(2023, i, 1).toISOString().split('T')[0], 
                                value: Math.floor(Math.random() * 1000) 
                            });
                        }
                    } else if (vis.type === 'pie_chart' || vis.type === 'pie') {
                        queryResults.push({ name: 'Category A', value: 30 });
                        queryResults.push({ name: 'Category B', value: 50 });
                        queryResults.push({ name: 'Category C', value: 20 });
                    } else if (vis.type === 'scatter_chart' || vis.type === 'scatter') {
                        for (let i = 0; i < 20; i++) {
                            queryResults.push({ 
                                x: Math.random() * 100, 
                                y: Math.random() * 100 
                            });
                        }
                    }
                }
                
                // Update visualization with data
                vis.data = {
                    source: queryResults,
                    dimensions: queryConfig.visualization.data.dimensions
                };
                
                // Update ECharts configuration
                vis.option = {
                    ...vis.echarts_config,
                    dataset: {
                        source: queryResults,
                        dimensions: queryConfig.visualization.data.dimensions
                    }
                };
                
                if (!vis.option.series && queryConfig.visualization.option && queryConfig.visualization.option.series) {
                    vis.option.series = queryConfig.visualization.option.series;
                }
            } catch (error) {
                logger.error(`Error processing visualization ${vis.title}:`, error);
                // Continue with next visualization
            }
        }
        
        const output = {
            dataset_info: visualizations.dataset_info,
            visualizations: visualizations.visualizations.map(vis => {
                // Ensure visualization has proper data and options 
                return {
                    id: vis.id,
                    title: vis.title,
                    description: vis.description,
                    type: vis.type,
                    data: vis.data || { source: [], dimensions: [] },
                    option: vis.option || vis.echarts_config || {},
                    preprocessing: vis.preprocessing || []
                };
            }),
            analysis_summary: visualizations.analysis_summary
        };
        
        logger.info('Sending response with output:', output);
        res.json(output);
    } catch (error) {
        logger.error('Error in /api/analyze:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack,
            path: filePath // Now filePath is in scope
        });
    }
});

app.get('/api/collections', async (req, res) => {
    try {
        const collections = await dbHandler.db.listCollections().toArray();
        // Fetch additional info for each collection
        const collectionsInfo = await Promise.all(collections.map(async (col) => {
            try {
                 const info = await dbHandler.getCollectionInfo(col.name);
                 return {
                     name: col.name,
                     count: info.count || 0,
                     schema: info.schema || {}
                     // Add other relevant info if needed, e.g., size, indexes
                 };
            } catch (infoError) {
                 logger.error(`Error getting info for collection ${col.name}:`, infoError);
                 return { name: col.name, count: 0, schema: {}, error: 'Failed to retrieve details' };
            }
        }));
        
        res.json({
            success: true, 
            collections: collectionsInfo
        });
    } catch (error) {
        logger.error('Error in /api/collections:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.get('/api/collections/:name', async (req, res) => {
    try {
        const collectionName = req.params.name;
        const collectionsList = await dbHandler.db.listCollections({ name: collectionName }).toArray();
        if (collectionsList.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: `Collection '${collectionName}' not found` 
            });
        }
        
        const info = await dbHandler.getCollectionInfo(collectionName);
        res.json({ 
            success: true, 
            collection: {
                name: collectionName,
                ...info
            }
        });
    } catch (error) {
        logger.error('Error in /api/collections/:name:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get data from a collection
app.get('/api/collections/:name/data', async (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 100, skip = 0, sort, filter } = req.query;
        
        logger.info(`Fetching data from collection ${name} with params:`, { limit, skip, sort, filter });
        
        // Check if collection exists
        const collectionsList = await dbHandler.db.listCollections({ name }).toArray();
        if (collectionsList.length === 0) {
            return res.status(404).json({ 
                 success: false,
                 error: `Collection '${name}' not found` 
            });
        }
        
        const collection = dbHandler.db.collection(name);
        
        // Parse query parameters
        const queryOptions = {
            limit: parseInt(limit),
            skip: parseInt(skip),
            sort: {} // Initialize sort object
        };
        
        // Parse sort parameter safely
        if (sort) {
            try {
                 queryOptions.sort = JSON.parse(sort);
            } catch (sortError) {
                 logger.warn('Invalid sort parameter format. Using default sort.');
                 queryOptions.sort = { _id: 1 };
            }
        } else {
            queryOptions.sort = { _id: 1 }; // Default sort
        }
        
        // Parse filter parameter safely
        let queryFilter = {};
        if (filter) {
            try {
                 queryFilter = JSON.parse(filter);
            } catch (filterError) {
                 logger.warn('Invalid filter parameter format. Ignoring filter.');
                 queryFilter = {};
            }
        }
        
        // Execute query
        const data = await collection.find(queryFilter, queryOptions).toArray();
        const total = await collection.countDocuments(queryFilter);
        
        res.json({
            success: true,
            data,
            metadata: {
                collection: name,
                total,
                limit: queryOptions.limit,
                skip: queryOptions.skip,
                filter: queryFilter,
                sort: queryOptions.sort,
                hasMore: total > (queryOptions.skip + data.length)
            }
        });
    } catch (error) {
        logger.error(`Error fetching data from collection ${req.params.name}:`, error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            message: 'Failed to fetch collection data'
        });
    }
});

// Delete a collection
app.delete('/api/collections/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { force } = req.query;
        
        logger.info(`Request to delete collection: ${name}`);
        
        // Check if collection exists
        const collectionsList = await dbHandler.db.listCollections({ name }).toArray();
        if (collectionsList.length === 0) {
            logger.warn(`Collection '${name}' not found during delete request (case-sensitive).`); // Added log
            return res.status(404).json({ 
                success: false,
                error: `Collection '${name}' not found` 
            });
        }
        
        // Get document count to warn about large collections
        const collection = dbHandler.db.collection(name);
        const count = await collection.countDocuments();
        
        // If collection has more than 1000 documents and force is not true, return a warning
        if (count > 1000 && force !== 'true') {
            return res.status(400).json({
                success: false, // Indicate failure due to needing force
                error: 'Collection is large',
                message: `Collection '${name}' contains ${count} documents. Use 'force=true' query parameter to confirm deletion.`,
                documentCount: count
            });
        }
        
        // Delete the collection
        const dropResult = await dbHandler.db.collection(name).drop();
        
        if (dropResult) {
             logger.info(`Collection '${name}' deleted successfully`);
        res.json({
            success: true,
            message: `Collection '${name}' deleted successfully`,
            documentCount: count
        });
        } else {
             logger.error(`Failed to drop collection '${name}'`);
             // This case might be rare if listCollections check passes, but good to handle
        res.status(500).json({ 
                success: false,
                error: `Failed to drop collection '${name}'. It might have been deleted concurrently.`
             });
        }
       
        } catch (error) {
        // Handle potential errors during drop operation (e.g., permissions)
        logger.error(`Error deleting collection ${req.params.name}:`, error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            message: 'Failed to delete collection'
        });
    }
});

// Google Sheets API Routes
app.get('/api/datasources/google/auth', (req, res) => {
    try {
        const authUrl = googleSheets.getAuthUrl();
        res.json({ 
            success: true,
            authUrl 
        });
    } catch (error) {
        logger.error('Error getting Google auth URL:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.get('/api/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ 
                success: false,
                error: 'Authorization code is required' 
            });
        }
        
        const tokens = await googleSheets.exchangeCode(code);
        
        // In a production app, store tokens securely for the user
        // For now, we'll just return them to the client
        res.json({ 
            success: true, 
            message: 'Successfully authenticated with Google',
            tokens
        });
    } catch (error) {
        logger.error('Error in Google auth callback:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.post('/api/google/set-credentials', (req, res) => {
    try {
        const { tokens } = req.body;
        
        if (!tokens) {
            return res.status(400).json({ 
                success: false,
                error: 'Tokens are required' 
            });
        }
        
        googleSheets.setCredentials(tokens);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error setting Google credentials:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.get('/api/datasources/google/sheets', async (req, res) => {
    try {
        const spreadsheets = await googleSheets.listSpreadsheets();
        res.json({
            success: true,
            sheets: spreadsheets.map(sheet => ({
                id: sheet.id,
                name: sheet.name,
                createdTime: sheet.createdTime,
                modifiedTime: sheet.modifiedTime,
                webViewLink: sheet.webViewLink
            }))
        });
    } catch (error) {
        logger.error('Error listing Google spreadsheets:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

app.get('/api/datasources/google/sheets/:id/tabs', async (req, res) => {
    try {
        const { id } = req.params;
        const sheets = await googleSheets.listSheets(id);
        res.json({
            success: true,
            spreadsheetId: id,
            tabs: sheets
        });
    } catch (error) {
        logger.error(`Error listing tabs for spreadsheet ${req.params.id}:`, error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Analyze a Google Sheet
app.post('/api/datasources/google/sheets/analyze', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, sampleSize = 100 } = req.body;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Empty sheet', 
                message: 'The specified sheet contains no data or is improperly formatted' 
            });
        }
        
        // Analyze data and generate metadata
        const metadata = googleSheets.analyzeSheetData(data, headers, sampleSize);
        
        // Generate MongoDB schema using Gemini AI
        const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        
        // Create a user-friendly response with column information (same as in /api/analyze/schema)
        const columnInfo = {};
        for (const [field, fieldSchema] of Object.entries(schema.schema)) {
            columnInfo[field] = {
                type: fieldSchema.type,
                description: fieldSchema.description,
                isRequired: fieldSchema.required || false, 
                isUnique: fieldSchema.unique || false,
                isIndex: fieldSchema.index || false,
                nullCount: metadata.nullCounts[field] || 0,
                suitableForVisualization: isSuitableForVisualization(field, fieldSchema.type)
            };
        }
        
        const schemaInfo = {
            success: true,
            suggestedCollectionName: schema.collection_name,
            totalRows: metadata.totalRows,
            sampleSize: metadata.sampleSize,
            columns: columnInfo,
            sampleData: metadata.sampleData.slice(0, 5), // First 5 rows as sample
            fileInfo: {
                path: spreadsheetId,
                id: sheetName
            }
        };
        
        res.json(schemaInfo);
    } catch (error) {
        logger.error('Error analyzing Google sheet:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Import data from Google Sheets
app.post('/api/import/google', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, collectionName, dropCollection = false } = req.body;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Empty sheet', 
                message: 'The specified sheet contains no data or is improperly formatted' 
            });
        }
        
        // Analyze data and generate metadata
        const metadata = googleSheets.analyzeSheetData(data, headers);
        
        // Generate MongoDB schema
        const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        
        // Use provided collection name if specified
        if (collectionName) {
            schema.collection_name = collectionName;
        }
        
        // Drop existing collection if requested
        if (dropCollection) {
            try {
                logger.info(`Dropping collection ${schema.collection_name} as requested`);
                await dbHandler.db.collection(schema.collection_name).drop();
            } catch (error) {
                // Ignore if collection doesn't exist
                if (error.code !== 26) {
                    logger.warn(`Error dropping collection: ${error.message}`);
                }
            }
        }
        
        // Create collection and import data
        const collection = await dbHandler.createCollectionWithSchema(schema);
        const insertedCount = await dbHandler.insertData(collection, data, schema);
        
        res.json({
            success: true,
            message: `Successfully imported ${insertedCount} documents`,
            collection: schema.collection_name,
            totalRows: data.length,
            insertedCount,
            schema: {
                name: schema.collection_name,
                fields: Object.keys(schema.schema || {}),
                source: {
                    type: 'google_sheets',
                    spreadsheetId,
                    sheetName
                }
            }
        });
    } catch (error) {
        logger.error('Error importing Google sheet:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get data directly from a Google Sheet without importing
app.get('/api/datasources/google/sheets/data', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, limit = 100 } = req.query;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Check if credentials are set
        if (!googleSheets.oauth2Client.credentials) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized',
                message: 'You need to authenticate with Google first'
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Empty sheet', 
                message: 'The specified sheet contains no data or is improperly formatted' 
            });
        }
        
        // Limit the number of rows returned
        const limitedData = data.slice(0, parseInt(limit));
        
        // Get information about the spreadsheet and its sheets
        const spreadsheetInfo = await googleSheets.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId
        });
        
        const sheetsList = spreadsheetInfo.data.sheets.map(sheet => ({
            id: sheet.properties.sheetId,
            title: sheet.properties.title,
            index: sheet.properties.index,
            rowCount: sheet.properties.gridProperties.rowCount,
            columnCount: sheet.properties.gridProperties.columnCount
        }));
        
        res.json({
            success: true,
            data: limitedData,
            metadata: {
                spreadsheetId,
                spreadsheetTitle: spreadsheetInfo.data.properties.title,
                sheetName,
                totalRows: data.length,
                returnedRows: limitedData.length,
                headers,
                sheets: sheetsList
            }
        });
    } catch (error) {
        logger.error('Error fetching Google sheet data:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            message: 'Failed to fetch data from Google Sheet'
        });
    }
});

// Initialize Dashboard model
import Dashboard from './models/Dashboard.js';
const dashboardModel = new Dashboard(dbHandler.db);

// Dashboard endpoints
app.post('/api/dashboards', async (req, res) => {
    try {
        const { name, description, layout, visualizations } = req.body;
        
        if (!name || !layout) {
            return res.status(400).json({ error: 'Name and layout are required' });
        }

        const dashboardId = await dashboardModel.create({
            name,
            description,
            layout,
            visualizations: visualizations || []
        });

        res.status(201).json({
            message: 'Dashboard created successfully',
            dashboardId
        });
    } catch (error) {
        logger.error('Error creating dashboard:', error);
        res.status(500).json({ error: 'Failed to create dashboard' });
    }
});

app.get('/api/dashboards', async (req, res) => {
    try {
        const dashboards = await dashboardModel.getAll();
        res.json(dashboards);
    } catch (error) {
        logger.error('Error getting dashboards:', error);
        res.status(500).json({ error: 'Failed to get dashboards' });
    }
});

app.get('/api/dashboards/:id', async (req, res) => {
    try {
        const dashboard = await dashboardModel.getById(req.params.id);
        if (!dashboard) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        res.json(dashboard);
    } catch (error) {
        logger.error('Error getting dashboard:', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
    }
});

app.put('/api/dashboards/:id', async (req, res) => {
    try {
        const { name, description, layout, visualizations } = req.body;
        
        if (!name || !layout) {
            return res.status(400).json({ error: 'Name and layout are required' });
        }

        const success = await dashboardModel.update(req.params.id, {
            name,
            description,
            layout,
            visualizations: visualizations || []
        });

        if (!success) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }

        res.json({ message: 'Dashboard updated successfully' });
    } catch (error) {
        logger.error('Error updating dashboard:', error);
        res.status(500).json({ error: 'Failed to update dashboard' });
    }
});

app.delete('/api/dashboards/:id', async (req, res) => {
    try {
        const success = await dashboardModel.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Dashboard not found' });
        }
        res.json({ message: 'Dashboard deleted successfully' });
    } catch (error) {
        logger.error('Error deleting dashboard:', error);
        res.status(500).json({ error: 'Failed to delete dashboard' });
    }
});

// Get AI-generated insights for a dataset
app.get('/api/insights/:collectionName', async (req, res) => {
    const { collectionName } = req.params;
    const { sampleSize = 100 } = req.query;

    try {
        logger.info(`Generating insights for collection: ${collectionName}`);
        
        // Get collection metadata and schema
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({
                error: 'Collection not found',
                message: `Collection '${collectionName}' does not exist`
            });
        }

        // Get sample data from the collection
        const sampleData = await dbHandler.getSampleData(collectionName, sampleSize);
        
        // Prepare metadata for AI analysis
        const metadata = {
            totalRows: collectionInfo.count,
            columns: Object.keys(collectionInfo.schema),
            sampleData: sampleData,
            sampleSize: sampleData.length,
            schema: collectionInfo.schema
        };

        // Generate insights using Gemini AI
        logger.info('Generating AI insights...');
        const insights = await gemini.generateDatasetInsights(metadata);
        
        // Structure the response
        const response = {
            collection_info: {
                name: collectionName,
                total_rows: collectionInfo.count,
                columns: Object.keys(collectionInfo.schema),
                schema: collectionInfo.schema
            },
            insights: {
                key_patterns: insights.key_patterns || [],
                anomalies: insights.anomalies || [],
                trends: insights.trends || [],
                statistical_summary: insights.statistical_summary || {},
                recommendations: insights.recommendations || []
            },
            analysis_summary: insights.analysis_summary || ''
        };

        res.json(response);
    } catch (error) {
        logger.error(`Error generating insights for ${collectionName}:`, error);
        res.status(500).json({
            error: 'Failed to generate insights',
            message: error.message
        });
    }
});

// Natural Language Query Endpoint
app.post('/api/query', async (req, res) => {
    const { collectionName, query, limit = 100 } = req.body;

    try {
        logger.info(`Processing natural language query for collection: ${collectionName}`);
        
        // Validate required parameters
        if (!collectionName || !query) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: 'Both collectionName and query are required'
            });
        }

        // Get collection metadata and schema
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({
                error: 'Collection not found',
                message: `Collection '${collectionName}' does not exist`
            });
        }

        // Convert natural language to MongoDB query
        const queryConfig = await gemini.convertNaturalLanguageToQuery(
            query,
            collectionName,
            collectionInfo.schema
        );

        // Execute the query
        const collection = dbHandler.db.collection(collectionName);
        let results;

        if (queryConfig.query.type === 'aggregate') {
            // Add limit to pipeline if not already present
            if (!queryConfig.query.pipeline.some(stage => stage.$limit)) {
                queryConfig.query.pipeline.push({ $limit: limit });
            }
            results = await collection.aggregate(queryConfig.query.pipeline).toArray();
        } else {
            // For find queries
            const options = {
                limit: queryConfig.query.limit || limit,
                projection: queryConfig.query.projection,
                sort: queryConfig.query.sort
            };
            results = await collection.find(queryConfig.query.filter, options).toArray();
        }

        // Prepare response
        const response = {
            collection: collectionName,
            query: queryConfig.query,
            explanation: queryConfig.explanation,
            results: results,
            count: results.length
        };

        res.json(response);
    } catch (error) {
        logger.error(`Error processing natural language query:`, error);
        res.status(500).json({
            error: 'Failed to process query',
            message: error.message
        });
    }
});

// Time Series Forecasting Endpoint
app.get('/api/forecast/:collectionName', async (req, res) => {
    const { collectionName } = req.params;
    const { periods = 12, sampleSize = 1000 } = req.query;

    try {
        logger.info(`Generating forecasts for collection: ${collectionName}`);
        
        // Get collection metadata and schema
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({
                error: 'Collection not found',
                message: `Collection '${collectionName}' does not exist`
            });
        }

        // Get sample data from the collection
        const sampleData = await dbHandler.getSampleData(collectionName, sampleSize);
        
        // Prepare metadata for forecasting
        const metadata = {
            totalRows: collectionInfo.count,
            columns: Object.keys(collectionInfo.schema),
            sampleData: sampleData,
            sampleSize: sampleData.length,
            schema: collectionInfo.schema
        };

        // Generate forecasts
        const forecasts = await gemini.generateTimeSeriesForecast(metadata, parseInt(periods));
        
        // Structure the response
        const response = {
            collection_info: {
                name: collectionName,
                total_rows: collectionInfo.count,
                columns: Object.keys(collectionInfo.schema),
                schema: collectionInfo.schema
            },
            forecast_info: {
                periods: parseInt(periods),
                sample_size: sampleData.length
            },
            analysis: forecasts.time_series_analysis,
            forecasts: forecasts.forecasts,
            insights: forecasts.insights,
            recommendations: forecasts.recommendations
        };

        res.json(response);
    } catch (error) {
        logger.error(`Error generating forecasts for ${collectionName}:`, error);
        res.status(500).json({
            error: 'Failed to generate forecasts',
            message: error.message
        });
    }
});

// Anomaly Detection Endpoint
app.get('/api/anomalies/:collectionName', async (req, res) => {
    const { collectionName } = req.params;
    const { sensitivity = 0.95, sampleSize = 1000 } = req.query;

    try {
        logger.info(`Detecting anomalies in collection: ${collectionName}`);
        
        // Get collection metadata and schema
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({
                error: 'Collection not found',
                message: `Collection '${collectionName}' does not exist`
            });
        }

        // Get sample data from the collection
        const sampleData = await dbHandler.getSampleData(collectionName, sampleSize);
        
        // Prepare metadata for anomaly detection
        const metadata = {
            totalRows: collectionInfo.count,
            columns: Object.keys(collectionInfo.schema),
            sampleData: sampleData,
            sampleSize: sampleData.length,
            schema: collectionInfo.schema
        };

        // Detect anomalies
        const anomalies = await gemini.detectAnomalies(metadata, parseFloat(sensitivity));
        
        // Structure the response
        const response = {
            collection_info: {
                name: collectionName,
                total_rows: collectionInfo.count,
                columns: Object.keys(collectionInfo.schema),
                schema: collectionInfo.schema
            },
            analysis_info: {
                sensitivity: parseFloat(sensitivity),
                sample_size: sampleData.length
            },
            data_summary: anomalies.data_summary,
            anomalies: anomalies.anomalies,
            statistical_summary: anomalies.statistical_summary,
            insights: anomalies.insights,
            recommendations: anomalies.recommendations
        };

        res.json(response);
    } catch (error) {
        logger.error(`Error detecting anomalies in ${collectionName}:`, error);
        res.status(500).json({
            error: 'Failed to detect anomalies',
            message: error.message
        });
    }
});

// Get Visualization Recommendations for a specific Collection
app.get('/api/collections/:name/visualizations', async (req, res) => {
    const { name: collectionName } = req.params;
    const { sampleSize = 100 } = req.query;

    try {
        logger.info(`Getting visualization recommendations for collection: ${collectionName}`);
        
        // Get collection metadata and schema from database
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({ success: false, error: `Collection '${collectionName}' not found` });
        }
        if (collectionInfo.count === 0) {
            return res.status(400).json({ success: false, error: 'Collection is empty, cannot generate recommendations.' });
        }

        // Get sample data from the collection
        const sampleData = await dbHandler.getSampleData(collectionName, sampleSize);
        
        // Prepare metadata in the format expected by the visualization recommendation system
        const metadata = {
            totalRows: collectionInfo.count,
            columns: Object.keys(collectionInfo.schema || {}),
            sampleData: sampleData,
            sampleSize: sampleData.length,
            schema: collectionInfo.schema // Pass schema context
        };
        
        // Construct schema object for Gemini
        const schema = { 
            collection_name: collectionName,
            schema: collectionInfo.schema
        };

        // Generate visualization recommendations using the existing Gemini interface
        logger.info('Generating visualization recommendations via Gemini...');
        const recommendationsResult = await gemini.generateVisualizationRecommendations(metadata, schema);
        logger.info('Visualization recommendations generated successfully.');
        
        // --- Caching Logic --- 
        const recommendationCacheId = crypto.randomBytes(16).toString('hex');
        const detailedRecommendations = recommendationsResult.visualizations.map(vis => ({
             id: vis.id, 
             title: vis.title,
             description: vis.description,
             type: vis.type,
             dimensions: vis.data ? vis.data.dimensions : [],
             echartsConfigHints: vis.echarts_config ? {
                 title: vis.echarts_config.title,
                 tooltip: vis.echarts_config.tooltip || { trigger: 'axis' },
                 legend: vis.echarts_config.legend,
                 xAxis: vis.echarts_config.xAxis,
                 yAxis: vis.echarts_config.yAxis
             } : {}
         }));
         
         recommendationCache.set(recommendationCacheId, { 
             timestamp: Date.now(),
             collectionName: collectionName, // Store associated collection
             recommendations: detailedRecommendations 
         });
         logger.info(`Stored recommendations under cache ID: ${recommendationCacheId} for collection ${collectionName}`);
         // ---------------------

        // Prepare the response (similar structure to POST /recommend)
        const responsePayload = {
            recommendationCacheId: recommendationCacheId, // <-- Return the cache ID
            source_info: { type: 'collection', name: collectionName },
            dataset_info: recommendationsResult.dataset_info,
            analysis_summary: recommendationsResult.analysis_summary,
            recommended_visualizations: recommendationsResult.visualizations.map(vis => ({
                id: vis.id,
                title: vis.title,
                description: vis.description,
                type: vis.type,
                suggestedDimensions: vis.data ? vis.data.dimensions : [],
                echartsConfigHints: vis.echarts_config ? {
                    title: vis.echarts_config.title,
                    tooltip: vis.echarts_config.tooltip || { trigger: 'axis' },
                    legend: vis.echarts_config.legend,
                    xAxis: vis.echarts_config.xAxis,
                    yAxis: vis.echarts_config.yAxis
                } : {},
                preview: generatePreviewForVisualization(vis.type)
            }))
        };

        res.json({ success: true, recommendations: responsePayload }); // Embed under 'recommendations'
    } catch (error) {
        logger.error(`Error in /api/collections/${collectionName}/visualizations:`, error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate visualization recommendations',
            message: error.message
        });
    }
});

// Regenerate a single Visualization with customizations
app.post('/api/visualizations/regenerate', async (req, res) => {
    // Input: collectionName, visualizationConfig: { id (optional), type, title, description, dimensions, optionsOverride }
    const { collectionName, visualizationConfig } = req.body;

    try {
        // ... validation ...
        
         // Check if collection exists AND get schema
        const collectionInfo = await dbHandler.getCollectionInfo(collectionName);
        if (!collectionInfo) {
            return res.status(404).json({ success: false, error: `Collection '${collectionName}' not found` });
        }
        if (collectionInfo.count === 0) {
             return res.status(400).json({ success: false, error: 'Cannot generate visualization for an empty collection' });
        }
        // --- >>>> Get the schema from collectionInfo
        const schemaForQuery = collectionInfo.schema;

        const collection = dbHandler.db.collection(collectionName);
        const generatedCharts = [];

        logger.info('Generating data queries and ECharts options for visualizations...');
        // Use the prepared 'visualizationsToGenerate' array for the loop
        for (const visConfig of visualizationConfig) {
             let chartOption = null;
             let error = null;
            try {
                logger.info(`Processing visualization request: ${visConfig.title || visConfig.type}`);
                
                // Prepare visualization object for query generation
                const visForQuery = {
                     id: visConfig.id || new Date().getTime().toString(),
                     type: visConfig.type,
                     title: visConfig.title,
                     description: visConfig.description,
                     echarts_config: visConfig.optionsOverride || { title: { text: visConfig.title } } 
                 };
                 
                 // Use dimensions from the prepared visConfig
                 if (visConfig.dimensions) {
                     visForQuery.data = { dimensions: visConfig.dimensions };
                 }

                // 1. Generate query configuration using Gemini
                // --- >>>> Pass the schema to the query generation function
                const queryConfigResult = await gemini.generateVisualizationDataQuery(visForQuery, dbHandler, collectionName, schemaForQuery);
                logger.info('Query config generated:', JSON.stringify(queryConfigResult));
                
                if (!queryConfigResult || !queryConfigResult.pipeline || !Array.isArray(queryConfigResult.pipeline)) {
                    throw new Error(`Invalid query configuration received from AI for ${visForQuery.title}.`);
                }

                // 2. Execute the MongoDB query
                const queryResults = await dbHandler.executeQuery(collection, { aggregate: queryConfigResult.pipeline });
                logger.info(`Query executed for ${visForQuery.title}. Results count: ${queryResults.length}`);
                
                // 3. Construct the final ECharts option object
                chartOption = {
                    ...(queryConfigResult.visualization?.option || {}),
                    ...(visConfig.optionsOverride || {}),
                    title: { text: visConfig.title || visForQuery.title, ...(visConfig.optionsOverride?.title || queryConfigResult.visualization?.option?.title || {}) },
                    tooltip: { ...(queryConfigResult.visualization?.option?.tooltip || { trigger: 'axis' }), ...(visConfig.optionsOverride?.tooltip || {}) },
                    legend: { ...(queryConfigResult.visualization?.option?.legend || {}), ...(visConfig.optionsOverride?.legend || {}) },
                    grid: { ...(queryConfigResult.visualization?.option?.grid || { containLabel: true }), ...(visConfig.optionsOverride?.grid || {}) }, 
                    dataset: {
                        source: queryResults, 
                        dimensions: queryConfigResult.visualization?.data?.dimensions 
                    },
                    series: queryConfigResult.visualization?.option?.series || [] 
                };
                
                 if (chartOption.series.length === 0 && queryResults.length > 0) {
                     logger.warn(`AI did not provide series configuration for ${visConfig.title}. Applying basic series.`);
                     const firstDimension = queryConfigResult.visualization?.data?.dimensions[0];
                     const otherDimensions = queryConfigResult.visualization?.data?.dimensions.slice(1);
                     chartOption.series = otherDimensions.map(dim => ({ type: visConfig.type || 'bar' })); 
                 }
                 
            } catch (e) {
                logger.error(`Error processing visualization ${visConfig.title || visConfig.id}:`, e);
                error = { message: e.message, stack: e.stack };
            }
            generatedCharts.push({ 
                 id: visConfig.id, 
                 title: visConfig.title,
                 type: visConfig.type,
                 options: chartOption, 
                 error: error
            });
        }
        
        const output = {
            success: true,
            collection: collectionName,
            generatedVisualizations: generatedCharts
        };
        
        res.json(output);
    } catch (error) {
        logger.error('Error in /api/visualizations/regenerate:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

// Start server
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received. Closing MongoDB connection...');
    await dbHandler.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received. Closing MongoDB connection...');
    await dbHandler.close();
    process.exit(0);
}); 