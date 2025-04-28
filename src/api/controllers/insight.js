import { responseFormatter } from '../../utils/responseFormatter.js';
import { InsightService } from '../../services/insightService.js';
import { logger } from '../../utils/logger.js';

/**
 * Controller for AI-powered data insights
 */
export class InsightController {
    constructor() {
        this.insightService = new InsightService();
    }

    /**
     * Get insights for a collection
     */
    async getInsights(req, res, next) {
        try {
            const { collectionName } = req.params;
            const { sampleSize } = req.query;
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            const insights = await this.insightService.getInsights(collectionName, { 
                sampleSize: sampleSize ? parseInt(sampleSize) : 100 
            });
            
            res.json(responseFormatter.success(
                insights,
                `Insights for collection '${collectionName}' generated successfully`,
                { 
                    collectionName,
                    insightCount: insights.insights ? insights.insights.length : 0
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Generate time series forecast
     */
    async generateForecast(req, res, next) {
        try {
            const { collectionName } = req.params;
            const { dateField, valueField, groupByField, forecastPeriods, seasonality } = req.query;
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            if (!dateField || !valueField) {
                throw responseFormatter.error('Both dateField and valueField are required', 400);
            }
            
            const forecast = await this.insightService.generateForecast(collectionName, {
                dateField,
                valueField,
                groupByField,
                forecastPeriods: forecastPeriods ? parseInt(forecastPeriods) : 7,
                seasonality
            });
            
            res.json(responseFormatter.success(
                forecast,
                `Forecast for collection '${collectionName}' generated successfully`,
                { 
                    collectionName,
                    originalDataPoints: forecast.originalData ? forecast.originalData.length : 0,
                    forecastDataPoints: forecast.forecastData ? forecast.forecastData.length : 0
                }
            ));
        } catch (error) {
            next(error);
        }
    }

    /**
     * Detect anomalies in data
     */
    async detectAnomalies(req, res, next) {
        try {
            const { collectionName } = req.params;
            const { dateField, valueField, sensitivityLevel } = req.query;
            
            if (!collectionName) {
                throw responseFormatter.error('Collection name is required', 400);
            }
            
            if (!dateField || !valueField) {
                throw responseFormatter.error('Both dateField and valueField are required', 400);
            }
            
            const anomalies = await this.insightService.detectAnomalies(collectionName, {
                dateField,
                valueField,
                sensitivityLevel: sensitivityLevel || 'medium'
            });
            
            res.json(responseFormatter.success(
                anomalies,
                `Anomalies for collection '${collectionName}' detected successfully`,
                { 
                    collectionName,
                    totalDataPoints: anomalies.data ? anomalies.data.length : 0,
                    anomaliesFound: anomalies.anomalies ? anomalies.anomalies.length : 0
                }
            ));
        } catch (error) {
            next(error);
        }
    }
}