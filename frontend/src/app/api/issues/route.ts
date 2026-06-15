import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { sendEmail } from '@/lib/email';
import { buildIssueInternalEmailWithAttachments, buildIssueReceivedEmail } from '@/lib/email-templates';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { writeMediaBuffer } from '@/lib/media-storage';

const ISSUE_DEV_EMAIL = 'dev@nolimitflix.com';
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3MB per attachment

const decodeDataUrl = (dataUrl: string) => {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const raw = match[2];
    const buffer = Buffer.from(raw, 'base64');
    return { mimeType, buffer };
};

const safeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

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
                attachments: Prisma.JsonNull,
            }
        });

        const uploadedAttachments: Array<{ name: string; type: string; size: number; key: string; url: string }> = [];

        for (const file of sanitizedAttachments) {
            const decoded = decodeDataUrl(file.dataUrl);
            if (!decoded) continue;
            if (decoded.buffer.length > MAX_ATTACHMENT_BYTES) {
                return NextResponse.json({ error: 'Attachment too large. Max 3MB per file.' }, { status: 400 });
            }
            const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
            const key = `issues/${new Date().toISOString().slice(0, 10)}/${report.id}/${crypto.randomUUID()}${ext ? `.${safeFileName(ext)}` : ''}`;
            const stored = await writeMediaBuffer(key, decoded.buffer);

            uploadedAttachments.push({
                name: file.name,
                type: decoded.mimeType || file.type,
                size: decoded.buffer.length,
                key: stored.relativePath,
                url: stored.publicUrl,
            });
        }

        if (uploadedAttachments.length) {
            await prisma.issueReport.update({
                where: { id: report.id },
                data: {
                    attachments: uploadedAttachments,
                },
            }
            );
        }

        await sendEmail({
            to: ISSUE_DEV_EMAIL,
            subject: `New issue report ${report.id}`,
            html: buildIssueInternalEmailWithAttachments({
                issueId: report.id,
                issue,
                name: report.name || undefined,
                email: report.email || undefined,
                userId: report.userId || undefined,
                attachments: uploadedAttachments.map((file) => ({ name: file.name, url: file.url })),
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

        return NextResponse.json({
            success: true,
            issue: {
                ...report,
                attachments: uploadedAttachments,
            }
        });
    } catch (error) {
        console.error('Issue report error:', error);
        return NextResponse.json({ error: 'Failed to submit issue.' }, { status: 500 });
    }
}
