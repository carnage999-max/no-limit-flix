import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                async: true
            })
        });

        const contentType = workerRes.headers.get('content-type') || '';
        let data: any = null;
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
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Worker returned non-JSON response', details: rawText || 'No response body' }, { status: 502 });
    } catch (error: any) {
        console.error('Worker refresh posters proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to refresh posters', details: error.message },
            { status: 500 }
        );
    }
}
