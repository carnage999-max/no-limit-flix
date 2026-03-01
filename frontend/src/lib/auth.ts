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

const getAuthSecret = () => {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET is required');
    }
    return secret;
};

const base64UrlEncode = (input: string | Buffer) => {
    const buffer = typeof input === 'string' ? Buffer.from(input) : input;
    return buffer
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
};

const base64UrlDecode = (input: string) => {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
    return Buffer.from(padded, 'base64').toString('utf-8');
};

export function createSessionToken(payload: { userId: string; role?: string; expiresAt: number; sessionId: string }) {
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
        .createHmac('sha256', getAuthSecret())
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${body}.${signature}`;
}

export function verifySessionToken(token?: string | null): { userId: string; role?: string; expiresAt: number; sessionId?: string } | null {
    if (!token) return null;
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expected = crypto
        .createHmac('sha256', getAuthSecret())
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
        const payload = JSON.parse(base64UrlDecode(body));
        if (!payload?.userId || !payload?.expiresAt) return null;
        if (Date.now() > payload.expiresAt) return null;
        return payload;
    } catch {
        return null;
    }
}

// Cookie constants
export const SESSION_COOKIE_NAME = 'auth_token';
export const SESSION_COOKIE_AGE = 30 * 24 * 60 * 60; // 30 days
