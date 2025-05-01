import { responseFormatter } from '../../utils/responseFormatter.js';
import { GoogleService } from '../../services/googleService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for Google Sheets operations
 */
export class GoogleController {
    constructor() {
        this.googleService = new GoogleService();
    }

    /**
     * Get Google OAuth2 auth URL
     */
    getAuthUrl(req, res, next) {
        try {
            const url = this.googleService.getAuthUrl();
            
            res.json(responseFormatter.success(
                { authUrl: url },
                'Google OAuth URL generated successfully'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle Google OAuth2 callback
     */
    async handleCallback(req, res, next) {
        try {
            const { code } = req.query;
            
            if (!code) {
                throw responseFormatter.error('Missing authorization code', 400);
            }
            
            const tokens = await this.googleService.handleAuthCallback(code);
            
            res.json(responseFormatter.success(
                { authenticated: true },
                'Google authentication successful',
                { expiryDate: tokens.expiry_date }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * List available Google Sheets
     */
    async listSpreadsheets(req, res, next) {
        try {
            const spreadsheets = await this.googleService.listSpreadsheets();
            
            res.json(responseFormatter.success(
                spreadsheets,
                'Google Sheets retrieved successfully',
                { count: spreadsheets.length }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get tabs within a Google Sheet
     */
    async getSheetTabs(req, res, next) {
        try {
            const { id } = req.params;
            
            if (!id) {
                throw responseFormatter.error('Spreadsheet ID is required', 400);
            }
            
            const sheets = await this.googleService.getSheetTabs(id);
            
            res.json(responseFormatter.success(
                sheets,
                'Sheet tabs retrieved successfully',
                { 
                    spreadsheetId: id,
                    count: sheets.length 
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get data from a Google Sheet
     */
    async getSheetData(req, res, next) {
        try {
            const { spreadsheetId, sheetName } = req.query;
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Both spreadsheetId and sheetName are required', 400);
            }
            
            const { data, headers } = await this.googleService.getSheetData(spreadsheetId, sheetName);
            
            res.json(responseFormatter.success(
                { data, headers },
                'Sheet data retrieved successfully',
                { 
                    spreadsheetId,
                    sheetName,
                    rowCount: data.length,
                    headerCount: headers.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Analyze Google Sheet data
     */
    async analyzeGoogleSheet(req, res, next) {
        try {
            const { spreadsheetId, sheetName } = req.body;
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Both spreadsheetId and sheetName are required', 400);
            }
            
            const result = await this.googleService.analyzeGoogleSheet(spreadsheetId, sheetName);
            
            // Create a user-friendly response with column information
            const columnInfo = {};
            for (const [field, fieldSchema] of Object.entries(result.schema.schema)) {
                columnInfo[field] = {
                    type: fieldSchema.type,
                    description: fieldSchema.description,
                    isRequired: fieldSchema.required || false, 
                    isUnique: fieldSchema.unique || false,
                    isIndex: fieldSchema.index || false,
                    nullCount: result.metadata.nullCounts[field] || 0
                };
            }
            
            const schemaInfo = {
                suggestedCollectionName: result.schema.collection_name,
                totalRows: result.metadata.totalRows,
                sampleSize: result.metadata.sampleSize,
                columns: columnInfo,
                sampleData: result.metadata.sampleData.slice(0, 5), // First 5 rows as sample
                sheetInfo: result.sheetInfo
            };
            
            res.json(responseFormatter.success(
                schemaInfo,
                'Google Sheet analysis completed successfully'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Import data from a Google Sheet to MongoDB
     */
    async importSheetData(req, res, next) {
        try {
            const { spreadsheetId, sheetName, options } = req.body;
            
            if (!spreadsheetId || !sheetName) {
                throw responseFormatter.error('Both spreadsheetId and sheetName are required', 400);
            }
            
            // Validate options
            const importOptions = options || {};
            if (!importOptions.collectionName) {
                throw responseFormatter.error('Collection name is required in options', 400);
            }
            
            if (!importOptions.schema) {
                // If no schema provided, attempt to generate one
                const analysisResult = await this.googleService.analyzeGoogleSheet(spreadsheetId, sheetName);
                importOptions.schema = analysisResult.schema;
            }
            
            const result = await this.googleService.importSheetData(spreadsheetId, sheetName, importOptions);
            
            res.json(responseFormatter.success(
                result,
                'Google Sheet data imported successfully',
                {
                    collectionName: importOptions.collectionName,
                    recordsImported: result.importCount || 0,
                    spreadsheetId,
                    sheetName
                }
            ));
        } catch (error) {
            logger.error('Error importing Google Sheet data:', error);
            next(error);
        }
    }
}