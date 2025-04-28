import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';

/**
 * Service for natural language querying
 */
export class QueryService {
    constructor() {
        this.geminiInterface = null; // Will be lazily initialized
    }

    /**
     * Process natural language query
     */
    async processQuery(query, options = {}) {
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
            
            // Log the query result for debugging
            logger.info(`Raw query result: ${JSON.stringify(queryResult)}`);
            
            if (!queryResult || !queryResult.pipeline || !Array.isArray(queryResult.pipeline)) {
                logger.error(`Invalid query result format: ${JSON.stringify(queryResult)}`);
                throw new Error('Failed to convert natural language query to MongoDB query');
            }
            
            // Execute the query
            logger.info(`Executing generated query pipeline: ${JSON.stringify(queryResult.pipeline)}`);
            const queryResults = await collection.aggregate(queryResult.pipeline).toArray();
            logger.info(`Query executed successfully, got ${queryResults.length} results`);

            // Generate natural language answer using Gemini
            const naturalLanguageAnswer = await this.geminiInterface.generateNaturalLanguageSummary(
                query,
                queryResults, // Pass the actual results
                queryResults.length, // Pass the total count
                queryResult.interpretation
            );

            // Improved visualization recommendation
            let visualization = null;
            let canVisualize = false;
            // Check if visualization was suggested AND results are suitable (more than 1 row or grouped)
            if (queryResult.visualization && queryResults.length > 0) {
                // Heuristic: Visualize if multiple results OR if single result has multiple fields (likely grouped)
                if (queryResults.length > 1 || (queryResults.length === 1 && Object.keys(queryResults[0]).length > 2)) {
                    visualization = {
                        ...queryResult.visualization,
                        dataset: {
                            source: queryResults,
                            dimensions: queryResult.visualization.data?.dimensions || []
                        }
                    };
                    canVisualize = true;
                    logger.info('Visualization is recommended for this query result.');
                } else {
                    logger.info('Visualization is possible but likely not meaningful for this single-result query.');
                }
            }

            return {
                collectionName,
                query,
                interpretation: queryResult.interpretation || 'Query processed successfully',
                naturalLanguageAnswer, // Use the AI-generated answer
                results: queryResults,
                visualization,
                canVisualize, // Use the refined flag
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
            try {
                // Try to import as named export first
                const { GeminiInterface } = await import('../utils/geminiInterface.js');
                this.geminiInterface = new GeminiInterface();
                logger.info('GeminiInterface initialized from named export');
            } catch (error) {
                // Fall back to default export if named export fails
                logger.warn('Failed to import GeminiInterface as named export, trying default export', error);
                const DefaultGeminiInterface = (await import('../utils/geminiInterface.js')).default;
                if (!DefaultGeminiInterface) {
                    logger.error('Failed to import GeminiInterface');
                    throw new Error('Could not initialize GeminiInterface');
                }
                this.geminiInterface = new DefaultGeminiInterface();
                logger.info('GeminiInterface initialized from default export');
            }
        }
    }
}