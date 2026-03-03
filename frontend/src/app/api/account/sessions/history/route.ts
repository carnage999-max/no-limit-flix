import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

export async function DELETE(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await prisma.userSession.deleteMany({
            where: { userId: sessionUser.id, revokedAt: { not: null } }
        });

        return NextResponse.json({ success: true, cleared: result.count });
    } catch (error) {
        console.error('Clear device history error:', error);
        return NextResponse.json({ error: 'Failed to clear device history' }, { status: 500 });
    }
}
