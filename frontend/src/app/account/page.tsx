'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to auth page
        router.push('/auth');
    }, [router]);

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
