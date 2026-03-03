import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { sendEmail } from '@/lib/email';
import { buildDeletionRequestEmail } from '@/lib/email-templates';

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

        try {
            await sendEmail({
                to: email,
                subject: 'Account deletion request received',
                html: buildDeletionRequestEmail(),
            });
        } catch (err) {
            console.warn('Deletion request email failed', err);
        }

        return NextResponse.json({ success: true, request: requestRow });
    } catch (error) {
        console.error('Delete request error:', error);
        return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }
}
