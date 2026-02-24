import crypto from 'crypto';

// Simple password hashing (for production, use bcrypt)
export function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

// Session token management
export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Cookie constants
export const SESSION_COOKIE_NAME = 'auth_token';
export const SESSION_COOKIE_AGE = 30 * 24 * 60 * 60; // 30 days
