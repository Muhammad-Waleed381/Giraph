import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
import crypto from 'crypto';
import { FileLoader } from '../utils/fileLoader.js';
import path from 'path';

/**
 * Service for managing visualizations
 */
export class VisualizationService {
    constructor(uploadsDir) {
        this.uploadsDir = uploadsDir;
        this.recommendationCache = new Map();
        this.CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
        
        // Start cache cleanup timer
        this._startCacheCleanup();
    }
    
    /**
     * Generate visualization recommendations
     */
    async generateRecommendations(options) {
        try {
            const { filePath, fileId, collectionName, sampleSize = 100 } = options;
            
            let metadata;
            let schema;
            let sourceInfo = {};
            
            const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
            
            if (collectionName) {
                // Using existing collection
                logger.info(`Analyzing existing collection: ${collectionName}`);
                
                // Get database instance
                const db = getDatabase();
                const collection = db.collection(collectionName);
                
                // Get collection info
                const count = await collection.countDocuments();
                if (count === 0) {
                    throw new Error('Collection is empty');
                }
                
                // Get sample data from collection
                const sampleData = await collection.find().limit(parseInt(sampleSize)).toArray();
                
                // Create a basic schema from sample data
                const sampleSchema = sampleData.length > 0 
                    ? Object.keys(sampleData[0]).reduce((acc, key) => {
                        if (key !== '_id') {
                            acc[key] = typeof sampleData[0][key];
                        }
                        return acc;
                    }, {})
                    : {};
                
                metadata = {
                    totalRows: count,
                    columns: Object.keys(sampleSchema),
                    sampleData: sampleData,
                    sampleSize: sampleData.length,
                    schema: sampleSchema
                };
                
                schema = { 
                    collection_name: collectionName,
                    schema: sampleSchema
                };
                
                sourceInfo = { type: 'collection', name: collectionName };
            } else {
                // Using file path or ID
                let normalizedPath;
                if (filePath) {
                    normalizedPath = path.normalize(filePath);
                    logger.info(`Using provided file path: ${normalizedPath}`);
                    sourceInfo = { type: 'file', path: normalizedPath };
                } else if (fileId) {
                    normalizedPath = path.join(this.uploadsDir, fileId);
                    logger.info(`Using uploaded file: ${normalizedPath}`);
                    sourceInfo = { type: 'file', id: fileId, path: normalizedPath };
                } else {
                    throw new Error('Missing information. Either file information (filePath/fileId) or collectionName is required');
                }
                
                // Load file and generate schema
                logger.info('Loading file for recommendations:', normalizedPath);
                const fileData = await FileLoader.loadFile(normalizedPath, sampleSize);
                metadata = fileData.metadata;
                
                logger.info('Generating schema from file metadata');
                schema = await gemini.analyzeDataAndGenerateSchema(metadata);
            }
            
            // Generate visualization recommendations
            logger.info('Generating visualization recommendations via Gemini...');
            const recommendationsResult = await gemini.generateVisualizationRecommendations(metadata, schema);
            logger.info('Visualization recommendations generated successfully.');
            
            // Create cache entry
            const recommendationCacheId = crypto.randomBytes(16).toString('hex');
            const detailedRecommendations = recommendationsResult.visualizations.map(vis => ({
                id: vis.id,
                title: vis.title,
                description: vis.description,
                type: vis.type,
                dimensions: vis.data ? vis.data.dimensions : [],
                echartsConfigHints: vis.echarts_config ? {
                    title: vis.echarts_config.title,
                    tooltip: vis.echarts_config.tooltip || { trigger: 'axis' },
                    legend: vis.echarts_config.legend,
                    xAxis: vis.echarts_config.xAxis,
                    yAxis: vis.echarts_config.yAxis
                } : {}
            }));
            
            this.recommendationCache.set(recommendationCacheId, { 
                timestamp: Date.now(),
                collectionName: schema.collection_name,
                recommendations: detailedRecommendations 
            });
            logger.info(`Stored recommendations under cache ID: ${recommendationCacheId}`);
            
            // Create response
            const responsePayload = {
                recommendationCacheId: recommendationCacheId,
                source_info: sourceInfo,
                dataset_info: recommendationsResult.dataset_info,
                analysis_summary: recommendationsResult.analysis_summary,
                recommended_visualizations: recommendationsResult.visualizations.map(vis => ({
                    id: vis.id,
                    title: vis.title,
                    description: vis.description,
                    type: vis.type,
                    suggestedDimensions: vis.data ? vis.data.dimensions : [],
                    echartsConfigHints: vis.echarts_config ? {
                        title: vis.echarts_config.title,
                        tooltip: vis.echarts_config.tooltip || { trigger: 'axis' },
                        legend: vis.echarts_config.legend,
                        xAxis: vis.echarts_config.xAxis,
                        yAxis: vis.echarts_config.yAxis
                    } : {},
                    preview: this._generatePreviewForVisualization(vis.type)
                }))
            };
            
            return responsePayload;
        } catch (error) {
            logger.error('Error in generateRecommendations:', error);
            throw error;
        }
    }
    
    /**
     * Generate visualizations based on recommendations
     */
    async generateVisualizations(options) {
        try {
            const { recommendationCacheId, selectedRecommendationIds, collectionName: collectionNameFromBody, visualizations: visualizationsFromBody } = options;
            
            let collectionName; 
            let visualizationsToGenerate = [];
            
            // Determine input type and prepare visualizations
            if (recommendationCacheId && Array.isArray(selectedRecommendationIds)) {
                logger.info(`Generating based on cache ID: ${recommendationCacheId} and selected IDs: ${selectedRecommendationIds.join(', ')}`);
                
                // Retrieve from cache
                const cachedData = this.recommendationCache.get(recommendationCacheId);
                if (!cachedData) {
                    throw new Error(`Cache ID ${recommendationCacheId} is invalid or has expired`);
                }
                
                collectionName = cachedData.collectionName;
                const allCachedRecommendations = cachedData.recommendations;
                
                // Filter based on selected IDs
                visualizationsToGenerate = allCachedRecommendations
                    .filter(rec => selectedRecommendationIds.includes(rec.id))
                    .map(rec => ({
                        id: rec.id,
                        type: rec.type,
                        title: rec.title,
                        description: rec.description,
                        dimensions: rec.dimensions,
                        optionsOverride: rec.echartsConfigHints
                    }));
                
                if (visualizationsToGenerate.length === 0) {
                    throw new Error('No matching recommendations found for selected IDs in cache');
                }
            } else if (collectionNameFromBody && Array.isArray(visualizationsFromBody)) {
                logger.info(`Generating based on provided visualization details for collection: ${collectionNameFromBody}`);
                collectionName = collectionNameFromBody;
                visualizationsToGenerate = visualizationsFromBody;
            } else {
                throw new Error('Invalid parameters. Request must contain either (recommendationCacheId and selectedRecommendationIds) or (collectionName and visualizations array)');
            }
            
            // Ensure we have a collection name
            if (!collectionName) {
                throw new Error('Collection name could not be determined');
            }
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot generate visualizations`);
            }
            
            // Get collection schema
            const sampleDoc = await collection.findOne({});
            const schemaForQuery = Object.keys(sampleDoc || {}).reduce((acc, key) => {
                if (key !== '_id') {
                    acc[key] = typeof sampleDoc[key];
                }
                return acc;
            }, {});
            
            const generatedCharts = [];
            const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
            
            logger.info('Generating data queries and ECharts options for visualizations...');
            
            // Process each visualization
            for (const visConfig of visualizationsToGenerate) {
                let chartOption = null;
                let error = null;
                
                try {
                    logger.info(`Processing visualization request: ${visConfig.title || visConfig.type}`);
                    
                    // Prepare visualization object for query generation
                    const visForQuery = {
                        id: visConfig.id || new Date().getTime().toString(),
                        type: visConfig.type,
                        title: visConfig.title,
                        description: visConfig.description,
                        echarts_config: visConfig.optionsOverride || { title: { text: visConfig.title } }
                    };
                    
                    // Use dimensions from the prepared visConfig
                    if (visConfig.dimensions) {
                        visForQuery.data = { dimensions: visConfig.dimensions };
                    }
                    
                    // Generate query configuration
                    const queryConfigResult = await gemini.generateVisualizationDataQuery(visForQuery, null, collectionName, schemaForQuery);
                    logger.info('Query config generated:', JSON.stringify(queryConfigResult));
                    
                    if (!queryConfigResult || !queryConfigResult.pipeline || !Array.isArray(queryConfigResult.pipeline)) {
                        throw new Error(`Invalid query configuration received from AI for ${visForQuery.title}`);
                    }
                    
                    // Execute the MongoDB query using aggregation pipeline
                    const dbHandler = new (await import('../utils/dbHandler.js')).DatabaseHandler();
                    dbHandler.db = db;
                    const queryResults = await dbHandler.executeQuery(collection, { aggregate: queryConfigResult.pipeline });
                    logger.info(`Query executed for ${visForQuery.title}. Results count: ${queryResults.length}`);
                    
                    // Construct the final ECharts option object
                    chartOption = {
                        ...(queryConfigResult.visualization?.option || {}),
                        ...(visConfig.optionsOverride || {}),
                        title: { text: visConfig.title || visForQuery.title, ...(visConfig.optionsOverride?.title || queryConfigResult.visualization?.option?.title || {}) },
                        tooltip: { ...(queryConfigResult.visualization?.option?.tooltip || { trigger: 'axis' }), ...(visConfig.optionsOverride?.tooltip || {}) },
                        legend: { ...(queryConfigResult.visualization?.option?.legend || {}), ...(visConfig.optionsOverride?.legend || {}) },
                        grid: { ...(queryConfigResult.visualization?.option?.grid || { containLabel: true }), ...(visConfig.optionsOverride?.grid || {}) },
                        dataset: {
                            source: queryResults,
                            dimensions: queryConfigResult.visualization?.data?.dimensions
                        },
                        series: queryConfigResult.visualization?.option?.series || []
                    };
                    
                    // Apply basic series if none provided
                    if (chartOption.series.length === 0 && queryResults.length > 0) {
                        logger.warn(`AI did not provide series configuration for ${visConfig.title}. Applying basic series.`);
                        chartOption.series = [{ type: visConfig.type || 'bar' }];
                    }
                } catch (e) {
                    logger.error(`Error processing visualization ${visConfig.title || visConfig.id}:`, e);
                    error = { message: e.message, stack: e.stack };
                }
                
                generatedCharts.push({
                    id: visConfig.id,
                    title: visConfig.title,
                    type: visConfig.type,
                    options: chartOption,
                    error: error
                });
            }
            
            return {
                collection: collectionName,
                generatedVisualizations: generatedCharts
            };
        } catch (error) {
            logger.error('Error in generateVisualizations:', error);
            throw error;
        }
    }
    
    /**
     * Regenerate a visualization with customization
     */
    async regenerateVisualization(collectionName, visualizationConfig) {
        try {
            if (!collectionName) {
                throw new Error('Collection name is required');
            }
            
            if (!visualizationConfig) {
                throw new Error('Visualization configuration is required');
            }
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot generate visualizations`);
            }
            
            // Get collection schema
            const sampleDoc = await collection.findOne({});
            const schemaForQuery = Object.keys(sampleDoc || {}).reduce((acc, key) => {
                if (key !== '_id') {
                    acc[key] = typeof sampleDoc[key];
                }
                return acc;
            }, {});
            
            const gemini = new (await import('../utils/geminiInterface.js')).GeminiInterface();
            
            // Process each visualization in config (array)
            const visualizationsToGenerate = Array.isArray(visualizationConfig) ? visualizationConfig : [visualizationConfig];
            const generatedCharts = [];
            
            for (const visConfig of visualizationsToGenerate) {
                let chartOption = null;
                let error = null;
                
                try {
                    logger.info(`Processing visualization request: ${visConfig.title || visConfig.type}`);
                    
                    // Prepare visualization object for query generation
                    const visForQuery = {
                        id: visConfig.id || new Date().getTime().toString(),
                        type: visConfig.type,
                        title: visConfig.title,
                        description: visConfig.description,
                        echarts_config: visConfig.optionsOverride || { title: { text: visConfig.title } }
                    };
                    
                    // Use dimensions from the prepared visConfig
                    if (visConfig.dimensions) {
                        visForQuery.data = { dimensions: visConfig.dimensions };
                    }
                    
                    // Generate query configuration
                    const queryConfigResult = await gemini.generateVisualizationDataQuery(visForQuery, null, collectionName, schemaForQuery);
                    logger.info('Query config generated:', JSON.stringify(queryConfigResult));
                    
                    if (!queryConfigResult || !queryConfigResult.pipeline || !Array.isArray(queryConfigResult.pipeline)) {
                        throw new Error(`Invalid query configuration received from AI for ${visForQuery.title}`);
                    }
                    
                    // Execute the MongoDB query using aggregation pipeline
                    const dbHandler = new (await import('../utils/dbHandler.js')).DatabaseHandler();
                    dbHandler.db = db;
                    const queryResults = await dbHandler.executeQuery(collection, { aggregate: queryConfigResult.pipeline });
                    logger.info(`Query executed for ${visForQuery.title}. Results count: ${queryResults.length}`);
                    
                    // Construct the final ECharts option object
                    chartOption = {
                        ...(queryConfigResult.visualization?.option || {}),
                        ...(visConfig.optionsOverride || {}),
                        title: { text: visConfig.title || visForQuery.title, ...(visConfig.optionsOverride?.title || queryConfigResult.visualization?.option?.title || {}) },
                        tooltip: { ...(queryConfigResult.visualization?.option?.tooltip || { trigger: 'axis' }), ...(visConfig.optionsOverride?.tooltip || {}) },
                        legend: { ...(queryConfigResult.visualization?.option?.legend || {}), ...(visConfig.optionsOverride?.legend || {}) },
                        grid: { ...(queryConfigResult.visualization?.option?.grid || { containLabel: true }), ...(visConfig.optionsOverride?.grid || {}) },
                        dataset: {
                            source: queryResults,
                            dimensions: queryConfigResult.visualization?.data?.dimensions
                        },
                        series: queryConfigResult.visualization?.option?.series || []
                    };
                    
                    // Apply basic series if none provided
                    if (chartOption.series.length === 0 && queryResults.length > 0) {
                        logger.warn(`AI did not provide series configuration for ${visConfig.title}. Applying basic series.`);
                        chartOption.series = [{ type: visConfig.type || 'bar' }];
                    }
                } catch (e) {
                    logger.error(`Error processing visualization ${visConfig.title || visConfig.id}:`, e);
                    error = { message: e.message, stack: e.stack };
                }
                
                generatedCharts.push({
                    id: visConfig.id,
                    title: visConfig.title,
                    type: visConfig.type,
                    options: chartOption,
                    error: error
                });
            }
            
            return {
                collection: collectionName,
                generatedVisualizations: generatedCharts
            };
        } catch (error) {
            logger.error('Error in regenerateVisualization:', error);
            throw error;
        }
    }
    
    /**
     * Helper: Generate preview data for visualizations
     */
    _generatePreviewForVisualization(type) {
        switch (type) {
            case 'bar_chart':
            case 'bar':
                return {
                    preview: true,
                    data: [
                        { category: 'A', value: 120 },
                        { category: 'B', value: 200 },
                        { category: 'C', value: 150 },
                        { category: 'D', value: 80 },
                        { category: 'E', value: 170 }
                    ]
                };
            case 'line_chart':
            case 'line':
                return {
                    preview: true,
                    data: Array.from({ length: 7 }, (_, i) => ({
                        date: `Day ${i+1}`,
                        value: Math.floor(Math.random() * 100 + 50)
                    }))
                };
            case 'pie_chart':
            case 'pie':
                return {
                    preview: true,
                    data: [
                        { name: 'Category A', value: 30 },
                        { name: 'Category B', value: 50 },
                        { name: 'Category C', value: 20 }
                    ]
                };
            case 'scatter_chart':
            case 'scatter':
                return {
                    preview: true,
                    data: Array.from({ length: 10 }, () => ({
                        x: Math.random() * 100,
                        y: Math.random() * 100
                    }))
                };
            default:
                return {
                    preview: true,
                    message: "Preview not available for this visualization type"
                };
        }
    }
    
    /**
     * Helper: Clean up expired cache entries
     */
    _cleanupCache() {
        const now = Date.now();
        for (const [key, { timestamp }] of this.recommendationCache.entries()) {
            if (now - timestamp > this.CACHE_TTL_MS) {
                this.recommendationCache.delete(key);
                logger.info(`Removed expired recommendation cache entry: ${key}`);
            }
        }
    }
    
    /**
     * Helper: Start cache cleanup timer
     */
    _startCacheCleanup() {
        setInterval(() => this._cleanupCache(), 5 * 60 * 1000); // Clean every 5 minutes
    }
}