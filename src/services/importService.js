import { logger } from '../utils/logger.js';
import { FileLoader } from '../utils/fileLoader.js';
import { getDatabase } from '../config/database.js';
import path from 'path';

/**
 * Service for managing data imports
 */
export class ImportService {
    constructor(uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    /**
     * Import data from file to collection
     */
    async importFromFile(filePathOrId, schema, options = {}) {
        try {
            const { 
                collectionName, 
                dropCollection = false, 
                isId = false,
                currentPage = 1,
                pageSize = 1000
            } = options;
            
            // Handle file path or ID
            let normalizedPath;
            if (!isId) {
                normalizedPath = path.normalize(filePathOrId);
            } else {
                normalizedPath = path.join(this.uploadsDir, filePathOrId);
            }
            
            // Load file data
            const { data } = await FileLoader.loadFile(normalizedPath);
            
            // Use provided schema or collection name
            let finalSchema = schema;
            if (collectionName) {
                finalSchema.collection_name = collectionName;
            }
            
            // Get database instance
            const db = getDatabase();
            
            // Handle collection dropping if requested
            if (dropCollection) {
                try {
                    logger.info(`Dropping collection ${finalSchema.collection_name} as requested`);
                    await db.collection(finalSchema.collection_name).drop();
                    logger.info(`Collection ${finalSchema.collection_name} dropped successfully`);
                } catch (error) {
                    // Ignore if collection doesn't exist
                    if (error.code !== 26) { // 26 is the error code for collection not found
                        logger.warn(`Error dropping collection: ${error.message}`);
                    }
                }
            }
            
            // Initialize DatabaseHandler for schema creation and data import
            const { DatabaseHandler } = await import('../utils/dbHandler.js');
            const dbHandler = new DatabaseHandler();
            dbHandler.db = db; // Use existing db connection
            
            // Only create collection if this is the first page or we're dropping
            if (currentPage === 1 || dropCollection) {
                logger.info('Creating MongoDB collection with schema...');
                const collection = await dbHandler.createCollectionWithSchema(finalSchema);
                logger.info('Collection created successfully');
            }
            
            // Get the collection reference
            const collection = db.collection(finalSchema.collection_name);
            
            // Apply pagination
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageData = data.slice(startIndex, endIndex);
            const hasMoreData = endIndex < data.length;
            
            if (pageData.length === 0) {
                return {
                    collectionName: finalSchema.collection_name,
                    totalRows: data.length,
                    insertedCount: 0,
                    hasMoreData: false,
                    schema: {
                        fields: Object.keys(finalSchema.schema || {}),
                    }
                };
            }
            
            logger.info(`Importing page ${currentPage} (${pageData.length} rows) into MongoDB...`);
            const insertedCount = await dbHandler.insertData(collection, pageData, finalSchema);
            logger.info(`Data page imported successfully. Inserted ${insertedCount} documents.`);
            
            return {
                collectionName: finalSchema.collection_name,
                totalRows: data.length,
                insertedCount,
                hasMoreData,
                schema: {
                    fields: Object.keys(finalSchema.schema || {}),
                }
            };
        } catch (error) {
            logger.error('Error in importFromFile:', error);
            throw error;
        }
    }
    
    /**
     * Import data from Google Sheet
     */
    async importFromGoogleSheet(googleSheets, spreadsheetId, sheetName, options = {}) {
        try {
            const { collectionName, dropCollection = false, schema: providedSchema } = options;
            
            if (!spreadsheetId || !sheetName) {
                throw new Error('Both spreadsheetId and sheetName are required');
            }
            
            // Get sheet data - Destructure all needed parts: data, headers, rows
            const { data, headers, rows } = await googleSheets.getSheetData(spreadsheetId, sheetName);
            
            if (!rows || rows.length === 0) {
                throw new Error('The specified sheet contains no data or is improperly formatted');
            }
            
            // Use provided schema if available, otherwise generate one
            let schema = providedSchema;
            if (!schema) {
                // Analyze data and generate metadata
                const metadata = googleSheets.analyzeSheetData(rows, headers);
                
                // Generate MongoDB schema
                const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
                schema = await gemini.analyzeDataAndGenerateSchema(metadata);
            }
            
            // Use provided collection name if specified
            if (collectionName) {
                schema.collection_name = collectionName;
            }
            
            // Get database instance
            const db = getDatabase();
            
            // Handle collection dropping if requested
            if (dropCollection) {
                try {
                    logger.info(`Dropping collection ${schema.collection_name} as requested`);
                    await db.collection(schema.collection_name).drop();
                    logger.info(`Collection ${schema.collection_name} dropped successfully`);
                } catch (error) {
                    // Ignore if collection doesn't exist
                    if (error.code !== 26) { // 26 is the error code for collection not found
                        logger.warn(`Error dropping collection: ${error.message}`);
                    }
                }
            }
            
            // Initialize DatabaseHandler for schema creation and data import
            const { DatabaseHandler } = await import('../utils/dbHandler.js');
            const dbHandler = new DatabaseHandler();
            dbHandler.db = db; // Use existing db connection
            
            // Create collection and import data
            const collection = await dbHandler.createCollectionWithSchema(schema);
            const insertedCount = await dbHandler.insertData(collection, data, schema);
            
            return {
                collectionName: schema.collection_name,
                totalRows: rows.length,
                insertedCount,
                schema: {
                    fields: Object.keys(schema.schema || {}),
                    source: {
                        type: 'google_sheets',
                        spreadsheetId,
                        sheetName
                    }
                }
            };
        } catch (error) {
            logger.error('Error in importFromGoogleSheet:', error);
            throw error;
        }
    }
}