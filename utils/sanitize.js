// backend/utils/sanitize.js
// Input sanitization utilities

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') {
        return String(input || '');
    }
    
    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .substring(0, 10000); // Limit length
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return null;
    
    const sanitized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
        return null;
    }
    
    return sanitized.substring(0, 255);
}

/**
 * Sanitize comment content
 */
export function sanitizeComment(content) {
    if (!content || typeof content !== 'string') return '';
    
    return sanitizeString(content)
        .substring(0, 500); // Max 500 characters for comments
}

/**
 * Sanitize review content
 */
export function sanitizeReviewContent(content) {
    if (!content || typeof content !== 'string') return '';
    
    return sanitizeString(content)
        .substring(0, 50000); // Max 50k characters for reviews
}

/**
 * Sanitize title
 */
export function sanitizeTitle(title) {
    if (!title || typeof title !== 'string') return '';
    
    return sanitizeString(title)
        .substring(0, 200); // Max 200 characters for titles
}

/**
 * Validate and sanitize rating
 */
export function sanitizeRating(rating) {
    const num = parseFloat(rating);
    
    if (isNaN(num) || num < 0 || num > 10) {
        return 0;
    }
    
    return Math.round(num * 10) / 10; // Round to 1 decimal
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') return '';
    
    return fileName
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove special characters
        .substring(0, 255);
}

