'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Info, ShieldCheck, FileText, LifeBuoy, ChevronRight, LogOut, UserX, Monitor, History, Flag } from 'lucide-react';
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
        title: 'Support',
        subtitle: 'Get help with app or account issues',
        href: '/support',
        icon: LifeBuoy,
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
    {
        title: 'Report an Issue',
        subtitle: 'Tell us what went wrong',
        href: '',
        icon: Flag,
        action: 'report',
    },
];

export default function SettingsPage() {
    const currentYear = new Date().getFullYear();
    const { user } = useSession();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showWelcomeScreen, setShowWelcomeScreen] = useState<boolean | null>(null);
    const [savingWelcome, setSavingWelcome] = useState(false);
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueText, setIssueText] = useState('');
    const [issueName, setIssueName] = useState('');
    const [issueEmail, setIssueEmail] = useState('');
    const [issueAttachments, setIssueAttachments] = useState<Array<{ name: string; type: string; size: number; dataUrl: string }>>([]);
    const [issueSubmitting, setIssueSubmitting] = useState(false);
    const [issueError, setIssueError] = useState('');
    const MAX_FILES = 3;
    const MAX_FILE_BYTES = 3 * 1024 * 1024;

    useEffect(() => {
        if (typeof user?.showWelcomeScreen === 'boolean') {
            setShowWelcomeScreen(user.showWelcomeScreen);
        }
    }, [user]);
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

    const handleIssueFiles = async (files: FileList | null) => {
        if (!files) return;
        setIssueError('');
        const incoming = Array.from(files).slice(0, MAX_FILES - issueAttachments.length);
        const oversize = incoming.find((file) => file.size > MAX_FILE_BYTES);
        if (oversize) {
            setIssueError(`"${oversize.name}" is too large. Max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file.`);
            return;
        }
        const mapped = await Promise.all(
            incoming.map((file) => new Promise<{ name: string; type: string; size: number; dataUrl: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    name: file.name,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    dataUrl: typeof reader.result === 'string' ? reader.result : '',
                });
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            }))
        );
        setIssueAttachments((prev) => [...prev, ...mapped].slice(0, 3));
    };

    const handleSubmitIssue = async () => {
        if (!issueText.trim()) {
            setIssueError('Please describe the issue before submitting.');
            return;
        }
        try {
            setIssueSubmitting(true);
            setIssueError('');
            const response = await fetch('/api/issues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    issue: issueText.trim(),
                    name: issueName.trim() || undefined,
                    email: issueEmail.trim() || undefined,
                    attachments: issueAttachments,
                }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data?.error || 'Failed to submit issue');
            }
            setIssueOpen(false);
            setIssueText('');
            setIssueName('');
            setIssueEmail('');
            setIssueAttachments([]);
            setIssueError('');
        } catch (error) {
            setIssueError(error instanceof Error ? error.message : 'Failed to submit issue');
        } finally {
            setIssueSubmitting(false);
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
                            if ((item as any).action === 'report') {
                                return (
                                    <button
                                        key={item.title}
                                        type="button"
                                        onClick={() => setIssueOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '1rem 1.25rem',
                                            borderRadius: '14px',
                                            border: '1px solid rgba(167, 171, 180, 0.08)',
                                            background: 'rgba(167, 171, 180, 0.04)',
                                            color: '#F3F4F6',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s ease',
                                            cursor: 'pointer',
                                            textAlign: 'left',
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
                                    </button>
                                );
                            }
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

                {issueOpen && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 50,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                    }}>
                        <div style={{
                            width: 'min(720px, 100%)',
                            background: '#0F1115',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            padding: '1.5rem',
                            border: '1px solid rgba(167, 171, 180, 0.12)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '1.1rem' }}>Report an Issue</div>
                                <button
                                    type="button"
                                    onClick={() => setIssueOpen(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#A7ABB4',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Issue details</label>
                                    <textarea
                                        value={issueText}
                                        onChange={(e) => setIssueText(e.target.value)}
                                        placeholder="Describe the issue..."
                                    style={{
                                        minHeight: '120px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(167, 171, 180, 0.2)',
                                        background: 'rgba(17, 17, 20, 0.8)',
                                        color: '#F3F4F6',
                                        padding: '0.75rem',
                                    }}
                                />
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Attachment (up to 3)</label>
                                        <input
                                            type="file"
                                            accept="*/*"
                                            multiple
                                            onChange={(e) => handleIssueFiles(e.target.files)}
                                            style={{ color: '#A7ABB4' }}
                                        />
                                        <div style={{ color: '#A7ABB4', fontSize: '0.75rem' }}>
                                            Max {Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file · {issueAttachments.length}/{MAX_FILES} attached
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                            {issueAttachments.map((file, index) => (
                                                <div key={`${file.name}-${index}`} style={{ width: '90px', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(167, 171, 180, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(17,17,20,0.6)' }}>
                                                    {file.type.startsWith('image/') ? (
                                                        <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ color: '#A7ABB4', fontSize: '0.65rem', textAlign: 'center', padding: '0 6px' }}>{file.name}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Name (optional)</label>
                                    <input
                                        value={issueName}
                                        onChange={(e) => setIssueName(e.target.value)}
                                        placeholder="Your name"
                                        style={{
                                            height: '44px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(17, 17, 20, 0.8)',
                                            color: '#F3F4F6',
                                            padding: '0 0.75rem',
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Email (optional)</label>
                                    <input
                                        value={issueEmail}
                                        onChange={(e) => setIssueEmail(e.target.value)}
                                        placeholder="name@email.com"
                                        style={{
                                            height: '44px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(17, 17, 20, 0.8)',
                                            color: '#F3F4F6',
                                            padding: '0 0.75rem',
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubmitIssue}
                                    disabled={issueSubmitting || !issueText.trim()}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.85rem',
                                        borderRadius: '12px',
                                        background: issueSubmitting ? 'rgba(212,175,55,0.4)' : '#D4AF37',
                                        color: '#0B0B0D',
                                        fontWeight: 700,
                                        border: 'none',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {issueSubmitting ? 'Submitting...' : 'Submit issue'}
                                </button>
                                {issueError ? (
                                    <div style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{issueError}</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

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
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            padding: '1rem 1.25rem',
                            borderRadius: '14px',
                            border: '1px solid rgba(167, 171, 180, 0.08)',
                            background: 'rgba(167, 171, 180, 0.04)',
                            marginBottom: '1rem',
                        }}>
                            <div>
                                <div style={{ color: '#F3F4F6', fontWeight: 600 }}>Welcome screen on login</div>
                                <div style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    Show the greeting screen after you sign in
                                </div>
                            </div>
                            <button
                                type="button"
                                disabled={savingWelcome || showWelcomeScreen === null}
                                onClick={async () => {
                                    if (showWelcomeScreen === null) return;
                                    const nextValue = !showWelcomeScreen;
                                    setShowWelcomeScreen(nextValue);
                                    setSavingWelcome(true);
                                    try {
                                        const res = await fetch('/api/account/profile', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ showWelcomeScreen: nextValue })
                                        });
                                        if (!res.ok) {
                                            setShowWelcomeScreen(!nextValue);
                                        }
                                    } finally {
                                        setSavingWelcome(false);
                                    }
                                }}
                                style={{
                                    width: '54px',
                                    height: '32px',
                                    borderRadius: '999px',
                                    border: '1px solid rgba(212, 175, 55, 0.4)',
                                    background: showWelcomeScreen ? 'rgba(212, 175, 55, 0.25)' : 'rgba(167, 171, 180, 0.15)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                }}
                                aria-pressed={Boolean(showWelcomeScreen)}
                                aria-label="Toggle welcome screen"
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: showWelcomeScreen ? '26px' : '4px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: showWelcomeScreen ? '#D4AF37' : '#A7ABB4',
                                    transition: 'left 0.2s ease',
                                }} />
                            </button>
                        </div>
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
