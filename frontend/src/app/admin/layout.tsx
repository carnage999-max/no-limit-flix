'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/context/SessionContext';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname() || '/admin';
    const { user, loading } = useSession();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push(`/auth?redirect=${encodeURIComponent(pathname)}`);
            return;
        }
        if (user.role !== 'admin') {
            router.push('/');
        }
    }, [loading, pathname, router, user]);

    if (loading || !user || user.role !== 'admin') {
        return null;
    }

    return (
        <div className="relative min-h-screen overflow-x-hidden">
            <div
                className="fixed inset-0 z-[-1] pointer-events-none"
                style={{
                    background:
                        'linear-gradient(180deg, rgba(11, 11, 13, 0.98) 0%, rgba(5, 6, 8, 1) 100%)',
                }}
            />
            <div className="container-custom py-10 md:py-16">
                {children}
            </div>
        </div>
    );
}
