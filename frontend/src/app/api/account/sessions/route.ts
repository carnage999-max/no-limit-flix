import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { parseUserAgent, lookupLocation } from '@/lib/device';

export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const payload = verifySessionToken(token);
        const currentSessionId = payload?.sessionId || null;

        const sessions = await prisma.userSession.findMany({
            where: { userId: sessionUser.id, revokedAt: null },
            orderBy: { lastUsedAt: 'desc' },
        });

        const enriched = await Promise.all(
            sessions.map(async (session) => {
                const device = parseUserAgent(session.userAgent);
                const location = await lookupLocation(session.ipAddress);
                return {
                    id: session.id,
                    sessionId: session.sessionId,
                    userAgent: session.userAgent,
                    ipAddress: session.ipAddress,
                    createdAt: session.createdAt,
                    lastUsedAt: session.lastUsedAt,
                    isCurrent: currentSessionId === session.sessionId,
                    device,
                    location,
                };
            })
        );

        return NextResponse.json({
            sessions: enriched
        });
    } catch (error) {
        console.error('Sessions fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.userSession.updateMany({
            where: { userId: sessionUser.id, revokedAt: null },
            data: { revokedAt: new Date() }
        });

        const response = NextResponse.json({ success: true });
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    } catch (error) {
        console.error('Logout all sessions error:', error);
        return NextResponse.json({ error: 'Failed to log out all devices' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { sessionId } = await request.json();
        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const targetSession = await prisma.userSession.findFirst({
            where: {
                userId: sessionUser.id,
                sessionId,
                revokedAt: null,
            }
        });

        if (!targetSession) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        await prisma.userSession.update({
            where: { id: targetSession.id },
            data: { revokedAt: new Date() }
        });

        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const payload = verifySessionToken(token);
        const isCurrent = payload?.sessionId === sessionId;

        const response = NextResponse.json({ success: true, loggedOutCurrent: isCurrent });
        if (isCurrent) {
            response.cookies.delete(SESSION_COOKIE_NAME);
        }
        return response;
    } catch (error) {
        console.error('Logout session error:', error);
        return NextResponse.json({ error: 'Failed to log out session' }, { status: 500 });
    }
}
