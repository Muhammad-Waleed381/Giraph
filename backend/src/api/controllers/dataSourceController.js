import { DataSource } from \'../../models/DataSource.js\'; // Assuming this is the correct path
import { responseFormatter } from \'../../utils/responseFormatter.js\';
import { logger } from \'../../utils/logger.js\';


export class DataSourceController {
    constructor(dataSourceService) {
        this.dataSourceService = dataSourceService;
    }

    async getUserCollections(req, res, next) {
        try {
            const userId = req.user.id; // Assuming req.user.id is available after authentication
            if (!userId) {
                return next(responseFormatter.error(\'User not authenticated\', 401));
            }

            logger.info(`Fetching collections for user ${userId}`);
            // Find distinct collection names where status indicates successful import/availability
            // And where collectionName is not null or empty
            const collections = await DataSource.find({
                userId: userId,
                status: { $in: [\'imported\', \'completed\', \'processed\'] }, // Adjust statuses as needed
                collectionName: { $exists: true, $ne: null, $ne: \'\' }
            }).distinct(\'collectionName\');

            logger.info(`Found ${collections.length} distinct collections for user ${userId}: ${collections.join(\', \')}`);
            res.json(responseFormatter.success(collections, \'Successfully fetched user collections\'));
        } catch (error) {
            logger.error(\`Error fetching user collections for user ${req.user?.id}: \`, error);
            next(responseFormatter.error(\'Failed to fetch user collections\', 500));
        }
    }
} 