import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { getSessionUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const payload = verifySessionToken(token);
        if (!payload) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        const user = await getSessionUser(request);
        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({ authenticated: true, user, sessionId: payload.sessionId });
    } catch (error) {
        console.error('Session lookup error:', error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
