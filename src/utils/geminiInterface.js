import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger.js';

class GeminiInterface {
    constructor() {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY not found in environment variables');
            }
            this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-1.5-flash' });
            logger.info('GeminiInterface initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize GeminiInterface:', error);
            throw error;
        }
    }

    async analyzeDataAndGenerateSchema(metadata) {
        try {
            const prompt = this._createSchemaGenerationPrompt(metadata);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw Gemini response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in analyzeDataAndGenerateSchema:', error);
            throw error;
        }
    }

    _extractJsonFromResponse(responseText) {
        try {
            logger.info('Processing response for JSON extraction');
            
            // First, clean the text by removing markdown code blocks if present
            let cleanText = responseText;
            if (cleanText.includes('```json')) {
                cleanText = cleanText.split('```json')[1].split('```')[0].trim();
            } else if (cleanText.includes('```')) {
                cleanText = cleanText.split('```')[1].split('```')[0].trim();
            }
            
            // Find the first { and last }
            const startIndex = cleanText.indexOf('{');
            const endIndex = cleanText.lastIndexOf('}');
            
            if (startIndex === -1 || endIndex === -1) {
                throw new Error('No valid JSON object found in response');
            }
            
            // Extract just the JSON part
            cleanText = cleanText.substring(startIndex, endIndex + 1);
            
            // Pre-process MongoDB-specific syntax that's not valid JSON
            cleanText = this._preprocessMongoDBSyntax(cleanText);
            
            // Parse the JSON
            try {
                return JSON.parse(cleanText);
            } catch (parseError) {
                logger.error('JSON Parse Error:', parseError);
                logger.error('Attempted to parse:', cleanText);
                throw new Error(`Failed to parse JSON: ${parseError.message}`);
            }
        } catch (error) {
            logger.error('Error extracting JSON:', error);
            logger.error('Original response:', responseText);
            throw error;
        }
    }
    
    _preprocessMongoDBSyntax(jsonString) {
        // Replace MongoDB ISODate with ISO date string for JSON compatibility
        jsonString = jsonString.replace(/ISODate\(["'](.+?)["']\)/g, '"$1"');
        
        // Replace ObjectId with string representation
        jsonString = jsonString.replace(/ObjectId\(["'](.+?)["']\)/g, '"$1"');
        
        // Replace MongoDB NumberDecimal/NumberLong/NumberInt with plain numbers
        jsonString = jsonString.replace(/NumberDecimal\(["']?(.+?)["']?\)/g, '$1');
        jsonString = jsonString.replace(/NumberLong\(["']?(.+?)["']?\)/g, '$1');
        jsonString = jsonString.replace(/NumberInt\(["']?(.+?)["']?\)/g, '$1');
        
        return jsonString;
    }

    async generateVisualizationRecommendations(metadata, schema) {
        try {
            const prompt = this._createVisualizationPrompt(metadata, schema);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw visualization response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in generateVisualizationRecommendations:', error);
            throw error;
        }
    }

    async generateVisualizationDataQuery(visualization, dbHandler, collectionName) {
        try {
            const prompt = this._createQueryGenerationPrompt(visualization, collectionName);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw query generation response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in generateVisualizationDataQuery:', error);
            throw error;
        }
    }

    async generateDatasetInsights(metadata) {
        try {
            const prompt = this._createInsightsPrompt(metadata);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw insights response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in generateDatasetInsights:', error);
            throw error;
        }
    }

    async convertNaturalLanguageToQuery(naturalQuery, collectionName, schema) {
        try {
            const prompt = this._createQueryConversionPrompt(naturalQuery, collectionName, schema);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw query conversion response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in convertNaturalLanguageToQuery:', error);
            throw error;
        }
    }

    async generateTimeSeriesForecast(metadata, forecastPeriods = 12) {
        try {
            const prompt = this._createForecastPrompt(metadata, forecastPeriods);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw forecast response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in generateTimeSeriesForecast:', error);
            throw error;
        }
    }

    async detectAnomalies(metadata, sensitivity = 0.95) {
        try {
            const prompt = this._createAnomalyDetectionPrompt(metadata, sensitivity);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw anomaly detection response:', text);
            return this._extractJsonFromResponse(text);
        } catch (error) {
            logger.error('Error in detectAnomalies:', error);
            throw error;
        }
    }

    _createSchemaGenerationPrompt(metadata) {
        return `
        You are a MongoDB schema expert. Analyze this dataset and create an optimized MongoDB schema.
        Your response MUST be valid JSON following the exact format below.
        
        Dataset Overview:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${metadata.columns.join(', ')}
        
        Data Types:
        ${JSON.stringify(metadata.dataTypes, null, 2)}
        
        Null Value Analysis:
        ${JSON.stringify(metadata.nullCounts, null, 2)}
        
        Sample Data:
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Return ONLY the following JSON structure with no additional text or explanation:
        {
            "collection_name": "suggested_name",
            "schema": {
                "field_name": {
                    "type": "mongodb_type",
                    "required": boolean,
                    "unique": boolean,
                    "index": boolean,
                    "description": "field_description"
                }
            },
            "indexes": [
                {
                    "fields": ["field1", "field2"],
                    "type": "index_type"
                }
            ],
            "validation_rules": {
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": ["field1", "field2"],
                    "properties": {
                        "field_name": {
                            "bsonType": "string",
                            "description": "field description"
                        }
                    }
                }
            }
        }`;
    }

    _createVisualizationPrompt(metadata, schema) {
        return `
        You are a data visualization expert. Create visualization recommendations for this dataset.
        Your response MUST be valid JSON with no additional text.
        
        Dataset Info:
        ${JSON.stringify(metadata, null, 2)}
        
        Schema:
        ${JSON.stringify(schema, null, 2)}
        
        Return ONLY the following JSON structure:
        {
            "dataset_info": {
                "name": "dataset_name",
                "total_rows": number,
                "columns": ["column1", "column2"]
            },
            "visualizations": [
                {
                    "id": "unique_id",
                    "type": "chart_type",
                    "title": "chart_title",
                    "description": "description",
                    "data": {
                        "source": "data_source",
                        "dimensions": ["dimension1", "dimension2"]
                    },
                    "echarts_config": {
                        "title": {},
                        "tooltip": {},
                        "legend": {},
                        "xAxis": {},
                        "yAxis": {},
                        "series": []
                    }
                }
            ],
            "analysis_summary": {
                "key_insights": ["insight1", "insight2"],
                "recommended_order": ["vis_id1", "vis_id2"]
            }
        }`;
    }

    _createQueryGenerationPrompt(visualization, collectionName = 'unknown') {
        return `
        Generate a MongoDB aggregation pipeline query for this visualization.
        
        Collection Name: ${collectionName}
        
        Visualization Details:
        Title: ${visualization.title}
        Type: ${visualization.type}
        Description: ${visualization.description}
        
        IMPORTANT: 
        1. Use only standard JSON in your response. Do NOT use MongoDB-specific syntax like:
           - ISODate() - use ISO string format like "2022-01-01T00:00:00Z" instead
           - ObjectId() - use string representation instead
           - NumberLong(), NumberInt(), NumberDecimal() - use plain numbers instead
        
        2. Create a working aggregation pipeline that will return actual data for this specific visualization.
           For example:
           - For bar charts: Group by categories with $group and calculate summaries like $sum
           - For line charts: Group by time periods with proper date formatting
           - For pie charts: Calculate proportions and percentages
           - For scatter plots: Provide individual data points with relevant dimensions
        
        3. For best results, use a pipeline with stages like:
           - $match to filter relevant data
           - $group to aggregate data
           - $project to shape the output
           - $sort to order results
           - $limit to avoid too many data points (max 50)
        
        Return ONLY the following JSON structure with no additional text:
        {
            "visualization": {
                "id": "${visualization.id}",
                "type": "${visualization.type}",
                "data": {
                    "dimensions": ["dimension1", "dimension2"] 
                },
                "option": {
                    "series": []
                }
            },
            "pipeline": [
                {"$match": {}},
                {"$group": {}},
                {"$sort": {}}
            ]
        }`;
    }

    _createInsightsPrompt(metadata) {
        return `
        You are a data analysis expert. Analyze this dataset and provide comprehensive insights.
        Your response MUST be valid JSON with no additional text.
        
        Dataset Info:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${metadata.columns.join(', ')}
        - Schema: ${JSON.stringify(metadata.schema, null, 2)}
        
        Sample Data:
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Return ONLY the following JSON structure:
        {
            "key_patterns": [
                {
                    "title": "pattern_title",
                    "description": "pattern_description",
                    "confidence": "high/medium/low",
                    "evidence": ["evidence1", "evidence2"]
                }
            ],
            "anomalies": [
                {
                    "title": "anomaly_title",
                    "description": "anomaly_description",
                    "severity": "high/medium/low",
                    "affected_fields": ["field1", "field2"]
                }
            ],
            "trends": [
                {
                    "title": "trend_title",
                    "description": "trend_description",
                    "direction": "increasing/decreasing/stable",
                    "timeframe": "timeframe_description"
                }
            ],
            "statistical_summary": {
                "numeric_fields": {
                    "field_name": {
                        "mean": number,
                        "median": number,
                        "std_dev": number,
                        "min": number,
                        "max": number
                    }
                },
                "categorical_fields": {
                    "field_name": {
                        "unique_values": number,
                        "most_common": ["value1", "value2"],
                        "distribution": {
                            "value1": percentage,
                            "value2": percentage
                        }
                    }
                }
            },
            "recommendations": [
                {
                    "title": "recommendation_title",
                    "description": "recommendation_description",
                    "priority": "high/medium/low",
                    "action_items": ["action1", "action2"]
                }
            ],
            "analysis_summary": "Overall summary of the dataset analysis"
        }`;
    }

    _createQueryConversionPrompt(naturalQuery, collectionName, schema) {
        return `
        Convert this natural language query into a MongoDB query.
        Your response MUST be valid JSON with no additional text.
        
        Natural Language Query: "${naturalQuery}"
        Collection Name: ${collectionName}
        Schema: ${JSON.stringify(schema, null, 2)}
        
        Return ONLY the following JSON structure:
        {
            "query": {
                "type": "find/aggregate",
                "pipeline": [
                    // For aggregate queries
                ],
                "filter": {
                    // For find queries
                },
                "projection": {
                    // Fields to include/exclude
                },
                "sort": {
                    // Sort criteria
                },
                "limit": number
            },
            "explanation": "Brief explanation of the query"
        }`;
    }

    _createForecastPrompt(metadata, forecastPeriods) {
        return `
        Analyze this time-series data and generate forecasts.
        Your response MUST be valid JSON with no additional text.
        
        Dataset Info:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${metadata.columns.join(', ')}
        - Schema: ${JSON.stringify(metadata.schema, null, 2)}
        
        Sample Data:
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Forecast Periods: ${forecastPeriods}
        
        Return ONLY the following JSON structure:
        {
            "time_series_analysis": {
                "time_column": "column_name",
                "value_columns": ["column1", "column2"],
                "frequency": "daily/weekly/monthly/yearly",
                "trend": "increasing/decreasing/stable",
                "seasonality": true/false
            },
            "forecasts": {
                "column_name": {
                    "historical_data": [
                        {
                            "timestamp": "date",
                            "value": number,
                            "actual": true
                        }
                    ],
                    "forecast_data": [
                        {
                            "timestamp": "date",
                            "value": number,
                            "lower_bound": number,
                            "upper_bound": number,
                            "actual": false
                        }
                    ],
                    "metrics": {
                        "mae": number,
                        "rmse": number,
                        "mape": number
                    }
                }
            },
            "insights": [
                "insight1",
                "insight2"
            ],
            "recommendations": [
                "recommendation1",
                "recommendation2"
            ]
        }`;
    }

    _createAnomalyDetectionPrompt(metadata, sensitivity) {
        return `
        Analyze this dataset and detect anomalies.
        Your response MUST be valid JSON with no additional text.
        
        Dataset Info:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${metadata.columns.join(', ')}
        - Schema: ${JSON.stringify(metadata.schema, null, 2)}
        
        Sample Data:
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Sensitivity: ${sensitivity}
        
        Return ONLY the following JSON structure:
        {
            "data_summary": {
                "numeric_columns": ["column1", "column2"],
                "categorical_columns": ["column3", "column4"],
                "date_columns": ["column5"]
            },
            "anomalies": {
                "point_anomalies": [
                    {
                        "id": "anomaly_id",
                        "type": "point",
                        "column": "column_name",
                        "value": "anomalous_value",
                        "expected_range": {
                            "min": number,
                            "max": number
                        },
                        "score": number,
                        "severity": "high/medium/low",
                        "explanation": "explanation of the anomaly"
                    }
                ],
                "contextual_anomalies": [
                    {
                        "id": "anomaly_id",
                        "type": "contextual",
                        "columns": ["column1", "column2"],
                        "pattern": "description of anomalous pattern",
                        "score": number,
                        "severity": "high/medium/low",
                        "explanation": "explanation of the anomaly"
                    }
                ]
            },
            "statistical_summary": {
                "column_name": {
                    "mean": number,
                    "median": number,
                    "std_dev": number,
                    "min": number,
                    "max": number,
                    "iqr": number
                }
            },
            "insights": [
                "insight1",
                "insight2"
            ],
            "recommendations": [
                "recommendation1",
                "recommendation2"
            ]
        }`;
    }
}

export { GeminiInterface }; 