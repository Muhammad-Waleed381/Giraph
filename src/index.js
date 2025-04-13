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

// Initialize components
const gemini = new GeminiInterface();
const dbHandler = new DatabaseHandler(process.env.MONGODB_URI);
const googleSheets = new GoogleSheetsHandler();

// Connect to MongoDB
await dbHandler.connect();

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), handleMulterError, async (req, res) => {
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

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Get uploaded files
app.get('/api/uploads', async (req, res) => {
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
                id: filename, // Use filename as ID
                name: filename,
                path: filePath,
                type: fileType,
                size: stats.size,
                uploadedAt: stats.mtime.toISOString()
            };
        });
        
        const fileInfos = await Promise.all(fileInfoPromises);
        
        // Sort by upload date (newest first)
        fileInfos.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        res.json(fileInfos);
    } catch (error) {
        logger.error('Error listing uploads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete an uploaded file
app.delete('/api/uploads/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        if (!fileId) {
            return res.status(400).json({ error: 'File ID is required' });
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
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Delete the file
        await fs.unlink(filePath);
        logger.info(`File deleted: ${filePath}`);
        
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        logger.error('Error deleting file:', error);
        res.status(500).json({ error: error.message });
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

// Visualization Recommendations Endpoint
app.post('/api/analyze/recommendations', async (req, res) => {
    const { filePath, fileId, schemaInfo, sampleSize = 100 } = req.body;

    try {
        logger.info('Received visualization recommendations request:', req.body);
        
        let normalizedPath;
        let metadata;
        let schema;
        
        // If schema information is already provided, use it
        if (schemaInfo) {
            logger.info('Using provided schema information');
            schema = {
                collection_name: schemaInfo.suggestedCollectionName,
                schema: {}
            };
            
            // Convert the user-friendly schema back to the format expected by the AI
            for (const [field, info] of Object.entries(schemaInfo.columns)) {
                schema.schema[field] = {
                    type: info.type,
                    description: info.description,
                    required: info.isRequired,
                    unique: info.isUnique,
                    index: info.isIndex
                };
            }
            
            // Create minimal metadata
            metadata = {
                totalRows: schemaInfo.totalRows,
                columns: Object.keys(schemaInfo.columns),
                sampleData: schemaInfo.sampleData || [],
                sampleSize: schemaInfo.sampleData ? schemaInfo.sampleData.length : 0
            };
        } else {
            // Otherwise, we need to load the file and analyze it first
            if (filePath) {
                normalizedPath = path.normalize(filePath);
                logger.info(`Using provided file path: ${normalizedPath}`);
            } else if (fileId) {
                normalizedPath = path.join(uploadsDir, fileId);
                logger.info(`Using uploaded file: ${normalizedPath}`);
            } else {
                logger.error('No file information or schema provided');
                return res.status(400).json({ 
                    error: 'Missing information', 
                    message: 'Either file information or schema is required' 
                });
            }
            
            // Load and analyze the file
            logger.info('Loading file for recommendations:', normalizedPath);
            const fileData = await FileLoader.loadFile(normalizedPath, sampleSize);
            metadata = fileData.metadata;
            
            logger.info('Generating schema from file');
            schema = await gemini.analyzeDataAndGenerateSchema(metadata);
        }
        
        // Generate visualization recommendations
        logger.info('Generating visualization recommendations...');
        const visualizations = await gemini.generateVisualizationRecommendations(metadata, schema);
        logger.info('Visualization recommendations generated');
        
        // Prepare simplified response without data queries
        const recommendations = {
            dataset_info: visualizations.dataset_info,
            visualizations: visualizations.visualizations.map(vis => ({
                id: vis.id,
                title: vis.title,
                description: vis.description,
                type: vis.type,
                suggestedDimensions: vis.data ? vis.data.dimensions : [],
                configuration: vis.echarts_config ? {
                    title: vis.echarts_config.title,
                    xAxis: vis.echarts_config.xAxis,
                    yAxis: vis.echarts_config.yAxis
                } : {},
                preview: generatePreviewForVisualization(vis.type)
            })),
            analysis_summary: visualizations.analysis_summary
        };
        
        res.json(recommendations);
    } catch (error) {
        logger.error('Error in /api/analyze/recommendations:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
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

// Generate Visualizations Endpoint
app.post('/api/analyze/visualizations', async (req, res) => {
    const { fileId, filePath, collectionName, selectedVisualizations, customConfigurations, dropCollection = false } = req.body;

    try {
        logger.info('Received visualization generation request:', req.body);
        
        let importData = true;
        let normalizedPath;
        
        // Handle either direct filePath or uploaded fileId
        if (filePath) {
            normalizedPath = path.normalize(filePath);
            logger.info(`Using provided file path: ${normalizedPath}`);
        } else if (fileId) {
            normalizedPath = path.join(uploadsDir, fileId);
            logger.info(`Using uploaded file: ${normalizedPath}`);
        } else if (collectionName) {
            // If collectionName is provided, we'll use existing data from MongoDB
            importData = false;
            logger.info(`Using existing collection: ${collectionName}`);
        } else {
            logger.error('No file or collection information provided');
            return res.status(400).json({ 
                error: 'Missing information', 
                message: 'Either file information or collection name is required' 
            });
        }
        
        let schema;
        let data;
        let metadata;
        let collection;
        
        if (importData) {
            // Check if file exists
            if (!existsSync(normalizedPath)) {
                logger.error(`File not found at path: ${normalizedPath}`);
                return res.status(400).json({ 
                    error: 'File not found',
                    path: normalizedPath
                });
            }
            
            // Load file and analyze
            logger.info('Loading and analyzing data file');
            const fileData = await FileLoader.loadFile(normalizedPath);
            data = fileData.data;
            metadata = fileData.metadata;
            
            // Generate schema
            logger.info('Generating MongoDB schema');
            schema = await gemini.analyzeDataAndGenerateSchema(metadata);
            
            // Drop existing collection if requested
            if (dropCollection && schema.collection_name) {
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
            logger.info('Creating MongoDB collection and importing data');
            collection = await dbHandler.createCollectionWithSchema(schema);
            await dbHandler.insertData(collection, data, schema);
        } else {
            // Using existing collection
            collection = dbHandler.db.collection(collectionName);
            
            // Get collection info
            const info = await dbHandler.getCollectionInfo(collectionName);
            if (info.count === 0) {
                return res.status(400).json({
                    error: 'Empty collection',
                    message: 'The specified collection does not contain any data'
                });
            }
            
            // Get a sample of the data
            const sampleData = await collection.find({}).limit(100).toArray();
            
            // Create minimal metadata and schema
            metadata = {
                totalRows: info.count,
                columns: Object.keys(sampleData[0] || {}),
                sampleData: sampleData,
                sampleSize: sampleData.length
            };
            
            schema = {
                collection_name: collectionName
            };
        }
        
        // Generate visualization recommendations if none were provided
        let visualizations;
        if (!selectedVisualizations || selectedVisualizations.length === 0) {
            logger.info('Generating new visualization recommendations');
            visualizations = await gemini.generateVisualizationRecommendations(metadata, schema);
        } else {
            logger.info('Using provided visualization selections');
            visualizations = {
                dataset_info: {
                    name: schema.collection_name,
                    total_rows: metadata.totalRows,
                    columns: metadata.columns
                },
                visualizations: selectedVisualizations,
                analysis_summary: {
                    key_insights: [],
                    recommended_order: selectedVisualizations.map(v => v.id)
                }
            };
        }
        
        // Apply custom configurations if provided
        if (customConfigurations) {
            logger.info('Applying custom visualization configurations');
            for (const visId in customConfigurations) {
                const vis = visualizations.visualizations.find(v => v.id === visId);
                if (vis) {
                    // Merge the custom configuration with the existing one
                    vis.title = customConfigurations[visId].title || vis.title;
                    vis.description = customConfigurations[visId].description || vis.description;
                    vis.type = customConfigurations[visId].type || vis.type;
                    
                    if (customConfigurations[visId].dimensions) {
                        vis.data = vis.data || {};
                        vis.data.dimensions = customConfigurations[visId].dimensions;
                    }
                    
                    if (customConfigurations[visId].configuration) {
                        vis.echarts_config = {
                            ...(vis.echarts_config || {}),
                            ...customConfigurations[visId].configuration
                        };
                    }
                }
            }
        }
        
        // Generate and execute MongoDB queries for each visualization
        logger.info('Generating data queries for visualizations');
        for (const vis of visualizations.visualizations) {
            try {
                logger.info(`Processing visualization: ${vis.title}`);
                const collectionName = schema.collection_name;
                
                // Generate query configuration
                const queryConfig = await gemini.generateVisualizationDataQuery(vis, dbHandler, collectionName);
                logger.info('Query config generated');
                
                if (!queryConfig || !queryConfig.pipeline || !Array.isArray(queryConfig.pipeline)) {
                    logger.warn(`Invalid query configuration for ${vis.title}. Using default query.`);
                    queryConfig.pipeline = [{ $limit: 50 }];
                }
                
                // Execute query
                const queryResults = await dbHandler.executeQuery(collection, { aggregate: queryConfig.pipeline });
                logger.info(`Query executed. Results count: ${queryResults.length}`);
                
                // Add fallback sample data if no results
                if (queryResults.length === 0) {
                    logger.warn(`No data returned for ${vis.title}. Using sample data.`);
                    const sampleData = generatePreviewForVisualization(vis.type).data;
                    vis.data = {
                        source: sampleData,
                        dimensions: queryConfig.visualization.data.dimensions
                    };
                } else {
                    vis.data = {
                        source: queryResults,
                        dimensions: queryConfig.visualization.data.dimensions
                    };
                }
                
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
                // Continue with next visualization, but mark this one as failed
                vis.error = {
                    message: error.message,
                    hasError: true
                };
            }
        }
        
        const output = {
            dataset_info: visualizations.dataset_info,
            visualizations: visualizations.visualizations.map(vis => {
                return {
                    id: vis.id,
                    title: vis.title,
                    description: vis.description,
                    type: vis.type,
                    data: vis.data || { source: [], dimensions: [] },
                    option: vis.option || vis.echarts_config || {},
                    error: vis.error || null
                };
            }),
            analysis_summary: visualizations.analysis_summary
        };
        
        res.json(output);
    } catch (error) {
        logger.error('Error in /api/analyze/visualizations:', error);
        res.status(500).json({ 
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
        res.json(collections.map(col => col.name));
    } catch (error) {
        logger.error('Error in /api/collections:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/collections/:name', async (req, res) => {
    try {
        const info = await dbHandler.getCollectionInfo(req.params.name);
        res.json(info);
    } catch (error) {
        logger.error('Error in /api/collections/:name:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get data from a collection
app.get('/api/collections/:name/data', async (req, res) => {
    try {
        const { name } = req.params;
        const { limit = 100, skip = 0, sort, filter } = req.query;
        
        logger.info(`Fetching data from collection ${name} with params:`, { limit, skip, sort, filter });
        
        // Check if collection exists
        const collections = await dbHandler.db.listCollections({ name }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: `Collection '${name}' not found` });
        }
        
        const collection = dbHandler.db.collection(name);
        
        // Parse query parameters
        const queryOptions = {
            limit: parseInt(limit),
            skip: parseInt(skip),
            sort: sort ? JSON.parse(sort) : { _id: 1 } // Default sort by _id ascending
        };
        
        // Parse filter if provided
        const queryFilter = filter ? JSON.parse(filter) : {};
        
        // Execute query
        const data = await collection.find(queryFilter, queryOptions).toArray();
        const total = await collection.countDocuments(queryFilter);
        
        res.json({
            data,
            metadata: {
                total,
                limit: queryOptions.limit,
                skip: queryOptions.skip,
                hasMore: total > (queryOptions.skip + data.length)
            }
        });
    } catch (error) {
        logger.error(`Error fetching data from collection ${req.params.name}:`, error);
        res.status(500).json({ 
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
        const collections = await dbHandler.db.listCollections({ name }).toArray();
        if (collections.length === 0) {
            return res.status(404).json({ error: `Collection '${name}' not found` });
        }
        
        // Get document count to warn about large collections
        const collection = dbHandler.db.collection(name);
        const count = await collection.countDocuments();
        
        // If collection has more than 1000 documents and force is not true, return a warning
        if (count > 1000 && force !== 'true') {
            return res.status(400).json({
                error: 'Collection is large',
                message: `Collection '${name}' contains ${count} documents. Use 'force=true' query parameter to confirm deletion.`,
                documentCount: count
            });
        }
        
        // Delete the collection
        await dbHandler.db.collection(name).drop();
        logger.info(`Collection '${name}' deleted successfully`);
        
        res.json({
            success: true,
            message: `Collection '${name}' deleted successfully`,
            documentCount: count
        });
    } catch (error) {
        logger.error(`Error deleting collection ${req.params.name}:`, error);
        res.status(500).json({ 
            error: error.message,
            message: 'Failed to delete collection'
        });
    }
});

// Data Source Management Endpoint
app.get('/api/datasource', async (req, res) => {
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
                id: col.name,
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
                    id: filename,
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
                    id: sheet.id,
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
        
        // Sort by name
        allSources.sort((a, b) => a.name.localeCompare(b.name));
        
        res.json({
            sources: allSources,
            counts: {
                total: allSources.length,
                collections: collectionInfo.length,
                uploads: uploads.length,
                googleSheets: googleSheetSources.length
            }
        });
    } catch (error) {
        logger.error('Error listing data sources:', error);
        res.status(500).json({ 
            error: error.message,
            message: 'Failed to list data sources'
        });
    }
});

// Google Sheets API Routes
app.get('/api/google/auth', (req, res) => {
    try {
        const authUrl = googleSheets.getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        logger.error('Error getting Google auth URL:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
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
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/google/set-credentials', (req, res) => {
    try {
        const { tokens } = req.body;
        
        if (!tokens) {
            return res.status(400).json({ error: 'Tokens are required' });
        }
        
        googleSheets.setCredentials(tokens);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error setting Google credentials:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/google/spreadsheets', async (req, res) => {
    try {
        const spreadsheets = await googleSheets.listSpreadsheets();
        res.json(spreadsheets);
    } catch (error) {
        logger.error('Error listing Google spreadsheets:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/google/spreadsheets/:id/sheets', async (req, res) => {
    try {
        const { id } = req.params;
        const sheets = await googleSheets.listSheets(id);
        res.json(sheets);
    } catch (error) {
        logger.error(`Error listing sheets for spreadsheet ${req.params.id}:`, error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/google/analyze', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, sampleSize = 100 } = req.body;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
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
            suggestedCollectionName: schema.collection_name,
            totalRows: metadata.totalRows,
            sampleSize: metadata.sampleSize,
            columns: columnInfo,
            sampleData: metadata.sampleData.slice(0, 5), // First 5 rows as sample
            source: {
                type: 'google_sheets',
                spreadsheetId,
                sheetName
            }
        };
        
        res.json(schemaInfo);
    } catch (error) {
        logger.error('Error analyzing Google sheet:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/google/import', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, collectionName, dropCollection = false } = req.body;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
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
            insertedCount
        });
    } catch (error) {
        logger.error('Error importing Google sheet:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get data directly from a Google Sheet without importing
app.get('/api/google/data', async (req, res) => {
    try {
        const { spreadsheetId, sheetName, limit = 100 } = req.query;
        
        if (!spreadsheetId || !sheetName) {
            return res.status(400).json({ 
                error: 'Missing parameters', 
                message: 'Both spreadsheetId and sheetName are required' 
            });
        }
        
        // Check if credentials are set
        if (!googleSheets.oauth2Client.credentials) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'You need to authenticate with Google first'
            });
        }
        
        // Get sheet data
        const { data, headers } = await googleSheets.getSheetData(spreadsheetId, sheetName);
        
        if (!data || data.length === 0) {
            return res.status(400).json({ 
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
            error: error.message,
            message: 'Failed to fetch data from Google Sheet'
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