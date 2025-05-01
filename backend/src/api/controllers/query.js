import { responseFormatter } from '../../utils/responseFormatter.js';
import { QueryService } from '../../services/queryService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for natural language querying
 */
export class QueryController {
    constructor() {
        this.queryService = new QueryService();
    }

    /**
     * Process natural language query
     */
    async processQuery(req, res, next) {
        try {
            // Accept an optional array of collection names
            const { query, collectionNames } = req.body;
            
            if (!query) {
                throw responseFormatter.error('Query text is required', 400);
            }
            
            // Validate collectionNames if provided (must be an array)
            if (collectionNames && !Array.isArray(collectionNames)) {
                 throw responseFormatter.error('collectionNames must be an array of strings', 400);
            }
            
            // Log the incoming query and target collections (if any)
            const logMessage = collectionNames 
                ? `Processing natural language query: "${query}" targeting collections: [${collectionNames.join(', ')}]`
                : `Processing natural language query: "${query}" against all collections`;
            logger.info(logMessage);
            
            // Pass collectionNames to the service options
            const result = await this.queryService.processQuery(query, { collectionNames });
            
            res.json(responseFormatter.success(
                result,
                result.naturalLanguageAnswer || 'Query processed successfully',
                { 
                    primaryCollection: result.primaryCollection, 
                    targetedCollections: collectionNames || 'all', // Indicate which collections were targeted
                    resultCount: result.results ? result.results.length : 0,
                    canVisualize: result.canVisualize || false
                }
            ));
        } catch (error) {
            next(error);
        }
    }
}