import { responseFormatter } from '../../utils/responseFormatter.js';
import { DataSourceService } from '../../services/dataSourceService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for data sources (files, collections, Google Sheets)
 */
export class DataSourceController {
    constructor(uploadsDir, googleSheets) {
        this.dataSourceService = new DataSourceService(uploadsDir);
        this.googleSheets = googleSheets;
    }

    /**
     * Get all data sources
     */
    async getAllDataSources(req, res, next) {
        try {
            const sources = await this.dataSourceService.getAllDataSources(this.googleSheets);
            res.json(responseFormatter.success(sources, 'Data sources retrieved successfully', { sources }));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload a file
     */
    async uploadFile(req, res, next) {
        try {
            logger.info('File upload request received');
            
            if (!req.file) {
                logger.error('No file received in upload request');
                throw responseFormatter.error('No file uploaded. Please select a file to upload', 400);
            }
            
            logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
            
            // Check if file is empty
            if (req.file.size === 0) {
                // Delete the empty file
                const fs = await import('fs/promises');
                await fs.unlink(req.file.path);
                
                throw responseFormatter.error('The uploaded file is empty', 400);
            }
            
            const fileInfo = this.dataSourceService.createFileInfo(req.file);
            
            // Return file information to client
            res.status(200).json(responseFormatter.success(
                fileInfo, 
                'File uploaded successfully',
                { fileInfo }
            ));
        } catch (error) {
            // If an error occurs, try to delete the uploaded file
            if (req.file && req.file.path) {
                try {
                    const fs = await import('fs/promises');
                    await fs.unlink(req.file.path);
                    logger.info(`Deleted incomplete upload: ${req.file.path}`);
                } catch (unlinkError) {
                    logger.error('Error deleting incomplete upload:', unlinkError);
                }
            }
            
            next(error);
        }
    }

    /**
     * Get uploaded files
     */
    async getUploadedFiles(req, res, next) {
        try {
            const files = await this.dataSourceService.getUploadedFiles();
            
            res.json(responseFormatter.success(
                files,
                'Files retrieved successfully',
                { files }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete an uploaded file
     */
    async deleteFile(req, res, next) {
        try {
            const { fileId } = req.params;
            const result = await this.dataSourceService.deleteFile(fileId);
            
            res.json(responseFormatter.success(
                null,
                result.message
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete any data source
     */
    async deleteDataSource(req, res, next) {
        try {
            const { id } = req.params;
            
            if (!id) {
                throw responseFormatter.error('Source ID is required', 400);
            }
            
            const result = await this.dataSourceService.deleteDataSource(id);
            
            res.json(responseFormatter.success(
                null,
                result.message
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Analyze schema of a file
     */
    async analyzeSchema(req, res, next) {
        try {
            const { filePath, fileId, sampleSize = 100 } = req.body;
            
            if (!filePath && !fileId) {
                throw responseFormatter.error('Missing file information. Either filePath or fileId is required', 400);
            }
            
            const { metadata, schema } = await this.dataSourceService.analyzeSchema(
                filePath || fileId, 
                !filePath, // isId = true if filePath is not provided
                sampleSize
            );
            
            // Create a user-friendly response with column information
            const columnInfo = {};
            for (const [field, fieldSchema] of Object.entries(schema.schema)) {
                columnInfo[field] = {
                    type: fieldSchema.type,
                    description: fieldSchema.description,
                    isRequired: fieldSchema.required || false, 
                    isUnique: fieldSchema.unique || false,
                    isIndex: fieldSchema.index || false,
                    nullCount: metadata.nullCounts[field] || 0,
                    suitableForVisualization: this.isSuitableForVisualization(field, fieldSchema.type)
                };
            }
            
            const schemaInfo = {
                suggestedCollectionName: schema.collection_name,
                totalRows: metadata.totalRows,
                sampleSize: metadata.sampleSize,
                columns: columnInfo,
                sampleData: metadata.sampleData.slice(0, 5), // First 5 rows as sample
                fileInfo: {
                    path: filePath || fileId,
                    id: fileId || path.basename(filePath)
                }
            };
            
            res.json(responseFormatter.success(
                schemaInfo,
                'Schema analysis completed successfully'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Helper: Check if field is suitable for visualization
     */
    isSuitableForVisualization(field, type) {
        // Numeric fields are good for measures (y-axis, sizes, etc)
        if (type === 'double' || type === 'int' || type === 'number' || type === 'decimal') {
            return {
                suitable: true,
                recommendedUses: ['measure', 'y-axis', 'value', 'size'],
                reason: 'Numeric fields work well for measures in charts'
            };
        }
        
        // Date fields are good for time-series
        if (type === 'date' || type === 'timestamp') {
            return {
                suitable: true,
                recommendedUses: ['dimension', 'x-axis', 'time-series'],
                reason: 'Date fields work well for time-series visualizations'
            };
        }
        
        // String/text fields are good for categories
        if (type === 'string' || type === 'text') {
            return {
                suitable: true,
                recommendedUses: ['dimension', 'category', 'label', 'group-by'],
                reason: 'Text fields work well as categories or labels'
            };
        }
        
        // Boolean fields
        if (type === 'boolean') {
            return {
                suitable: true,
                recommendedUses: ['filter', 'segment'],
                reason: 'Boolean fields work well for filtering or segmenting data'
            };
        }
        
        // For other types
        return {
            suitable: false,
            recommendedUses: [],
            reason: 'This data type may not be ideal for visualizations'
        };
    }
}