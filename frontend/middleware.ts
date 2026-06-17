import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenEdge } from '@/lib/auth-edge';
import {
    buildSessionVerificationHeaders,
    buildSessionVerificationUrl,
    getRequestSessionToken,
} from '@/lib/middleware-auth';

const PUBLIC_PAGE_PREFIXES = [
    '/auth',
    '/about',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
    '/admin',
];

const AUTH_ONLY_PAGE_PREFIXES = [
    '/account/billing',
];

const SUBSCRIPTION_API_PREFIXES = [
    '/api/library',
    '/api/search',
    '/api/title',
    '/api/watch',
    '/api/favorites',
    '/api/watch-history',
    '/api/collection',
    '/api/reels/feed',
    '/api/ai',
];

const isMatchingPrefix = (pathname: string, prefixes: string[]) => {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const isPublicPage = (pathname: string) => {
    if (pathname === '/') return false;
    return isMatchingPrefix(pathname, PUBLIC_PAGE_PREFIXES);
};

const isSubscriptionApi = (pathname: string) => {
    return isMatchingPrefix(pathname, SUBSCRIPTION_API_PREFIXES);
};

const unauthorizedResponse = (request: NextRequest, isApi: boolean) => {
    if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redirectUrl = new URL('/auth', request.url);
    redirectUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
};

const inactiveSubscriptionResponse = (request: NextRequest, isApi: boolean) => {
    if (isApi) {
        return NextResponse.json({ error: 'Active subscription required' }, { status: 402 });
    }

    const redirectUrl = new URL('/account/billing', request.url);
    redirectUrl.searchParams.set('redirect', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    redirectUrl.searchParams.set('gated', '1');
    return NextResponse.redirect(redirectUrl);
};

const verifyRequestSession = async (request: NextRequest) => {
    const verifyRes = await fetch(buildSessionVerificationUrl(request.url), {
        headers: buildSessionVerificationHeaders({
            cookieHeader: request.headers.get('cookie') || '',
            authorizationHeader: request.headers.get('authorization') || request.headers.get('Authorization') || '',
        }),
        cache: 'no-store',
    });

    if (!verifyRes.ok) return null;
    return verifyRes.json();
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApi = pathname.startsWith('/api/');

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

    if (!isApi && isPublicPage(pathname)) {
        return NextResponse.next();
    }

    const requiresAuthOnlyPage = !isApi && isMatchingPrefix(pathname, AUTH_ONLY_PAGE_PREFIXES);
    const requiresSubscriptionPage = !isApi && !requiresAuthOnlyPage;
    const requiresSubscriptionApi = isApi && isSubscriptionApi(pathname);

    if (!requiresAuthOnlyPage && !requiresSubscriptionPage && !requiresSubscriptionApi) {
        return NextResponse.next();
    }

    const token = getRequestSessionToken({
        cookieToken: request.cookies.get('auth_token')?.value || null,
        authorizationHeader: request.headers.get('authorization') || request.headers.get('Authorization'),
    });
    const session = await verifySessionTokenEdge(token);
    if (!session) {
        return unauthorizedResponse(request, isApi);
    }

    try {
        const sessionData = await verifyRequestSession(request);
        if (!sessionData?.authenticated) {
            return unauthorizedResponse(request, isApi);
        }

        if ((requiresSubscriptionPage || requiresSubscriptionApi) && !sessionData?.billing?.access) {
            return inactiveSubscriptionResponse(request, isApi);
        }

        return NextResponse.next();
    } catch {
        return unauthorizedResponse(request, isApi);
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
    ],
};
