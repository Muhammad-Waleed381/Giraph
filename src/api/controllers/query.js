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
            const { query, collectionName } = req.body;
            
            if (!query) {
                throw responseFormatter.error('Query text is required', 400);
            }
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            logger.info(`Processing natural language query: "${query}" on collection: ${collectionName}`);
            
            const result = await this.queryService.processQuery(query, {
                collectionName
            });
            
            res.json(responseFormatter.success(
                result,
                result.naturalLanguageAnswer || 'Query processed successfully',
                { 
                    collectionName,
                    resultCount: result.results ? result.results.length : 0,
                    canVisualize: result.canVisualize || false
                }
            ));
        } catch (error) {
            next(error);
        }
    }
}