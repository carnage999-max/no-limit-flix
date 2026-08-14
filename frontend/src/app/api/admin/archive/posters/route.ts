import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-actions';

interface WorkerPosterRefreshResponse {
    error?: string;
    details?: string;
    jobId?: string;
    [key: string]: unknown;
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const workerUrl = process.env.INGEST_WORKER_URL;
        const workerSecret = process.env.INGEST_WORKER_SECRET;
        if (!workerUrl || !workerSecret) {
            return NextResponse.json({ error: 'Worker not configured' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const endpoint = workerUrl.replace(/\/$/, '');

        const workerRes = await fetch(`${endpoint}/refresh-posters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerSecret}`
            },
            body: JSON.stringify({
                limit: body?.limit,
                offset: body?.offset,
                force: body?.force === true,
                async: true
            })
        });

        const contentType = workerRes.headers.get('content-type') || '';
        let data: WorkerPosterRefreshResponse | null = null;
        let rawText: string | null = null;

        if (contentType.includes('application/json')) {
            data = await workerRes.json();
        } else {
            rawText = await workerRes.text();
        }

        if (!workerRes.ok) {
            return NextResponse.json(
                {
                    error: data?.error || 'Worker poster refresh failed',
                    details: data?.details || rawText || 'Unexpected worker response'
                },
                { status: 502 }
            );
        }

        if (data) {
            await recordAdminAction({
                actorId: auth.user?.id,
                action: 'video.thumbnail.refresh_queued',
                entityType: 'Video',
                metadata: {
                    jobId: data.jobId || null,
                    limit: body?.limit || null,
                    offset: body?.offset || null,
                    force: body?.force === true,
                },
            });
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Worker returned non-JSON response', details: rawText || 'No response body' }, { status: 502 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Worker refresh posters proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to refresh posters', details: message },
            { status: 500 }
        );
    }
}
