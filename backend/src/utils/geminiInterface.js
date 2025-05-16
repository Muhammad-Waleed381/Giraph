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
            
            let textToParse = responseText.trim();
            
            // Remove markdown code block fences if present
            if (textToParse.startsWith("```json")) {
                textToParse = textToParse.substring(7); // Remove ```json
            }
            if (textToParse.startsWith("```")) {
              textToParse = textToParse.substring(3);
            }
            if (textToParse.endsWith("```")) {
                textToParse = textToParse.substring(0, textToParse.length - 3);
            }
            textToParse = textToParse.trim();

            const startIndex = textToParse.indexOf('{');
            const lastBraceIndex = textToParse.lastIndexOf('}');
            const lastBracketIndex = textToParse.lastIndexOf(']');
            
            let endIndex = -1;

            if (textToParse.startsWith("[") && lastBracketIndex > startIndex) { // Response is an array
                endIndex = lastBracketIndex;
            } else if (textToParse.startsWith("{") && lastBraceIndex > startIndex) { // Response is an object
                endIndex = lastBraceIndex;
            } else { 
                // Try to find the start of a JSON object or array if not at the beginning
                const firstBrace = textToParse.indexOf('{');
                const firstBracket = textToParse.indexOf('[');

                if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) { // Starts with {
                    if (lastBraceIndex > firstBrace) {
                        textToParse = textToParse.substring(firstBrace, lastBraceIndex + 1);
                        endIndex = textToParse.lastIndexOf('}');
                    }
                } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) { // Starts with [
                     if (lastBracketIndex > firstBracket) {
                        textToParse = textToParse.substring(firstBracket, lastBracketIndex + 1);
                        endIndex = textToParse.lastIndexOf(']');
                    }
                }
            }

            if (startIndex === -1 || endIndex === -1 || endIndex < (textToParse.startsWith("[") ? textToParse.indexOf('[') : startIndex)) {
                 logger.error("Could not find valid JSON object/array boundaries for parsing.", { originalText: responseText, processedText: textToParse });
                 throw new Error('No valid JSON object/array boundaries found in response');
            }
            
            // If we didn't re-substring above for cases where JSON doesn't start at index 0
            if (!(textToParse.startsWith("{") || textToParse.startsWith("["))) {
                 textToParse = textToParse.substring(startIndex, endIndex + 1);
            }
            
            // Pre-process MongoDB-specific syntax that's not valid JSON
            textToParse = this._preprocessMongoDBSyntax(textToParse);
            
            logger.info('Attempting to parse cleaned JSON:', textToParse);
            
            return JSON.parse(textToParse);
            
        } catch (error) {
            // Ensure textToParse is defined in this scope for logging
            const textForLog = typeof textToParse !== 'undefined' ? textToParse : responseText;
            if (error instanceof SyntaxError) {
                 logger.error('SyntaxError during JSON.parse. Text attempted:', textForLog);
            }
            logger.error('Error during _extractJsonFromResponse processing:', { error: error.message, stack: error.stack, textAttempted: textForLog});
            throw new Error(`Error extracting JSON: ${error.message}`);
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

    async generateVisualizationDataQuery(visualization, dbHandler, collectionName, schema) {
        try {
            const prompt = this._createQueryGenerationPrompt(visualization, collectionName, schema);
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

    async convertNaturalLanguageToQuery(naturalQuery, availableSchemas) {
        try {
            const prompt = this._createQueryConversionPrompt(naturalQuery, availableSchemas);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw query conversion response from Gemini:', text);
            
            let parsedResult;
            try {
                parsedResult = this._extractJsonFromResponse(text);
            } catch (parsingError) {
                logger.error('*** Error occurred during _extractJsonFromResponse ***', parsingError);
                logger.error('Original text causing parsing error:', text);
                throw new Error(`Failed to parse or extract JSON from Gemini response: ${parsingError.message}`);
            }
            
            return parsedResult;
        } catch (error) {
            logger.error('Error in convertNaturalLanguageToQuery (outer catch):', error);
            if (typeof text !== 'undefined' && !(error.message.startsWith('Failed to parse'))) {
                 logger.error('Original text (if available):', text);
            }
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

    /**
     * Refine visualization recommendations based on user's natural language prompt
     */
    async getRefinedVisualizationRecommendations(refinementPrompt) {
        try {
            logger.info('Refining visualization recommendations with Gemini...');
            const result = await this.model.generateContent(refinementPrompt);
            const response = await result.response;
            const text = response.text();
            logger.info('Raw refinement response:', text);
            
            // Use the robust _extractJsonFromResponse method
            const extractedJson = this._extractJsonFromResponse(text);

            // The prompt asks for a JSON array of recommendations.
            // If the extracted JSON is already an array, wrap it in the expected structure.
            // If it's an object with a 'visualizations' key (as sometimes returned), use that.
            if (Array.isArray(extractedJson)) {
                return { visualizations: extractedJson };
            } else if (extractedJson && typeof extractedJson === 'object' && Array.isArray(extractedJson.visualizations)) {
                return extractedJson; // It's already in the { visualizations: [] } format
            } else if (extractedJson && typeof extractedJson === 'object' && !extractedJson.visualizations) {
                 // This case can happen if the AI returns a single JSON object instead of an array or wrapped object
                logger.warn('Refinement response was a single JSON object, wrapping it into a visualizations array.');
                return { visualizations: [extractedJson] };
            }
            
            logger.error('Unexpected JSON structure from refinement response:', extractedJson);
            throw new Error('Refined recommendations did not return the expected array structure.');

        } catch (error) {
            logger.error('Error in getRefinedVisualizationRecommendations:', { message: error.message, stack: error.stack });
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

    async generateNaturalLanguageSummary(originalQuery, resultsSample, totalResultsCount, interpretation) {
        try {
            const prompt = this._createNLSummaryPrompt(originalQuery, resultsSample, totalResultsCount, interpretation);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();
            logger.info('Generated Natural Language Summary:', text);
            // Return the raw text summary, no JSON extraction needed here
            return text;
        } catch (error) {
            logger.error('Error in generateNaturalLanguageSummary:', error);
            // Fallback answer in case of error
            return `Found ${totalResultsCount} result(s) for your query: ${interpretation || ''}`;
        }
    }

    _createSchemaGenerationPrompt(metadata) {
        // Ensure column names are strings for the prompt
        const columnNamesString = metadata.columns.map(String).join(', ');
        
        return `
        You are a MongoDB schema expert. Analyze this dataset and create an optimized MongoDB schema.
        Your response MUST be valid JSON following the exact format below.
        
        Dataset Overview:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${columnNamesString} 
        
        IMPORTANT: Use the exact column names provided above as the field names in the "schema" and "properties" objects you generate. Do not modify them.
        
        Data Types (Detected from Sample):
        ${JSON.stringify(metadata.dataTypes, null, 2)}
        
        Null Value Analysis (From Sample):
        ${JSON.stringify(metadata.nullCounts, null, 2)}
        
        Sample Data (First ${metadata.sampleSize} rows):
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Instructions:
        1. Determine the most appropriate MongoDB BSON type for each column based on the sample data and data types.
        2. Suggest a suitable collection name (use underscores, lowercase, e.g., 'sales_data').
        3. Define the schema structure using the exact column names provided.
        4. Suggest relevant indexes based on potential query patterns (e.g., fields used for filtering, sorting).
        5. Generate basic validation rules.
        
        Return ONLY the following JSON structure with no additional text or explanation:
        {
            "collection_name": "suggested_name",
            "schema": {
                "COLUMN_NAME_EXACTLY_AS_PROVIDED": {
                    "type": "mongodb_bson_type",
                    "required": boolean,
                    "unique": boolean,
                    "index": boolean,
                    "description": "Description of the field based on its name and data."
                }
                // ... other fields exactly matching provided columns
            },
            "indexes": [
                {
                    "fields": ["exact_column_name_1", "exact_column_name_2"],
                    "type": "single or compound"
                }
                // ... other suggested indexes
            ],
            "validation_rules": {
                "$jsonSchema": {
                    "bsonType": "object",
                    "required": [/* list of exact required column names */],
                    "properties": {
                         "COLUMN_NAME_EXACTLY_AS_PROVIDED": {
                            "bsonType": "mongodb_bson_type_for_validation",
                            "description": "Description of the field."
                        }
                         // ... other properties exactly matching provided columns
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

    _createQueryGenerationPrompt(visualization, collectionName = 'unknown', schema = null) {
        // Include schema information in the prompt if available
        const schemaContext = schema ? `
        Collection Schema:
        ${JSON.stringify(schema, null, 2)}
        ` : '';

        return `
               Generate a MongoDB aggregation pipeline query for the specified visualization.

        Collection Name: ${collectionName}
        ${schemaContext}
        Visualization Details:
        Title: ${visualization.title}
        Type: ${visualization.type}
        Description: ${visualization.description}
        Requested Dimensions: ${visualization.data?.dimensions?.join(', ') || 'Not specified'}

        IMPORTANT INSTRUCTIONS:
        1. Use the EXACT field names provided in the Collection Schema above (if provided) or common variations if schema is absent.
        2. Create a MongoDB aggregation pipeline ([{...}, {...}]) that calculates the data needed for the visualization.
        3. For aggregations (bar, pie, etc.), use $group correctly. Use $sum, $avg, or $count as appropriate for the dimensions.
        4. For scatter plots, ensure the final documents contain the requested dimension fields.
        5. ALL string comparisons within any $match stage, you MUST use case-insensitive matching.** Use the $regex operator with the i option. **DO NOT use simple key-value pairs for string matching.** For example, to match 'public' in a field named 'status', use { "$match": { "status": { "$regex": "^public$", "$options": "i" } } }, **NOT** { "$match": { "status": "public" } }. VERY IMPORTANT: DO NOT use $expr or $where or $match for string comparisons.
        6. The FINAL stage of the pipeline ($project or $group output) MUST output documents where the field names EXACTLY MATCH the requested dimensions. For example, if dimensions are ["industry", "totalRevenue"], the final documents should look like { "industry": "some_value", "totalRevenue": number }.
        7. Use ONLY standard JSON. Do NOT use ISODate(), ObjectId(), NumberLong(), etc.
        8. Limit the results if appropriate (e.g., $limit: 50) unless the aggregation naturally limits results (like grouping by a few categories).
        9. **CRITICAL ECHARTS CONFIGURATION:**
           a. **visualization.data.dimensions**: This array MUST be populated with the exact field names that will be present in the dataset.source (i.e., the results from your pipeline). This is ESSENTIAL for connecting data to the chart.
           b. **visualization.option.series**: This array MUST be populated. Each series object within this array MUST have a type (e.g., 'bar', 'line', 'pie', 'scatter') and an encode object.
           c. **series.encode**: 
              - For type: 'bar' or type: 'line': encode should typically be { "x": "dimension_name_for_x_axis", "y": "dimension_name_for_y_axis" }. These dimension names MUST exist in visualization.data.dimensions.
              - For type: 'pie': encode should be { "itemName": "dimension_name_for_category", "value": "dimension_name_for_value" }. These dimension names MUST exist in visualization.data.dimensions.
              - For type: scatter': encode should be { "x": "dimension_name_for_x", "y": "dimension_name_for_y" }. If a third dimension is used for size, add "size": "dimension_name_for_size". These dimension names MUST exist in 
              visualization.data.dimensions.
           d. **visualization.option.xAxis and visualization.option.yAxis **: These MUST be defined. 
              - For categorical axes (common for bar/line charts), set type: 'category'. The actual category data often comes from the dataset via series.encode.x.
              - For numerical axes, set type: 'value'.
              - Example for a bar chart x-axis: "xAxis": { "type": "category" } (data is implicitly mapped from the first dimension in encode.x).
              - Example for a y-axis: "yAxis": { "type": "value" }.
           e. Ensure title.text is set from visualization.title.

        Return ONLY the following JSON structure with no additional text:
        {
            "visualization": {
                "id": "${visualization.id}",
                "type": "${visualization.type}",
                "data": {
                    "dimensions": [/* CRITICAL: Accurate array of field names from pipeline output */]
                },
                "option": {
                    "title": { "text": "${visualization.title}" },
                    "tooltip": { "trigger": "axis" },
                    "legend": { "data": [] },
                    "grid": { "left": "3%", "right": "4%", "bottom": "3%", "containLabel": true },
                    "xAxis": { /* CRITICAL: Define type, e.g., { "type": "category" } */ },
                    "yAxis": { /* CRITICAL: Define type, e.g., { "type": "value" } */ },
                    "series": [/* CRITICAL: Array of series objects with type and encode, e.g., { "type": "bar", "encode": { "x": "dim1", "y": "dim2" } } */]
                }
            },
            "pipeline": [
                // MongoDB aggregation pipeline stages
                // Example: { "$match": {} }, { "$group": {} }, { "$sort": {} }, { "$limit": 50 }
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

    _createQueryConversionPrompt(naturalQuery, availableSchemas) {
        // Ensure availableSchemas is a string representation of the object for the prompt
        const schemasString = JSON.stringify(availableSchemas, null, 2);

        return `
        You are a MongoDB query and data analysis expert. Convert this natural language query into a MongoDB aggregation pipeline, potentially joining data from multiple collections using $lookup.
        Your response MUST be valid JSON with no additional text. Aim for deterministic and consistent output for similar queries.

        Natural Language Query: "${naturalQuery}"
        Available Collections and Schemas: 
        ${schemasString}

        IMPORTANT INSTRUCTIONS:
        1.  Interpret the user's core intent, considering all available collections and schemas.
        2.  Determine if the query requires data from MULTIPLE collections and generate $lookup stages if needed.
        3.  Identify the PRIMARY collection to start the aggregation pipeline from. If multiple are suitable, prefer the one most central to the query's main subject.
        4.  **Identify the primary CATEGORY dimension (e.g., product name, region, date/year/month) and the primary VALUE dimension (e.g., count, total sales, average price) based on the query.**
        5.  Determine if the query requires analysis/inference beyond data retrieval ("requires_analysis": true/false).
        6.  Identify key fields for analysis/lookup ("analysis_fields").
        7.  Generate the MongoDB aggregation pipeline. **Prefer standard, simple pipeline structures.** For example, for counts/sums by category, typically use $match -> $group -> $project -> $sort.
        8.  Use EXACT field names from schemas.
        9.  Use case-insensitive matching ($regex) for string comparisons where appropriate.
        10. **CRITICAL Date Handling Rules for Time-Based Queries (e.g., "top 5 months by sales")**:
            -   **Identify the date field to be used for the time aggregation (e.g., "Order Date", "transaction_date").**
            -   **ALWAYS ensure this date field is a BSON Date object BEFORE applying any date operator ($year, $month, $dayOfMonth, $dateToString, etc.).**
            -   **If the schema for the field shows its type is 'string', or if the type is unknown/missing, you MUST explicitly convert it to a BSON Date using { "$toDate": "$fieldName" } before using it in any date operator.** For example: { "$year": { "$toDate": "$orderDateStringField" } }.
            -   **If the schema already indicates the field is a BSON 'date', 'datetime', or 'timestamp', you can use the date operator directly on the field (e.g., { "$year": "$orderDateField" }).**
            -   When grouping by time parts (e.g., year, month), create new fields in the $group stage with clear names (e.g., "year_extracted", "month_extracted"). Example: { $group: { _id: { year: { $year: { $toDate: "$dateField" } }, month: { $month: { $toDate: "$dateField" } } }, /* ... */ } }
            -   If the query involves a specific field like "date", treat it as a potential date field and apply conversion if it's a string.
        11. **Field Naming:** When creating new fields (e.g., in $group or $project), use clear, predictable names (e.g., 'count', 'totalSales', 'averagePrice', 'extracted_year', 'extracted_month').
        12. **Default Sorting:** If the query doesn't specify an order, apply a default sort, typically by the CATEGORY dimension ascending or the VALUE dimension descending (e.g., {$sort: { category_field: 1 }} or {$sort: { value_field: -1 }}). Choose the most logical default for the query type.
        13. **For visualization**:
            a.  Set "visualization_recommended_by_ai": true/false.
            b.  If true, provide a detailed ECharts "option".
            c.  **CRITICAL AXIS MAPPING:** Map CATEGORY dimension to 'category' axis, VALUE dimension to 'value' axis. Usually: Category->X, Value->Y. Ensure consistency.
            d.  Ensure dataset.dimensions order is [category_dimension_name, value_dimension_name].
            e.  Ensure series.encode maps correctly (e.g., { x: category_dimension_name, y: value_dimension_name } for vertical bar). Use the exact dimension names.
            f.  Provide a clear, descriptive "title".
        14. **CRITICAL JSON FORMATTING**: Single, valid JSON object, double quotes for all keys/operators.
        
        Return ONLY the following JSON structure:
        {
            "interpretation": "Brief explanation of how you interpreted the query's intent, including which collections are involved",
            "primary_collection": "name_of_the_primary_collection_to_start_aggregation",
            "requires_analysis": boolean,
            "analysis_fields": ["collection_name.field1", "joined_collection_alias.field2"], 
            "pipeline": [
                // MongoDB aggregation pipeline stages, potentially including $lookup
                {"$match": { /* ... */ }},
                {"$lookup": {
                    "from": "other_collection_name",
                    "localField": "field_in_primary",
                    "foreignField": "field_in_other",
                    "as": "joined_data_alias"
                 }},
                 {"$unwind": "$joined_data_alias"}, // Optional: if lookup returns single match
                 // ... other stages ($project, $group, $sort, $limit)
            ],
            "explanation": "Explanation of the pipeline, including the join logic and any analysis needed",
            "visualization_recommended_by_ai": boolean,
            "visualization": { 
                "type": "line/scatter/pie/bar/etc just don't keep only one type(see which one is best for the data)", 
                "title": "Clear and Descriptive Visualization Title (e.g., 'Sales Count per Region')", 
                "option": { 
                    "title": { "text": "Suggested title (should match above)" },
                    "tooltip": { },
                    "legend": { },
                    "grid": { },
                    "xAxis": { "type": "category", "data": ["category_dimension_name"] (ALWAYS PROVIDE THE DATA FOR THE X AXIS)},
                    "yAxis": { "type": "value", "data": ["value_dimension_name"] (ALWAYS PROVIDE THE DATA FOR THE Y AXIS)},
                    "dataset": {
                        "dimensions": ["category_dimension_name", "value_dimension_name"] 
                    },
                    "series": [ 
                        { "type": "bar", "encode": { "x": "category_dimension_name", "y": "value_dimension_name" } } 
                    ]
                }
            }
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

    _createNLSummaryPrompt(originalQuery, resultsSample, totalResultsCount, interpretation) {
        // Limit sample size for prompt efficiency
        const sample = resultsSample.slice(0, 5);
        const sampleString = JSON.stringify(sample, null, 2);

        return `
        You are an AI assistant summarizing database query results in a natural, conversational way.
        The user asked the following question: "${originalQuery}"
        We interpreted this as: "${interpretation || 'Fetching relevant data'}"
        The query returned a total of ${totalResultsCount} results.
        Here is a sample of the results (up to 5 entries):
        \`\`\`json
        ${sampleString}
        \`\`\`

        Instructions:
        1.  Analyze the original query and the results sample.
        2.  Generate a concise, natural language answer that directly addresses the user's query.
        3.  If it's a single result (totalResultsCount = 1), focus on the key information requested (e.g., "The youngest business is X, founded in Y.").
        4.  If there are multiple results, summarize the findings (e.g., "Found 15 companies. The top one is X...", "There are 5 regions, with the highest count in Y.").
        5.  If there are no results (totalResultsCount = 0), state that clearly.
        6.  Keep the response friendly and easy to understand for a non-technical user.
        7.  Do NOT just repeat the JSON data. Synthesize the information.
        8.  Do NOT include phrases like "Based on the data..." unless necessary for clarity.
        9.  Respond ONLY with the natural language summary text, no extra formatting or explanations.

        Example for "which business is the youngest?" with one result:
        "The youngest business is [Business Name], founded in [Year]."

        Example for "how many customers per region?" with multiple results:
        "We found customers across [Number] regions. The region with the most customers is [Region Name] with [Count] customers."

        Generate the natural language summary now:
        `;
    }
}

export { GeminiInterface };