import { logger } from '../utils/logger.js';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';

/**
 * Service for managing dashboards
 */
export class DashboardService {
    constructor() {
        this.collection = getDatabase().collection('dashboards');
    }

    /**
     * Create a new dashboard
     */
    async createDashboard(dashboardData) {
        try {
            const result = await this.collection.insertOne({
                ...dashboardData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            
            logger.info(`Dashboard created with ID: ${result.insertedId}`);
            return result.insertedId;
        } catch (error) {
            logger.error('Error creating dashboard:', error);
            throw error;
        }
    }

    /**
     * Get a dashboard by ID
     */
    async getDashboardById(id) {
        try {
            const objectId = this._convertToObjectId(id);
            const dashboard = await this.collection.findOne({ _id: objectId });
            
            if (!dashboard) {
                throw new Error(`Dashboard with ID ${id} not found`);
            }
            
            return dashboard;
        } catch (error) {
            logger.error(`Error getting dashboard by ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get all dashboards
     */
    async getAllDashboards() {
        try {
            return await this.collection.find({}).sort({ updatedAt: -1 }).toArray();
        } catch (error) {
            logger.error('Error getting all dashboards:', error);
            throw error;
        }
    }

    /**
     * Update a dashboard
     */
    async updateDashboard(id, dashboardData) {
        try {
            const objectId = this._convertToObjectId(id);
            
            const result = await this.collection.updateOne(
                { _id: objectId },
                { 
                    $set: {
                        ...dashboardData,
                        updatedAt: new Date()
                    }
                }
            );
            
            if (result.matchedCount === 0) {
                throw new Error(`Dashboard with ID ${id} not found`);
            }
            
            logger.info(`Dashboard ${id} updated successfully`);
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error(`Error updating dashboard ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete a dashboard
     */
    async deleteDashboard(id) {
        try {
            const objectId = this._convertToObjectId(id);
            
            const result = await this.collection.deleteOne({ _id: objectId });
            
            if (result.deletedCount === 0) {
                throw new Error(`Dashboard with ID ${id} not found`);
            }
            
            logger.info(`Dashboard ${id} deleted successfully`);
            return true;
        } catch (error) {
            logger.error(`Error deleting dashboard ${id}:`, error);
            throw error;
        }
    }
    
    /**
     * Helper: Convert string ID to MongoDB ObjectId
     */
    _convertToObjectId(id) {
        try {
            return new ObjectId(id);
        } catch (error) {
            throw new Error(`Invalid dashboard ID format: ${id}`);
        }
    }
}