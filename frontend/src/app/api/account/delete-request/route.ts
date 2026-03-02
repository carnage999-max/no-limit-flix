import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { sendEmail } from '@/lib/email';

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
                html: `
                    <div style="font-family: Arial, sans-serif; color: #111;">
                      <h2>We received your request</h2>
                      <p>Your account deletion request is now in review.</p>
                      <p>If you did not request this, please contact support immediately.</p>
                    </div>
                `,
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
