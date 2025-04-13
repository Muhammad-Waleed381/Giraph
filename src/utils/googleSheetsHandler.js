import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from './logger.js';

class GoogleSheetsHandler {
    constructor() {
        // Set up OAuth2 client
        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'
        );
        
        // Initialize sheets API
        this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    }
    
    /**
     * Generate the URL for authorization
     */
    getAuthUrl() {
        const scopes = [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
        ];
        
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });
    }
    
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCode(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            logger.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }
    
    /**
     * Set credentials for the OAuth2 client
     */
    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }
    
    /**
     * List user's spreadsheets
     */
    async listSpreadsheets() {
        try {
            const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
            const response = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                fields: 'files(id, name, createdTime, modifiedTime, webViewLink)'
            });
            
            return response.data.files;
        } catch (error) {
            logger.error('Error listing spreadsheets:', error);
            throw error;
        }
    }
    
    /**
     * List available sheets in a spreadsheet
     */
    async listSheets(spreadsheetId) {
        try {
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            });
            
            return response.data.sheets.map(sheet => ({
                id: sheet.properties.sheetId,
                title: sheet.properties.title,
                index: sheet.properties.index,
                rowCount: sheet.properties.gridProperties.rowCount,
                columnCount: sheet.properties.gridProperties.columnCount
            }));
        } catch (error) {
            logger.error(`Error listing sheets for spreadsheet ${spreadsheetId}:`, error);
            throw error;
        }
    }
    
    /**
     * Get data from a specific sheet
     */
    async getSheetData(spreadsheetId, range) {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: range
            });
            
            const rows = response.data.values;
            
            if (!rows || rows.length === 0) {
                return { data: [], headers: [] };
            }
            
            // Assume first row is headers
            const headers = rows[0];
            
            // Convert the rest to objects with the headers as keys
            const data = rows.slice(1).map(row => {
                const item = {};
                headers.forEach((header, i) => {
                    // Clean the header (remove spaces, special chars)
                    const cleanHeader = header.trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
                    item[cleanHeader] = row[i] || '';
                });
                return item;
            });
            
            return { data, headers, rawData: rows };
        } catch (error) {
            logger.error(`Error fetching data for spreadsheet ${spreadsheetId}, range ${range}:`, error);
            throw error;
        }
    }
    
    /**
     * Analyze sheet data and provide metadata
     */
    analyzeSheetData(data, headers, sampleSize = 100) {
        try {
            if (!data || data.length === 0) {
                return {
                    totalRows: 0,
                    columns: [],
                    dataTypes: {},
                    nullCounts: {},
                    sampleData: []
                };
            }
            
            const sampleData = data.slice(0, sampleSize);
            const columns = Object.keys(data[0] || {});
            
            // Detect data types
            const dataTypes = {};
            columns.forEach(column => {
                const values = sampleData
                    .map(row => row[column])
                    .filter(val => val !== undefined && val !== null && val !== '');
                
                if (values.length === 0) {
                    dataTypes[column] = 'null';
                    return;
                }
                
                const allNumbers = values.every(val => !isNaN(val) && val.toString().trim() !== '');
                const allIntegers = allNumbers && values.every(val => Number.isInteger(Number(val)));
                const allDates = values.every(val => !isNaN(Date.parse(val)));
                const allBooleans = values.every(val => 
                    val.toString().toLowerCase() === 'true' || 
                    val.toString().toLowerCase() === 'false' || 
                    val.toString() === '0' || 
                    val.toString() === '1'
                );
                
                if (allIntegers) {
                    dataTypes[column] = 'int';
                } else if (allNumbers) {
                    dataTypes[column] = 'double';
                } else if (allDates) {
                    dataTypes[column] = 'date';
                } else if (allBooleans) {
                    dataTypes[column] = 'boolean';
                } else {
                    dataTypes[column] = 'string';
                }
            });
            
            // Count null values
            const nullCounts = {};
            columns.forEach(column => {
                nullCounts[column] = data.filter(row => 
                    row[column] === undefined || 
                    row[column] === null || 
                    row[column] === ''
                ).length;
            });
            
            return {
                totalRows: data.length,
                columns,
                dataTypes,
                nullCounts,
                sampleSize: sampleData.length,
                sampleData
            };
        } catch (error) {
            logger.error('Error analyzing sheet data:', error);
            throw error;
        }
    }
}

export { GoogleSheetsHandler }; 