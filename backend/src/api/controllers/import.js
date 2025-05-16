import { responseFormatter } from '../../utils/responseFormatter.js';
import { ImportService } from '../../services/importService.js';
import { GoogleSheetsHandler } from '../../utils/googleSheetsHandler.js';
import { logger } from '../../utils/logger.js';
import path from 'path';
import mongoose from 'mongoose'; // Required for ObjectId if req.user._id is string

/**
 * Controller for data import operations
 */
export class ImportController {
    constructor(uploadsDir, googleSheetsHandler) { // Accept googleSheetsHandler
        this.importService = new ImportService(uploadsDir);
        // Use passed googleSheetsHandler or create new if not provided (for standalone use/testing)
        this.googleSheets = googleSheetsHandler || new GoogleSheetsHandler();
    }

    /**
     * Import data from file to collection
     */
    async importFromFile(req, res, next) {
        try {
            const { filePath, fileId, schema, collectionName, dropCollection = false, sampleSize = 100 } = req.body;
            // We won't require user ID anymore
            // const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

            // if (!userId) {
            //     logger.warn('No user ID found in request for importFromFile. Import will not be associated with a user.');
            // }
            
            if (!filePath && !fileId) {
                throw responseFormatter.error('Missing file information. Either filePath or fileId is required', 400);
            }
            
            let schemaToUse = schema;
            
            if (!schemaToUse) {
                logger.info('Schema not provided, automatically analyzing file to generate schema...');
                const dataSourceService = new (await import('../../services/dataSourceService.js')).DataSourceService(this.importService.uploadsDir);
                const analysisResult = await dataSourceService.analyzeSchema(
                    filePath || fileId,
                    !filePath, 
                    sampleSize
                );
                schemaToUse = analysisResult.schema;
                logger.info('Schema generated automatically:', schemaToUse);
            }
            
            if (!schemaToUse) {
                throw responseFormatter.error('Failed to generate schema from file', 400);
            }
            
            const importOptions = {
                collectionName,
                dropCollection,
                isId: !filePath,
                currentPage: 1,
                pageSize: 1000,
                // We won't pass userId anymore
                // userId 
            };

            const initialResult = await this.importService.importFromFile(
                filePath || fileId,
                schemaToUse,
                importOptions
            );
            
            let totalImported = initialResult.insertedCount;

            // The DataSource functionality is now optional
            // let dataSourceId = null;
            // if (userId && fileId) {
            //     const DataSource = (await import('../../models/dataSource.js')).default;
            //     const ds = await DataSource.findOne({ user_id: userId, 'file_info.upload_id': fileId });
            //     if (ds) dataSourceId = ds._id;
            // }
            
            if (initialResult.hasMoreData) {
                this.importRemainingPages(
                    filePath || fileId,
                    schemaToUse,
                    {
                        ...importOptions,
                        collectionName: initialResult.collectionName,
                        currentPage: 2, 
                        totalRows: initialResult.totalRows,
                    }
                );
            }
            
            res.json(responseFormatter.success(
                {
                    ...initialResult,
                    // dataSourceId,
                    importing: initialResult.hasMoreData, 
                    estimatedTimeRemaining: this.estimateImportTime(initialResult.totalRows - totalImported)
                },
                `Successfully initiated import of ${totalImported} documents into ${initialResult.collectionName}` +
                (initialResult.hasMoreData ? '. Continuing to import the rest in the background...' : '. Import complete.'),
                {
                    collectionName: initialResult.collectionName,
                    totalRows: initialResult.totalRows,
                    insertedCount: totalImported
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Helper method to import remaining pages in the background
     */
    async importRemainingPages(filePathOrId, schema, options) {
        // Options should include: collectionName, isId, currentPage, totalRows, pageSize, userId
        const { collectionName, isId, currentPage, totalRows, pageSize = 1000, userId } = options;
        let page = currentPage;
        // totalImported is tracked by the service within the DataSource record
        
        try {
            let hasMoreData = true;
            
            while (hasMoreData) {
                logger.info(`Background import: Importing page ${page} of ${Math.ceil(totalRows / pageSize)} for ${filePathOrId}...`);
                
                const result = await this.importService.importFromFile(
                    filePathOrId,
                    schema,
                    {
                        collectionName,
                        isId,
                        currentPage: page,
                        pageSize,
                        userId,
                        dropCollection: false // Should not drop collection on subsequent pages
                    }
                );
                
                hasMoreData = result.hasMoreData;
                // DataSource record updates are handled by importService.importFromFile
                
                page++;
                if (page > Math.ceil(totalRows / pageSize) + 5) { // Safety break for very large files or issues
                    logger.error(`Background import for ${filePathOrId} exceeded expected page count. Breaking loop.`);
                    hasMoreData = false; 
                }
            }
            
            logger.info(`Background import complete for ${filePathOrId}: All pages processed for ${collectionName}.`);
            
        } catch (error) {
            logger.error(`Error in background import of ${filePathOrId} (page ${page}):`, error);
            // The service's importFromFile should have marked the DataSource with an error.
        }
    }
    
    /**
     * Estimate the time remaining for import
     */
    estimateImportTime(remainingRows) {
        // Assume importing 1000 records takes about 2 seconds
        const secondsPerThousand = 2;
        const estimatedSeconds = Math.ceil((remainingRows / 1000) * secondsPerThousand);
        
        if (estimatedSeconds < 60) {
            return `less than a minute`;
        } else if (estimatedSeconds < 3600) {
            const minutes = Math.ceil(estimatedSeconds / 60);
            return `about ${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            const hours = Math.floor(estimatedSeconds / 3600);
            const minutes = Math.ceil((estimatedSeconds % 3600) / 60);
            return `about ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
    }
    
    /**
     * Import data from Google Sheet
     */
    async importFromGoogle(req, res, next) {
        try {
            const { spreadsheetId, sheetName, schema, collectionName, dropCollection = false, sampleSize = 100 } = req.body;
            // Skip user ID extraction - it's not needed
            // const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

            // if (!userId) {
            //     logger.warn('No user ID found in request for importFromGoogle. Import will not be associated with a user.');
            //     // return next(responseFormatter.error('User authentication required for import.', 401));
            // }
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Missing parameters. Both spreadsheetId and sheetName are required', 400);
            }
            
            if (!this.googleSheets.isCredentialSet()) {
                // Instead of returning a 401 error, try to get a new URL and send it back
                const authUrl = this.googleSheets.getAuthUrl();
                return res.json(responseFormatter.success(
                    { authUrl },
                    'Google authentication URL generated. Please authenticate and try again.'
                ));
            }
            
            let schemaToUse = schema;
            
            // If schema is not provided, analyze the Google Sheet to generate one
            if (!schemaToUse) {
                logger.info('Schema not provided, automatically analyzing Google Sheet to generate schema...');
                // Get sheet data for analysis
                let sheetData;
                try {
                    sheetData = await this.googleSheets.getSheetData(spreadsheetId, sheetName);
                } catch (err) {
                    logger.error('Google Sheets API error:', err);
                    const detail = err.message || (err.errors && err.errors.length > 0 ? err.errors[0].message : 'Unknown Google API error');
                    // Pass error to the global handler instead of returning directly
                    return next(responseFormatter.error(`Failed to retrieve data from Google Sheet: ${detail}`, 500)); 
                }
                
                // Check if headers exist and are a non-empty array.
                // Empty rows are acceptable (sheet with only headers or no data rows).
                if (!sheetData || !Array.isArray(sheetData.headers) || sheetData.headers.length === 0) { 
                    logger.warn('getSheetData returned invalid structure (missing/empty headers)', { spreadsheetId, sheetName, sheetData });
                    return next(responseFormatter.error('Retrieved invalid data structure (missing or empty headers) from Google Sheet', 500));
                }
                
                // Extract metadata for schema generation
                const metadata = {
                    totalRows: sheetData.rows.length,
                    columns: sheetData.headers,
                    sampleData: sheetData.rows.slice(0, sampleSize),
                    dataTypes: {},
                    nullCounts: {}
                };
                
                // Calculate data types and null counts from sample
                sheetData.headers.forEach(header => {
                    const values = sheetData.rows.slice(0, sampleSize).map(row => row[header]);
                    const nonNullValues = values.filter(val => val !== null && val !== undefined && val !== '');
                    
                    metadata.nullCounts[header] = values.length - nonNullValues.length;
                    
                    // Determine data type
                    if (nonNullValues.length > 0) {
                        if (nonNullValues.every(val => !isNaN(val) && !isNaN(parseFloat(val)))) {
                            metadata.dataTypes[header] = 'number';
                        } else if (nonNullValues.every(val => !isNaN(Date.parse(val)))) {
                            metadata.dataTypes[header] = 'date';
                        } else {
                            metadata.dataTypes[header] = 'string';
                        }
                    } else {
                        metadata.dataTypes[header] = 'string'; // default to string for empty columns
                    }
                });
                
                // Use Gemini to generate schema
                const gemini = new (await import('../../utils/geminiInterface.js')).GeminiInterface();
                const schemaResult = await gemini.analyzeDataAndGenerateSchema(metadata);
                schemaToUse = schemaResult;
                logger.info('Schema generated automatically from Google Sheet:', schemaToUse);
            }
            
            if (!schemaToUse) {
                throw responseFormatter.error('Failed to generate schema from Google Sheet', 400);
            }
            
            const result = await this.importService.importFromGoogleSheet(
                this.googleSheets,
                spreadsheetId,
                sheetName,
                {
                    collectionName: collectionName || schemaToUse.collection_name,
                    schema: schemaToUse,
                    dropCollection
                    // Remove userId from here
                }
            );
            
            res.json(responseFormatter.success(
                result, // result from service should now include dataSourceId
                `Successfully imported ${result.insertedCount} documents from Google Sheet into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    totalRows: result.totalRows,
                    insertedCount: result.insertedCount,
                    dataSourceId: result.dataSourceId
                }
            ));
        } catch (error) {
            logger.error('Import from Google failed:', error);
            // Include specific error message here too if it's a different type of error
            const detail = error.message || (error.errors && error.errors.length > 0 ? error.errors[0].message : 'Unknown error during import process');
            // Use appropriate status code if available, otherwise default to 500
            const statusCode = error.status || error.code || 500;
            next(responseFormatter.error(`Import from Google failed: ${detail}`, statusCode));
        }
    }
    
    /**
     * Analyze file and import data
     * Legacy handler for compatibility with /api/analyze endpoint
     */
    async analyzeAndImport(req, res, next) {
        try {
            const { filePath, fileId, sampleSize = 100, dropCollection = false } = req.body;
            const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

            if (!filePath && !fileId) {
                throw responseFormatter.error('Missing file information. Either filePath or fileId is required', 400);
            }

            // First, analyze the file to generate schema
            const dataSourceService = new (await import('../../services/dataSourceService.js')).DataSourceService(this.importService.uploadsDir);
            // analyzeSchema in dataSourceService itself loads file data and returns metadata including totalRows
            const analysisResult = await dataSourceService.analyzeSchema(
                filePath || fileId,
                !filePath, // isId = true if filePath is not provided
                sampleSize
            );
            const { metadata, schema } = analysisResult;

            // Then import the data, ensuring all rows are processed by this single call to importService
            // Note: importService.importFromFile loads the entire file, then slices.
            // This is okay if analyzeAndImport is meant for a one-shot full import after analysis.
            // For very large files, the paginated importFromFile controller endpoint is better.
            const importResult = await this.importService.importFromFile(
                filePath || fileId,
                schema,
                {
                    dropCollection,
                    isId: !filePath, // isId = true if filePath is not provided
                    pageSize: metadata.totalRows, // Process all rows from the loaded file data
                    userId // Pass userId for data source record management
                }
            );

            // Generate visualization recommendations
            const gemini = new (await import('../../utils/geminiInterface.js')).GeminiInterface();
            logger.info('Generating visualization recommendations...');
            const visualizations = await gemini.generateVisualizationRecommendations(metadata, schema);

            // Prepare the output payload
            const outputPayload = {
                dataset_info: visualizations.dataset_info,
                visualizations: visualizations.visualizations.map(vis => {
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
                analysis_summary: visualizations.analysis_summary,
                import_result: {
                    collectionName: importResult.collectionName,
                    totalRows: importResult.totalRows,
                    insertedCount: importResult.insertedCount,
                    // Potentially add dataSourceId from importResult if available and needed
                }
            };
            
            // Use responseFormatter for success
            res.json(responseFormatter.success(
                outputPayload,
                'File analyzed and imported successfully.'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Continue to iterate through data import process
     * Supports both file and Google Sheet data sources
     */
    async continueIteration(req, res, next) {
        try {
            const { 
                iterationType,
                sourceId, 
                sourceName, // sheetName for Google Sheets
                currentPage = 1, 
                pageSize = 1000,
                collectionName,
                schema, // Full schema object
                dropCollection = false 
            } = req.body;
            const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

            if (!userId && iterationType === 'file') { // For file iteration, user context is important for DataSource
                 logger.warn('User ID missing for file iteration. Progress tracking might be affected.');
            }
            
            if (!iterationType) {
                throw responseFormatter.error('Missing iterationType parameter. Must be either "file" or "googleSheet"', 400);
            }
            
            if (!sourceId) {
                throw responseFormatter.error('Missing sourceId parameter (fileId or spreadsheetId)', 400);
            }
            
            if (!collectionName) {
                throw responseFormatter.error('Missing collectionName parameter', 400);
            }
            
            if (!schema) {
                throw responseFormatter.error('Missing schema parameter', 400);
            }
            
            let result;
            
            // Handle different data source types
            if (iterationType === 'file') {
                result = await this.importService.importFromFile(
                    sourceId, // This is fileId (upload_id)
                    schema,
                    {
                        collectionName,
                        dropCollection: currentPage === 1 && dropCollection,
                        isId: true,
                        currentPage,
                        pageSize,
                        userId
                    }
                );
            } else if (iterationType === 'googleSheet') {
                if (!sourceName) {
                    throw responseFormatter.error('Missing sourceName parameter (sheetName)', 400);
                }
                
                if (!this.googleSheets.oauth2Client.credentials) {
                    throw responseFormatter.error('You need to authenticate with Google first', 401);
                }
                
                result = await this.importService.importFromGoogleSheet(
                    this.googleSheets,
                    sourceId, // spreadsheetId
                    sourceName, // sheetName
                    {
                        collectionName,
                        schema,
                        dropCollection: currentPage === 1 && dropCollection, // Google Sheets usually imported in one go
                        // currentPage, pageSize might not be directly applicable unless service supports chunking for GSheets
                        userId
                    }
                );
            } else {
                throw responseFormatter.error('Invalid iterationType. Must be either "file" or "googleSheet"', 400);
            }
            
            // Determine if we should continue iterating
            const hasMoreData = result.hasMoreData || false; // Ensure hasMoreData is boolean
            const nextPage = hasMoreData ? currentPage + 1 : null;
            
            res.json(responseFormatter.success(
                { ...result, currentPage, nextPage, hasMoreData }, // Add iteration info to result
                `Imported page ${currentPage} with ${result.insertedCount} documents into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    currentPage,
                    nextPage,
                    hasMoreData,
                    totalInserted: result.totalInserted || result.insertedCount,
                    iterationType
                }
            ));
        } catch (error) {
            next(error);
        }
    }
}