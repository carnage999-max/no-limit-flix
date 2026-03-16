import { NextRequest, NextResponse } from 'next/server';

type WorkerResponse = {
    error?: string;
    details?: string | null;
};

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
        if (!workerUrl) {
            return NextResponse.json({ error: 'INGEST_WORKER_URL not configured' }, { status: 500 });
        }
        if (!workerSecret) {
            return NextResponse.json({ error: 'INGEST_WORKER_SECRET not configured' }, { status: 500 });
        }

        const body = await request.json().catch(() => ({}));
        const limit = Math.min(Math.max(Number(body?.limit) || 20, 1), 200);
        const payload = {
            query: body?.query || null,
            presetQuery: body?.presetQuery || null,
            limit,
            allowMkv: Boolean(body?.allowMkv),
            requireAudio: body?.requireAudio !== false,
            allowUnknownDuration: body?.allowUnknownDuration === true,
            minDurationSeconds: Number(body?.minDurationSeconds) || 8,
            maxDurationSeconds: Number(body?.maxDurationSeconds) || 150,
            candidateMultiplier: Number(body?.candidateMultiplier) || undefined,
            compress: body?.compress !== false,
            compressMinBytes: Number(body?.compressMinBytes) || undefined,
            identifiers: Array.isArray(body?.identifiers) ? body.identifiers : undefined,
            items: Array.isArray(body?.items) ? body.items : undefined,
            async: body?.async !== false,
        };

        const endpoint = workerUrl.replace(/\/$/, '');
        const response = await fetch(`${endpoint}/reels/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${workerSecret}`
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        const contentType = response.headers.get('content-type') || '';
        let data: WorkerResponse | null = null;
        let rawText = '';

        if (contentType.includes('application/json')) {
            data = await response.json().catch(() => null);
        } else {
            rawText = (await response.text().catch(() => '')) || '';
        }

        if (!response.ok) {
            const rawSnippet = rawText ? rawText.replace(/\s+/g, ' ').trim().slice(0, 220) : null;
            const isMissingReelsRoute = response.status === 404 && /\/reels\/import/i.test(rawText);
            const error = isMissingReelsRoute
                ? 'Worker is running an older build without POST /reels/import. Redeploy worker with latest code.'
                : (data?.error || 'Worker reels import failed');

            return NextResponse.json(
                {
                    error,
                    details: data?.details || rawSnippet || null,
                    upstreamStatus: response.status,
                    upstreamStatusText: response.statusText || null,
                },
                { status: response.status }
            );
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin reels import error:', error);
        return NextResponse.json(
            { error: 'Failed to import reels', details: message },
            { status: 502 }
        );
    }
}
