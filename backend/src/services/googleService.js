import { GoogleSheetsHandler } from '../utils/googleSheetsHandler.js';
import { logger } from '../utils/logger.js';
import { ImportService } from './importService.js';
import path from 'path';

/**
 * Service for Google Sheets operations
 */
export class GoogleService {
    constructor(uploadsDir = path.join(process.cwd(), 'uploads')) {
        this.googleSheets = new GoogleSheetsHandler();
        this.importService = new ImportService(uploadsDir);
    }

    /**
     * Get OAuth2 authentication URL
     */
    getAuthUrl() {
        try {
            return this.googleSheets.getAuthUrl();
        } catch (error) {
            logger.error('Error generating Google OAuth URL:', error);
            throw error;
        }
    }

    /**
     * Handle OAuth2 callback
     */
    async handleAuthCallback(code) {
        try {
            const tokens = await this.googleSheets.handleAuthCallback(code);
            return tokens;
        } catch (error) {
            logger.error('Error handling Google auth callback:', error);
            throw error;
        }
    }

    /**
     * List available Google Sheets
     */
    async listSpreadsheets() {
        try {
            return await this.googleSheets.listSpreadsheets();
        } catch (error) {
            logger.error('Error listing Google Sheets:', error);
            throw error;
        }
    }

    /**
     * Get tabs within a Google Sheet
     */
    async getSheetTabs(spreadsheetId) {
        try {
            return await this.googleSheets.listSheets(spreadsheetId);
        } catch (error) {
            logger.error(`Error getting tabs for spreadsheet ${spreadsheetId}:`, error);
            throw error;
        }
    }

    /**
     * Get data from a Google Sheet
     */
    async getSheetData(spreadsheetId, sheetName) {
        try {
            return await this.googleSheets.getSheetData(spreadsheetId, sheetName);
        } catch (error) {
            logger.error(`Error getting data from spreadsheet ${spreadsheetId}, sheet ${sheetName}:`, error);
            throw error;
        }
    }
    
    /**
     * Analyze Google Sheet data
     */
    async analyzeGoogleSheet(spreadsheetId, sheetName) {
        try {
            // Get sheet data
            const { data, headers } = await this.googleSheets.getSheetData(spreadsheetId, sheetName);
            
            if (!data || data.length === 0) {
                throw new Error('The specified sheet contains no data or is improperly formatted');
            }
            
            // Analyze data and generate metadata
            const metadata = this.googleSheets.analyzeSheetData(data, headers);
            
            // Generate MongoDB schema
            const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
            const schema = await gemini.analyzeDataAndGenerateSchema(metadata);
            
            return {
                metadata,
                schema,
                sheetInfo: {
                    spreadsheetId,
                    sheetName,
                    rowCount: data.length,
                    columnCount: headers.length
                }
            };
        } catch (error) {
            logger.error(`Error analyzing Google Sheet ${spreadsheetId}, sheet ${sheetName}:`, error);
            throw error;
        }
    }

    /**
     * Import data from a Google Sheet
     */
    async importFromGoogleSheet(spreadsheetId, sheetName, schema, options = {}) {
        try {
            const { 
                collectionName, 
                dropCollection = false,
                currentPage = 1,
                pageSize = 1000
            } = options;
            
            // Get the sheets API
            const sheets = await this.getSheetsApi();
            
            // Fetch sheet data
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: sheetName,
            });
            
            const rows = response.data.values || [];
            
            // Ensure we have data
            if (!rows || rows.length === 0) {
                throw new Error('No data found in the Google Sheet');
            }
            
            // Extract headers and data
            const headers = rows[0];
            const data = rows.slice(1).map(row => {
                const item = {};
                headers.forEach((header, index) => {
                    item[header] = row[index] || '';
                });
                return item;
            });
            
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
            
            logger.info(`Importing page ${currentPage} (${pageData.length} rows) from Google Sheet into MongoDB...`);
            const insertedCount = await dbHandler.insertData(collection, pageData, finalSchema);
            logger.info(`Google Sheet data page imported successfully. Inserted ${insertedCount} documents.`);
            
            return {
                collectionName: finalSchema.collection_name,
                totalRows: data.length,
                insertedCount,
                hasMoreData,
                nextPage: hasMoreData ? currentPage + 1 : null,
                schema: {
                    fields: Object.keys(finalSchema.schema || {}),
                }
            };
        } catch (error) {
            logger.error('Error in importFromGoogleSheet:', error);
            throw error;
        }
    }

    /**
     * Import data from a Google Sheet to a MongoDB collection
     * @param {string} spreadsheetId - ID of the Google spreadsheet
     * @param {string} sheetName - Name of the specific sheet
     * @param {Object} options - Import options (collectionName, dropCollection, schema)
     * @returns {Promise<Object>} Import results
     */
    async importSheetData(spreadsheetId, sheetName, options = {}) {
        try {
            return await this.importService.importFromGoogleSheet(
                this.googleSheets, 
                spreadsheetId, 
                sheetName, 
                options
            );
        } catch (error) {
            logger.error(`Error importing data from Google Sheet ${spreadsheetId}, sheet ${sheetName}:`, error);
            throw error;
        }
    }
}