/**
 * Normalizes phone number strings to their last 10 digits
 * by stripping non-digit characters.
 * Useful for matching contacts across different formats (e.g. +91 9999999999 vs 9999999999)
 * 
 * @param {string} phoneStr - Raw phone number string
 * @returns {string} Normalized 10-digit phone number, or empty string
 */
export const normalizePhone = (phoneStr) => {
    if (!phoneStr) return '';
    // Keep only digits
    const cleaned = String(phoneStr).replace(/\D/g, '');
    
    // If it starts with 91 and has 12 digits, strip the 91
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return cleaned.substring(2);
    }
    
    // If it has more than 10 digits, return last 10 digits
    if (cleaned.length > 10) {
        return cleaned.slice(-10);
    }
    
    return cleaned;
};
