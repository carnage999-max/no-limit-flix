const getAuthSecret = () => {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return null;
    return secret;
};

const base64UrlEncode = (input: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < input.length; i += 1) {
        binary += String.fromCharCode(input[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const base64UrlDecode = (input: string) => {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const timingSafeEqual = (a: string, b: string) => {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
};

export async function verifySessionTokenEdge(token?: string | null): Promise<{ userId: string; role?: string; expiresAt: number; sessionId?: string } | null> {
    if (!token) return null;
    const secret = getAuthSecret();
    if (!secret) return null;

    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    try {
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const expectedBytes = new Uint8Array(
            await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
        );
        const expected = base64UrlEncode(expectedBytes);

        if (!timingSafeEqual(expected, signature)) return null;

        const payloadBytes = base64UrlDecode(body);
        const payloadText = new TextDecoder().decode(payloadBytes);
        const payload = JSON.parse(payloadText);
        if (!payload?.userId || !payload?.expiresAt) return null;
        if (Date.now() > payload.expiresAt) return null;
        return payload;
    } catch {
        return null;
    }
}
