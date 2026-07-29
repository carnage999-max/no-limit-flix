'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AdminFloatingButton, Navbar, MobileTabBar } from '@/components';
import { useSession } from '@/context/SessionContext';
import SubscriptionGate from '@/components/SubscriptionGate';

export default function AppFrame({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/';
    const { user, billing, loading } = useSession();

    const shouldHideChrome = !loading && Boolean(user) && billing?.requiresSubscription && !billing.access;
    const isBillingPage = pathname === '/account/billing';
    const showAdminButton = !loading && user?.role === 'admin' && !pathname.startsWith('/admin');

    if (shouldHideChrome) {
        return (
            <SubscriptionGate>
                {isBillingPage ? children : null}
            </SubscriptionGate>
        );
    }

    return (
        <SubscriptionGate>
            <Navbar />
            {children}
            {showAdminButton ? <AdminFloatingButton /> : null}
            <Suspense fallback={null}>
                <MobileTabBar />
            </Suspense>
        </SubscriptionGate>
    );
}
