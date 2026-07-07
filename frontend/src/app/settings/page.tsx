'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info, ShieldCheck, FileText, LifeBuoy, ChevronRight, LogOut, UserX, Monitor, History, Flag, CreditCard } from 'lucide-react';
import { ConfirmModal, ShellPage, ShellPageHeader } from '@/components';
import { useSession } from '@/context/SessionContext';

interface IssueAttachment {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
}

interface MenuItem {
    title: string;
    subtitle: string;
    href: string;
    icon: LucideIcon;
    action?: 'report';
}

const menuItems: MenuItem[] = [
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
        title: 'Billing',
        subtitle: 'Manage subscription and renewal',
        href: '/account/billing',
        icon: CreditCard,
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
    const [issueAttachments, setIssueAttachments] = useState<IssueAttachment[]>([]);
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
        <ShellPage width="wide">
            <ShellPageHeader
                eyebrow="Account"
                title="Settings"
                subtitle="Account settings, support tools, library controls, and app information for No Limit Flix."
            />

            <section className="glass-panel utility-panel utility-stack">
                <p className="section-label">Resources</p>
                <div className="utility-list">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const content = (
                            <>
                                <span className="utility-link-card__leading">
                                    <span className="utility-link-card__icon">
                                        <Icon size={20} aria-hidden="true" />
                                    </span>
                                    <span>
                                        <span className="utility-link-card__title">{item.title}</span>
                                        <span className="utility-link-card__subtitle">{item.subtitle}</span>
                                    </span>
                                </span>
                                <ChevronRight size={18} color="#A7ABB4" aria-hidden="true" />
                            </>
                        );

                        if (item.action === 'report') {
                            return (
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => setIssueOpen(true)}
                                    className="utility-link-card"
                                    style={{ textAlign: 'left' }}
                                >
                                    {content}
                                </button>
                            );
                        }

                        return (
                            <Link key={item.title} href={item.href} className="utility-link-card">
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </section>

            {issueOpen ? (
                <div className="utility-sheet">
                    <div className="glass-panel utility-sheet__panel">
                        <div className="utility-sheet__header">
                            <h2>Report an Issue</h2>
                            <button
                                type="button"
                                onClick={() => setIssueOpen(false)}
                                className="utility-icon-button"
                                aria-label="Close issue report"
                            >
                                ×
                            </button>
                        </div>
                        <div className="utility-stack">
                            <label className="utility-field">
                                <span className="utility-label">Issue details</span>
                                <textarea
                                    value={issueText}
                                    onChange={(e) => setIssueText(e.target.value)}
                                    placeholder="Describe the issue..."
                                    className="utility-textarea"
                                    style={{ minHeight: '120px' }}
                                />
                            </label>

                            <div className="utility-field">
                                <span className="utility-label">Attachment (up to 3)</span>
                                <input type="file" accept="*/*" multiple onChange={(e) => handleIssueFiles(e.target.files)} />
                                <p className="utility-field__hint">
                                    Max {Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file · {issueAttachments.length}/{MAX_FILES} attached
                                </p>
                                <div className="utility-media-row">
                                    {issueAttachments.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="utility-card"
                                            style={{
                                                width: '90px',
                                                height: '90px',
                                                padding: 0,
                                                overflow: 'hidden',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ color: '#A7ABB4', fontSize: '0.65rem', textAlign: 'center', padding: '0 6px' }}>{file.name}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className="utility-field">
                                <span className="utility-label">Name (optional)</span>
                                <input
                                    value={issueName}
                                    onChange={(e) => setIssueName(e.target.value)}
                                    placeholder="Your name"
                                    className="utility-input"
                                />
                            </label>

                            <label className="utility-field">
                                <span className="utility-label">Email (optional)</span>
                                <input
                                    value={issueEmail}
                                    onChange={(e) => setIssueEmail(e.target.value)}
                                    placeholder="name@email.com"
                                    className="utility-input"
                                />
                            </label>

                            <button
                                type="button"
                                onClick={handleSubmitIssue}
                                disabled={issueSubmitting || !issueText.trim()}
                                className="utility-button"
                                style={{ opacity: issueSubmitting ? 0.7 : 1 }}
                            >
                                {issueSubmitting ? 'Submitting...' : 'Submit issue'}
                            </button>
                            {issueError ? <div style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{issueError}</div> : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {user ? (
                <section className="glass-panel utility-panel utility-stack">
                    <p className="section-label">Account</p>
                    <div className="utility-card utility-media-row" style={{ justifyContent: 'space-between' }}>
                        <div>
                            <p className="utility-title">Welcome screen on login</p>
                            <p className="utility-muted">Show the greeting screen after you sign in.</p>
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
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: showWelcomeScreen ? '26px' : '4px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: showWelcomeScreen ? '#D4AF37' : '#A7ABB4',
                                    transition: 'left 0.2s ease',
                                }}
                            />
                        </button>
                    </div>

                    <button type="button" onClick={() => setShowLogoutConfirm(true)} className="utility-danger-button">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                            <LogOut size={18} />
                            Log out
                        </span>
                    </button>
                </section>
            ) : null}

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

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#A7ABB4', opacity: 0.7 }}>
                        © {currentYear} No Limit Flix. All cinematic rights reserved.
                </p>
                <p
                    style={{
                        fontSize: '0.65rem',
                        color: '#D4AF37',
                        marginTop: '0.5rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        opacity: 0.6,
                    }}
                >
                        Hosted Library & Personalized Discovery
                </p>
            </div>
        </ShellPage>
    );
}
