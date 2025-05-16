import { responseFormatter } from '../../utils/responseFormatter.js';
import { VisualizationService } from '../../services/visualizationService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for visualization operations
 */
export class VisualizationController {
    constructor(uploadsDir) {
        this.visualizationService = new VisualizationService(uploadsDir);
    }

    /**
     * Get visualization recommendations
     */
    async getRecommendations(req, res, next) {
        try {
            const { filePath, fileId, collectionName, sampleSize } = req.body;
            
            if (!filePath && !fileId && !collectionName) {
                throw responseFormatter.error('Missing required parameters. Either file information (filePath/fileId) or collectionName must be provided', 400);
            }
            
            const results = await this.visualizationService.generateRecommendations({
                filePath,
                fileId,
                collectionName,
                sampleSize
            });
            
            res.json(responseFormatter.success(
                results,
                'Visualization recommendations generated successfully',
                {
                    recommendationCacheId: results.recommendationCacheId,
                    recommendationsCount: results.recommended_visualizations.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refine visualization recommendations using natural language
     */
    async refineRecommendations(req, res, next) {
        try {
            const { recommendationCacheId, userPrompt, currentRecommendations } = req.body;
            
            if (!recommendationCacheId) {
                throw responseFormatter.error('Recommendation cache ID is required', 400);
            }
            
            if (!userPrompt) {
                throw responseFormatter.error('User prompt is required for refinement', 400);
            }
            
            const results = await this.visualizationService.refineVisualizationRecommendations({
                recommendationCacheId,
                userPrompt,
                currentRecommendations
            });
            
            res.json(responseFormatter.success(
                results,
                'Visualization recommendations refined successfully',
                {
                    recommendationCacheId: results.recommendationCacheId,
                    refinedVisualizationsCount: results.refined_visualizations.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate visualizations
     */
    async generateVisualizations(req, res, next) {
        try {
            const { recommendationCacheId, selectedRecommendationIds, collectionName, visualizations } = req.body;
            
            if ((!recommendationCacheId || !selectedRecommendationIds) && (!collectionName || !visualizations)) {
                throw responseFormatter.error('Invalid request. Please provide either (recommendationCacheId and selectedRecommendationIds) or (collectionName and visualizations array)', 400);
            }
            
            const results = await this.visualizationService.generateVisualizations({
                recommendationCacheId,
                selectedRecommendationIds,
                collectionName,
                visualizations
            });
            
            res.json(responseFormatter.success(
                results,
                'Visualizations generated successfully',
                {
                    collectionName: results.collection,
                    visualizationCount: results.generatedVisualizations.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Get visualizations for a collection
     */
    async getCollectionVisualizations(req, res, next) {
        try {
            const { name } = req.params;
            
            if (!name) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            // Generate recommendations for the collection (this could be optimized by storing/caching visualizations)
            const results = await this.visualizationService.generateRecommendations({
                collectionName: name,
                sampleSize: 100
            });
            
            res.json(responseFormatter.success(
                {
                    recommendations: results.recommended_visualizations,
                    dataset_info: results.dataset_info,
                    analysis_summary: results.analysis_summary
                },
                `Visualizations for collection '${name}' retrieved successfully`,
                {
                    recommendationCacheId: results.recommendationCacheId
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Regenerate a visualization with customizations
     */
    async regenerateVisualization(req, res, next) {
        try {
            const { collectionName, visualization } = req.body;
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            if (!visualization) {
                throw responseFormatter.error('Visualization configuration is required', 400);
            }
            
            const result = await this.visualizationService.regenerateVisualization(collectionName, visualization);
            
            res.json(responseFormatter.success(
                result,
                'Visualization regenerated successfully',
                {
                    collectionName: result.collection,
                    visualizationCount: result.generatedVisualizations.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Save a dashboard of visualizations
     */
    async saveDashboard(req, res, next) {
        try {
            const { name, description, collectionName, visualizations } = req.body;
            
            if (!name) {
                throw responseFormatter.error('Dashboard name is required', 400);
            }
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            if (!visualizations || !Array.isArray(visualizations) || visualizations.length === 0) {
                throw responseFormatter.error('At least one visualization is required', 400);
            }
            
            const result = await this.visualizationService.saveDashboard({
                name,
                description,
                collectionName,
                visualizations
            });
            
            res.json(responseFormatter.success(
                result,
                'Dashboard saved successfully',
                {
                    dashboardId: result.dashboardId
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Get all saved dashboards
     */
    async getAllDashboards(req, res, next) {
        try {
            const dashboards = await this.visualizationService.getAllDashboards();
            
            res.json(responseFormatter.success(
                { dashboards },
                'Dashboards retrieved successfully',
                {
                    count: dashboards.length
                }
            ));
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * Get a dashboard by ID
     */
    async getDashboardById(req, res, next) {
        try {
            const { id } = req.params;
            
            if (!id) {
                throw responseFormatter.error('Dashboard ID is required', 400);
            }
            
            const dashboard = await this.visualizationService.getDashboardById(id);
            
            res.json(responseFormatter.success(
                { dashboard },
                `Dashboard '${dashboard.name}' retrieved successfully`
            ));
        } catch (error) {
            next(error);
        }
    }
}