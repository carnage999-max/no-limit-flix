'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const isHome = pathname === '/';

    return (
        <header
            style={{
                padding: '1rem 2rem',
                position: 'sticky',
                top: 0,
                background: 'rgba(11, 11, 13, 0.9)',
                backdropFilter: 'blur(12px)',
                zIndex: 100,
                borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            <Link
                href="/"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    textDecoration: 'none'
                }}
            >
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)'
                }}>
                    <img
                        src="/no-limit-flix-logo.png"
                        alt="Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <span style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em'
                }}>
                    No Limit Flix
                </span>
            </Link>

            {!isHome && (
                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#A7ABB4',
                        textDecoration: 'none',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#A7ABB4';
                    }}
                >
                    ← Back to Discovery
                </Link>
            )}
        </header>
    );
}
