import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync } from 'fs';
import { read, utils } from 'xlsx';
import { logger } from './logger.js';
import path from 'path';

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
                try {
                    // Read file with UTF-8 encoding
                    const fileContent = readFileSync(normalizedPath, 'utf8');
                    if (!fileContent) {
                        throw new Error('File is empty');
                    }

                    // Parse CSV with more robust options
                    data = parse(fileContent, {
                        columns: true,
                        skip_empty_lines: true,
                        trim: true,
                        skip_records_with_error: true,
                        relax_column_count: true,
                        encoding: 'utf8'
                    });

                    logger.info(`CSV parsed successfully. Found ${data.length} rows`);
                } catch (error) {
                    logger.error('Error parsing CSV:', error);
                    // Try alternative encoding if UTF-8 fails
                    const fileContent = readFileSync(normalizedPath);
                    data = parse(fileContent, {
                        columns: true,
                        skip_empty_lines: true,
                        trim: true,
                        skip_records_with_error: true,
                        relax_column_count: true
                    });
                    logger.info(`CSV parsed successfully with alternative encoding. Found ${data.length} rows`);
                }
            } else if (normalizedPath.endsWith('.xlsx') || normalizedPath.endsWith('.xls')) {
                logger.info('Loading Excel file');
                const workbook = read(normalizedPath);
                if (!workbook.SheetNames.length) {
                    throw new Error('No sheets found in Excel file');
                }
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                data = utils.sheet_to_json(firstSheet);
                logger.info(`Excel parsed successfully. Found ${data.length} rows`);
            } else {
                throw new Error('Unsupported file format. Please provide a CSV or Excel file.');
            }

            if (!data || !data.length) {
                throw new Error('No data found in file');
            }

            // Validate data structure
            const firstRow = data[0];
            const expectedColumns = Object.keys(firstRow);
            logger.info(`Expected columns: ${expectedColumns.join(', ')}`);

            // Filter out invalid rows
            data = data.filter(row => {
                const rowColumns = Object.keys(row);
                return rowColumns.length === expectedColumns.length;
            });

            // Create sample for analysis
            const sampleData = data.slice(0, sampleSize);
            logger.info(`Created sample of ${sampleData.length} rows`);

            // Generate metadata
            metadata = {
                totalRows: data.length,
                columns: expectedColumns,
                dataTypes: this._getDataTypes(data),
                nullCounts: this._getNullCounts(data),
                sampleSize,
                sampleData
            };

            logger.info('Metadata generated:', metadata);
            return { data, metadata };
        } catch (error) {
            logger.error('Error in loadFile:', error);
            throw error;
        }
    }

    static _getDataTypes(data) {
        if (!data.length) return {};

        const types = {};
        const firstRow = data[0];

        for (const [key, value] of Object.entries(firstRow)) {
            if (value === null || value === undefined) {
                types[key] = 'null';
            } else if (typeof value === 'number') {
                types[key] = Number.isInteger(value) ? 'int' : 'double';
            } else if (typeof value === 'boolean') {
                types[key] = 'boolean';
            } else if (value instanceof Date || !isNaN(Date.parse(value))) {
                types[key] = 'date';
            } else {
                types[key] = 'string';
            }
        }

        return types;
    }

    static _getNullCounts(data) {
        if (!data.length) return {};

        const nullCounts = {};
        const columns = Object.keys(data[0] || {});

        for (const column of columns) {
            nullCounts[column] = data.filter(row => 
                row[column] === null || 
                row[column] === undefined || 
                row[column] === ''
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