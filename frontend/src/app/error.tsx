'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            color: '#F3F4F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div style={{
                maxWidth: '520px',
                width: '100%',
                background: 'rgba(11, 11, 13, 0.9)',
                borderRadius: '20px',
                border: '1px solid rgba(167, 171, 180, 0.12)',
                padding: '2rem',
                textAlign: 'center',
                boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            }}>
                <div style={{
                    width: '56px',
                    height: '56px',
                    margin: '0 auto 1rem',
                    borderRadius: '16px',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FCA5A5',
                }}>
                    <AlertTriangle size={22} />
                </div>
                <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
                <p style={{ color: '#A7ABB4', marginBottom: '1.5rem' }}>
                    We hit a snag while loading this page. Try again or head back home.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.7rem 1.1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            background: 'rgba(212, 175, 55, 0.15)',
                            color: '#D4AF37',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        <RefreshCcw size={16} />
                        Try again
                    </button>
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.7rem 1.1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(167, 171, 180, 0.3)',
                            background: 'rgba(167, 171, 180, 0.08)',
                            color: '#F3F4F6',
                            textDecoration: 'none',
                            fontWeight: 600,
                        }}
                    >
                        <Home size={16} />
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}
