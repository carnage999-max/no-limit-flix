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
    // The 3D store is a full-bleed immersive view with its own top bar and navigation —
    // the regular nav would just double up and eat into its canvas.
    const isImmersiveStore = pathname.startsWith('/3d');

    if (shouldHideChrome) {
        return (
            <SubscriptionGate>
                {isBillingPage ? children : null}
            </SubscriptionGate>
        );
    }

    if (isImmersiveStore) {
        return <SubscriptionGate>{children}</SubscriptionGate>;
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
