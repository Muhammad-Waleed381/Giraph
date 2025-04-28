import { logger } from '../../utils/logger.js';

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
    // Log the error
    logger.error('API Error:', err);
    
    // Determine appropriate status code
    const statusCode = err.statusCode || 500;
    
    // Structure error response
    const errorResponse = {
        success: false,
        error: err.message || 'An unexpected error occurred',
        details: err.details || {},
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
    
    // Send error response
    res.status(statusCode).json(errorResponse);
}