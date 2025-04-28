import express from 'express';
import { CollectionController } from '../controllers/collection.js';

/**
 * Collections routes
 * @returns {express.Router} Router instance
 */
export function setupCollectionRoutes() {
    const router = express.Router();
    const collectionController = new CollectionController();
    
    // Collection management routes
    router.get('/', collectionController.getAllCollections.bind(collectionController));
    router.get('/:name', collectionController.getCollection.bind(collectionController));
    router.get('/:name/data', collectionController.getCollectionData.bind(collectionController));
    router.delete('/:name', collectionController.deleteCollection.bind(collectionController));

    return router;
}