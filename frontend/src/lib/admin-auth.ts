import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-server';

export async function requireAdmin(request: NextRequest) {
    const user = await getSessionUser(request);

    if (!user) {
        return {
            user: null,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    if (user.role !== 'admin') {
        return {
            user,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    return { user, response: null };
}
