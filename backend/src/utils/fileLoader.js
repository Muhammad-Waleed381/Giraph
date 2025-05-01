import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync } from 'fs';
import { read, utils } from 'xlsx';
import { logger } from './logger.js';
import path from 'path';
import { cleanHeaderName } from './commonUtils.js';

class FileLoader {
    static async loadFile(filePath, sampleSize = 100) {
        try {
            logger.info(`Attempting to load file: ${filePath}`);
            
            if (!filePath) {
                throw new Error('filePath is required');
            }

            // Normalize the file path
            const normalizedPath = path.normalize(filePath);
            logger.info(`Normalized file path: ${normalizedPath}`);

            let data;
            let metadata;

            if (normalizedPath.endsWith('.csv')) {
                logger.info('Loading CSV file');
                let fileContent;
                let rawData;
                try {
                    // Read file with UTF-8 encoding
                    fileContent = readFileSync(normalizedPath, 'utf8');
                    if (!fileContent) throw new Error('File is empty');
                    
                    // Parse CSV just to get rows
                    rawData = parse(fileContent, {
                        skip_empty_lines: true,
                        trim: true,
                        skip_records_with_error: true,
                        relax_column_count: true,
                        encoding: 'utf8'
                    });

                } catch (error) {
                    logger.error('Error parsing CSV with UTF-8:', error);
                    // Try alternative encoding if UTF-8 fails
                    fileContent = readFileSync(normalizedPath);
                    rawData = parse(fileContent, {
                        skip_empty_lines: true,
                        trim: true,
                        skip_records_with_error: true,
                        relax_column_count: true
                    });
                }
                
                if (!rawData || rawData.length < 1) {
                    throw new Error('No header row found in CSV file');
                }
                
                // Extract and clean headers
                const originalHeaders = rawData[0];
                const cleanedHeaders = originalHeaders.map(h => cleanHeaderName(h));
                logger.info(`Original Headers: ${originalHeaders.join(', ')}`)
                logger.info(`Cleaned Headers: ${cleanedHeaders.join(', ')}`)
                
                // Map data rows to objects with cleaned headers
                data = rawData.slice(1).map(row => {
                    const item = {};
                    cleanedHeaders.forEach((header, i) => {
                        item[header] = row[i] || null; // Use null for empty/missing values
                    });
                    return item;
                });
                
                logger.info(`CSV processed successfully. Found ${data.length} data rows`);

            } else if (normalizedPath.endsWith('.xlsx') || normalizedPath.endsWith('.xls')) {
                logger.info('Loading Excel file');
                const workbook = read(readFileSync(normalizedPath)); // Read as buffer
                if (!workbook.SheetNames.length) {
                    throw new Error('No sheets found in Excel file');
                }
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                // Get raw data with headers
                const rawJson = utils.sheet_to_json(firstSheet, { header: 1 }); 
                
                if (!rawJson || rawJson.length < 1) {
                     throw new Error('No header row found in Excel sheet');
                }
                
                // Extract and clean headers
                const originalHeaders = rawJson[0];
                const cleanedHeaders = originalHeaders.map(h => cleanHeaderName(String(h))); // Ensure string before cleaning
                logger.info(`Original Headers: ${originalHeaders.join(', ')}`)
                logger.info(`Cleaned Headers: ${cleanedHeaders.join(', ')}`)
                
                // Map data rows to objects with cleaned headers
                data = rawJson.slice(1).map(row => {
                    const item = {};
                    cleanedHeaders.forEach((header, i) => {
                        item[header] = row[i] !== undefined ? row[i] : null; // Use null for empty/missing values
                    });
                    return item;
                });
                
                logger.info(`Excel parsed successfully. Found ${data.length} data rows`);
            } else {
                throw new Error('Unsupported file format. Please provide a CSV or Excel file.');
            }

            if (!data) {
                throw new Error('No data could be processed from file');
            }

            // Use the cleaned headers
            const columns = data.length > 0 ? Object.keys(data[0]) : [];
            logger.info(`Columns after cleaning: ${columns.join(', ')}`);

            // Filter out rows that might be completely empty after processing
            data = data.filter(row => columns.some(col => row[col] !== null && row[col] !== undefined));

            if (data.length === 0) {
                logger.warn('No valid data rows found after processing and filtering.')
                // Handle case with headers but no data rows if necessary
            }

            // Create sample for analysis
            const sampleData = data.slice(0, sampleSize);
            logger.info(`Created sample of ${sampleData.length} rows`);

            // Generate metadata using the cleaned columns
            metadata = {
                totalRows: data.length,
                columns: columns, // Use the cleaned columns
                dataTypes: this._getDataTypes(sampleData, columns), // Pass cleaned columns
                nullCounts: this._getNullCounts(data, columns), // Pass cleaned columns
                sampleSize: sampleData.length,
                sampleData
            };

            logger.info('Metadata generated:', metadata);
            return { data, metadata }; // Return data with cleaned keys and metadata with cleaned column names
        } catch (error) {
            logger.error('Error in loadFile:', error);
            throw error;
        }
    }

    static _getDataTypes(data, columns) {
        if (!data.length) return {};

        const types = {};

        for (const column of columns) {
            let sampleValue = undefined;
            for (const row of data) {
                if (row[column] !== null && row[column] !== undefined && row[column] !== '') {
                    sampleValue = row[column];
                    break;
                }
            }

            if (sampleValue === undefined) {
                types[column] = 'null';
            } else if (typeof sampleValue === 'number') {
                types[column] = Number.isInteger(sampleValue) ? 'int' : 'double';
            } else if (typeof sampleValue === 'boolean') {
                types[column] = 'boolean';
            } else if (sampleValue instanceof Date || (!isNaN(sampleValue) && !isNaN(Date.parse(sampleValue)))) {
                types[column] = 'date';
            } else {
                const num = Number(String(sampleValue).replace(/[,\$]/g, ''));
                if (!isNaN(num) && String(sampleValue).trim() !== '') {
                     types[column] = Number.isInteger(num) ? 'int' : 'double';
                } else {
                    types[column] = 'string';
                } 
            }
        }

        return types;
    }

    static _getNullCounts(data, columns) {
        if (!data.length) return {};

        const nullCounts = {};

        for (const column of columns) {
            nullCounts[column] = data.filter(row => 
                row[column] === null || 
                row[column] === undefined || 
                String(row[column]).trim() === ''
            ).length;
        }

        return nullCounts;
    }

    static prepareAnalysisPrompt(metadata) {
        return `
        Analyze this dataset and create an optimized MongoDB schema.
        
        Dataset Overview:
        - Total Rows: ${metadata.totalRows}
        - Columns: ${metadata.columns.join(', ')}
        
        Data Types:
        ${JSON.stringify(metadata.dataTypes, null, 2)}
        
        Null Value Analysis:
        ${JSON.stringify(metadata.nullCounts, null, 2)}
        
        Sample Data (first ${metadata.sampleSize} rows):
        ${JSON.stringify(metadata.sampleData, null, 2)}
        
        Please create a MongoDB schema that:
        1. Uses appropriate data types for each field
        2. Includes necessary constraints (required, unique, etc.)
        3. Handles nested structures if present
        4. Optimizes for query performance
        5. Includes appropriate indexes
        
        Return the schema in this JSON format:
        {
            "collection_name": "suggested_name",
            "schema": {
                "field_name": {
                    "type": "mongodb_type",
                    "required": boolean,
                    "unique": boolean,
                    "index": boolean,
                    "description": "field description"
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
                    "required": ["field1", "field2"],
                    "properties": {}
                }
            }
        }
        `;
    }
}

export { FileLoader }; 