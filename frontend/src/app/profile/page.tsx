'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Image as ImageIcon, Monitor, History, Trash2 } from 'lucide-react';
import { ShellPage, ShellPageHeader } from '@/components';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface GoogleCredentialResponse {
    credential?: string;
}

interface GoogleIdentityApi {
    initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (element: HTMLElement, options: {
        theme: string;
        size: string;
        text: string;
        shape: string;
        logo_alignment: string;
        width: number;
    }) => void;
}

declare global {
    interface Window {
        google?: {
            accounts?: {
                id?: GoogleIdentityApi;
            };
        };
    }
}

const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
};

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading, refresh } = useSession();
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [googleReady, setGoogleReady] = useState(false);
    const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
    const googleButtonRef = useRef<HTMLDivElement | null>(null);
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.push('/auth?redirect=/profile');
            return;
        }
        setUsername(user.username || '');
        setEmail(user.email || '');
        setAvatar(user.avatar || '');
    }, [user, loading, router]);

    const handleGoogleCredential = useCallback(async (credential: string) => {
        if (!credential) return;
        try {
            const res = await fetch('/api/account/link-google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: credential })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to link Google account');
            }
            showToast('Google account linked', 'success');
            await refresh();
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Failed to link Google account'), 'error');
        }
    }, [refresh, showToast]);

    useEffect(() => {
        if (!googleClientId) return;
        if (typeof window === 'undefined') return;
        if (window.google?.accounts?.id) {
            setGoogleReady(true);
            return;
        }
        const existing = document.querySelector('script[data-google-identity]');
        if (existing) {
            existing.addEventListener('load', () => setGoogleReady(true), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        script.onload = () => setGoogleReady(true);
        script.onerror = () => showToast('Google sign-in unavailable right now.', 'error');
        document.body.appendChild(script);
    }, [googleClientId, showToast]);

    useEffect(() => {
        if (!googleReady || !googleClientId || !googleButtonRef.current) return;
        if (!window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: (response: GoogleCredentialResponse) => handleGoogleCredential(response?.credential || ''),
        });
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 320,
        });
    }, [googleReady, googleClientId, handleGoogleCredential]);

    const updateProfile = async (payload: { username?: string; email?: string; avatar?: string | null }) => {
        const res = await fetch('/api/account/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || 'Failed to update profile');
        }
        await refresh();
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateProfile({ username, email, avatar });
            showToast('Profile updated', 'success');
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Failed to update profile'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (file: File) => {
        if (!user) return;
        setUploading(true);
        try {
            const response = await fetch('/api/account/avatar-presigned-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, fileType: file.type })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to prepare upload');
            }

            const uploadRes = await fetch(data.presignedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': file.type },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error('Upload failed');
            }

            setAvatar(data.publicUrl);
            await updateProfile({ avatar: data.publicUrl });
            showToast('Profile updated', 'success');
        } catch (error: unknown) {
            showToast(getErrorMessage(error, 'Failed to upload avatar'), 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading || !user) return null;

    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="Account"
                title="Profile"
                subtitle="Update your account details, photo, and connected sign-in methods."
                actions={(
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="utility-button"
                        style={{ opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            />

            <div className="glass-panel utility-panel utility-stack">
                <label className="utility-field">
                    <span className="utility-label">Username</span>
                    <div className="utility-field__control">
                        <User size={16} className="utility-field__icon" />
                        <input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="utility-input"
                        />
                    </div>
                </label>

                <label className="utility-field">
                    <span className="utility-label">Email</span>
                    <div className="utility-field__control">
                        <Mail size={16} className="utility-field__icon" />
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="utility-input"
                        />
                    </div>
                </label>

                <div className="utility-field">
                    <span className="utility-label">Profile Photo</span>
                    <div className="utility-media-row">
                        <img
                            src={avatar || '/avatar-placeholder.svg'}
                            alt="Profile avatar"
                            className="utility-avatar"
                            onError={(e) => {
                                const target = e.currentTarget;
                                target.onerror = null;
                                target.src = '/avatar-placeholder.svg';
                            }}
                        />
                        <label
                            className="utility-button"
                            style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ImageIcon size={16} />
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleAvatarUpload(file);
                                    }
                                }}
                            />
                        </label>
                        {avatar ? (
                            <button
                                type="button"
                                className="utility-danger-button"
                                onClick={async () => {
                                    try {
                                        setAvatar('');
                                        await updateProfile({ avatar: null });
                                        showToast('Profile photo removed', 'success');
                                    } catch (error: unknown) {
                                        showToast(getErrorMessage(error, 'Failed to remove photo'), 'error');
                                    }
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Trash2 size={16} />
                                    Remove photo
                                </span>
                            </button>
                        ) : null}
                    </div>
                    <p className="utility-field__hint">JPG or PNG. Square images look best.</p>
                    <p className="utility-muted">Upload replaces your current photo instantly.</p>
                </div>

                <div className="utility-divider utility-stack">
                    <div className="utility-card utility-stack">
                        <div className="utility-media-row" style={{ justifyContent: 'space-between' }}>
                            <div className="utility-media-row" style={{ gap: '0.75rem' }}>
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <img
                                        src="/Google_logo.png"
                                        alt="Google"
                                        style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                                    />
                                </div>
                                <div>
                                    <p className="utility-title">Linked accounts</p>
                                    <p className="utility-muted">
                                        {user.googleId ? 'Google account connected.' : 'No Google account linked yet.'}
                                    </p>
                                </div>
                            </div>
                            {user.googleId ? <span className="utility-badge utility-badge--success">Connected</span> : null}
                        </div>

                        {!user.googleId && googleClientId ? (
                            <div ref={googleButtonRef} style={{ minHeight: '44px' }} />
                        ) : null}

                        {user.googleId ? (
                            <button
                                type="button"
                                onClick={() => setUnlinkConfirmOpen(true)}
                                className="utility-danger-button"
                                style={{ width: 'fit-content' }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <img
                                        src="/Google_logo.png"
                                        alt="Google"
                                        style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                                    />
                                    Unlink Google
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="utility-divider utility-grid">
                    <Link href="/devices" className="utility-link-card">
                        <span className="utility-link-card__leading">
                            <span className="utility-link-card__icon">
                                <Monitor size={18} />
                            </span>
                            <span>
                                <span className="utility-link-card__title">Manage Devices</span>
                                <span className="utility-link-card__subtitle">Review active sessions and trusted screens.</span>
                            </span>
                        </span>
                    </Link>
                    <Link href="/watch-history" className="utility-link-card">
                        <span className="utility-link-card__leading">
                            <span className="utility-link-card__icon">
                                <History size={18} />
                            </span>
                            <span>
                                <span className="utility-link-card__title">Watch History</span>
                                <span className="utility-link-card__subtitle">See what you watched across devices.</span>
                            </span>
                        </span>
                    </Link>
                </div>
            </div>
            <ConfirmModal
                open={unlinkConfirmOpen}
                title="Unlink Google account"
                description="You will no longer be able to sign in with Google for this account."
                confirmLabel="Unlink"
                tone="danger"
                onCancel={() => setUnlinkConfirmOpen(false)}
                onConfirm={async () => {
                    setUnlinkConfirmOpen(false);
                    try {
                        const res = await fetch('/api/account/unlink-google', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) {
                            throw new Error(data?.error || 'Failed to unlink Google account');
                        }
                        showToast('Google account unlinked', 'success');
                        await refresh();
                    } catch (error: unknown) {
                        showToast(getErrorMessage(error, 'Failed to unlink Google account'), 'error');
                    }
                }}
            />
        </ShellPage>
    );
}
