import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function getSessionUser(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
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
            role: true,
        }
    });

    return user || null;
}
