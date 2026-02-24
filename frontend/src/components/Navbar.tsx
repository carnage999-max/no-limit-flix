'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart3, Heart, LogIn } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const isHome = pathname === '/';
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Get user role and ID from localStorage
        const storedUser = localStorage.getItem('user');
        const storedUserId = localStorage.getItem('userId');
        if (storedUser && storedUserId) {
            try {
                const userData = JSON.parse(storedUser);
                setUserRole(userData.role || 'user');
                setUserId(storedUserId);
            } catch (err) {
                console.error('Failed to parse user:', err);
                setUserRole(null);
                setUserId(null);
            }
        } else {
            setUserRole(null);
            setUserId(null);
        }
    }, [pathname, router]);

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

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                {userRole === 'admin' && (
                    <Link
                        href="/account/dashboard"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            color: '#D4AF37',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                        }}
                    >
                        <BarChart3 size={18} />
                        Analytics
                    </Link>
                )}
                {userRole && (
                    <Link
                        href="/account/favorites"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '40px',
                            height: '40px',
                            borderRadius: '0.5rem',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.2)',
                            color: '#D4AF37',
                            textDecoration: 'none',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                        }}
                        title="Favorites"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                        }}
                    >
                        <Heart size={18} />
                    </Link>
                )}
                {!userId && (
                    <Link
                        href="/auth"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                            border: 'none',
                            color: '#0B0B0D',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 10px 20px rgba(212, 175, 55, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <LogIn size={18} />
                        Sign In
                    </Link>
                )}
            </div>
        </header>
    );
}
