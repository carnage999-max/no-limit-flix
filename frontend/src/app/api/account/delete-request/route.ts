import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        const body = await request.json();
        const email = (body?.email || sessionUser?.email || '').toString().trim();
        const reason = body?.reason ? String(body.reason) : null;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const requestRow = await prisma.accountDeletionRequest.create({
            data: {
                userId: sessionUser?.id || null,
                email,
                reason,
                status: 'pending',
            }
        });

        return NextResponse.json({ success: true, request: requestRow });
    } catch (error) {
        console.error('Delete request error:', error);
        return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }
}
