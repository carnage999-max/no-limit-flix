import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenEdge } from '@/lib/auth-edge';

const PUBLIC_PAGE_PREFIXES = [
    '/auth',
    '/about',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
];

const isMatchingPrefix = (pathname: string, prefixes: string[]) => {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const isPublicPage = (pathname: string) => {
    if (pathname === '/') return false;
    return isMatchingPrefix(pathname, PUBLIC_PAGE_PREFIXES);
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith('/admin')) {
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifySessionTokenEdge(token);

        if (!payload) {
            const url = new URL('/auth', request.url);
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }

        if (payload.role !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url));
        }

        return NextResponse.next();
    }

    if (isPublicPage(pathname)) {
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
    ],
};
