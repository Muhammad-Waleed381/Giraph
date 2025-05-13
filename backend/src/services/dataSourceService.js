import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { FileLoader } from '../utils/fileLoader.js';
import { formatFileSize } from '../api/middleware/upload.js';
import { getDatabase } from '../config/database.js'; // Restore getDatabase import
import DataSource from '../models/dataSource.js'; // Import the data source model

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
    async getAllDataSources(googleSheets, userId = null) {
        try {
            // Get data sources from the data_sources collection
            let dataSources = [];
            try {
                const DataSource = (await import('../models/dataSource.js')).default;
                
                // Find all data sources for this user or null userId (all users)
                const query = userId ? { user_id: userId } : {};
                
                const dataSourceDocs = await DataSource.find(query).sort({ last_updated: -1 });
                
                dataSources = dataSourceDocs.map(doc => {
                    const baseSource = {
                        id: doc._id.toString(),
                        name: doc.name,
                        type: doc.type,
                        collectionName: doc.collection_name,
                        rowCount: doc.row_count || 0,
                        createdAt: doc.created_at,
                        updatedAt: doc.last_updated,
                        userId: doc.user_id?.toString() || null
                    };
                    
                    // Add source-specific details
                    if (doc.type === 'csv' || doc.type === 'excel' || doc.type === 'json') {
                        return {
                            ...baseSource,
                            sourceType: 'file',
                            fileInfo: doc.file_info,
                            id: `file:${doc.file_info?.upload_id || doc._id.toString()}`, // For backward compatibility
                            path: doc.file_info?.upload_id ? path.join(this.uploadsDir, doc.file_info.upload_id) : null
                        };
                    } else if (doc.type === 'google_sheets') {
                        return {
                            ...baseSource,
                            sourceType: 'google_sheet',
                            googleSheetInfo: doc.google_sheet_info,
                            id: `googlesheet:${doc.google_sheet_info?.spreadsheet_id || doc._id.toString()}` // For backward compatibility
                        };
                    } else {
                        return {
                            ...baseSource,
                            sourceType: 'other'
                        };
                    }
                });
            } catch (error) {
                logger.error('Error getting data sources from collection:', error);
                dataSources = []; // Continue even if database query fails
            }
            
            // Use getDatabase()
            const db = getDatabase();
            
            // Get all collections
            const collections = await db.listCollections().toArray();
            const collectionInfo = await Promise.all(collections.map(async col => {
                // Skip system collections and data_sources collection
                if (col.name.startsWith('system.') || col.name === 'data_sources') {
                    return null;
                }
                
                // Skip collections that already appear in dataSources
                const existingSource = dataSources.find(ds => 
                    ds.collectionName === col.name && 
                    (ds.type === 'csv' || ds.type === 'excel' || ds.type === 'json' || ds.type === 'google_sheets')
                );
                
                if (existingSource) {
                    return null;
                }
                
                // Use getDatabase()
                const collection = db.collection(col.name);
                const count = await collection.countDocuments();
                const sample = await collection.find().limit(1).toArray();
                const columns = sample.length > 0 ? Object.keys(sample[0]).filter(k => k !== '_id') : [];
                
                return {
                    id: `collection:${col.name}`,
                    name: col.name,
                    type: 'mongodb_collection',
                    collectionName: col.name,
                    documentCount: count,
                    columns: columns,
                    lastModified: col.info ? col.info.lastModified : null
                };
            }));
            
            // Filter out nulls from collectionInfo
            const filteredCollectionInfo = collectionInfo.filter(col => col !== null);
            
            // Combine all data sources, prioritizing the ones from data_sources collection
            return [...dataSources, ...filteredCollectionInfo];
        } catch (error) {
            logger.error('Error in getAllDataSources:', error);
            throw error;
        }
    }

    /**
     * Get information about a file upload and save to data_sources collection
     */
    async createFileInfo(file, userId = null) {
        // Detect file format
        let fileFormat = '';
        let fileType = '';
        if (file.originalname.endsWith('.csv') || file.mimetype.includes('csv')) {
            fileFormat = 'CSV';
            fileType = 'csv';
        } else if (file.originalname.endsWith('.xlsx') || file.mimetype.includes('openxmlformats')) {
            fileFormat = 'Excel (XLSX)';
            fileType = 'excel';
        } else if (file.originalname.endsWith('.xls') || file.mimetype.includes('excel')) {
            fileFormat = 'Excel (XLS)';
            fileType = 'excel';
        } else if (file.originalname.endsWith('.json') || file.mimetype.includes('json')) {
            fileFormat = 'JSON';
            fileType = 'json';
        } else {
            fileFormat = 'Unknown';
            fileType = 'unknown';
        }
        
        const fileInfo = {
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

        try {
            // Store in data_sources collection
            const dataSource = new DataSource({
                user_id: userId || '000000000000000000000000', // Default if no user ID
                name: file.originalname,
                type: fileType,
                collection_name: '', // Will be set during import
                row_count: 0, // Will be set during import
                file_info: {
                    original_filename: file.originalname,
                    file_size: file.size,
                    upload_id: file.filename
                },
                created_at: new Date(),
                last_updated: new Date()
            });
            
            await dataSource.save();
            logger.info(`Saved file info to data_sources collection, ID: ${dataSource._id}`);
            
            // Add the mongoose document ID to the fileInfo for reference
            fileInfo.dataSourceId = dataSource._id;
            
        } catch (error) {
            logger.error('Error saving file info to data_sources:', error);
            // Continue even if database storage fails
        }
        
        return fileInfo;
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
                // Use getDatabase()
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