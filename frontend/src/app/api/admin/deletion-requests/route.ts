import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

function ensureAdminSession(request: NextRequest) {
    const session = request.cookies.get('admin_session')?.value;
    return Boolean(session);
}

export async function GET(request: NextRequest) {
    try {
        if (!ensureAdminSession(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requests = await prisma.accountDeletionRequest.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    }
                }
            }
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Admin deletion requests error:', error);
        return NextResponse.json({ error: 'Failed to fetch deletion requests' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        if (!ensureAdminSession(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await request.json();
        if (!id) {
            return NextResponse.json({ error: 'Request id is required' }, { status: 400 });
        }

        await prisma.accountDeletionRequest.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete request error:', error);
        return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
    }
}
