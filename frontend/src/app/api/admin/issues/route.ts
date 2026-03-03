import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { buildIssueResolvedEmail, buildIssueInternalEmail } from '@/lib/email-templates';

const ISSUE_DEV_EMAIL = 'dev@nolimitflix.com';

function ensureAdminSession(request: NextRequest) {
    const session = request.cookies.get('admin_session')?.value;
    return Boolean(session);
}

export async function GET(request: NextRequest) {
    try {
        if (!ensureAdminSession(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [openIssues, resolvedIssues] = await Promise.all([
            prisma.issueReport.findMany({
                where: { status: 'open' },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.issueReport.findMany({
                where: { status: 'resolved' },
                orderBy: { resolvedAt: 'desc' },
            }),
        ]);

        return NextResponse.json({ issues: openIssues, resolved: resolvedIssues });
    } catch (error) {
        console.error('Admin issues fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        if (!ensureAdminSession(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids } = await request.json();
        const issueIds: string[] = Array.isArray(ids) ? ids : ids ? [ids] : [];
        if (!issueIds.length) {
            return NextResponse.json({ error: 'Issue ids are required' }, { status: 400 });
        }

        const issues = await prisma.issueReport.findMany({
            where: { id: { in: issueIds } },
        });

        await prisma.issueReport.updateMany({
            where: { id: { in: issueIds } },
            data: {
                status: 'resolved',
                resolvedAt: new Date(),
            }
        });

        await Promise.all(
            issues.map(async (issue) => {
                await sendEmail({
                    to: ISSUE_DEV_EMAIL,
                    subject: `Issue resolved ${issue.id}`,
                    html: buildIssueInternalEmail({
                        issueId: issue.id,
                        issue: issue.issue,
                        name: issue.name || undefined,
                        email: issue.email || undefined,
                        userId: issue.userId || undefined,
                    }),
                });

                if (issue.email) {
                    await sendEmail({
                        to: issue.email,
                        subject: `Issue resolved (#${issue.id})`,
                        html: buildIssueResolvedEmail({ issueId: issue.id }),
                    });
                }
            })
        );

        return NextResponse.json({ success: true, resolved: issueIds.length });
    } catch (error) {
        console.error('Admin issues update error:', error);
        return NextResponse.json({ error: 'Failed to update issues' }, { status: 500 });
    }
}
