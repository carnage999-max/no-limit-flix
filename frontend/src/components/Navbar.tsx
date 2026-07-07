'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import { ConfirmModal } from '@/components';
import { BarChart3, LogIn, ArrowLeft, User, Settings, Bookmark, CreditCard, LogOut } from 'lucide-react';

const menuLinkStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.72rem 0.8rem',
    borderRadius: '0.9rem',
    textDecoration: 'none',
    color: '#F7F4EE',
};

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
        <>
            <header className="app-topbar">
                <div className="app-topbar__brand">
                    <Link href="/" className="app-brandmark" aria-label="No Limit Flix home">
                        <img src="/no-limit-flix-logo.png" alt="No Limit Flix" />
                    </Link>
                </div>

                {isHome ? (
                    <div className="app-topbar__center-spacer" />
                ) : (
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textDecoration: 'none',
                            color: '#B5AFBD',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                        }}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Discovery
                    </Link>
                )}

                <div className="app-topbar__actions">
                    {userRole === 'admin' ? (
                        <Link
                            href="/account/dashboard"
                            className="app-topbar__icon-button"
                            aria-label="Analytics dashboard"
                            title="Analytics"
                        >
                            <BarChart3 size={18} />
                        </Link>
                    ) : null}

                    {userRole ? (
                        <div
                            className="profile-menu"
                            style={{ position: 'relative' }}
                            onMouseEnter={() => setMenuHover(true)}
                            onMouseLeave={() => setMenuHover(false)}
                        >
                            <button
                                type="button"
                                onClick={() => setMenuOpen((prev) => !prev)}
                                className="app-topbar__avatar-button"
                                title="Profile"
                            >
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.username || 'Profile'}
                                        className="app-topbar__avatar-image"
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null;
                                            target.src = '/avatar-placeholder.svg';
                                        }}
                                    />
                                ) : (
                                    <span className="app-topbar__avatar-fallback">
                                        {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </button>

                            {(menuOpen || menuHover) ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: 'calc(100% + 0.8rem)',
                                        minWidth: '250px',
                                        background: 'rgba(10, 10, 16, 0.98)',
                                        border: '1px solid rgba(255, 214, 122, 0.12)',
                                        borderRadius: '1.1rem',
                                        boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
                                        padding: '0.55rem',
                                        zIndex: 200,
                                        backdropFilter: 'blur(18px)',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem 0.8rem',
                                            borderRadius: '0.9rem',
                                            border: '1px solid rgba(255, 214, 122, 0.1)',
                                            background: 'rgba(20, 20, 28, 0.76)',
                                            color: '#F7F4EE',
                                            marginBottom: '0.4rem',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '999px',
                                                overflow: 'hidden',
                                                background: 'rgba(255, 214, 122, 0.08)',
                                                border: '1px solid rgba(255, 214, 122, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#FFD26F',
                                                flex: '0 0 auto',
                                            }}
                                        >
                                            {user?.avatar ? (
                                                <img
                                                    src={user.avatar}
                                                    alt={user.username || 'Profile'}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        target.onerror = null;
                                                        target.src = '/avatar-placeholder.svg';
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                                    {(user?.username || user?.email || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.1rem' }}>
                                            <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{user?.username || 'User'}</span>
                                            <span style={{ fontSize: '0.76rem', color: '#B5AFBD' }}>{user?.email}</span>
                                        </div>
                                    </div>
                                    <Link href="/account/favorites" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
                                        <Bookmark size={16} />
                                        Favorites
                                    </Link>
                                    <Link href="/profile" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
                                        <User size={16} />
                                        Profile
                                    </Link>
                                    <Link href="/account/billing" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
                                        <CreditCard size={16} />
                                        Billing
                                    </Link>
                                    <Link href="/settings" style={menuLinkStyle} onClick={() => setMenuOpen(false)}>
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
                                            ...menuLinkStyle,
                                            border: 'none',
                                            width: '100%',
                                            textAlign: 'left',
                                            background: 'rgba(255, 115, 128, 0.08)',
                                            color: '#FFB3BB',
                                            marginTop: '0.25rem',
                                        }}
                                    >
                                        <LogOut size={16} />
                                        Log out
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : !loading ? (
                        <Link href="/auth" className="app-topbar__icon-button" aria-label="Sign in">
                            <LogIn size={18} />
                        </Link>
                    ) : null}
                </div>
            </header>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                title="Log out?"
                message="You’ll need to sign back in to access your account."
                confirmText="Log out"
                cancelText="Cancel"
                confirmVariant="danger"
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </>
    );
}
