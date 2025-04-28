import { responseFormatter } from '../../utils/responseFormatter.js';
import { DashboardService } from '../../services/dashboardService.js';

/**
 * Controller for dashboard operations
 */
export class DashboardController {
    constructor() {
        this.dashboardService = new DashboardService();
    }

    /**
     * Create a new dashboard
     */
    async createDashboard(req, res, next) {
        try {
            const { name, description, layout, visualizations } = req.body;
            
            if (!name || !layout) {
                throw responseFormatter.error('Name and layout are required', 400);
            }

            const dashboardId = await this.dashboardService.createDashboard({
                name,
                description,
                layout,
                visualizations: visualizations || []
            });

            res.status(201).json(responseFormatter.success(
                { dashboardId },
                'Dashboard created successfully',
                { dashboardId }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all dashboards
     */
    async getAllDashboards(req, res, next) {
        try {
            const dashboards = await this.dashboardService.getAllDashboards();
            res.json(responseFormatter.success(
                dashboards,
                'Dashboards retrieved successfully'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get dashboard by ID
     */
    async getDashboard(req, res, next) {
        try {
            const dashboard = await this.dashboardService.getDashboardById(req.params.id);
            res.json(responseFormatter.success(
                dashboard,
                `Dashboard '${dashboard.name}' retrieved successfully`
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update a dashboard
     */
    async updateDashboard(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description, layout, visualizations } = req.body;
            
            if (!name || !layout) {
                throw responseFormatter.error('Name and layout are required', 400);
            }

            const success = await this.dashboardService.updateDashboard(id, {
                name,
                description,
                layout,
                visualizations: visualizations || []
            });

            if (!success) {
                throw responseFormatter.error('Failed to update dashboard', 500);
            }

            res.json(responseFormatter.success(
                null,
                'Dashboard updated successfully'
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete a dashboard
     */
    async deleteDashboard(req, res, next) {
        try {
            const { id } = req.params;
            const success = await this.dashboardService.deleteDashboard(id);

            if (!success) {
                throw responseFormatter.error('Failed to delete dashboard', 500);
            }

            res.json(responseFormatter.success(
                null,
                'Dashboard deleted successfully'
            ));
        } catch (error) {
            next(error);
        }
    }
}