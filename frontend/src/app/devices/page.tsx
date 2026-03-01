'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Smartphone, LogOut, RefreshCcw } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/components/Toast';

interface DeviceSession {
    id: string;
    sessionId: string;
    userAgent?: string | null;
    ipAddress?: string | null;
    createdAt: string;
    lastUsedAt: string;
    isCurrent: boolean;
    device?: {
        browser: string;
        os: string;
        deviceType: string;
        deviceLabel: string;
    };
    location?: {
        city?: string | null;
        region?: string | null;
        country?: string | null;
    } | null;
}

const getDeviceLabel = (session: DeviceSession) => {
    if (session.device?.deviceLabel) return session.device.deviceLabel;
    return 'Unknown device';
};

const getDeviceIcon = (session: DeviceSession) => {
    const type = session.device?.deviceType?.toLowerCase() || '';
    if (type === 'mobile' || type === 'tablet') return Smartphone;
    return Monitor;
};

const formatLocation = (session: DeviceSession) => {
    const parts = [session.location?.city, session.location?.region, session.location?.country].filter(Boolean);
    if (parts.length) return parts.join(', ');
    if (session.ipAddress) return `IP ${session.ipAddress}`;
    return 'Location unavailable';
};

export default function DevicesPage() {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSession();
    const { showToast } = useToast();
    const [sessions, setSessions] = useState<DeviceSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [loggingOutAll, setLoggingOutAll] = useState(false);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/account/sessions');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to fetch devices');
            }
            setSessions(data.sessions || []);
        } catch (error: any) {
            showToast(error.message || 'Failed to fetch devices', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth?redirect=/devices');
            return;
        }
        fetchSessions();
    }, [user, sessionLoading]);

    const handleLogoutAll = async () => {
        setLoggingOutAll(true);
        try {
            const response = await fetch('/api/account/sessions', { method: 'POST' });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to log out all devices');
            }
            showToast('Logged out of all devices', 'success');
            window.location.href = '/auth';
        } catch (error: any) {
            showToast(error.message || 'Failed to log out all devices', 'error');
        } finally {
            setLoggingOutAll(false);
        }
    };

    const handleLogoutSession = async (sessionId: string) => {
        try {
            const response = await fetch('/api/account/sessions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to log out device');
            }
            showToast('Device logged out', 'success');
            if (data?.loggedOutCurrent) {
                window.location.href = '/auth';
                return;
            }
            setSessions((prev) => prev.filter((session) => session.sessionId !== sessionId));
        } catch (error: any) {
            showToast(error.message || 'Failed to log out device', 'error');
        }
    };

    if (sessionLoading) return null;

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '96px', paddingBottom: '140px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#F3F4F6', marginBottom: '0.5rem' }}>
                            Devices
                        </h1>
                        <p style={{ color: '#A7ABB4' }}>See where you&apos;re signed in.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={fetchSessions}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                background: 'rgba(167, 171, 180, 0.08)',
                                color: '#F3F4F6',
                                cursor: 'pointer',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <RefreshCcw size={16} />
                            Refresh
                        </button>
                        <button
                            type="button"
                            onClick={handleLogoutAll}
                            disabled={loggingOutAll}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(244, 63, 94, 0.4)',
                                background: 'rgba(244, 63, 94, 0.12)',
                                color: '#FCA5A5',
                                cursor: loggingOutAll ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: loggingOutAll ? 0.7 : 1,
                            }}
                        >
                            <LogOut size={16} />
                            Log out all devices
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
                    {loading ? (
                        <div style={{ color: '#A7ABB4', padding: '2rem', textAlign: 'center' }}>
                            Loading devices...
                        </div>
                    ) : sessions.length === 0 ? (
                        <div style={{ color: '#A7ABB4', padding: '2rem', textAlign: 'center' }}>
                            No active devices found.
                        </div>
                    ) : (
                        sessions.map((session) => {
                            const Icon = getDeviceIcon(session);
                            return (
                                <div
                                    key={session.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '16px',
                                        background: 'rgba(11, 11, 13, 0.9)',
                                        border: '1px solid rgba(167, 171, 180, 0.12)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        flexWrap: 'wrap'
                                    }}
                                >
                                    <div style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '16px',
                                        background: session.isCurrent ? 'rgba(212, 175, 55, 0.18)' : 'rgba(167, 171, 180, 0.08)',
                                        border: session.isCurrent ? '1px solid rgba(212, 175, 55, 0.4)' : '1px solid rgba(167, 171, 180, 0.2)',
                                        color: session.isCurrent ? '#D4AF37' : '#A7ABB4',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '220px' }}>
                                        <div style={{ fontWeight: 700, color: '#F3F4F6' }}>
                                            {getDeviceLabel(session)}
                                            {session.isCurrent && (
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            {session.device?.deviceType || 'Device'} · {session.device?.os || 'OS'} · {session.device?.browser || 'Browser'}
                                        </div>
                                        <div style={{ color: '#8C9099', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                            {formatLocation(session)}
                                        </div>
                                        <div style={{ color: '#8C9099', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                            Last active {new Date(session.lastUsedAt).toLocaleString()} {session.ipAddress ? `· ${session.ipAddress}` : ''}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleLogoutSession(session.sessionId)}
                                        style={{
                                            padding: '0.55rem 0.9rem',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(244, 63, 94, 0.35)',
                                            background: 'rgba(244, 63, 94, 0.12)',
                                            color: '#FCA5A5',
                                            cursor: 'pointer',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Log out this device
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </main>
    );
}
