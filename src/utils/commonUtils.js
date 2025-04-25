/**
 * Cleans a header name for consistent use as a database field name.
 * - Converts to lowercase.
 * - Replaces sequences of non-alphanumeric characters with a single underscore.
 * - Trims leading/trailing underscores.
 * 
 * Examples:
 *  'Order ID' -> 'order_id'
 *  'Market Value ($M)' -> 'market_value_m'
 *  'Annual Growth (%)' -> 'annual_growth_percent' // or annual_growth based on regex
 *  'public/private' -> 'public_private'
 * 
 * @param {string} header The original header name.
 * @returns {string} The cleaned header name.
 */
export function cleanHeaderName(header) {
    if (typeof header !== 'string') {
        return header; // Return non-strings as is
    }
    
    // Convert to lowercase
    let cleaned = header.toLowerCase();
    
    // Replace sequences of non-alphanumeric characters with a single underscore
    // Handles spaces, $, %, /, -, etc.
    cleaned = cleaned.replace(/[^a-z0-9]+/g, '_');
    
    // Trim leading and trailing underscores
    cleaned = cleaned.replace(/^_+|_+$/g, '');
    
    // Handle potential empty strings after cleaning (e.g., header was just '___')
    if (!cleaned) {
        return '_invalid_header_'; // Or generate a unique placeholder
    }
    
    return cleaned;
} 