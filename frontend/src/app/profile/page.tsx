'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Mail, Image as ImageIcon, Monitor, History, Trash2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/components/Toast';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading, refresh } = useSession();
    const { showToast } = useToast();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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
        } catch (error: any) {
            showToast(error.message || 'Failed to update profile', 'error');
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
        } catch (error: any) {
            showToast(error.message || 'Failed to upload avatar', 'error');
        } finally {
            setUploading(false);
        }
    };

    if (loading || !user) return null;

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '96px',
            paddingBottom: '140px',
        }}>
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 2rem' }}>
                <h1 style={{
                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                    fontWeight: 700,
                    color: '#F3F4F6',
                    marginBottom: '1.5rem',
                }}>
                    Profile
                </h1>

                <div style={{
                    background: 'rgba(11, 11, 13, 0.9)',
                    borderRadius: '20px',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    padding: '1.5rem',
                    display: 'grid',
                    gap: '1.25rem',
                }}>
                    <label style={{ display: 'grid', gap: '0.5rem', color: '#A7ABB4' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Username</span>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#A7ABB4' }} />
                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.2)',
                                    color: '#F3F4F6',
                                }}
                            />
                        </div>
                    </label>

                    <label style={{ display: 'grid', gap: '0.5rem', color: '#A7ABB4' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Email</span>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#A7ABB4' }} />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.2)',
                                    color: '#F3F4F6',
                                }}
                            />
                        </div>
                    </label>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A7ABB4' }}>Profile Photo</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <img
                                src={avatar || '/avatar-placeholder.svg'}
                                alt="Profile avatar"
                                style={{ width: 72, height: 72, borderRadius: '18px', objectFit: 'cover', border: '1px solid rgba(167, 171, 180, 0.2)' }}
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    target.onerror = null;
                                    target.src = '/avatar-placeholder.svg';
                                }}
                            />
                            <label
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(212, 175, 55, 0.35)',
                                    background: 'rgba(212, 175, 55, 0.12)',
                                    color: '#D4AF37',
                                    fontWeight: 600,
                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <ImageIcon size={16} />
                                {uploading ? 'Uploading...' : 'Upload Photo'}
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
                            <span style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>
                                JPG or PNG. Square images look best.
                            </span>
                            {avatar && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            setAvatar('');
                                            await updateProfile({ avatar: null });
                                            showToast('Profile photo removed', 'success');
                                        } catch (error: any) {
                                            showToast(error.message || 'Failed to remove photo', 'error');
                                        }
                                    }}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.65rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(244, 63, 94, 0.4)',
                                        background: 'rgba(244, 63, 94, 0.12)',
                                        color: '#FCA5A5',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Trash2 size={16} />
                                    Remove photo
                                </button>
                            )}
                        </div>

                        <p style={{ color: '#A7ABB4', fontSize: '0.85rem', margin: 0 }}>
                            Upload replaces your current photo instantly.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '0.85rem 1.25rem',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                            border: 'none',
                            color: '#0B0B0D',
                            fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                        }}
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <div style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(167, 171, 180, 0.1)',
                        display: 'grid',
                        gap: '0.75rem'
                    }}>
                        <Link
                            href="/devices"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(167, 171, 180, 0.12)',
                                background: 'rgba(167, 171, 180, 0.04)',
                                color: '#F3F4F6',
                                textDecoration: 'none',
                            }}
                        >
                            <Monitor size={18} />
                            Manage Devices
                        </Link>
                        <Link
                            href="/watch-history"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(167, 171, 180, 0.12)',
                                background: 'rgba(167, 171, 180, 0.04)',
                                color: '#F3F4F6',
                                textDecoration: 'none',
                            }}
                        >
                            <History size={18} />
                            Watch History
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
