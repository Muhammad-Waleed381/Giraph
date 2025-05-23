import { MongoClient } from 'mongodb';
import { logger } from './logger.js';
import { cleanHeaderName } from './commonUtils.js';

class DatabaseHandler {
    constructor(connectionString = 'mongodb://localhost:27017/') {
        this.client = new MongoClient(connectionString);
        this.db = null;
    }

    async connect() {
        try {
            await this.client.connect();
            this.db = this.client.db('data_warehouse');
            logger.info('Connected to MongoDB successfully');
        } catch (error) {
            logger.error('Failed to connect to MongoDB:', error);
            throw error;
        }
    }

    async createCollectionWithSchema(schema) {
        try {
            const collectionName = schema.collection_name;
            let collection;
            
            // Check if collection already exists
            const collections = await this.db.listCollections({ name: collectionName }).toArray();
            
            if (collections.length > 0) {
                logger.info(`Collection ${collectionName} already exists, using existing collection`);
                collection = this.db.collection(collectionName);
                
                // Optionally update validation if needed
                // await this.db.command({ 
                //    collMod: collectionName,
                //    validator: schema.validation_rules,
                //    validationLevel: "moderate",
                //    validationAction: "warn"
                // });
            } else {
                // Create collection with schema validation but make it less strict
                logger.info(`Creating new collection: ${collectionName}`);
                collection = await this.db.createCollection(collectionName, {
                    validator: schema.validation_rules,
                    validationLevel: "moderate", // Change from strict to moderate
                    validationAction: "warn"     // Change from error to warn
                });

                // Create indexes
                for (const index of schema.indexes) {
                    const fields = index.fields.reduce((acc, field) => {
                        acc[field] = 1;
                        return acc;
                    }, {});
                    await collection.createIndex(fields);
                }
            }

            return collection;
        } catch (error) {
            logger.error('Error creating/accessing collection:', error);
            throw error;
        }
    }

    async insertData(collection, data, schema, batchSize = 1000) {
        try {
            const convertedData = this._convertDataTypes(data, schema);
            const totalRows = convertedData.length;
            let insertedCount = 0;

            for (let i = 0; i < totalRows; i += batchSize) {
                const batch = convertedData.slice(i, i + batchSize);
                const cleanedBatch = batch.map(doc => {
                    const cleaned = {};
                    for (const [key, value] of Object.entries(doc)) {
                        if (value !== null && value !== undefined) {
                            cleaned[key] = value;
                        }
                    }
                    return cleaned;
                });

                try {
                    const result = await collection.insertMany(cleanedBatch, { ordered: false });
                    insertedCount += result.insertedCount || 0;
                    logger.info(`Inserted ${result.insertedCount || 0} documents in batch`);
                } catch (error) {
                    logger.error('Error inserting batch:', error.message);
                    
                    // Even with batch errors, some documents might have been inserted
                    if (error.result && error.result.result) {
                        insertedCount += error.result.nInserted || 0;
                        logger.info(`Inserted ${error.result.nInserted || 0} documents before error`);
                    }
                    
                    // Try inserting documents one by one
                    for (const doc of cleanedBatch) {
                        try {
                            const result = await collection.insertOne(doc);
                            if (result.acknowledged) {
                                insertedCount++;
                            }
                        } catch (e) {
                            logger.error(`Failed to insert document: ${JSON.stringify(doc).substring(0, 100)}...`);
                            logger.error('Error:', e.message);
                        }
                    }
                }
            }
            
            logger.info(`Data import completed. Total documents inserted: ${insertedCount} out of ${totalRows}`);
            return insertedCount;
        } catch (error) {
            logger.error('Error in insertData:', error);
            throw error;
        }
    }

    _convertDataTypes(data, schema) {
        const typeMapping = {
            'date': value => {
                if (value === null || value === undefined || String(value).trim() === '') return null;
                const date = new Date(value);
                return isNaN(date.getTime()) ? null : date;
            },
            'int': value => {
                if (value === null || value === undefined || String(value).trim() === '') return null;
                const num = parseInt(String(value).replace(/[,\$]/g, ''), 10);
                return isNaN(num) ? null : num;
            },
            'double': value => {
                if (value === null || value === undefined || String(value).trim() === '') return null;
                const num = parseFloat(String(value).replace(/[,\$]/g, ''));
                return isNaN(num) ? null : num;
            },
            'string': value => String(value),
            'boolean': value => {
                 if (value === null || value === undefined) return null;
                 const strVal = String(value).toLowerCase().trim();
                 if (strVal === 'true' || strVal === '1') return true;
                 if (strVal === 'false' || strVal === '0') return false;
                 return null;
            }
        };
        
        // Create a mapping from cleaned schema field names to original schema field names
        const cleanedSchemaFieldsMap = {};
        if (schema && schema.schema) {
            for (const field in schema.schema) {
                cleanedSchemaFieldsMap[cleanHeaderName(field)] = field;
            }
        }

        return data.map(doc => {
            const converted = {};
            for (const rawKey in doc) {
                const cleanedKey = cleanHeaderName(rawKey);
                const originalSchemaField = cleanedSchemaFieldsMap[cleanedKey];

                if (schema && schema.schema && originalSchemaField && schema.schema[originalSchemaField]) {
                    const fieldSchema = schema.schema[originalSchemaField];
                    const mongoType = (fieldSchema.type || 'string').toLowerCase();
                    
                    if (mongoType in typeMapping) {
                        try {
                            converted[originalSchemaField] = typeMapping[mongoType](doc[rawKey]);
                        } catch (error) {
                            logger.warn(`Could not convert ${originalSchemaField} ('${doc[rawKey]}') to ${mongoType}:`, error);
                            converted[originalSchemaField] = doc[rawKey];
                        }
                    } else {
                        converted[originalSchemaField] = doc[rawKey];
                    }
                } else if (!originalSchemaField) {
                    // Handle cases where a key from the data doesn't match any schema field
                    // logger.warn(`Data key '${rawKey}' (cleaned: '${cleanedKey}') not found in schema.`);
                    // Optionally include these fields anyway, maybe in a separate 'unmapped' subdocument
                    // converted[rawKey] = doc[rawKey]; 
                }
            }
            return converted;
        });
    }

    async executeQuery(collection, query) {
        try {
            let results;
            if (query.aggregate) {
                results = await collection.aggregate(query.aggregate).toArray();
            } else {
                const findQuery = query.find || {};
                const sortQuery = query.sort || {};
                const limit = query.limit || 0;

                let cursor = collection.find(findQuery);
                if (Object.keys(sortQuery).length > 0) {
                    cursor = cursor.sort(sortQuery);
                }
                if (limit > 0) {
                    cursor = cursor.limit(limit);
                }

                results = await cursor.toArray();
            }

            return this._serializeDocuments(results);
        } catch (error) {
            logger.error('Error executing query:', error);
            throw error;
        }
    }

    _serializeDocuments(docs) {
        return docs.map(doc => {
            const serialized = {};
            for (const [key, value] of Object.entries(doc)) {
                if (value instanceof Date) {
                    serialized[key] = value.toISOString();
                } else if (value && typeof value === 'object') {
                    serialized[key] = this._serializeDocuments([value])[0];
                } else {
                    serialized[key] = value;
                }
            }
            return serialized;
        });
    }

    async getCollectionInfo(collectionName) {
        try {
            const collection = this.db.collection(collectionName);
            const count = await collection.countDocuments();
            const sample = await collection.find().limit(1).toArray();
            const schema = sample.length > 0 ? Object.keys(sample[0]).reduce((acc, key) => {
                acc[key] = typeof sample[0][key];
                return acc;
            }, {}) : {};
            
            return {
                count,
                schema
            };
        } catch (error) {
            logger.error(`Error getting collection info for ${collectionName}:`, error);
            throw error;
        }
    }

    async getSampleData(collectionName, sampleSize = 100) {
        try {
            const collection = this.db.collection(collectionName);
            // Convert sampleSize to integer
            const limit = parseInt(sampleSize, 10) || 100;
            const sample = await collection.find()
                .limit(limit)
                .toArray();
            
            return sample;
        } catch (error) {
            logger.error(`Error getting sample data from ${collectionName}:`, error);
            throw error;
        }
    }

    async close() {
        try {
            await this.client.close();
            logger.info('MongoDB connection closed');
        } catch (error) {
            logger.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }
}

export { DatabaseHandler }; 