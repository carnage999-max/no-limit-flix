import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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

        const endpoint = workerUrl.replace(/\/$/, '');
        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('jobId');

        const url = jobId ? `${endpoint}/jobs/${jobId}` : `${endpoint}/jobs`;
        const workerRes = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${workerSecret}`
            }
        });

        const data = await workerRes.json();
        if (!workerRes.ok) {
            return NextResponse.json({ error: data?.error || 'Worker job lookup failed' }, { status: 502 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Worker jobs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch worker jobs', details: error.message },
            { status: 500 }
        );
    }
}
