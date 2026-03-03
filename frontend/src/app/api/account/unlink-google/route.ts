import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const updated = await prisma.user.update({
            where: { id: sessionUser.id },
            data: { googleId: null },
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
        console.error('Unlink Google error:', error);
        return NextResponse.json({ error: 'Failed to unlink Google account' }, { status: 500 });
    }
}
