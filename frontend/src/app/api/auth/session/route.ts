import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
        const payload = verifySessionToken(token);
        if (!payload) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
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

        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        return NextResponse.json({ authenticated: true, user });
    } catch (error) {
        console.error('Session lookup error:', error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
