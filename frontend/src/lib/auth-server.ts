import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

const getBearerToken = (request: NextRequest) => {
    const header = request.headers.get('authorization') || request.headers.get('Authorization');
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
    return value || null;
};

export async function getSessionUser(request: NextRequest) {
    const token = getBearerToken(request) || request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = verifySessionToken(token);
    if (!payload) return null;

    if (payload.sessionId) {
        const session = await prisma.userSession.findFirst({
            where: {
                sessionId: payload.sessionId,
                revokedAt: null,
            },
            select: { id: true }
        });
        if (!session) return null;
        await prisma.userSession.updateMany({
            where: { sessionId: payload.sessionId },
            data: { lastUsedAt: new Date() }
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            username: true,
            avatar: true,
            showWelcomeScreen: true,
            role: true,
            googleId: true,
            appleId: true,
        }
    });

    return user || null;
}
