import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

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

        const workerRes = await fetch(`${endpoint}/reconcile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerSecret}`
            },
            body: JSON.stringify({
                bundleIdentifier: body?.bundleIdentifier,
                limit: body?.limit,
                async: true
            })
        });

        const data = await workerRes.json();
        if (!workerRes.ok) {
            return NextResponse.json(
                { error: data?.error || 'Worker reconcile failed', details: data?.details },
                { status: 502 }
            );
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Worker reconcile proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to reconcile worker uploads', details: error.message },
            { status: 500 }
        );
    }
}
