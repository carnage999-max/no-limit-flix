'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        <div style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ color: '#A7ABB4' }}>Redirecting...</div>
        </div>
    );
}
