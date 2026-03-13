import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

const verifyGoogleToken = async (idToken: string) => {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
        cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    const validAudiences = [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);
    if (!validAudiences.length || !validAudiences.includes(data.aud)) {
        return null;
    }
    if (data.email_verified !== 'true' && data.email_verified !== true) return null;
    return data;
};

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const idToken = body?.idToken;
        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json({ error: 'Missing Google token' }, { status: 400 });
        }

        const tokenInfo = await verifyGoogleToken(idToken);
        const googleId = tokenInfo?.sub ? String(tokenInfo.sub) : null;
        if (!tokenInfo?.email || !googleId) {
            return NextResponse.json({ error: 'Google token invalid' }, { status: 401 });
        }

        const existing = await prisma.user.findFirst({
            where: { googleId }
        });
        if (existing && existing.id !== sessionUser.id) {
            return NextResponse.json({ error: 'Google account already linked to another user.' }, { status: 409 });
        }

        const updated = await prisma.user.update({
            where: { id: sessionUser.id },
            data: {
                googleId,
                avatar: sessionUser.avatar || tokenInfo.picture || undefined,
            },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                showWelcomeScreen: true,
                role: true,
                googleId: true,
            }
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (error) {
        console.error('Link Google error:', error);
        return NextResponse.json({ error: 'Failed to link Google account' }, { status: 500 });
    }
}
