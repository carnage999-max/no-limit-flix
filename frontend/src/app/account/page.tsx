'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShellPage } from '@/components';
import { useSession } from '@/context/SessionContext';

export default function AccountPage() {
    const router = useRouter();
    const { user, loading } = useSession();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/auth?redirect=/account/favorites');
            return;
        }
        router.push('/account/favorites');
    }, [router, user, loading]);

    return (
        <ShellPage width="narrow">
            <div className="glass-panel status-panel">
                <p className="section-label">Account</p>
                <p className="status-panel__message">Redirecting...</p>
            </div>
        </ShellPage>
    );
}
