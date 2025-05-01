import { ObjectId } from 'mongodb';
import { logger } from '../utils/logger.js';

class Dashboard {
    constructor(db) {
        this.db = db;
        this.collection = db.collection('dashboards');
    }

    async create(dashboardData) {
        try {
            const result = await this.collection.insertOne({
                ...dashboardData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return result.insertedId;
        } catch (error) {
            logger.error('Error creating dashboard:', error);
            throw error;
        }
    }

    async getById(id) {
        try {
            return await this.collection.findOne({ _id: new ObjectId(id) });
        } catch (error) {
            logger.error('Error getting dashboard by ID:', error);
            throw error;
        }
    }

    async getAll() {
        try {
            return await this.collection.find({}).toArray();
        } catch (error) {
            logger.error('Error getting all dashboards:', error);
            throw error;
        }
    }

    async update(id, dashboardData) {
        try {
            const result = await this.collection.updateOne(
                { _id: new ObjectId(id) },
                { 
                    $set: {
                        ...dashboardData,
                        updatedAt: new Date()
                    }
                }
            );
            return result.modifiedCount > 0;
        } catch (error) {
            logger.error('Error updating dashboard:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
            return result.deletedCount > 0;
        } catch (error) {
            logger.error('Error deleting dashboard:', error);
            throw error;
        }
    }
}

export default Dashboard; 