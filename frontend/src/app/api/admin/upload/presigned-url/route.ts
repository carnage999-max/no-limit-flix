import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    return NextResponse.json(
        {
            error: 'S3 presigned movie uploads have been removed. Use /api/admin/upload/direct.',
        },
        { status: 410 }
    );
}
