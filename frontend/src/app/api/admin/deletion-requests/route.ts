import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

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
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

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
