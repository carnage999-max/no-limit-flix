import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const workerUrl = process.env.INGEST_WORKER_URL;
        const workerSecret = process.env.INGEST_WORKER_SECRET;
        if (!workerUrl || !workerSecret) {
            return NextResponse.json({ error: 'Worker not configured' }, { status: 400 });
        }

        const endpoint = workerUrl.replace(/\/$/, '');
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        const url = jobId ? `${endpoint}/jobs/${jobId}` : `${endpoint}/jobs`;
        const workerRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${workerSecret}`
            }
        });

        const workerText = await workerRes.text();
        let data: { error?: string; [key: string]: unknown } | null = null;
        try {
            data = workerText ? JSON.parse(workerText) : null;
        } catch {
            data = null;
        }
        if (!workerRes.ok) {
            return NextResponse.json({
                error: data?.error || 'Worker job lookup failed',
                details: workerText.slice(0, 500),
            }, { status: 502 });
        }

        return NextResponse.json(data || { success: true });
    } catch (error) {
        console.error('Worker jobs error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to fetch worker jobs', details: message },
            { status: 500 }
        );
    }
}
