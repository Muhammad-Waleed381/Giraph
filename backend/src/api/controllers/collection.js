import { responseFormatter } from '../../utils/responseFormatter.js';
import { CollectionService } from '../../services/collectionService.js';

/**
 * Controller for MongoDB collections
 */
export class CollectionController {
    constructor() {
        this.collectionService = new CollectionService();
    }

    /**
     * Get all collections
     */
    async getAllCollections(req, res, next) {
        try {
            const collections = await this.collectionService.getAllCollections();
            res.json(responseFormatter.success(
                collections,
                'Collections retrieved successfully',
                { collections }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get collection by name
     */
    async getCollection(req, res, next) {
        try {
            const { name } = req.params;
            const collection = await this.collectionService.getCollection(name);
            
            res.json(responseFormatter.success(
                collection,
                `Collection '${name}' retrieved successfully`,
                { collection }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get data from collection with filtering, sorting, etc.
     */
    async getCollectionData(req, res, next) {
        try {
            const { name } = req.params;
            const { limit, skip, sort, filter } = req.query;
            
            const result = await this.collectionService.getCollectionData(name, {
                limit,
                skip,
                sort,
                filter
            });
            
            res.json(responseFormatter.success(
                result.data,
                `Data from collection '${name}' retrieved successfully`,
                { metadata: result.metadata }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete collection
     */
    async deleteCollection(req, res, next) {
        try {
            const { name } = req.params;
            const { force } = req.query;
            
            const result = await this.collectionService.deleteCollection(name, {
                force: force === 'true'
            });
            
            // If the collection requires confirmation for deletion
            if (result.requiresConfirmation) {
                return res.status(400).json({
                    success: false,
                    error: 'Collection is large',
                    message: result.message,
                    documentCount: result.documentCount
                });
            }
            
            res.json(responseFormatter.success(
                null,
                result.message,
                { documentCount: result.documentCount }
            ));
        } catch (error) {
            next(error);
        }
    }
}