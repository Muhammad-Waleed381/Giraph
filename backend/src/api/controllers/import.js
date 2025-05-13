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
            const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null; // Assuming auth middleware sets req.user

            if (!userId) {
                // If you require a user for every import, throw an error.
                // Otherwise, imports can proceed without user association if userId is null.
                logger.warn('No user ID found in request for importFromFile. Import will not be associated with a user.');
                // return next(responseFormatter.error('User authentication required for import.', 401));
            }
            
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
                userId 
            };

            const initialResult = await this.importService.importFromFile(
                filePath || fileId,
                schemaToUse,
                importOptions
            );
            
            let totalImported = initialResult.insertedCount;
            // let dataSourceId = null; // dataSourceId will be part of initialResult if service handles it

            // The DataSource record should be created/updated by the service.
            // We might want to fetch the dataSourceId here if needed for the response.
            let dataSourceId = null;
            if (userId && fileId) { // fileId is the upload_id
                 const DataSource = (await import('../../models/dataSource.js')).default;
                 const ds = await DataSource.findOne({ user_id: userId, 'file_info.upload_id': fileId });
                 if (ds) dataSourceId = ds._id;
            }
            
            if (initialResult.hasMoreData) {
                logger.info(`Starting background import process for remaining pages of ${filePath || fileId}`);
                // Call as a detached Promise but ensure it starts
                this.importRemainingPages(
                    filePath || fileId,
                    schemaToUse,
                    {
                        ...importOptions, // Pass all options including userId
                        collectionName: initialResult.collectionName, // Use collection name from initial result
                        currentPage: 2, 
                        totalRows: initialResult.totalRows,
                        // userId is already in importOptions
                    }
                ).catch(error => {
                    logger.error(`Error in background import process: ${error.message}`, error);
                });
                
                logger.info(`Background import process initiated for ${filePath || fileId}. User will be notified upon completion.`);
            }
            
            res.json(responseFormatter.success(
                {
                    ...initialResult,
                    dataSourceId, // Include dataSourceId if found
                    importing: initialResult.hasMoreData, 
                    // totalRows: initialResult.totalRows, // Already in initialResult
                    // importedCount: totalImported, // Already in initialResult as insertedCount for the first page
                    estimatedTimeRemaining: this.estimateImportTime(initialResult.totalRows - totalImported),
                    success: true // Explicitly add success flag to make it clearer for the frontend
                },
                `Successfully initiated import of ${totalImported} documents into ${initialResult.collectionName}` +
                (initialResult.hasMoreData ? '. Continuing to import the rest in the background...' : '. Import complete.'),
                {
                    collectionName: initialResult.collectionName,
                    totalRows: initialResult.totalRows,
                    insertedCount: totalImported, // This is for the first page only
                    status: 'success' // Add explicit status
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
        let importedSoFar = 0;
        // totalImported is tracked by the service within the DataSource record
        
        try {
            let hasMoreData = true;
            
            logger.info(`Background import started for ${filePathOrId}. Total rows: ${totalRows}, starting from page ${page} with page size ${pageSize}`);
            
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
                
                importedSoFar += result.insertedCount;
                logger.info(`Page ${page} imported successfully with ${result.insertedCount} records. Total imported so far: ${importedSoFar}/${totalRows}`);
                
                hasMoreData = result.hasMoreData;
                // DataSource record updates are handled by importService.importFromFile
                
                page++;
                if (page > Math.ceil(totalRows / pageSize) + 5) { // Safety break for very large files or issues
                    logger.error(`Background import for ${filePathOrId} exceeded expected page count. Breaking loop.`);
                    hasMoreData = false; 
                }
            }
            
            logger.info(`Background import complete for ${filePathOrId}: All pages processed for ${collectionName}. Total records imported: ${importedSoFar}`);
            
            // Update the DataSource record one final time to ensure completion status is set
            if (userId) {
                try {
                    const DataSource = (await import('../../models/dataSource.js')).default;
                    const dsRecord = await DataSource.findOne({'file_info.upload_id': filePathOrId, user_id: userId });
                    if (dsRecord) {
                        dsRecord.schema_metadata.importComplete = true;
                        dsRecord.schema_metadata.importCompletedAt = new Date();
                        dsRecord.schema_metadata.importedCount = importedSoFar;
                        dsRecord.schema_metadata.importProgress = 100;
                        dsRecord.last_updated = new Date();
                        await dsRecord.save();
                        logger.info(`Updated data source record for ${filePathOrId} with completed status`);
                    }
                } catch (error) {
                    logger.error(`Failed to update DataSource with completion status: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error in background import of ${filePathOrId} (page ${page}):`, error);
            // Try to update the DataSource record with error info
            if (userId) {
                try {
                    const DataSource = (await import('../../models/dataSource.js')).default;
                    const dsRecord = await DataSource.findOne({'file_info.upload_id': filePathOrId, user_id: userId });
                    if (dsRecord) {
                        dsRecord.schema_metadata.importError = error.message;
                        dsRecord.schema_metadata.importErrorAt = new Date();
                        dsRecord.last_updated = new Date();
                        await dsRecord.save();
                        logger.info(`Updated data source record for ${filePathOrId} with error status`);
                    }
                } catch (updateError) {
                    logger.error(`Failed to update DataSource with error status: ${updateError.message}`);
                }
            }
            throw error; // Re-throw to be caught by the caller
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
            const userId = req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null;

            if (!userId) {
                logger.warn('No user ID found in request for importFromGoogle. Import will not be associated with a user.');
                // return next(responseFormatter.error('User authentication required for import.', 401));
            }
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Missing parameters. Both spreadsheetId and sheetName are required', 400);
            }
            
            if (!this.googleSheets.isCredentialSet()) { // Check credentials using a method
                // Attempt to refresh or re-auth if necessary, or guide user
                // For now, assume credentials must be pre-set
                const authUrl = this.googleSheets.getAuthUrl();
                 return next(responseFormatter.error(
                    'Google authentication required. Please authenticate.', 
                    401, 
                    { authUrl } // Optionally provide authUrl if re-authentication is needed
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
                    dropCollection,
                    userId
                }
            );
            
            res.json(responseFormatter.success(
                {
                    ...result, // result from service should now include dataSourceId
                    success: true // Explicitly add success flag
                },
                `Successfully imported ${result.insertedCount} documents from Google Sheet into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    totalRows: result.totalRows,
                    insertedCount: result.insertedCount,
                    dataSourceId: result.dataSourceId,
                    status: 'success' // Add explicit status
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
            
            if (!filePath && !fileId) {
                throw responseFormatter.error('Missing file information. Either filePath or fileId is required', 400);
            }
            
            // First, analyze the file to generate schema
            const dataSourceService = new (await import('../../services/dataSourceService.js')).DataSourceService(this.importService.uploadsDir);
            const { data, metadata, schema } = await dataSourceService.analyzeSchema(
                filePath || fileId,
                !filePath, // isId = true if filePath is not provided
                sampleSize
            );
            
            // Then import the data
            const result = await this.importService.importFromFile(
                filePath || fileId,
                schema,
                {
                    dropCollection,
                    isId: !filePath // isId = true if filePath is not provided
                }
            );
            
            // Generate visualization recommendations
            const gemini = new (await import('../../utils/geminiInterface.js')).GeminiInterface();
            logger.info('Generating visualization recommendations...');
            const visualizations = await gemini.generateVisualizationRecommendations(metadata, schema);
            
            // Prepare the output response
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
                        preprocessing: vis.preprocessing || []
                    };
                }),
                analysis_summary: visualizations.analysis_summary,
                import_result: {
                    collectionName: result.collectionName,
                    totalRows: result.totalRows,
                    insertedCount: result.insertedCount
                }
            };
            
            res.json(output);
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
                { 
                    ...result, 
                    currentPage, 
                    nextPage, 
                    hasMoreData,
                    success: true // Explicitly add success flag
                }, // Add iteration info to result
                `Imported page ${currentPage} with ${result.insertedCount} documents into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    currentPage,
                    nextPage,
                    hasMoreData,
                    totalInserted: result.totalInserted || result.insertedCount,
                    iterationType,
                    status: 'success' // Add explicit status
                }
            ));
        } catch (error) {
            next(error);
        }
    }
}