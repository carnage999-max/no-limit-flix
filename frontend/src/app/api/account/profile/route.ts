import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

export async function PUT(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { username, email, avatar } = body;

        const updated = await prisma.user.update({
            where: { id: sessionUser.id },
            data: {
                username: username || undefined,
                email: email || undefined,
                avatar: avatar || undefined,
            },
            select: {
                id: true,
                email: true,
                username: true,
                avatar: true,
                role: true,
            }
        });

        return NextResponse.json({ user: updated });
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return NextResponse.json({ error: 'Email or username already in use' }, { status: 409 });
        }
        console.error('Profile update error:', error);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
