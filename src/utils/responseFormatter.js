/**
 * Standard response format for API endpoints
 */
export const responseFormatter = {
    /**
     * Format a successful response
     * @param {Object|Array} data - Response data
     * @param {String} message - Success message
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Formatted response
     */
    success: (data = null, message = 'Operation successful', metadata = {}) => {
        const response = {
            success: true,
            message,
            ...metadata
        };

        // Only include data if not null
        if (data !== null) {
            response.data = data;
        }

        return response;
    },

    /**
     * Format an error response
     * @param {String} message - Error message
     * @param {Number} statusCode - HTTP status code
     * @param {Object} details - Additional error details
     * @returns {Object} Formatted error response
     */
    error: (message = 'An error occurred', statusCode = 500, details = {}) => {
        // Create error object with appropriate properties
        const error = new Error(message);
        error.statusCode = statusCode;
        error.details = details;
        
        return error;
    }
};