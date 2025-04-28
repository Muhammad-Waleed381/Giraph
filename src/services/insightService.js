import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';

/**
 * Service for AI-powered data insights
 */
export class InsightService {
    constructor() {
        this.geminiInterface = null; // Will be lazily initialized
    }

    /**
     * Get insights for a collection
     */
    async getInsights(collectionName, options = {}) {
        try {
            const { sampleSize = 100 } = options;
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot generate insights`);
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
            
            // Generate insights
            await this._initGeminiInterface();
            logger.info(`Generating insights for collection ${collectionName}`);
            
            const insights = await this.geminiInterface.generateDatasetInsights({
                totalRows: count,
                columns: Object.keys(sampleSchema),
                sampleData: sampleData,
                sampleSize: sampleData.length,
                schema: sampleSchema
            }, { collection_name: collectionName, schema: sampleSchema });
            
            logger.info(`Insights generated successfully for collection ${collectionName}`);
            
            return {
                collectionName,
                insights: insights.insights || [],
                summaries: insights.summaries || {},
                patterns: insights.patterns || [],
                recommendations: insights.recommendations || []
            };
        } catch (error) {
            logger.error(`Error generating insights for collection ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Generate time series forecast
     */
    async generateForecast(collectionName, options = {}) {
        try {
            const { 
                dateField, 
                valueField, 
                groupByField = null, 
                forecastPeriods = 7, 
                seasonality = 'auto' 
            } = options;
            
            if (!dateField || !valueField) {
                throw new Error('Both dateField and valueField are required for forecasting');
            }
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists and has data
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot generate forecast`);
            }
            
            // Aggregate time series data
            const pipeline = [
                { $sort: { [dateField]: 1 } }  // Sort by date
            ];
            
            // Add group by if specified
            if (groupByField) {
                pipeline.push({
                    $group: {
                        _id: {
                            date: `$${dateField}`,
                            group: `$${groupByField}`
                        },
                        value: { $sum: `$${valueField}` }
                    }
                });
            } else {
                pipeline.push({
                    $group: {
                        _id: { date: `$${dateField}` },
                        value: { $sum: `$${valueField}` }
                    }
                });
            }
            
            // Project to desired format
            pipeline.push({
                $project: {
                    _id: 0,
                    date: "$_id.date",
                    ...(groupByField && { group: "$_id.group" }),
                    value: 1
                }
            });
            
            // Execute aggregate query
            const timeSeriesData = await collection.aggregate(pipeline).toArray();
            
            if (timeSeriesData.length === 0) {
                throw new Error('No valid time series data available for forecasting');
            }
            
            // Generate forecast
            await this._initGeminiInterface();
            logger.info(`Generating forecast for collection ${collectionName}`);
            
            const forecastResult = await this.geminiInterface.generateTimeSeriesForecast(
                timeSeriesData,
                {
                    dateField: 'date',
                    valueField: 'value',
                    groupField: groupByField ? 'group' : null,
                    forecastPeriods,
                    seasonality
                }
            );
            
            logger.info(`Forecast generated successfully for collection ${collectionName}`);
            
            return {
                collectionName,
                originalData: timeSeriesData,
                forecastData: forecastResult.forecast || [],
                confidence: forecastResult.confidence || {},
                summary: forecastResult.summary || {},
                model: forecastResult.model || 'time series'
            };
        } catch (error) {
            logger.error(`Error generating forecast for collection ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Detect anomalies in data
     */
    async detectAnomalies(collectionName, options = {}) {
        try {
            const { 
                dateField, 
                valueField, 
                sensitivityLevel = 'medium'
            } = options;
            
            if (!dateField || !valueField) {
                throw new Error('Both dateField and valueField are required for anomaly detection');
            }
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists and has data
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot detect anomalies`);
            }
            
            // Get all data sorted by date
            const data = await collection.find()
                .sort({ [dateField]: 1 })
                .project({
                    _id: 0,
                    date: `$${dateField}`,
                    value: `$${valueField}`
                })
                .toArray();
            
            if (data.length === 0) {
                throw new Error('No valid data available for anomaly detection');
            }
            
            // Detect anomalies
            await this._initGeminiInterface();
            logger.info(`Detecting anomalies for collection ${collectionName}`);
            
            // Map sensitivity level to threshold
            let threshold;
            switch (sensitivityLevel) {
                case 'low':
                    threshold = 3.0; // 3 standard deviations
                    break;
                case 'medium':
                    threshold = 2.0; // 2 standard deviations
                    break;
                case 'high':
                    threshold = 1.5; // 1.5 standard deviations
                    break;
                default:
                    threshold = 2.0;
            }
            
            const anomalyResult = await this.geminiInterface.detectAnomalies(
                data,
                {
                    dateField: 'date',
                    valueField: 'value',
                    threshold
                }
            );
            
            logger.info(`Anomalies detected successfully for collection ${collectionName}`);
            
            return {
                collectionName,
                data: data,
                anomalies: anomalyResult.anomalies || [],
                analysis: anomalyResult.analysis || {},
                summary: anomalyResult.summary || {},
                detectionMethod: anomalyResult.method || 'statistical'
            };
        } catch (error) {
            logger.error(`Error detecting anomalies for collection ${collectionName}:`, error);
            throw error;
        }
    }
    
    /**
     * Process natural language query
     */
    async processNaturalLanguageQuery(query, options = {}) {
        try {
            const { collectionName } = options;
            
            if (!collectionName) {
                throw new Error('Collection name is required for natural language querying');
            }
            
            // Get database instance
            const db = getDatabase();
            const collection = db.collection(collectionName);
            
            // Check if collection exists
            const count = await collection.countDocuments();
            if (count === 0) {
                throw new Error(`Collection '${collectionName}' is empty, cannot process query`);
            }
            
            // Get collection schema
            const sampleDoc = await collection.findOne();
            const schema = Object.keys(sampleDoc || {}).reduce((acc, key) => {
                if (key !== '_id') {
                    acc[key] = typeof sampleDoc[key];
                }
                return acc;
            }, {});
            
            // Process natural language query
            await this._initGeminiInterface();
            logger.info(`Processing natural language query for collection ${collectionName}: "${query}"`);
            
            const queryResult = await this.geminiInterface.convertNaturalLanguageToQuery(
                query,
                collectionName,
                schema
            );
            
            if (!queryResult || !queryResult.pipeline || !Array.isArray(queryResult.pipeline)) {
                throw new Error('Failed to convert natural language query to MongoDB query');
            }
            
            // Execute the query
            logger.info(`Executing generated query pipeline: ${JSON.stringify(queryResult.pipeline)}`);
            const queryResults = await collection.aggregate(queryResult.pipeline).toArray();
            logger.info(`Query executed successfully, got ${queryResults.length} results`);
            
            // Generate visualization for the query if appropriate
            let visualization = null;
            if (queryResult.visualization) {
                visualization = {
                    ...queryResult.visualization,
                    dataset: {
                        source: queryResults,
                        dimensions: queryResult.visualization.data?.dimensions || []
                    }
                };
            }
            
            return {
                collectionName,
                query,
                interpretation: queryResult.interpretation || 'Query processed successfully',
                results: queryResults,
                visualization,
                explanation: queryResult.explanation || 'No additional explanation available',
                mongoQuery: queryResult.pipeline
            };
        } catch (error) {
            logger.error(`Error processing natural language query:`, error);
            throw error;
        }
    }
    
    /**
     * Initialize GeminiInterface lazily
     */
    async _initGeminiInterface() {
        if (!this.geminiInterface) {
            const GeminiInterface = (await import('../utils/geminiInterface.js')).GeminiInterface || 
                                    (await import('../utils/geminiInterface.js')).default;
            this.geminiInterface = new GeminiInterface();
        }
    }
}