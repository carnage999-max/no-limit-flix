'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Image as ImageIcon } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading, refresh } = useSession();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatar, setAvatar] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setStatus(null);
        try {
            const res = await fetch('/api/account/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, avatar })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to update profile');
            }
            await refresh();
            setStatus('Profile updated');
        } catch (error: any) {
            setStatus(error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
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

                    <label style={{ display: 'grid', gap: '0.5rem', color: '#A7ABB4' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Avatar URL</span>
                        <div style={{ position: 'relative' }}>
                            <ImageIcon size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#A7ABB4' }} />
                            <input
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
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

                    {avatar && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <img
                                src={avatar}
                                alt="Profile avatar"
                                style={{ width: 64, height: 64, borderRadius: '16px', objectFit: 'cover' }}
                            />
                            <span style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Preview</span>
                        </div>
                    )}

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

                    {status && (
                        <p style={{ color: '#A7ABB4', fontSize: '0.9rem' }}>{status}</p>
                    )}
                </div>
            </div>
        </main>
    );
}
