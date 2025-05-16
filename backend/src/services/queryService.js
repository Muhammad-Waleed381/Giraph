import { logger } from '../utils/logger.js';
import { getDatabase } from '../config/database.js';
// Import GeminiInterface statically
import { GeminiInterface } from '../utils/geminiInterface.js'; 
// We need DatabaseHandler to get schema info
import { DatabaseHandler } from '../utils/dbHandler.js'; 

/**
 * Service for natural language querying
 */
export class QueryService {
    constructor() {
        // Initialize directly in constructor
        this.geminiInterface = new GeminiInterface(); 
        // Instantiate DatabaseHandler - assumes default constructor is sufficient
        // Or potentially inject it if it requires configuration or a shared instance
        this.dbHandler = new DatabaseHandler(); 
    }

    // Helper function to format names (snake_case or camelCase to Title Case)
    formatDimensionName(name) {
        if (!name) return '';
        // Add space before capital letters (for camelCase) and replace _ with space
        const spaced = name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
        // Capitalize first letter of each word and trim whitespace
        return spaced
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
            .trim();
    }

    /**
     * Fix date operations in aggregation pipeline
     * Detect and fix common date operation issues, particularly ensuring date operators have correct input.
     * It prefers using $toDate for string-to-date conversions.
     * @param {Array} pipeline - MongoDB aggregation pipeline
     * @param {Object} availableSchemas - Collection schemas to check field types
     * @param {string} primaryCollection - Name of the primary collection
     * @returns {Array} - Fixed pipeline
     */
    fixDateOperations(pipeline, availableSchemas, primaryCollection) {
        if (!pipeline || !Array.isArray(pipeline) || pipeline.length === 0) {
            return pipeline;
        }

        logger.info(`Validating and fixing date operations in pipeline for ${primaryCollection}...`);

        const collectionSchema = availableSchemas[primaryCollection]?.schema || {};
        const knownDateFields = new Set();

        // Find initial date fields from schema and common names
        Object.entries(collectionSchema).forEach(([fieldName, fieldInfo]) => {
            const fieldType = String(fieldInfo?.type || '').toLowerCase();
            if (fieldType.includes('date') || fieldType.includes('timestamp')) {
                knownDateFields.add(fieldName);
                logger.debug(`Identified date field from schema type: ${fieldName}`);
            } else {
                // Check common date field name patterns even if type is string or unknown
                const lowerFieldName = fieldName.toLowerCase();
                if (lowerFieldName.includes('date') || lowerFieldName.includes('time') || 
                    lowerFieldName.endsWith('_at') || lowerFieldName.endsWith('_on') || 
                    ['created', 'modified', 'timestamp', 'event_date'].includes(lowerFieldName)) {
                    knownDateFields.add(fieldName); // Add it, _recursivelyFixDateOps will ensure $toDate if it's used as string by AI
                    logger.debug(`Potentially identified date field by name pattern: ${fieldName} (will verify usage)`);
                }
            }
        });
        // Add very common generic date field names if not already caught by schema/patterns
        ['date', 'Date', 'Order Date', 'order_date', 'transaction_date'].forEach(df => knownDateFields.add(df));

        logger.info(`Initial candidate date fields for ${primaryCollection}: ${Array.from(knownDateFields).join(', ')}`);

        const fixedPipeline = JSON.parse(JSON.stringify(pipeline));

        for (const stage of fixedPipeline) {
            this._recursivelyFixDateOps(stage, null, null, knownDateFields, collectionSchema);
            this._trackDateFieldsFromStage(stage, knownDateFields); // Track fields that become dates
        }

        logger.info(`Pipeline after date operation fixing for ${primaryCollection}: ${JSON.stringify(fixedPipeline)}`);
        return fixedPipeline;
    }

    /**
     * Helper: Recursively scan and fix date operations within an object/array.
     * Modifies the object/array in place.
     */
    _recursivelyFixDateOps(current, parent, keyInParent, knownDateFields, schema) {
        if (!current || typeof current !== 'object') return;

        if (Array.isArray(current)) {
            current.forEach((item, index) => this._recursivelyFixDateOps(item, current, index, knownDateFields, schema));
            return;
        }

        const dateOperators = ['$year', '$month', '$dayOfMonth', '$dayOfWeek', '$dayOfYear', '$hour', '$minute', '$second', '$millisecond', '$dateToString'];

        Object.keys(current).forEach(key => {
            const value = current[key];

            if (key === '$dateFromString' && value && typeof value === 'object' && parent && keyInParent !== null) {
                const dateFieldExpr = value.dateString;
                let fieldName = null;
                if (typeof dateFieldExpr === 'string' && dateFieldExpr.startsWith('$')) {
                    fieldName = dateFieldExpr.substring(1);
                }
                
                const fieldSchemaType = fieldName ? schema[fieldName]?.type?.toLowerCase() : null;
                if (fieldName && fieldSchemaType && (fieldSchemaType.includes('date') || fieldSchemaType.includes('timestamp'))) {
                    logger.warn(`Gemini used $dateFromString on field '${fieldName}' which is already a BSON date. Replacing with direct field reference.`);
                    parent[keyInParent] = `$${fieldName}`;
                    return; 
                } else {
                    logger.warn(`Converting $dateFromString to $toDate for input: ${JSON.stringify(value)}.`);
                    parent[keyInParent] = { $toDate: value.dateString }; 
                    return; 
                }
            }
            
            if (dateOperators.includes(key)) {
                const inputExpr = value;
                if (typeof inputExpr === 'string' && inputExpr.startsWith('$')) {
                    const fieldName = inputExpr.substring(1);
                    const fieldSchemaType = schema[fieldName]?.type?.toLowerCase();

                    // Condition for forcing $toDate:
                    // 1. Schema type is explicitly 'string'.
                    // 2. Schema type is unknown/missing, and it's a common date-like field name (e.g., 'date', 'Order Date').
                    // 3. It is NOT already confirmed to be a BSON date type by a strict schema check.
                    const commonDateNames = ['date', 'order_date', 'transaction_date', 'event_date', 'ship_date', 'delivery_date', 'created_at', 'updated_at', 'Order Date', 'Ship Date'];
                    const isCommonDateName = commonDateNames.includes(fieldName) || fieldName.toLowerCase().includes('date');

                    if (fieldSchemaType === 'string' || 
                        (!fieldSchemaType && isCommonDateName) || 
                        (fieldSchemaType && !fieldSchemaType.includes('date') && !fieldSchemaType.includes('timestamp') && isCommonDateName)) {
                        logger.warn(`Date operator '${key}' on field '${fieldName}' (schema type: ${fieldSchemaType || 'unknown'}, commonName: ${isCommonDateName}). Applying $toDate.`);
                        current[key] = { $toDate: inputExpr };
                    } else if (fieldSchemaType && (fieldSchemaType.includes('date') || fieldSchemaType.includes('timestamp'))) {
                        logger.debug(`Date operator '${key}' correctly applied to BSON date field '${fieldName}'.`);
                    } else {
                        // Fallback for less certain cases: if Gemini didn't use $toDate and it is in knownDateFields (by pattern), apply $toDate.
                        // This handles cases where schema might be missing but name suggests a date.
                        if (knownDateFields.has(fieldName)){
                             logger.warn(`Date operator '${key}' on field '${fieldName}' (in knownDateFields by pattern, schema type: ${fieldSchemaType || 'unknown'}). Applying $toDate as a safeguard.`);
                             current[key] = { $toDate: inputExpr };
                        } else {
                            logger.debug(`Date operator '${key}' on field '${fieldName}'. Type seems non-date and not a strong date name pattern. Assuming AI handled it or it's not a date.`);
                        }
                    }
                } else if (inputExpr && typeof inputExpr === 'object') {
                    this._recursivelyFixDateOps(inputExpr, current, key, knownDateFields, schema);
                } else if (typeof inputExpr === 'string') {
                     logger.warn(`Date operator '${key}' applied to literal string '${inputExpr}'. Applying $toDate.`);
                     current[key] = { $toDate: inputExpr };
                }
            }

            if (value && typeof value === 'object') {
                this._recursivelyFixDateOps(value, current, key, knownDateFields, schema);
            }
        });
    }

    /**
     * Helper: Track fields that become dates as a result of a pipeline stage.
     * @private
     */
    _trackDateFieldsFromStage(stage, knownDateFields) {
        const stageOperator = Object.keys(stage)[0];
        let fieldsToCheck = null;
        if (stageOperator === '$project' || stageOperator === '$addFields') {
            fieldsToCheck = stage[stageOperator];
        } else if (stageOperator === '$group') {
            fieldsToCheck = stage[stageOperator];
            const groupFields = { ...(typeof fieldsToCheck._id === 'object' ? fieldsToCheck._id : {}), ...fieldsToCheck };
            delete groupFields._id;
            fieldsToCheck = groupFields;
        }

        if (fieldsToCheck && typeof fieldsToCheck === 'object') {
            Object.entries(fieldsToCheck).forEach(([fieldName, definition]) => {
                if (this._expressionProducesDate(definition, knownDateFields)) {
                    if (!knownDateFields.has(fieldName)) {
                        logger.debug(`Tracking new date field "${fieldName}" created by stage ${stageOperator}`);
                        knownDateFields.add(fieldName);
                    }
                } else {
                    if (knownDateFields.has(fieldName)) {
                        logger.debug(`Field "${fieldName}" is being overwritten by a non-date expression in stage ${stageOperator}. Untracking.`);
                        knownDateFields.delete(fieldName);
                    }
                }
            });
        }
    }

    /**
     * Helper: Check if a MongoDB expression likely produces a Date object.
     * @private
     */
    _expressionProducesDate(definition, knownDateFields) {
        if (!definition || typeof definition !== 'object') {
            if (typeof definition === 'string' && definition.startsWith('$')) {
                return knownDateFields.has(definition.substring(1));
            }
            return false;
        }
        // Check for operators that explicitly return dates
        if (definition.$toDate !== undefined) return true;
        if (definition.$dateFromString !== undefined) return true; // Keep for completeness, though we prefer $toDate
        if (definition.$dateAdd !== undefined) return true;
        if (definition.$dateSubtract !== undefined) return true;
        if (definition.$dateTrunc !== undefined) return true;

        if (definition.$ifNull && Array.isArray(definition.$ifNull)) {
            return definition.$ifNull.some(arg => this._expressionProducesDate(arg, knownDateFields));
        }
        if (definition.$cond) {
            const thenExpr = definition.$cond.then;
            const elseExpr = definition.$cond.else;
            return this._expressionProducesDate(thenExpr, knownDateFields) || this._expressionProducesDate(elseExpr, knownDateFields);
        }
        return false;
    }

    /**
     * Process natural language query, potentially across multiple collections
     */
    async processQuery(query, options = {}) {
        const { collectionNames: specifiedCollections } = options;
        try {
            const logMessage = specifiedCollections 
                ? `Service processing query "${query}" for collections: [${specifiedCollections.join(', ')}]`
                : `Service processing query "${query}" against all collections`;
            logger.info(logMessage);
            
            const db = getDatabase();
            this.dbHandler.db = db;
            
            let targetCollectionNames;

            // 1. Determine target collection names
            if (specifiedCollections && specifiedCollections.length > 0) {
                 // Validate that specified collections actually exist
                const allCollections = await db.listCollections().toArray();
                const allCollectionNames = allCollections.map(c => c.name);
                
                const validSpecifiedCollections = specifiedCollections.filter(name => {
                    if (allCollectionNames.includes(name)) {
                        return true;
                    } else {
                        logger.warn(`Specified collection "${name}" does not exist. It will be ignored.`);
                        return false;
                    }
                });
                
                if (validSpecifiedCollections.length === 0) {
                    throw new Error(`None of the specified collections exist: [${specifiedCollections.join(', ')}]`);
                }
                targetCollectionNames = validSpecifiedCollections;
                logger.info(`Using specified collections: ${targetCollectionNames.join(', ')}`);
            } else {
                // Fallback: Get all collection names if none were specified
                logger.info('No specific collections provided, fetching schemas for all available collections.');
                const collections = await db.listCollections().toArray();
                targetCollectionNames = collections.map(c => c.name).filter(name => !name.startsWith('system.')); 
            }
            
            if (!targetCollectionNames || targetCollectionNames.length === 0) {
                throw new Error('No target collections found to query against.');
            }
            
            // 2. Get schemas for the *target* collections
            const availableSchemas = {};
            logger.info(`Fetching schemas for target collections: ${targetCollectionNames.join(', ')}`);
            for (const name of targetCollectionNames) {
                try {
                    // --- Placeholder for actual schema retrieval --- 
                    // IMPORTANT: Replace this with your actual schema retrieval logic
                    const collectionForSchema = db.collection(name);
                    const sampleDoc = await collectionForSchema.findOne({}, { projection: { _id: 0 } }); // Exclude _id for cleaner schema
                    if (sampleDoc && Object.keys(sampleDoc).length > 0) {
                        availableSchemas[name] = { 
                            collection_name: name,
                            // Generate a more detailed schema if possible
                            schema: Object.entries(sampleDoc).reduce((acc, [key, value]) => {
                                let type = typeof value;
                                if (value instanceof Date) type = 'date';
                                else if (Array.isArray(value)) type = 'array';
                                else if (value === null) type = 'null';
                                acc[key] = { type: type, sample: value }; // Include sample for better type inference
                                return acc;
                            }, {})
                        };
                    } else {
                        logger.warn(`Collection "${name}" is empty or first doc has no fields (excluding _id). Using empty schema.`);
                        availableSchemas[name] = { collection_name: name, schema: {} };
                    }
                    // --- End Placeholder --- 
                    // Replace placeholder with actual call like:
                    // availableSchemas[name] = await this.dbHandler.getSchemaInfo(name);
                } catch (schemaError) {
                    logger.error(`Critical error retrieving schema for collection ${name}: ${schemaError.message}. Aborting.`);
                    // Throw error here because if schema fails for a *targeted* collection, the AI result might be wrong.
                     throw new Error(`Failed to retrieve necessary schema for collection ${name}: ${schemaError.message}`);
                }
            }
            
            if (Object.keys(availableSchemas).length === 0) {
                // This should ideally not happen if targetCollectionNames validation passed
                throw new Error('Could not retrieve schema information for any target collection.');
            }

            // 3. Process natural language query using Gemini with the relevant schemas
            logger.info('Sending query and relevant schemas to Gemini for pipeline generation...');
            const queryResult = await this.geminiInterface.convertNaturalLanguageToQuery(
                query,
                availableSchemas // Pass the object containing all schemas
            );
            
            logger.info(`Raw Gemini query result: ${JSON.stringify(queryResult)}`);
            
            // 4. Validate response and extract primary collection + pipeline
            if (!queryResult || !queryResult.pipeline || !Array.isArray(queryResult.pipeline) || !queryResult.primary_collection) {
                logger.error(`Invalid query result format from Gemini: ${JSON.stringify(queryResult)}`);
                throw new Error('Failed to convert natural language query to a valid MongoDB query pipeline');
            }

            const primaryCollectionName = queryResult.primary_collection;
             // Check if the identified primary collection actually exists and we have its schema
             // Do this *before* fixing dates, as fixDateOperations needs the schema
            if (!availableSchemas[primaryCollectionName]) {
                 throw new Error(`Gemini identified primary collection "${primaryCollectionName}", but it was not found among the target collections or its schema could not be retrieved.`);
            }

            // Apply date operation fixes to the pipeline
            const finalPipeline = this.fixDateOperations(queryResult.pipeline, availableSchemas, primaryCollectionName);
            
            // 5. Execute the query against the primary collection
            logger.info(`Executing generated query pipeline on primary collection: ${primaryCollectionName}`);
            logger.debug(`Pipeline: ${JSON.stringify(finalPipeline)}`);

            const primaryCollection = db.collection(primaryCollectionName);
            // --- Add Error Handling for Aggregation ---
            let queryResults;
            try {
                 queryResults = await primaryCollection.aggregate(finalPipeline).toArray();
                 logger.info(`Query executed successfully, got ${queryResults.length} results`);
            } catch (aggError) {
                 logger.error(`Error executing aggregation pipeline for collection "${primaryCollectionName}":`, aggError);
                 logger.error(`Failed Pipeline: ${JSON.stringify(finalPipeline)}`);
                 // Rethrow a more informative error
                 throw new Error(`Database query execution failed on collection "${primaryCollectionName}". Cause: ${aggError.message}. Check logs for pipeline details.`);
            }
            // --- End Error Handling ---

            // 6. Generate natural language summary (remains the same)
            const naturalLanguageAnswer = await this.geminiInterface.generateNaturalLanguageSummary(
                query,
                queryResults, 
                queryResults.length, 
                queryResult.interpretation
            );

            // 7. Handle visualization 
            let finalVisualization = null;
            let canVisualize = false;
            const defaultColors = ['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4', '#EA7CCC'];
            
            if (queryResult.visualization_recommended_by_ai && queryResults.length > 0) {
                logger.info('AI recommended visualization and results exist.');
                canVisualize = true;
                finalVisualization = queryResult.visualization || {}; 
                finalVisualization.option = finalVisualization.option || {}; 
                finalVisualization.option.color = finalVisualization.option.color || defaultColors;
                finalVisualization.option.dataset = finalVisualization.option.dataset || {};
                
                // Ensure dataset dimensions are determined
                finalVisualization.option.dataset.source = queryResults;
                if (!finalVisualization.option.dataset.dimensions) {
                    finalVisualization.option.dataset.dimensions = Object.keys(queryResults[0] || {}).filter(k => k !== '_id');
                    logger.info(`Inferred dimensions: ${finalVisualization.option.dataset.dimensions.join(', ')}`);
                }
                const dimensions = finalVisualization.option.dataset.dimensions;

                // --- Robust Axis and Dimension Role Identification --- 
                let xAxisType = finalVisualization.option.xAxis?.type || 'category';
                let yAxisType = finalVisualization.option.yAxis?.type || 'value';
                
                let categoryDimensionRaw = null;
                let valueDimensionRaw = null;
                let isHorizontalBar = false;

                // Helper to find a key in the first result that matches a pattern
                const findKeyByPattern = (patterns) => {
                    if (queryResults.length === 0) return null;
                    const firstResultKeys = Object.keys(queryResults[0]);
                    for (const pattern of patterns) {
                        const regex = new RegExp(pattern, 'i'); // Case-insensitive match
                        const foundKey = firstResultKeys.find(key => regex.test(key));
                        if (foundKey) return foundKey;
                    }
                    // Check within _id if it's an object (common for $group stage)
                    if (queryResults[0]._id && typeof queryResults[0]._id === 'object') {
                        const idKeys = Object.keys(queryResults[0]._id);
                        for (const pattern of patterns) {
                            const regex = new RegExp(pattern, 'i');
                            const foundKey = idKeys.find(key => regex.test(key));
                            if (foundKey) return `_id.${foundKey}`; // Path to nested key
                        }
                    }
                    return null;
                };

                // Try to intelligently guess dimensions if not perfectly provided by AI or if defaults are used
                if (dimensions && dimensions.length >= 2) {
                    // Default assumption from AI
                    categoryDimensionRaw = dimensions[0];
                    valueDimensionRaw = dimensions[1];
                } else if (queryResults.length > 0) {
                    logger.info('Attempting to infer category and value dimensions from queryResults keys...');
                    const firstResult = queryResults[0];
                    const keys = Object.keys(firstResult);
                    
                    // Attempt to find a time-based category field (month, year, date)
                    categoryDimensionRaw = findKeyByPattern(['month', '^yr$', 'year', 'date', 'quarter']);
                    
                    // Attempt to find a common value/metric field
                    valueDimensionRaw = findKeyByPattern(['sales', 'profit', 'revenue', 'count', 'total', 'amount', 'value', 'sum', 'avg', 'average']);

                    if (categoryDimensionRaw && valueDimensionRaw) {
                        logger.info(`Inferred category: ${categoryDimensionRaw}, value: ${valueDimensionRaw} from result keys.`);
                        // Update dimensions array if we made better guesses
                        finalVisualization.option.dataset.dimensions = [categoryDimensionRaw, valueDimensionRaw, ...keys.filter(k => k !== categoryDimensionRaw && k !== valueDimensionRaw)];
                    } else if (keys.length >= 2) {
                        // Fallback to first two keys if specific patterns not found
                        categoryDimensionRaw = keys.filter(k => k !== '_id')[0] || keys[0]; // Prefer non-_id field first
                        valueDimensionRaw = keys.filter(k => k !== '_id' && k !== categoryDimensionRaw)[0] || keys[1];
                        logger.warn(`Could not infer specific time/metric dimensions. Falling back to first two available keys: ${categoryDimensionRaw}, ${valueDimensionRaw}`);
                        finalVisualization.option.dataset.dimensions = [categoryDimensionRaw, valueDimensionRaw, ...keys.filter(k => k !== categoryDimensionRaw && k !== valueDimensionRaw)];
                    } else if (keys.length === 1 && keys[0] !== '_id') {
                        // Handle single dimension case, e.g. count of something where category is implied
                        categoryDimensionRaw = 'category'; // Placeholder name
                        valueDimensionRaw = keys[0];
                        // Augment results to have a placeholder category if needed for chart
                        finalVisualization.option.dataset.source = queryResults.map((item, index) => ({ 'category': `Item ${index + 1}`, ...item }));
                        finalVisualization.option.dataset.dimensions = ['category', valueDimensionRaw];
                        logger.warn(`Only one data dimension found: ${valueDimensionRaw}. Using placeholder category.`);
                    } else {
                        logger.error('Could not determine category/value dimensions from queryResults.');
                    }
                }

                // Identify dimensions based on axis types (prefer standard vertical bar layout)
                if (dimensions && dimensions.length > 0) {
                    // Check if we should use a horizontal bar chart based on label length
                    if (finalVisualization.type === 'bar' && !isHorizontalBar) {
                        // Get actual data to examine label lengths
                        const potentialCategoryDim = dimensions[0];
                        if (potentialCategoryDim && queryResults.length > 0) {
                            const sampleLabels = queryResults.map(item => String(item[potentialCategoryDim] || ''));
                            const avgLabelLength = sampleLabels.reduce((sum, label) => sum + label.length, 0) / sampleLabels.length;
                            const maxLabelLength = Math.max(...sampleLabels.map(label => label.length));
                            
                            // Use horizontal bar if labels are long, especially with many categories
                            if ((maxLabelLength > 25 || avgLabelLength > 15) && queryResults.length > 3) {
                                logger.info(`Switching to horizontal bar due to long labels (max: ${maxLabelLength}, avg: ${avgLabelLength.toFixed(1)})`);
                                isHorizontalBar = true;
                                // Swap axis types
                                xAxisType = 'value';
                                yAxisType = 'category';
                            }
                        }
                    }

                    if (xAxisType === 'category' && yAxisType === 'value') {
                        categoryDimensionRaw = dimensions[0];
                        if (dimensions.length > 1) valueDimensionRaw = dimensions[1];
                    } else if (yAxisType === 'category' && xAxisType === 'value') {
                        // This suggests a horizontal bar chart might be intended by Gemini
                        categoryDimensionRaw = dimensions[0]; // Still assume first dimension is the category label
                        if (dimensions.length > 1) valueDimensionRaw = dimensions[1]; // Assume second is value
                        isHorizontalBar = (finalVisualization.type === 'bar'); // Only flag if it's a bar chart
                         if (isHorizontalBar) logger.info('Detected potential horizontal bar chart configuration.');
                    } else if (xAxisType === 'category') { // Only x is category
                         categoryDimensionRaw = dimensions[0];
                         if (dimensions.length > 1) valueDimensionRaw = dimensions[1]; // Assume second is value
                    } else if (yAxisType === 'category') { // Only y is category
                         categoryDimensionRaw = dimensions[0]; 
                         if (dimensions.length > 1) valueDimensionRaw = dimensions[1];
                         isHorizontalBar = (finalVisualization.type === 'bar');
                          if (isHorizontalBar) logger.info('Detected potential horizontal bar chart configuration (y-axis category).');
                    } else { // Neither is category (e.g., scatter plot)
                         categoryDimensionRaw = dimensions[0]; // Default to dim[0] for x
                         if (dimensions.length > 1) valueDimensionRaw = dimensions[1]; // Default to dim[1] for y
                         logger.info('Assuming non-category axes (e.g., scatter). Mapping dim0->X, dim1->Y.');
                    }
                }
                
                // Format dimension names
                const categoryDimensionFormatted = this.formatDimensionName(categoryDimensionRaw);
                const valueDimensionFormatted = this.formatDimensionName(valueDimensionRaw);
                logger.info(`Identified Roles -> Category: ${categoryDimensionRaw} (Formatted: ${categoryDimensionFormatted}), Value: ${valueDimensionRaw} (Formatted: ${valueDimensionFormatted})`);

                // Helper to safely access nested properties using a path string
                const getNestedValue = (obj, path) => {
                    if (!path) return undefined;
                    return path.split('.').reduce((currentObject, key) => currentObject?.[key], obj);
                };

                // --- Configure Axes based on Identified Roles --- 
                finalVisualization.option.xAxis = finalVisualization.option.xAxis || {};
                finalVisualization.option.yAxis = finalVisualization.option.yAxis || {};

                finalVisualization.option.xAxis.type = xAxisType;
                if (xAxisType === 'category') {
                    finalVisualization.option.xAxis.name = categoryDimensionFormatted;
                    if (categoryDimensionRaw) {
                         const xAxisCategories = queryResults.map(item => getNestedValue(item, categoryDimensionRaw));
                         finalVisualization.option.xAxis.data = xAxisCategories;
                    }
                    
                    const longestLabel = finalVisualization.option.xAxis.data?.reduce(
                        (max, current) => (String(current)?.length > String(max)?.length ? current : max),
                        ""
                    ) || "";
                    
                    const labelRotation = String(longestLabel).length > 30 ? 45 : 
                                         String(longestLabel).length > 20 ? 30 : 
                                         String(longestLabel).length > 10 ? 15 : 0;
                    
                    const labelAlign = labelRotation > 0 ? 'right' : 'center';
                    const labelVerticalAlign = labelRotation > 0 ? 'middle' : 'top';
                    
                    finalVisualization.option.xAxis.axisLabel = { 
                        interval: 0, 
                        rotate: labelRotation,
                        align: labelAlign,
                        verticalAlign: labelVerticalAlign,
                        margin: 14,
                        fontSize: 12,
                        formatter: function(value) {
                            const valStr = String(value);
                            if (valStr.length > 40) {
                                return valStr.substring(0, 38) + '...';
                            }
                            return valStr;
                        },
                        ...(finalVisualization.option.xAxis.axisLabel || {}) 
                    };
                    finalVisualization.option.xAxis.nameGap = 35 + (labelRotation > 30 ? 15 : 0);
                } else { 
                    finalVisualization.option.xAxis.name = isHorizontalBar ? valueDimensionFormatted : categoryDimensionFormatted;
                    finalVisualization.option.xAxis.nameGap = 25;
                }
                 finalVisualization.option.xAxis.nameLocation = 'middle';
                 finalVisualization.option.xAxis.nameTextStyle = { fontWeight: 'bold', fontSize: 14 };

                finalVisualization.option.yAxis.type = yAxisType;
                 if (yAxisType === 'category') {
                     finalVisualization.option.yAxis.name = categoryDimensionFormatted;
                      if (categoryDimensionRaw) {
                         const yAxisCategories = queryResults.map(item => getNestedValue(item, categoryDimensionRaw));
                         finalVisualization.option.yAxis.data = yAxisCategories;
                     }
                     
                     finalVisualization.option.yAxis.axisLabel = { 
                         interval: 0,
                         fontSize: 12,
                         width: 120, 
                         overflow: 'truncate',
                         formatter: function(value) {
                             const valStr = String(value);
                             if (valStr.length > 25) {
                                 return valStr.substring(0, 23) + '...';
                             }
                             return valStr;
                         },
                         ...(finalVisualization.option.yAxis.axisLabel || {}) 
                     }; 
                     if (isHorizontalBar) {
                         finalVisualization.option.grid = {
                             ...finalVisualization.option.grid,
                             left: '15%', 
                         };
                     }
                     finalVisualization.option.yAxis.nameGap = 45;
                 } else { 
                     finalVisualization.option.yAxis.name = isHorizontalBar ? categoryDimensionFormatted : valueDimensionFormatted;
                     finalVisualization.option.yAxis.nameGap = 45;
                 }
                finalVisualization.option.yAxis.nameLocation = 'middle';
                finalVisualization.option.yAxis.nameTextStyle = { fontWeight: 'bold', fontSize: 14 };
                
                // --- Configure Series Encoding --- 
                if (finalVisualization.option.series.length > 0) {
                    finalVisualization.option.series = finalVisualization.option.series.map(s => {
                        let updatedEncode = { ...(s.encode || {}) };
                        
                        if (isHorizontalBar) { 
                            if (categoryDimensionRaw) updatedEncode.y = categoryDimensionRaw;
                            if (valueDimensionRaw) updatedEncode.x = valueDimensionRaw;
                             if (yAxisType === 'category') delete updatedEncode.y;
                             if (xAxisType === 'category') delete updatedEncode.x;
                        } else { 
                            if (categoryDimensionRaw) updatedEncode.x = categoryDimensionRaw;
                            if (valueDimensionRaw) updatedEncode.y = valueDimensionRaw;
                            if (xAxisType === 'category') delete updatedEncode.x;
                             if (yAxisType === 'category') delete updatedEncode.y;
                        }
                        
                        s.datasetIndex = 0; 
                        return { ...s, encode: updatedEncode };
                    });
                } else { 
                     const defaultType = finalVisualization.type || 'bar'; 
                     const defaultSeries = { type: defaultType, datasetIndex: 0 };
                     let defaultEncode = {};
                      if (isHorizontalBar) {
                         if (categoryDimensionRaw && yAxisType !== 'category') defaultEncode.y = categoryDimensionRaw;
                         if (valueDimensionRaw && xAxisType !== 'category') defaultEncode.x = valueDimensionRaw;
                     } else {
                         if (categoryDimensionRaw && xAxisType !== 'category') defaultEncode.x = categoryDimensionRaw;
                         if (valueDimensionRaw && yAxisType !== 'category') defaultEncode.y = valueDimensionRaw;
                     }
                     if (Object.keys(defaultEncode).length > 0) {
                         defaultSeries.encode = defaultEncode;
                     }
                     finalVisualization.option.series = [defaultSeries];
                     logger.warn(`AI did not provide series config. Added default series: ${JSON.stringify(defaultSeries)}`);
                }
                
                // Enhanced Tooltip Formatter
                finalVisualization.option.tooltip = {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: (params) => {
                        let tooltipContent = '';
                        if (params && params.length > 0) {
                            const categoryValueFromAxis = params[0].axisValueLabel || params[0].name;
                            tooltipContent += `${categoryDimensionFormatted || 'Category'}: ${categoryValueFromAxis}<br/>`;
                            
                            params.forEach(param => {
                                const seriesName = param.seriesName || '';
                                let value;
                                const rawDataItem = param.data; // ECharts provides the raw data item here

                                if (valueDimensionRaw && rawDataItem) {
                                    value = getNestedValue(rawDataItem, valueDimensionRaw);
                                } else {
                                    // Fallback if valueDimensionRaw is not set or rawDataItem is missing
                                    const encodeKey = isHorizontalBar ? 'x' : 'y';
                                    if(param.encode && param.encode[encodeKey] && param.encode[encodeKey].length > 0 && rawDataItem) {
                                         const valueKey = param.encode[encodeKey][0];
                                         value = getNestedValue(rawDataItem, valueKey);
                                    }
                                }
                                
                                const formattedValue = typeof value === 'number' ? value.toLocaleString() : (value !== undefined && value !== null ? String(value) : 'N/A');
                                const seriesDimFormatted = valueDimensionFormatted || 'Value';
                                
                                tooltipContent += `${param.marker} ${seriesName ? seriesName + ' (' + seriesDimFormatted + ')' : seriesDimFormatted}: ${formattedValue}<br/>`;
                            });
                        }
                        return tooltipContent;
                    },
                     ...(finalVisualization.option.tooltip || {}) 
                };
                
                // DataZoom (adjust target axis if needed, though usually applied to category axis)
                 const zoomAxisIndex = (xAxisType === 'category') ? 0 : (yAxisType === 'category' ? 1 : 0); // Target category axis
                 const categoryAxisData = (xAxisType === 'category') ? finalVisualization.option.xAxis.data : finalVisualization.option.yAxis.data;
                if (categoryAxisData && categoryAxisData.length > 10) { 
                     finalVisualization.option.dataZoom = [
                        {
                            type: 'slider', 
                             // Determine which axis index (0 for x, 1 for y) slider controls
                             [`${zoomAxisIndex === 0 ? 'xAxisIndex' : 'yAxisIndex'}`]: 0,
                            start: 0, 
                            end: (10 / categoryAxisData.length) * 100, 
                             bottom: zoomAxisIndex === 0 ? '5%' : 'auto', // Position at bottom for x-axis zoom
                             left: zoomAxisIndex === 1 ? '95%' : 'auto', // Position at right for y-axis zoom
                             right: zoomAxisIndex === 1 ? '3%' : 'auto',
                             top: zoomAxisIndex === 1 ? '15%' : 'auto',
                            height: zoomAxisIndex === 0 ? 20 : 'auto', // Adjust height/width based on orientation
                            width: zoomAxisIndex === 1 ? 20 : 'auto'
                        }
                    ];
                    // Adjust grid based on zoom axis
                     if (zoomAxisIndex === 0) finalVisualization.option.grid = { ...finalVisualization.option.grid, bottom: '25%' }; 
                     // No specific adjustment needed for y-axis zoom here, handled by general grid padding
                }

                // Ensure grid has enough padding
                finalVisualization.option.grid = {
                    containLabel: true,
                    top: '15%', 
                    bottom: finalVisualization.option.grid?.bottom || (xAxisType === 'category' ? '35%' : '15%'), // More bottom padding for x categories
                    left: '10%',
                    right: '8%', // Slightly more right padding for potential y-axis zoom slider
                    ...(finalVisualization.option.grid || {}) 
                };
                
                // Check product name length and adjust grid further if needed
                if (xAxisType === 'category' && finalVisualization.option.xAxis.data) {
                    const longestLabel = finalVisualization.option.xAxis.data.reduce(
                        (max, current) => (current?.length > max?.length ? current : max),
                        ""
                    ) || "";
                    
                    // Adjust bottom padding based on label length
                    if (longestLabel.length > 30) {
                        finalVisualization.option.grid.bottom = '40%';
                    } else if (longestLabel.length > 20) {
                        finalVisualization.option.grid.bottom = '30%';
                    }
                }
                
                // Title formatting (remains same)
                finalVisualization.option.title = finalVisualization.option.title || {};
                finalVisualization.option.title.text = this.formatDimensionName(finalVisualization.title) || this.formatDimensionName(queryResult.interpretation) || 'Visualization';
                finalVisualization.option.title.subtext = finalVisualization.option.title.subtext || '';
                finalVisualization.option.title.left = 'center'; 
                
            } else {
                 logger.info('AI did not recommend visualization or no results returned.');
            }

            // 8. Return results
            return {
                primaryCollection: primaryCollectionName,
                targetedCollections: targetCollectionNames, // List of collections whose schemas were sent to Gemini
                query,
                interpretation: queryResult.interpretation || 'Query processed successfully',
                naturalLanguageAnswer, 
                results: queryResults,
                visualization: finalVisualization, 
                canVisualize, 
                explanation: queryResult.explanation || 'No additional explanation available',
                mongoQuery: finalPipeline 
            };
        } catch (error) {
            logger.error(`Error processing natural language query:`, error);
            // Consider re-throwing a more specific error type if needed
            throw error;
        }
    }
}