'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

const PUBLIC_PREFIXES = [
    '/auth',
    '/about',
    '/privacy',
    '/terms',
    '/support',
    '/delete-account',
    '/admin',
    '/account/billing',
];

const isPublicPath = (pathname: string) => {
    return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/';
    const router = useRouter();
    const { user, billing, loading } = useSession();

    useEffect(() => {
        if (loading || !user || !billing) return;
        if (!billing.requiresSubscription || billing.access || isPublicPath(pathname)) return;

        const queryString = typeof window !== 'undefined' ? window.location.search : '';
        const redirectTarget = `${pathname}${queryString ? `?${queryString}` : ''}`;
        router.replace(`/account/billing?gated=1&redirect=${encodeURIComponent(redirectTarget)}`);
    }, [billing, loading, pathname, router, user]);

    if (!loading && user && billing?.requiresSubscription && !billing.access && !isPublicPath(pathname)) {
        return (
            <main
                style={{
                    minHeight: '100vh',
                    background: '#0B0B0D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Loader2 className="w-6 h-6 animate-spin" color="#D4AF37" />
            </main>
        );
    }

    return <>{children}</>;
}
