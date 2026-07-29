import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

type WorkerJob = {
    type?: string | null;
};

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const workerUrl = process.env.INGEST_WORKER_URL;
        const workerSecret = process.env.INGEST_WORKER_SECRET;
        if (!workerUrl || !workerSecret) {
            return NextResponse.json(
                { error: 'Ingest worker is not configured' },
                { status: 500 }
            );
        }

        const endpoint = workerUrl.replace(/\/$/, '');
        const jobId = request.nextUrl.searchParams.get('jobId');
        const path = jobId ? `/jobs/${encodeURIComponent(jobId)}` : '/jobs';

        const response = await fetch(`${endpoint}${path}`, {
            headers: {
                'Authorization': `Bearer ${workerSecret}`,
            },
            cache: 'no-store',
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            return NextResponse.json(
                { error: data?.error || 'Worker jobs lookup failed', details: data?.details || null },
                { status: 502 }
            );
        }

        if (jobId) {
            if (data?.job && data.job.type && data.job.type !== 'reels_import') {
                return NextResponse.json({ error: 'Job is not a reels import job' }, { status: 404 });
            }
            return NextResponse.json(data);
        }

        const jobs = Array.isArray(data?.jobs)
            ? (data.jobs as WorkerJob[]).filter((job) => job?.type === 'reels_import')
            : [];

        return NextResponse.json({ success: true, jobs });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin reels jobs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reels jobs', details: message },
            { status: 500 }
        );
    }
}
