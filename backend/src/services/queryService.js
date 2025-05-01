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
     * Detect and fix common date operation issues, particularly removing $dateFromString
     * when applied to native Date fields, and ensuring date operators have correct input.
     * @param {Array} pipeline - MongoDB aggregation pipeline
     * @param {Object} availableSchemas - Collection schemas to check field types
     * @param {string} primaryCollection - Name of the primary collection
     * @returns {Array} - Fixed pipeline
     */
    fixDateOperations(pipeline, availableSchemas, primaryCollection) {
        if (!pipeline || !Array.isArray(pipeline) || pipeline.length === 0) {
            return pipeline;
        }

        logger.info(`Validating date operations in pipeline for ${primaryCollection}...`);

        // SPECIAL HANDLING: For known collections, force disable all $dateFromString
        // This is a temporary workaround for schemas that might be inaccurate
        const forceDateConversionRemoval = ['sales_data', 'order_returns'].includes(primaryCollection);
        if (forceDateConversionRemoval) {
            logger.warn(`Applying special date operation handling for ${primaryCollection} collection - removing all $dateFromString operations`);
        }

        const collectionSchema = availableSchemas[primaryCollection]?.schema || {};

        // Track field types through pipeline stages
        let knownDateFields = new Set();

        // Find initial date fields from schema
        Object.entries(collectionSchema).forEach(([fieldName, fieldInfo]) => {
            // Check for 'date', 'datetime', 'timestamp' etc.
            const fieldType = String(fieldInfo?.type || '').toLowerCase();
            if (fieldType.includes('date') || fieldType.includes('timestamp')) {
                knownDateFields.add(fieldName);
                logger.debug(`Identified date field from schema: ${fieldName}`);
            }
        });

        // Special handling for known date fields in common collections (if schema is unreliable)
        if (primaryCollection === 'sales_data') {
            const knownSalesDateFields = ['Order Date', 'Ship Date'];
            knownSalesDateFields.forEach(field => {
                if (!knownDateFields.has(field)) {
                    knownDateFields.add(field);
                    logger.info(`Manually adding known date field for ${primaryCollection}: ${field}`);
                }
            });
        }

        logger.info(`Initial known date fields: ${Array.from(knownDateFields).join(', ')}`);

        // Create a deep copy of the pipeline to avoid modifying the original
        const fixedPipeline = JSON.parse(JSON.stringify(pipeline));

        // Process each pipeline stage
        let stageIndex = 0;
        for (const stage of fixedPipeline) {
            logger.debug(`Processing pipeline stage ${stageIndex}: ${JSON.stringify(stage)}`);

            // Recursively fix date operations within the stage
            this._recursivelyFixDateOps(stage, null, null, knownDateFields, forceDateConversionRemoval);

            // Update known date fields based on $addFields, $project, etc.
            // This needs to be done *after* fixing the current stage
            this._trackDateFieldsFromStage(stage, knownDateFields);
            logger.debug(`Known date fields after stage ${stageIndex}: ${Array.from(knownDateFields).join(', ')}`);
            stageIndex++;
        }

        logger.info(`Fixed pipeline: ${JSON.stringify(fixedPipeline)}`);

        return fixedPipeline;
    }

    /**
     * Helper: Recursively scan and fix date operations within an object/array.
     * Modifies the object/array in place.
     * @private
     * @param {Object|Array} current - The current object or array being processed.
     * @param {Object|Array|null} parent - The parent object or array.
     * @param {string|number|null} keyInParent - The key or index of 'current' within 'parent'.
     * @param {Set<string>} knownDateFields - Set of field names known to be dates.
     * @param {boolean} forceRemoveConversions - Whether to remove $dateFromString regardless of field type.
     */
    _recursivelyFixDateOps(current, parent, keyInParent, knownDateFields, forceRemoveConversions = false) {
        if (!current || typeof current !== 'object') return;

        // Handle arrays - process each element recursively
        if (Array.isArray(current)) {
            current.forEach((item, index) => this._recursivelyFixDateOps(item, current, index, knownDateFields, forceRemoveConversions));
            return;
        }

        // Handle objects - process each key-value pair
        const keys = Object.keys(current);
        for (const key of keys) {
            const value = current[key];

            // --- Rule 1: Fix $dateFromString applied to known date fields ---
            // Example: { "$month": { "$dateFromString": { "dateString": "$Order Date" } } }
            // If "Order Date" is a known date field, this should become { "$month": "$Order Date" }
            if (key === '$dateFromString' && value && typeof value === 'object' && parent && keyInParent !== null) {
                // Extract the field name being converted (handle variations like $toString)
                const dateFieldExpr = value.dateString;
                let fieldName = null;
                if (typeof dateFieldExpr === 'string' && dateFieldExpr.startsWith('$')) {
                    fieldName = dateFieldExpr.substring(1); // Simple "$FieldName"
                } else if (typeof dateFieldExpr === 'object' && dateFieldExpr.$toString && typeof dateFieldExpr.$toString === 'string' && dateFieldExpr.$toString.startsWith('$')) {
                    fieldName = dateFieldExpr.$toString.substring(1); // { $toString: "$FieldName" }
                } else if (typeof dateFieldExpr === 'object' && dateFieldExpr.$field) {
                     fieldName = dateFieldExpr.$field; // { $field: "FieldName" } - less common
                }
                 // Add more extraction logic if other patterns emerge

                let shouldReplace = forceRemoveConversions;
                if (fieldName && knownDateFields.has(fieldName)) {
                    shouldReplace = true;
                    logger.warn(`Found $dateFromString applied to known date field "${fieldName}" in parent key "${keyInParent}". Replacing with direct field reference.`);
                } else if (fieldName) {
                     logger.debug(`Found $dateFromString on field "${fieldName}" which is not marked as a date field.`);
                } else {
                     logger.debug(`Found $dateFromString with complex/unrecognized input: ${JSON.stringify(value)}`);
                }

                if (shouldReplace && fieldName) {
                    // Replace the parent's value (the $dateFromString object) with the direct field reference
                    parent[keyInParent] = `$${fieldName}`;
                    // Since we modified the parent, we don't need to recurse into the $dateFromString object itself
                    continue; // Move to the next key in the current object
                }
            }

            // --- Rule 2: Ensure date operators ($month, $year, etc.) have a valid date input ---
            // Example: { "$month": "$DateField" } -> OK if DataField is date
            // Example: { "$month": "$StringField" } -> Error, needs $dateFromString if StringField holds a date string
            // Example: { "$month": { some_expr } } -> Recurse into some_expr
            const dateOperators = ['$year', '$month', '$dayOfMonth', '$dayOfWeek', '$dayOfYear', '$hour', '$minute', '$second', '$millisecond', '$dateToString'];
            if (dateOperators.includes(key)) {
                const inputExpr = value; // The input to the date operator

                if (typeof inputExpr === 'string' && inputExpr.startsWith('$')) {
                    // Input is a direct field reference, e.g., "$Order Date"
                    const fieldName = inputExpr.substring(1);
                    if (!knownDateFields.has(fieldName)) {
                        // This is potentially an error: applying a date op to a non-date field
                        // The AI prompt now explicitly tells it *not* to do this.
                        // We could try to *add* $dateFromString here, but it's safer to rely on the AI fixing it based on the improved prompt.
                        logger.error(`Potential Error: Date operator "${key}" applied directly to non-date field "${fieldName}". Pipeline: ${JSON.stringify(current)}. Relying on AI prompt rules to prevent this.`);
                        // Optionally, throw an error or attempt a fix:
                        // current[key] = { $dateFromString: { dateString: inputExpr } }; // Risky if the string isn't a valid date format
                    } else {
                         logger.debug(`Date operator "${key}" correctly applied to known date field "${fieldName}".`);
                    }
                } else if (inputExpr && typeof inputExpr === 'object') {
                    // Input is a nested expression, e.g., { $dateFromString: ... } or some other calculation
                    // We need to recurse into this nested expression to check/fix it
                     logger.debug(`Recursing into input expression for date operator "${key}": ${JSON.stringify(inputExpr)}`);
                     this._recursivelyFixDateOps(inputExpr, current, key, knownDateFields, forceRemoveConversions);
                } else {
                    // Input is something else (literal, null, etc.) - likely an error generated by AI
                    logger.error(`Invalid input type for date operator "${key}": ${JSON.stringify(inputExpr)}. Pipeline: ${JSON.stringify(current)}`);
                    // Optionally try to remove the problematic stage/field or throw error
                }
                 // No 'continue' here, allow recursion below for other keys in the object
            }


            // --- Recursion Step ---
            // Recurse into nested objects or arrays
            if (value && typeof value === 'object') {
                this._recursivelyFixDateOps(value, current, key, knownDateFields, forceRemoveConversions);
            }
        }
        // No need for the _replaced logic anymore
    }

    /**
     * Helper: Track fields that become dates as a result of a pipeline stage.
     * @private
     */
    _trackDateFieldsFromStage(stage, knownDateFields) {
        const stageOperator = Object.keys(stage)[0]; // e.g., $project, $addFields, $group

        let fieldsToCheck = null;
        if (stageOperator === '$project' || stageOperator === '$addFields') {
            fieldsToCheck = stage[stageOperator];
        } else if (stageOperator === '$group') {
            // Check fields created in the _id document or accumulated fields
            fieldsToCheck = stage[stageOperator];
            // We need to check both the _id object and the accumulator fields
            const groupFields = { ...(typeof fieldsToCheck._id === 'object' ? fieldsToCheck._id : {}), ...fieldsToCheck };
            delete groupFields._id; // Don't check the _id key itself, check *within* it if it's an object
             fieldsToCheck = groupFields;
        }
        // Add checks for $lookup 'as' fields if necessary, though less common to create dates there

        if (fieldsToCheck && typeof fieldsToCheck === 'object') {
            Object.entries(fieldsToCheck).forEach(([fieldName, definition]) => {
                if (this._expressionProducesDate(definition, knownDateFields)) {
                    if (!knownDateFields.has(fieldName)) {
                        logger.debug(`Tracking new date field "${fieldName}" created by stage ${stageOperator}`);
                        knownDateFields.add(fieldName);
                    }
                } else {
                    // If a field is redefined and *no longer* a date, remove it
                    // (e.g., $project: { myDate: { $dateToString... } })
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
            // Simple field reference: "$ExistingDateField"
            if (typeof definition === 'string' && definition.startsWith('$')) {
                return knownDateFields.has(definition.substring(1));
            }
            return false; // Literals, other types are not dates
        }

        // Check for operators that explicitly return dates
        if (definition.$dateFromString !== undefined) return true;
        if (definition.$toDate !== undefined) return true; // Alias for $dateFromString
        // Add other date-producing operators if needed (e.g., $dateAdd, $dateSubtract, $dateTrunc)
        if (definition.$dateAdd !== undefined) return true;
        if (definition.$dateSubtract !== undefined) return true;
        if (definition.$dateTrunc !== undefined) return true;


        // Check if it's an operator that *preserves* the date type from its input
        // e.g., $ifNull: [ "$DateField", new Date() ] -> Date
        // e.g., $cond: { if: <cond>, then: "$DateField", else: "$AnotherDateField" } -> Date
        // This is complex to track perfectly, but we can handle common cases.
        if (definition.$ifNull && Array.isArray(definition.$ifNull)) {
             // If any argument produces a date, the result *could* be a date
             return definition.$ifNull.some(arg => this._expressionProducesDate(arg, knownDateFields));
        }
        if (definition.$cond) {
            // If 'then' or 'else' produces a date, the result *could* be a date
            const thenExpr = definition.$cond.then;
            const elseExpr = definition.$cond.else;
            return this._expressionProducesDate(thenExpr, knownDateFields) || this._expressionProducesDate(elseExpr, knownDateFields);
        }
         // Add $switch, etc. if needed

        // Default: Assume it doesn't produce a date unless explicitly known
        return false;
    }

    /**
     * Process natural language query, potentially across multiple collections
     */
    async processQuery(query, options = {}) {
        // Extract collectionNames from options
        const { collectionNames: specifiedCollections } = options;
        
        try {
            const logMessage = specifiedCollections 
                ? `Service processing query "${query}" for collections: [${specifiedCollections.join(', ')}]`
                : `Service processing query "${query}" against all collections`;
            logger.info(logMessage);
            
            const db = getDatabase();
            this.dbHandler.db = db; // Ensure dbHandler has the current db instance
            
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
                                acc[key] = { type: type };
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
            const correctedPipeline = this.fixDateOperations(queryResult.pipeline, availableSchemas, primaryCollectionName);

            // 5. Execute the query against the primary collection
            logger.info(`Executing generated query pipeline on primary collection: ${primaryCollectionName}`);
            logger.debug(`Pipeline: ${JSON.stringify(correctedPipeline)}`);

            const primaryCollection = db.collection(primaryCollectionName);
            // --- Add Error Handling for Aggregation ---
            let queryResults;
            try {
                 queryResults = await primaryCollection.aggregate(correctedPipeline).toArray();
                 logger.info(`Query executed successfully, got ${queryResults.length} results`);
            } catch (aggError) {
                 logger.error(`Error executing aggregation pipeline for collection "${primaryCollectionName}":`, aggError);
                 logger.error(`Failed Pipeline: ${JSON.stringify(correctedPipeline)}`);
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
                let xAxisType = finalVisualization.option.xAxis?.type || 'category'; // Default to category if missing
                let yAxisType = finalVisualization.option.yAxis?.type || 'value'; // Default to value if missing
                
                let categoryDimensionRaw = null;
                let valueDimensionRaw = null;
                let isHorizontalBar = false; // Flag for horizontal bar charts

                // Identify dimensions based on axis types (prefer standard vertical bar layout)
                if (dimensions && dimensions.length > 0) {
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

                // --- Configure Axes based on Identified Roles --- 
                // Ensure axis objects exist
                finalVisualization.option.xAxis = finalVisualization.option.xAxis || {};
                finalVisualization.option.yAxis = finalVisualization.option.yAxis || {};

                // Configure X-Axis
                finalVisualization.option.xAxis.type = xAxisType;
                if (xAxisType === 'category') {
                    finalVisualization.option.xAxis.name = categoryDimensionFormatted;
                    if (categoryDimensionRaw) {
                         const xAxisCategories = queryResults.map(item => item[categoryDimensionRaw]);
                         finalVisualization.option.xAxis.data = xAxisCategories;
                    }
                    finalVisualization.option.xAxis.axisLabel = { interval: 0, rotate: 30, ...(finalVisualization.option.xAxis.axisLabel || {}) };
                    finalVisualization.option.xAxis.nameGap = 35;
                } else { // Value or Time axis
                    finalVisualization.option.xAxis.name = isHorizontalBar ? valueDimensionFormatted : categoryDimensionFormatted; // Value if horizontal bar
                    finalVisualization.option.xAxis.nameGap = 25;
                }
                 finalVisualization.option.xAxis.nameLocation = 'middle';
                 finalVisualization.option.xAxis.nameTextStyle = { fontWeight: 'bold', fontSize: 14 };

                 // Configure Y-Axis
                finalVisualization.option.yAxis.type = yAxisType;
                 if (yAxisType === 'category') {
                     finalVisualization.option.yAxis.name = categoryDimensionFormatted;
                      if (categoryDimensionRaw) {
                         const yAxisCategories = queryResults.map(item => item[categoryDimensionRaw]);
                         finalVisualization.option.yAxis.data = yAxisCategories;
                     }
                     // No rotation typically needed for y-axis labels
                     finalVisualization.option.yAxis.axisLabel = { interval: 0, ...(finalVisualization.option.yAxis.axisLabel || {}) }; 
                     finalVisualization.option.yAxis.nameGap = 45;
                 } else { // Value or Time axis
                     finalVisualization.option.yAxis.name = isHorizontalBar ? categoryDimensionFormatted : valueDimensionFormatted; // Category if horizontal bar
                     finalVisualization.option.yAxis.nameGap = 45;
                 }
                finalVisualization.option.yAxis.nameLocation = 'middle';
                finalVisualization.option.yAxis.nameTextStyle = { fontWeight: 'bold', fontSize: 14 };
                
                 // --- Configure Series Encoding --- 
                if (finalVisualization.option.series.length > 0) {
                    finalVisualization.option.series = finalVisualization.option.series.map(s => {
                        let updatedEncode = { ...(s.encode || {}) }; // Start with existing encode
                        
                        // Map category and value dimensions correctly
                        if (isHorizontalBar) { // Horizontal Bar: category->Y, value->X
                            if (categoryDimensionRaw) updatedEncode.y = categoryDimensionRaw;
                            if (valueDimensionRaw) updatedEncode.x = valueDimensionRaw;
                             // Remove mappings conflicting with axis.data if present
                             if (yAxisType === 'category') delete updatedEncode.y;
                             if (xAxisType === 'category') delete updatedEncode.x;
                        } else { // Vertical Chart (default): category->X, value->Y
                            if (categoryDimensionRaw) updatedEncode.x = categoryDimensionRaw;
                            if (valueDimensionRaw) updatedEncode.y = valueDimensionRaw;
                             // Remove mappings conflicting with axis.data if present
                            if (xAxisType === 'category') delete updatedEncode.x;
                             if (yAxisType === 'category') delete updatedEncode.y;
                        }
                        
                        s.datasetIndex = 0; // Ensure series links to the dataset
                        return { ...s, encode: updatedEncode };
                    });
                } else { // Add default series if none exist
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
                
                // --- Tooltip, DataZoom, Grid, Title --- (Adjust slightly based on new dimension logic)
                
                // Enhanced Tooltip Formatter
                finalVisualization.option.tooltip = {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: (params) => {
                        let tooltipContent = '';
                        if (params && params.length > 0) {
                            // Determine which axis holds the category based on chart orientation
                            const categoryName = params[0].axisValueLabel || params[0].name;
                            tooltipContent += `${categoryDimensionFormatted || 'Category'}: ${categoryName}<br/>`;
                            
                            params.forEach(param => {
                                const seriesName = param.seriesName || '';
                                // Try to get value based on encode information for the correct axis
                                let value;
                                const encodeKey = isHorizontalBar ? 'x' : 'y'; // Value is on X for horizontal, Y for vertical
                                const dimName = isHorizontalBar ? valueDimensionRaw : valueDimensionRaw; 
                                if(param.encode && param.encode[encodeKey] && param.encode[encodeKey].length > 0) {
                                     value = param.value[param.encode[encodeKey][0]];
                                } else if (dimName) {
                                     // Fallback to assuming standard dimension order if encode is missing
                                     value = param.value[dimName]; 
                                }
                                
                                const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;
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
                    bottom: finalVisualization.option.grid?.bottom || (xAxisType === 'category' ? '25%' : '15%'), // More bottom padding if x categories rotated
                    left: '10%',
                    right: '8%', // Slightly more right padding for potential y-axis zoom slider
                    ...(finalVisualization.option.grid || {}) 
                };
                
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
                mongoQuery: correctedPipeline 
            };
        } catch (error) {
            logger.error(`Error processing natural language query:`, error);
            // Consider re-throwing a more specific error type if needed
            throw error;
        }
    }
}