import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { createSessionToken, generateRefreshToken, hashToken, REFRESH_TOKEN_COOKIE_NAME, REFRESH_TOKEN_AGE, SESSION_COOKIE_NAME, SESSION_COOKIE_AGE, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const refreshToken = body?.refreshToken || request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return NextResponse.json({ error: 'Missing refresh token' }, { status: 401 });
        }

        const refreshHash = hashToken(refreshToken);
        const session = await prisma.userSession.findFirst({
            where: {
                refreshTokenHash: refreshHash,
                revokedAt: null,
                refreshTokenExpiresAt: { gt: new Date() }
            },
            select: { userId: true, sessionId: true }
        });

        if (!session) {
            return NextResponse.json({ error: 'Refresh token invalid' }, { status: 401 });
        }

        const newRefreshToken = generateRefreshToken();
        const newRefreshHash = hashToken(newRefreshToken);
        const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_AGE * 1000);

        await prisma.userSession.updateMany({
            where: { sessionId: session.sessionId },
            data: {
                refreshTokenHash: newRefreshHash,
                refreshTokenExpiresAt: refreshExpiresAt,
                lastUsedAt: new Date(),
            }
        });

        const accessToken = createSessionToken({
            userId: session.userId,
            expiresAt: Date.now() + SESSION_COOKIE_AGE * 1000,
            sessionId: session.sessionId,
        });

        const response = NextResponse.json({
            success: true,
            token: accessToken,
            refreshToken: newRefreshToken
        });

        response.cookies.set(SESSION_COOKIE_NAME, accessToken, getAuthCookieOptions(SESSION_COOKIE_AGE));
        response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, getAuthCookieOptions(REFRESH_TOKEN_AGE));

        return response;
    } catch (error) {
        console.error('Refresh token error:', error);
        return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 });
    }
}
