import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenEdge } from '@/lib/auth-edge';

export async function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    const protectedRoutes = ['/watch', '/title'];
    if (protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
        const token = request.cookies.get('auth_token')?.value;
        const session = await verifySessionTokenEdge(token);
        if (!session) {
            const redirectUrl = new URL('/auth', request.url);
            redirectUrl.searchParams.set('redirect', `${pathname}${search}`);
            return NextResponse.redirect(redirectUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/watch/:path*', '/title/:path*'],
};
