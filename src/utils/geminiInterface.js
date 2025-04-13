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
}

export { GeminiInterface }; 