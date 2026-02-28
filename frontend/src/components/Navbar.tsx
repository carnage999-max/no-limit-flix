'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { ConfirmModal } from '@/components';
import { BarChart3, LogIn, ArrowLeft, User, Settings, Bookmark, LogOut } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const isHome = pathname === '/';
    const { user, loading } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuHover, setMenuHover] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const handleLogout = async () => {
        try {
            await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            });
        } finally {
            window.location.href = '/auth';
        }
    };

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (!target.closest('.profile-menu')) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);
    const userRole = user?.role || null;

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
                    <ArrowLeft className="w-4 h-4" />
                    Back to Discovery
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
                    <div
                        className="profile-menu"
                        style={{ position: 'relative' }}
                        onMouseEnter={() => setMenuHover(true)}
                        onMouseLeave={() => setMenuHover(false)}
                    >
                        <button
                            type="button"
                            onClick={() => setMenuOpen((prev) => !prev)}
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
                                cursor: 'pointer',
                                padding: 0,
                            }}
                            title="Profile"
                        >
                            {user?.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.username || 'Profile'}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '0.5rem',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <span style={{
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    color: '#D4AF37'
                                }}>
                                    {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </button>
                        {(menuOpen || menuHover) && (
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 'calc(100% + 0.75rem)',
                                    minWidth: '220px',
                                    background: 'rgba(11, 11, 13, 0.98)',
                                    border: '1px solid rgba(167, 171, 180, 0.12)',
                                    borderRadius: '0.75rem',
                                    boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
                                    padding: '0.5rem',
                                    zIndex: 200,
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '0.6rem',
                                        border: '1px solid rgba(167, 171, 180, 0.12)',
                                        background: 'rgba(167, 171, 180, 0.06)',
                                        color: '#F3F4F6',
                                        marginBottom: '0.35rem',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            background: 'rgba(212, 175, 55, 0.12)',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#D4AF37',
                                        }}
                                    >
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.username || 'Profile'}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                                {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gap: '0.1rem' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user?.username || 'User'}</span>
                                        <span style={{ fontSize: '0.75rem', color: '#A7ABB4' }}>{user?.email}</span>
                                    </div>
                                </div>
                                <Link
                                    href="/account/favorites"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '0.6rem',
                                        textDecoration: 'none',
                                        color: '#F3F4F6',
                                    }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <Bookmark size={16} />
                                    Favorites
                                </Link>
                                <Link
                                    href="/profile"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '0.6rem',
                                        textDecoration: 'none',
                                        color: '#F3F4F6',
                                    }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <User size={16} />
                                    Profile
                                </Link>
                                <Link
                                    href="/settings"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '0.6rem',
                                        textDecoration: 'none',
                                        color: '#F3F4F6',
                                    }}
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <Settings size={16} />
                                    Settings
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setShowLogoutConfirm(true);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.65rem 0.75rem',
                                        borderRadius: '0.6rem',
                                        border: 'none',
                                        width: '100%',
                                        textAlign: 'left',
                                        background: 'rgba(244, 63, 94, 0.12)',
                                        color: '#FCA5A5',
                                        cursor: 'pointer',
                                        marginTop: '0.25rem',
                                    }}
                                >
                                    <LogOut size={16} />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {!loading && !user && (
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
            <ConfirmModal
                open={showLogoutConfirm}
                title="Log out of No Limit Flix?"
                description="You will need to sign in again to access your watchlist and account settings."
                confirmLabel="Log out"
                cancelLabel="Cancel"
                tone="danger"
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={async () => {
                    setShowLogoutConfirm(false);
                    await handleLogout();
                }}
            />
        </header>
    );
}
