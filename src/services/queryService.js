import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
// Import GeminiInterface statically
import { GeminiInterface } from '../utils/geminiInterface.js'; 

/**
 * Service for natural language querying
 */
export class QueryService {
    constructor() {
        // Initialize directly in constructor
        this.geminiInterface = new GeminiInterface(); 
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
            
            // Process natural language query using the already initialized interface
            // await this._initGeminiInterface(); // Remove this call
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

            // Improved visualization recommendation logic
            let finalVisualization = null;
            let canVisualize = false;
            
            // Check if AI recommended visualization AND results exist
            if (queryResult.visualization_recommended_by_ai && queryResults.length > 0) {
                logger.info('AI recommended visualization for this query type and results exist.');
                canVisualize = true;
                
                // Start with the structure provided by AI
                finalVisualization = queryResult.visualization || {}; // Use Gemini's suggestion
                finalVisualization.option = finalVisualization.option || {}; // Ensure option object exists
                
                // Ensure dataset structure exists within option
                finalVisualization.option.dataset = finalVisualization.option.dataset || {};
                
                // Inject actual data and ensure dimensions are set
                finalVisualization.option.dataset.source = queryResults;
                if (!finalVisualization.option.dataset.dimensions) {
                    finalVisualization.option.dataset.dimensions = queryResult.visualization?.option?.dataset?.dimensions || Object.keys(queryResults[0] || {}).filter(k => k !== '_id');
                    logger.info(`Inferred dimensions: ${finalVisualization.option.dataset.dimensions.join(', ')}`);
                }
                
                // Ensure title is set
                finalVisualization.option.title = finalVisualization.option.title || {};
                finalVisualization.option.title.text = finalVisualization.title || queryResult.interpretation;

                // Add default series if missing
                if (!finalVisualization.option.series || finalVisualization.option.series.length === 0) {
                    const defaultType = finalVisualization.type || 'bar'; // Default to bar if type missing
                    finalVisualization.option.series = [{ type: defaultType }];
                    logger.warn(`AI did not provide series configuration. Added default series: ${defaultType}`);
                }

            } else if (queryResult.visualization) {
                logger.info('AI did not recommend visualization for this query type, or no results returned.');
            }

            return {
                collectionName,
                query,
                interpretation: queryResult.interpretation || 'Query processed successfully',
                naturalLanguageAnswer, // Use the AI-generated answer
                results: queryResults,
                visualization: finalVisualization, // Use the detailed object (or null)
                canVisualize, // Use the refined flag
                explanation: queryResult.explanation || 'No additional explanation available',
                mongoQuery: queryResult.pipeline
            };
        } catch (error) {
            logger.error(`Error processing natural language query:`, error);
            throw error;
        }
    }
}