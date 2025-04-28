import { responseFormatter } from '../../utils/responseFormatter.js';
import { ImportService } from '../../services/importService.js';
import { GoogleSheetsHandler } from '../../utils/googleSheetsHandler.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for data import operations
 */
export class ImportController {
    constructor(uploadsDir) {
        this.importService = new ImportService(uploadsDir);
        this.googleSheets = new GoogleSheetsHandler();
    }

    /**
     * Import data from file to collection
     */
    async importFromFile(req, res, next) {
        try {
            const { filePath, fileId, schema, collectionName, dropCollection = false, sampleSize = 100 } = req.body;
            
            if (!filePath && !fileId) {
                throw responseFormatter.error('Missing file information. Either filePath or fileId is required', 400);
            }
            
            let schemaToUse = schema;
            
            // If schema is not provided, analyze the file to generate one
            if (!schemaToUse) {
                logger.info('Schema not provided, automatically analyzing file to generate schema...');
                const dataSourceService = new (await import('../../services/dataSourceService.js')).DataSourceService(this.importService.uploadsDir);
                const analysisResult = await dataSourceService.analyzeSchema(
                    filePath || fileId,
                    !filePath, // isId = true if filePath is not provided
                    sampleSize
                );
                schemaToUse = analysisResult.schema;
                logger.info('Schema generated automatically:', schemaToUse);
            }
            
            if (!schemaToUse) {
                throw responseFormatter.error('Failed to generate schema from file', 400);
            }
            
            const result = await this.importService.importFromFile(
                filePath || fileId,
                schemaToUse,
                {
                    collectionName,
                    dropCollection,
                    isId: !filePath // isId = true if filePath is not provided
                }
            );
            
            res.json(responseFormatter.success(
                result,
                `Successfully imported ${result.insertedCount} documents into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    totalRows: result.totalRows,
                    insertedCount: result.insertedCount
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Import data from Google Sheet
     */
    async importFromGoogle(req, res, next) {
        try {
            const { spreadsheetId, sheetName, schema, collectionName, dropCollection = false, sampleSize = 100 } = req.body;
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Missing parameters. Both spreadsheetId and sheetName are required', 400);
            }
            
            // Check if credentials are set
            if (!this.googleSheets.oauth2Client.credentials) {
                throw responseFormatter.error('You need to authenticate with Google first', 401);
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
                }
            );
            
            res.json(responseFormatter.success(
                result,
                `Successfully imported ${result.insertedCount} documents from Google Sheet into ${result.collectionName}`,
                {
                    collectionName: result.collectionName,
                    totalRows: result.totalRows,
                    insertedCount: result.insertedCount
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
                sourceName,
                currentPage = 1, 
                pageSize = 1000,
                collectionName,
                schema,
                dropCollection = false 
            } = req.body;
            
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
                // For file-based imports
                result = await this.importService.importFromFile(
                    sourceId,
                    schema,
                    {
                        collectionName,
                        dropCollection: currentPage === 1 && dropCollection, // Only drop on first page
                        isId: true,
                        currentPage,
                        pageSize
                    }
                );
            } else if (iterationType === 'googleSheet') {
                // For Google Sheet imports
                if (!sourceName) {
                    throw responseFormatter.error('Missing sourceName parameter (sheetName)', 400);
                }
                
                // Check if credentials are set
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
                        dropCollection: currentPage === 1 && dropCollection, // Only drop on first page
                        currentPage,
                        pageSize
                    }
                );
            } else {
                throw responseFormatter.error('Invalid iterationType. Must be either "file" or "googleSheet"', 400);
            }
            
            // Determine if we should continue iterating
            const hasMoreData = result.hasMoreData || false;
            const nextPage = hasMoreData ? currentPage + 1 : null;
            
            res.json(responseFormatter.success(
                result,
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