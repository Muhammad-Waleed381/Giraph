import { logger } from '../utils/logger.js';
import { FileLoader } from '../utils/fileLoader.js';
import { getDatabase } from '../config/database.js';
import path from 'path';
import mongoose from 'mongoose'; // Needed for ObjectId

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
                isId = false, // if true, filePathOrId is an upload_id
                currentPage = 1,
                pageSize = 1000,
                userId = null // Added userId
            } = options;
            
            let normalizedPath;
            let originalFilename;

            if (!isId) {
                normalizedPath = path.normalize(filePathOrId);
                originalFilename = path.basename(normalizedPath);
            } else {
                normalizedPath = path.join(this.uploadsDir, filePathOrId);
                originalFilename = filePathOrId; // Assuming fileId is the original name or a unique ID
            }
            
            const { data } = await FileLoader.loadFile(normalizedPath);
            
            let finalSchema = schema;
            if (collectionName) {
                finalSchema.collection_name = collectionName;
            }
            
            const db = getDatabase();
            
            if (dropCollection && currentPage === 1) {
                try {
                    logger.info(`Dropping collection ${finalSchema.collection_name} as requested`);
                    await db.collection(finalSchema.collection_name).drop();
                    logger.info(`Collection ${finalSchema.collection_name} dropped successfully`);
                } catch (error) {
                    if (error.code !== 26) { 
                        logger.warn(`Error dropping collection: ${error.message}`);
                    }
                }
            }
            
            const { DatabaseHandler } = await import('../utils/dbHandler.js');
            const dbHandler = new DatabaseHandler();
            dbHandler.db = db; 
            
            if (currentPage === 1 || (dropCollection && currentPage === 1)) {
                logger.info('Creating MongoDB collection with schema...');
                await dbHandler.createCollectionWithSchema(finalSchema);
                logger.info('Collection created successfully');
            }

            const DataSource = (await import('../models/dataSource.js')).default;
            let dataSourceRecord = null;

            if (isId && userId) { // Only manage DataSource if it's an uploaded file (isId=true) and user is known
                dataSourceRecord = await DataSource.findOne({ 'file_info.upload_id': filePathOrId, user_id: userId });

                if (currentPage === 1) {
                    if (dataSourceRecord) {
                        dataSourceRecord.collection_name = finalSchema.collection_name;
                        dataSourceRecord.row_count = data.length;
                        dataSourceRecord.last_updated = new Date();
                        dataSourceRecord.schema_metadata = {
                            fields: Object.keys(finalSchema.schema || {}),
                            importedCount: 0,
                            totalRows: data.length,
                            importProgress: 0,
                            importComplete: false,
                        };
                        await dataSourceRecord.save();
                        logger.info(`Updated data source record for file ${filePathOrId}`);
                    } else {
                        // This case should ideally be handled when the file is first uploaded by DataSourceService
                        // However, if an import is triggered for a file without a DataSource record,
                        // and we have a userId, we could create one.
                        // For now, we assume DataSource record is created upon upload.
                        logger.warn(`DataSource record not found for file ${filePathOrId} and user ${userId}. Import will proceed without full tracking.`);
                    }
                }
            }
            
            const collection = db.collection(finalSchema.collection_name);
            const startIndex = (currentPage - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const pageData = data.slice(startIndex, endIndex);
            const hasMoreData = endIndex < data.length;
            
            if (pageData.length === 0 && currentPage > 1) { // Avoid returning 0 inserted if it's just an empty file from start
                if (dataSourceRecord) {
                     dataSourceRecord.schema_metadata.importedCount = data.length;
                     dataSourceRecord.schema_metadata.importProgress = 100;
                     dataSourceRecord.schema_metadata.importComplete = true;
                     dataSourceRecord.schema_metadata.importCompletedAt = new Date();
                     dataSourceRecord.last_updated = new Date();
                     await dataSourceRecord.save();
                }
                return {
                    collectionName: finalSchema.collection_name,
                    totalRows: data.length,
                    insertedCount: 0,
                    hasMoreData: false,
                    schema: { fields: Object.keys(finalSchema.schema || {}) }
                };
            }
            
            const insertedCount = pageData.length > 0 ? await dbHandler.insertData(collection, pageData, finalSchema) : 0;
            logger.info(`Page ${currentPage}: Inserted ${insertedCount} documents into ${finalSchema.collection_name}.`);

            if (dataSourceRecord) {
                const totalImportedSoFar = Math.min(startIndex + insertedCount, data.length);
                dataSourceRecord.schema_metadata.importedCount = totalImportedSoFar;
                dataSourceRecord.schema_metadata.importProgress = data.length > 0 ? Math.round((totalImportedSoFar / data.length) * 100) : 100;
                dataSourceRecord.last_updated = new Date();
                if (!hasMoreData) {
                    dataSourceRecord.schema_metadata.importComplete = true;
                    dataSourceRecord.schema_metadata.importCompletedAt = new Date();
                    if (totalImportedSoFar !== data.length) {
                        logger.warn(`Import completed for ${filePathOrId}, but imported count ${totalImportedSoFar} does not match total rows ${data.length}.`);
                        dataSourceRecord.row_count = totalImportedSoFar; // Adjust row_count if necessary
                    }
                }
                await dataSourceRecord.save();
                logger.info(`Updated import progress for ${filePathOrId}: ${dataSourceRecord.schema_metadata.importProgress}%`);
            }
            
            return {
                collectionName: finalSchema.collection_name,
                totalRows: data.length,
                insertedCount,
                hasMoreData,
                schema: { fields: Object.keys(finalSchema.schema || {}) }
            };
        } catch (error) {
            logger.error('Error in importFromFile:', error);
            // Optionally update DataSource record to reflect error
            if (options.userId && options.isId) {
                try {
                    const DataSource = (await import('../models/dataSource.js')).default;
                    const dsRecord = await DataSource.findOne({'file_info.upload_id': filePathOrId, user_id: options.userId });
                    if (dsRecord) {
                        dsRecord.schema_metadata.importError = error.message;
                        dsRecord.schema_metadata.importComplete = false; // Ensure it's not marked complete
                        dsRecord.last_updated = new Date();
                        await dsRecord.save();
                    }
                } catch (e) {
                    logger.error('Failed to update DataSource with import error:', e);
                }
            }
            throw error;
        }
    }
    
    /**
     * Import data from Google Sheet
     */
    async importFromGoogleSheet(googleSheets, spreadsheetId, sheetName, options = {}) {
        try {
            const { collectionName, dropCollection = false, schema: providedSchema, userId = null } = options;
            
            if (!spreadsheetId || !sheetName) {
                throw new Error('Both spreadsheetId and sheetName are required');
            }
            
            const { data, headers, rows } = await googleSheets.getSheetData(spreadsheetId, sheetName);
            
            if (!rows || rows.length === 0) {
                throw new Error('The specified sheet contains no data or is improperly formatted');
            }
            
            let schema = providedSchema;
            if (!schema) {
                const metadata = googleSheets.analyzeSheetData(rows, headers);
                const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
                schema = await gemini.analyzeDataAndGenerateSchema(metadata);
            }
            
            if (collectionName) {
                schema.collection_name = collectionName;
            }
            
            const db = getDatabase();
            
            if (dropCollection) {
                try {
                    logger.info(`Dropping collection ${schema.collection_name} as requested`);
                    await db.collection(schema.collection_name).drop();
                    logger.info(`Collection ${schema.collection_name} dropped successfully`);
                } catch (error) {
                    if (error.code !== 26) {
                        logger.warn(`Error dropping collection: ${error.message}`);
                    }
                }
            }
            
            const { DatabaseHandler } = await import('../utils/dbHandler.js');
            const dbHandler = new DatabaseHandler();
            dbHandler.db = db;
            
            const collection = await dbHandler.createCollectionWithSchema(schema);
            const insertedCount = await dbHandler.insertData(collection, data, schema);

            let dataSourceId = null;
            if (userId) {
                const DataSource = (await import('../models/dataSource.js')).default;
                let dataSourceRecord = await DataSource.findOne({
                    'google_sheet_info.spreadsheet_id': spreadsheetId,
                    'google_sheet_info.sheet_name': sheetName,
                    user_id: userId
                });

                const dsData = {
                    user_id: userId,
                    name: schema.collection_name || `Google Sheet - ${sheetName}`,
                    type: 'google_sheets',
                    collection_name: schema.collection_name,
                    row_count: rows.length,
                    google_sheet_info: { spreadsheet_id: spreadsheetId, sheet_name: sheetName },
                    schema_metadata: {
                        fields: Object.keys(schema.schema || {}),
                        importedCount: insertedCount,
                        totalRows: rows.length,
                        importProgress: 100,
                        importComplete: true,
                        importCompletedAt: new Date()
                    },
                    last_updated: new Date()
                };

                if (dataSourceRecord) {
                    Object.assign(dataSourceRecord, dsData);
                    logger.info(`Updating data source record for Google Sheet ${spreadsheetId}/${sheetName}`);
                } else {
                    dataSourceRecord = new DataSource({ ...dsData, created_at: new Date() });
                    logger.info(`Creating data source record for Google Sheet ${spreadsheetId}/${sheetName}`);
                }
                await dataSourceRecord.save();
                dataSourceId = dataSourceRecord._id;
            }
            
            return {
                collectionName: schema.collection_name,
                totalRows: rows.length,
                insertedCount,
                dataSourceId,
                schema: {
                    fields: Object.keys(schema.schema || {}),
                    source: { type: 'google_sheets', spreadsheetId, sheetName }
                }
            };
        } catch (error) {
            logger.error('Error in importFromGoogleSheet:', error);
            if (options.userId) {
                 try {
                    const DataSource = (await import('../models/dataSource.js')).default;
                    const dsRecord = await DataSource.findOne({'google_sheet_info.spreadsheet_id': spreadsheetId, 'google_sheet_info.sheet_name': sheetName, user_id: options.userId });
                    if (dsRecord) {
                        dsRecord.schema_metadata.importError = error.message;
                        dsRecord.schema_metadata.importComplete = false;
                        dsRecord.last_updated = new Date();
                        await dsRecord.save();
                    }
                } catch (e) {
                    logger.error('Failed to update DataSource with Google Sheet import error:', e);
                }
            }
            throw error;
        }
    }
}