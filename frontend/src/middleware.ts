import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Gate all /admin routes except the login page itself and API routes
    if (pathname.startsWith('/admin') && pathname !== '/admin') {
        const session = request.cookies.get('admin_session');
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Verify session against password
        if (!session || !adminPassword || session.value !== adminPassword) {
            const url = new URL('/admin', request.url);
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
