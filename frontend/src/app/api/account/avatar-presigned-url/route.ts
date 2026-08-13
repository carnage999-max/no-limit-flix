import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
        {
            error: 'S3 presigned avatar uploads have been removed. Use /api/account/avatar.',
        },
        { status: 410 }
    );
}
