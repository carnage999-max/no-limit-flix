'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Info, ShieldCheck, FileText, ChevronRight, LogOut, UserX, Monitor, History } from 'lucide-react';
import { ConfirmModal } from '@/components';
import { useSession } from '@/context/SessionContext';

const menuItems = [
    {
        title: 'About No Limit Flix',
        subtitle: 'Learn about the platform',
        href: '/about',
        icon: Info,
    },
    {
        title: 'Privacy Policy',
        subtitle: 'How we handle your data',
        href: '/privacy',
        icon: ShieldCheck,
    },
    {
        title: 'Terms of Service',
        subtitle: 'Rules, rights, and responsibilities',
        href: '/terms',
        icon: FileText,
    },
    {
        title: 'Delete Account',
        subtitle: 'Request account deletion',
        href: '/delete-account',
        icon: UserX,
    },
    {
        title: 'Devices',
        subtitle: 'Manage where you are signed in',
        href: '/devices',
        icon: Monitor,
    },
    {
        title: 'Watch History',
        subtitle: 'See what you watched across devices',
        href: '/watch-history',
        icon: History,
    },
];

export default function SettingsPage() {
    const currentYear = new Date().getFullYear();
    const { user } = useSession();
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

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '96px',
            paddingBottom: '120px',
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 2rem',
            }}>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                    fontWeight: 700,
                    color: '#F3F4F6',
                    marginBottom: '1.5rem',
                }}>
                    Settings
                </h1>

                <div style={{ marginBottom: '2.5rem' }}>
                    <p style={{
                        color: '#A7ABB4',
                        fontSize: '1rem',
                        maxWidth: '520px',
                    }}>
                        Account settings and app information for No Limit Flix.
                    </p>
                </div>

                <section style={{
                    background: 'rgba(11, 11, 13, 0.9)',
                    borderRadius: '20px',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    padding: '1.5rem',
                }}>
                    <h2 style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: '#A7ABB4',
                        marginBottom: '1rem',
                    }}>
                        Resources
                    </h2>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1rem 1.25rem',
                                        borderRadius: '14px',
                                        border: '1px solid rgba(167, 171, 180, 0.08)',
                                        background: 'rgba(167, 171, 180, 0.04)',
                                        textDecoration: 'none',
                                        color: '#F3F4F6',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                                        e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.08)';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.04)';
                                    }}
                                >
                                    <span style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(212, 175, 55, 0.1)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        color: '#D4AF37',
                                    }}>
                                        <Icon size={20} aria-hidden="true" />
                                    </span>
                                    <span style={{ flex: 1 }}>
                                        <span style={{
                                            display: 'block',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            color: '#F3F4F6',
                                        }}>
                                            {item.title}
                                        </span>
                                        <span style={{
                                            display: 'block',
                                            fontSize: '0.85rem',
                                            color: '#A7ABB4',
                                            marginTop: '0.15rem',
                                        }}>
                                            {item.subtitle}
                                        </span>
                                    </span>
                                    <ChevronRight size={18} color="#A7ABB4" aria-hidden="true" />
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {user && (
                    <section style={{
                        marginTop: '2rem',
                        background: 'rgba(11, 11, 13, 0.9)',
                        borderRadius: '20px',
                        border: '1px solid rgba(167, 171, 180, 0.1)',
                        padding: '1.5rem',
                    }}>
                        <h2 style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: '#A7ABB4',
                            marginBottom: '1rem',
                        }}>
                            Account
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowLogoutConfirm(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.9rem 1.25rem',
                                borderRadius: '14px',
                                border: '1px solid rgba(248, 113, 113, 0.35)',
                                background: 'rgba(248, 113, 113, 0.08)',
                                color: '#FCA5A5',
                                width: '100%',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            <LogOut size={18} />
                            Log out
                        </button>
                    </section>
                )}

                <ConfirmModal
                    open={showLogoutConfirm}
                    title="Log out of No Limit Flix?"
                    description="You can sign back in anytime to continue watching."
                    confirmLabel="Log out"
                    cancelLabel="Cancel"
                    tone="danger"
                    onCancel={() => setShowLogoutConfirm(false)}
                    onConfirm={async () => {
                        setShowLogoutConfirm(false);
                        await handleLogout();
                    }}
                />

                <div style={{
                    marginTop: '2.5rem',
                    textAlign: 'center',
                }}>
                    <p style={{
                        fontSize: '0.75rem',
                        color: '#A7ABB4',
                        opacity: 0.7,
                    }}>
                        © {currentYear} No Limit Flix. All cinematic rights reserved.
                    </p>
                    <p style={{
                        fontSize: '0.65rem',
                        color: '#D4AF37',
                        marginTop: '0.5rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        opacity: 0.6,
                    }}>
                        Hosted Library & Personalized Discovery
                    </p>
                </div>
            </div>
        </main>
    );
}
