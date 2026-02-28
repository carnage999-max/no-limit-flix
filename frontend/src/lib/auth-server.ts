import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function getSessionUser(request: NextRequest) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = verifySessionToken(token);
    if (!payload) return null;

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
