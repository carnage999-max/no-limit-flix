import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PAGE_PREFIXES = [
    '/auth',
    '/about',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
    '/admin',
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

    if (pathname.startsWith('/admin') && pathname !== '/admin') {
        const session = request.cookies.get('admin_session');
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!session || !adminPassword || session.value !== adminPassword) {
            const url = new URL('/admin', request.url);
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
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
