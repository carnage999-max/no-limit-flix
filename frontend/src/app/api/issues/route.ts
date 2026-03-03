import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { sendEmail } from '@/lib/email';
import { buildIssueInternalEmail, buildIssueReceivedEmail } from '@/lib/email-templates';

const ISSUE_DEV_EMAIL = 'dev@nolimitflix.com';
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB per attachment

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        const payload = await request.json();
        const issue = String(payload?.issue || '').trim();
        const name = payload?.name ? String(payload.name).trim() : null;
        const email = payload?.email ? String(payload.email).trim() : null;
        const attachments = Array.isArray(payload?.attachments) ? payload.attachments.slice(0, MAX_ATTACHMENTS) : [];

        if (!issue) {
            return NextResponse.json({ error: 'Issue description is required.' }, { status: 400 });
        }

        const sanitizedAttachments = attachments.map((file: any) => ({
            name: String(file?.name || 'attachment'),
            type: String(file?.type || 'application/octet-stream'),
            size: Number(file?.size || 0),
            dataUrl: String(file?.dataUrl || ''),
        }));

        const oversized = sanitizedAttachments.find((file: any) => file.size > MAX_ATTACHMENT_BYTES);
        if (oversized) {
            return NextResponse.json({ error: 'Attachment too large. Max 3MB per file.' }, { status: 400 });
        }

        const report = await prisma.issueReport.create({
            data: {
                userId: sessionUser?.id || null,
                name: sessionUser?.username || name,
                email: sessionUser?.email || email,
                issue,
                attachments: sanitizedAttachments.length ? sanitizedAttachments : null,
            }
        });

        await sendEmail({
            to: ISSUE_DEV_EMAIL,
            subject: `New issue report ${report.id}`,
            html: buildIssueInternalEmail({
                issueId: report.id,
                issue,
                name: report.name || undefined,
                email: report.email || undefined,
                userId: report.userId || undefined,
            }),
        });

        if (report.email) {
            await sendEmail({
                to: report.email,
                subject: `Issue received (#${report.id})`,
                html: buildIssueReceivedEmail({
                    issueId: report.id,
                    issue,
                    name: report.name || undefined,
                    email: report.email || undefined,
                }),
            });
        }

        return NextResponse.json({ success: true, issue: report });
    } catch (error) {
        console.error('Issue report error:', error);
        return NextResponse.json({ error: 'Failed to submit issue.' }, { status: 500 });
    }
}
