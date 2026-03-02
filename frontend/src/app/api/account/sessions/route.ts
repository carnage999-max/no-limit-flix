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
        const includeHistory = request.nextUrl.searchParams.get('includeHistory') === '1';

        const userRecord = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { primaryDeviceId: true, maxDevices: true }
        });
        const primaryDeviceId = userRecord?.primaryDeviceId || null;
        const maxDevices = userRecord?.maxDevices ?? null;

        const sessions = await prisma.userSession.findMany({
            where: { userId: sessionUser.id, revokedAt: null },
            orderBy: { lastUsedAt: 'desc' },
        });

        const seenDevices = new Set<string>();
        const activeSessions = sessions.filter((session) => {
            if (!session.deviceId) return true;
            if (seenDevices.has(session.deviceId)) return false;
            seenDevices.add(session.deviceId);
            return true;
        });

        const enriched = await Promise.all(
            activeSessions.map(async (session) => {
                const device = parseUserAgent(session.userAgent);
                const location = await lookupLocation(session.ipAddress);
                return {
                    id: session.id,
                    sessionId: session.sessionId,
                    deviceId: session.deviceId,
                    deviceName: session.deviceName,
                    userAgent: session.userAgent,
                    ipAddress: session.ipAddress,
                    createdAt: session.createdAt,
                    lastUsedAt: session.lastUsedAt,
                    isCurrent: currentSessionId === session.sessionId,
                    isPrimary: !!(session.deviceId && primaryDeviceId && session.deviceId === primaryDeviceId),
                    device,
                    location,
                };
            })
        );

        if (includeHistory) {
            const historySessions = await prisma.userSession.findMany({
                where: { userId: sessionUser.id, revokedAt: { not: null } },
                orderBy: { lastUsedAt: 'desc' },
            });
            const seenHistory = new Set<string>();
            const history = historySessions.filter((session) => {
                if (!session.deviceId) return true;
                if (seenHistory.has(session.deviceId)) return false;
                seenHistory.add(session.deviceId);
                return true;
            });
            const enrichedHistory = await Promise.all(
                history.map(async (session) => {
                    const device = parseUserAgent(session.userAgent);
                    const location = await lookupLocation(session.ipAddress);
                    return {
                        id: session.id,
                        sessionId: session.sessionId,
                        deviceId: session.deviceId,
                        deviceName: session.deviceName,
                        userAgent: session.userAgent,
                        ipAddress: session.ipAddress,
                        createdAt: session.createdAt,
                        lastUsedAt: session.lastUsedAt,
                        revokedAt: session.revokedAt,
                        device,
                        location,
                    };
                })
            );
            return NextResponse.json({
                sessions: enriched,
                history: enrichedHistory,
                primaryDeviceId,
                maxDevices,
            });
        }

        return NextResponse.json({
            sessions: enriched,
            primaryDeviceId,
            maxDevices,
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
        await prisma.user.update({
            where: { id: sessionUser.id },
            data: { primaryDeviceId: null }
        });

        const response = NextResponse.json({ success: true });
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    } catch (error) {
        console.error('Logout all sessions error:', error);
        return NextResponse.json({ error: 'Failed to log out all devices' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { deviceId } = await request.json();
        if (!deviceId) {
            return NextResponse.json({ error: 'deviceId is required' }, { status: 400 });
        }

        const existing = await prisma.userSession.findFirst({
            where: { userId: sessionUser.id, deviceId }
        });
        if (!existing) {
            return NextResponse.json({ error: 'Device not found' }, { status: 404 });
        }

        await prisma.user.update({
            where: { id: sessionUser.id },
            data: { primaryDeviceId: deviceId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Set primary device error:', error);
        return NextResponse.json({ error: 'Failed to set primary device' }, { status: 500 });
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
        if (targetSession.deviceId) {
            await prisma.user.updateMany({
                where: { id: sessionUser.id, primaryDeviceId: targetSession.deviceId },
                data: { primaryDeviceId: null }
            });
        }

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
