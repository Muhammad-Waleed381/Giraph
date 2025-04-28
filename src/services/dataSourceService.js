import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { FileLoader } from '../utils/fileLoader.js';
import { formatFileSize } from '../api/middleware/upload.js';
import { getDatabase } from '../config/database.js';

/**
 * Service for managing data sources (files, collections, Google Sheets)
 */
export class DataSourceService {
    constructor(uploadsDir) {
        this.uploadsDir = uploadsDir;
    }

    /**
     * List all available data sources
     */
    async getAllDataSources(googleSheets) {
        try {
            const db = getDatabase();
            
            // Get all collections
            const collections = await db.listCollections().toArray();
            const collectionInfo = await Promise.all(collections.map(async col => {
                const collection = db.collection(col.name);
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
            let uploads = [];
            try {
                const files = await fs.readdir(this.uploadsDir);
                
                uploads = await Promise.all(files.map(async (filename) => {
                    const filePath = path.join(this.uploadsDir, filename);
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
                if (googleSheets && googleSheets.oauth2Client && googleSheets.oauth2Client.credentials) {
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
            return [...collectionInfo, ...uploads, ...googleSheetSources];
        } catch (error) {
            logger.error('Error in getAllDataSources:', error);
            throw error;
        }
    }

    /**
     * Get information about a file upload
     */
    createFileInfo(file) {
        // Detect file format
        let fileFormat = '';
        if (file.originalname.endsWith('.csv') || file.mimetype.includes('csv')) {
            fileFormat = 'CSV';
        } else if (file.originalname.endsWith('.xlsx') || file.mimetype.includes('openxmlformats')) {
            fileFormat = 'Excel (XLSX)';
        } else if (file.originalname.endsWith('.xls') || file.mimetype.includes('excel')) {
            fileFormat = 'Excel (XLS)';
        } else {
            fileFormat = 'Unknown';
        }
        
        return {
            id: file.filename,
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            sizeFormatted: formatFileSize(file.size),
            mimetype: file.mimetype,
            format: fileFormat,
            uploadedAt: new Date().toISOString()
        };
    }
    
    /**
     * List uploaded files
     */
    async getUploadedFiles() {
        try {
            // Read all files in the uploads directory
            const files = await fs.readdir(this.uploadsDir);
            
            // Get file information for each file
            const fileInfoPromises = files.map(async (filename) => {
                const filePath = path.join(this.uploadsDir, filename);
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
            
            return fileInfos;
        } catch (error) {
            logger.error('Error listing uploads:', error);
            throw error;
        }
    }
    
    /**
     * Delete a data source
     */
    async deleteDataSource(id) {
        try {
            // Parse the ID to determine the source type
            if (id.startsWith('file:')) {
                // Delete file
                const fileId = id.replace('file:', '');
                const normalizedFileId = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, '');
                const filePath = path.join(this.uploadsDir, normalizedFileId);
                
                try {
                    await fs.access(filePath);
                    await fs.unlink(filePath);
                    logger.info(`File deleted: ${filePath}`);
                    return { success: true, message: 'File deleted successfully' };
                } catch (error) {
                    logger.error(`File not found or could not be deleted: ${filePath}`, error);
                    throw new Error('File not found or could not be deleted');
                }
            } else if (id.startsWith('collection:')) {
                // Delete collection
                const collectionName = id.replace('collection:', '');
                const db = getDatabase();
                
                try {
                    await db.collection(collectionName).drop();
                    logger.info(`Collection '${collectionName}' deleted successfully`);
                    return { success: true, message: `Collection '${collectionName}' deleted successfully` };
                } catch (error) {
                    logger.error(`Error deleting collection ${collectionName}:`, error);
                    throw new Error(`Failed to delete collection: ${error.message}`);
                }
            } else if (id.startsWith('googlesheet:')) {
                // Google Sheets cannot be deleted through our API
                throw new Error('Deleting Google Sheets is not supported through this API');
            } else {
                throw new Error('Invalid data source ID format');
            }
        } catch (error) {
            logger.error('Error in deleteDataSource:', error);
            throw error;
        }
    }
    
    /**
     * Delete an uploaded file
     */
    async deleteFile(fileId) {
        try {
            if (!fileId) {
                throw new Error('File ID is required');
            }
            
            // Prevent directory traversal attacks
            const normalizedFileId = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, '');
            const filePath = path.join(this.uploadsDir, normalizedFileId);
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                logger.error(`File not found: ${filePath}`);
                throw new Error('File not found');
            }
            
            // Delete the file
            await fs.unlink(filePath);
            logger.info(`File deleted: ${filePath}`);
            
            return { success: true, message: 'File deleted successfully' };
        } catch (error) {
            logger.error('Error deleting file:', error);
            throw error;
        }
    }

    /**
     * Analyze file schema without importing
     */
    async analyzeSchema(filePathOrId, isId = false, sampleSize = 100) {
        try {
            let normalizedPath;
            
            // Handle either direct filePath or uploaded fileId
            if (!isId) {
                normalizedPath = path.normalize(filePathOrId);
            } else {
                normalizedPath = path.join(this.uploadsDir, filePathOrId);
            }
            
            // Load and analyze the file
            const { data, metadata } = await FileLoader.loadFile(normalizedPath, sampleSize);
            const gemini = (await import('../utils/geminiInterface.js')).default || (await import('../utils/geminiInterface.js')).GeminiInterface;
            const geminiInstance = new gemini();
            const schema = await geminiInstance.analyzeDataAndGenerateSchema(metadata);
            
            return { data, metadata, schema, normalizedPath };
        } catch (error) {
            logger.error('Error in analyzeSchema:', error);
            throw error;
        }
    }
}