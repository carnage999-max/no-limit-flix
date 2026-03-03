'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Smartphone, LogOut, RefreshCcw, Pencil } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';

interface DeviceSession {
    id: string;
    sessionId: string;
    deviceId?: string | null;
    deviceName?: string | null;
    deviceNickname?: string | null;
    deviceEmoji?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    createdAt: string;
    lastUsedAt: string;
    isCurrent: boolean;
    isPrimary?: boolean;
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
    if (session.deviceNickname) return session.deviceNickname;
    if (session.deviceName) return session.deviceName;
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
    const [history, setHistory] = useState<DeviceSession[]>([]);
    const [primaryDeviceId, setPrimaryDeviceId] = useState<string | null>(null);
    const [maxDevices, setMaxDevices] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loggingOutAll, setLoggingOutAll] = useState(false);
    const [confirmLogoutAllOpen, setConfirmLogoutAllOpen] = useState(false);
    const [confirmLogoutSession, setConfirmLogoutSession] = useState<DeviceSession | null>(null);
    const [confirmPrimary, setConfirmPrimary] = useState<DeviceSession | null>(null);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);
    const [keepPrimary, setKeepPrimary] = useState(true);
    const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
    const [draftNickname, setDraftNickname] = useState('');
    const [draftEmoji, setDraftEmoji] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const emojiOptions = [
        { label: 'Work', emoji: '💼' },
        { label: 'Home', emoji: '🏠' },
        { label: 'Shop', emoji: '🛍️' },
        { label: 'Church', emoji: '⛪' },
        { label: 'Travel', emoji: '✈️' },
        { label: 'Studio', emoji: '🎬' },
        { label: 'Gym', emoji: '🏋️' },
        { label: 'Cafe', emoji: '☕' },
        { label: 'Gaming', emoji: '🎮' },
    ];

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/account/sessions?includeHistory=1');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to fetch devices');
            }
            setSessions(data.sessions || []);
            setHistory(data.history || []);
            setPrimaryDeviceId(data.primaryDeviceId || null);
            setMaxDevices(typeof data.maxDevices === 'number' ? data.maxDevices : null);
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

    const handleLogoutAll = async (keepPrimaryFlag: boolean) => {
        setLoggingOutAll(true);
        try {
            const response = await fetch('/api/account/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keepPrimary: keepPrimaryFlag })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to log out all devices');
            }
            showToast(keepPrimaryFlag ? 'Logged out other devices' : 'Logged out of all devices', 'success');
            if (data?.loggedOutCurrent) {
                window.location.href = '/auth';
            } else {
                await fetchSessions();
            }
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

    const handleSetPrimary = async (deviceId?: string | null) => {
        if (!deviceId) return;
        try {
            const response = await fetch('/api/account/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, setPrimary: true })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to set primary device');
            }
            setPrimaryDeviceId(deviceId);
            showToast('Primary device updated', 'success');
            await fetchSessions();
        } catch (error: any) {
            showToast(error.message || 'Failed to set primary device', 'error');
        }
    };

    const handleSaveLabel = async (deviceId: string) => {
        try {
            const response = await fetch('/api/account/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    nickname: draftNickname,
                    emoji: draftEmoji,
                })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to update device label');
            }
            showToast('Device label updated', 'success');
            setEditingDeviceId(null);
            await fetchSessions();
        } catch (error: any) {
            showToast(error.message || 'Failed to update device label', 'error');
        }
    };

    const handleClearHistory = async () => {
        try {
            const response = await fetch('/api/account/sessions/history', { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to clear history');
            }
            showToast('Device history cleared', 'success');
            await fetchSessions();
        } catch (error: any) {
            showToast(error.message || 'Failed to clear history', 'error');
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
                        <p style={{ color: '#A7ABB4' }}>
                            See where you&apos;re signed in.
                            {maxDevices ? ` (${sessions.length}/${maxDevices} active)` : ''}
                        </p>
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
                            onClick={() => {
                                setKeepPrimary(true);
                                setConfirmLogoutAllOpen(true);
                            }}
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
                            const label = getDeviceLabel(session);
                            const displayName = session.deviceEmoji ? `${session.deviceEmoji} ${label}` : label;
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
                                            {displayName || session.deviceName}
                                            {session.isCurrent && (
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                                    Current
                                                </span>
                                            )}
                                            {primaryDeviceId && session.deviceId === primaryDeviceId && (
                                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                                    Primary
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
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenMenuId((prev) => prev === session.id ? null : session.id)}
                                            style={{
                                                padding: '0.55rem 0.9rem',
                                                borderRadius: '10px',
                                                border: '1px solid rgba(167, 171, 180, 0.3)',
                                                background: 'rgba(167, 171, 180, 0.08)',
                                                color: '#F3F4F6',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                            }}
                                        >
                                            <Pencil size={14} />
                                            Manage
                                        </button>
                                        {openMenuId === session.id && (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: '110%',
                                                    background: 'rgba(11, 11, 13, 0.98)',
                                                    border: '1px solid rgba(167, 171, 180, 0.2)',
                                                    borderRadius: '12px',
                                                    padding: '0.5rem',
                                                    minWidth: '180px',
                                                    zIndex: 20,
                                                    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                                                    display: 'grid',
                                                    gap: '0.25rem',
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        setEditingDeviceId(session.deviceId || null);
                                                        setDraftNickname(session.deviceNickname || '');
                                                        setDraftEmoji(session.deviceEmoji || '');
                                                    }}
                                                    style={{
                                                        padding: '0.5rem 0.6rem',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#F3F4F6',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Edit label
                                                </button>
                                                {session.deviceId && session.deviceId !== primaryDeviceId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenMenuId(null);
                                                            setConfirmPrimary(session);
                                                        }}
                                                        style={{
                                                            padding: '0.5rem 0.6rem',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#93C5FD',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Set as primary
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        setConfirmLogoutSession(session);
                                                    }}
                                                    style={{
                                                        padding: '0.5rem 0.6rem',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#FCA5A5',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Log out this device
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {history.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowHistory((prev) => !prev)}
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
                                    {showHistory ? 'Hide' : 'View'} device history
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmClearHistory(true)}
                                    style={{
                                        padding: '0.6rem 1rem',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(244, 63, 94, 0.4)',
                                        background: 'rgba(244, 63, 94, 0.12)',
                                        color: '#FCA5A5',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    Clear history
                                </button>
                            </div>
                            {showHistory && (
                                <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
                                    {history.map((session) => (
                                        <div
                                            key={`history-${session.id}`}
                                            style={{
                                                padding: '0.9rem',
                                                borderRadius: '14px',
                                                background: 'rgba(11, 11, 13, 0.7)',
                                                border: '1px solid rgba(167, 171, 180, 0.12)',
                                                color: '#A7ABB4',
                                                fontSize: '0.85rem',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: '#F3F4F6' }}>
                                                {session.deviceName || getDeviceLabel(session)}
                                            </div>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                Last active {new Date(session.lastUsedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <ConfirmModal
                open={confirmLogoutAllOpen}
                title="Log out everywhere"
                description="This will end your active sessions on other devices."
                confirmLabel="Log out"
                tone="danger"
                onCancel={() => setConfirmLogoutAllOpen(false)}
                onConfirm={async () => {
                    setConfirmLogoutAllOpen(false);
                    await handleLogoutAll(keepPrimary);
                }}
            >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#A7ABB4', marginBottom: '1rem' }}>
                    <input
                        type="checkbox"
                        checked={!keepPrimary}
                        onChange={(e) => setKeepPrimary(!e.target.checked)}
                        style={{ accentColor: '#F43F5E', width: 16, height: 16 }}
                    />
                    Also log out the primary device
                </label>
            </ConfirmModal>
            <ConfirmModal
                open={!!confirmLogoutSession}
                title="Log out device"
                description="This device will be signed out immediately."
                confirmLabel="Log out"
                tone="danger"
                onCancel={() => setConfirmLogoutSession(null)}
                onConfirm={async () => {
                    if (!confirmLogoutSession) return;
                    const sessionId = confirmLogoutSession.sessionId;
                    setConfirmLogoutSession(null);
                    await handleLogoutSession(sessionId);
                }}
            />
            <ConfirmModal
                open={!!confirmPrimary}
                title="Set as primary"
                description="This device will become your primary device."
                confirmLabel="Set primary"
                onCancel={() => setConfirmPrimary(null)}
                onConfirm={async () => {
                    if (!confirmPrimary?.deviceId) return;
                    const deviceId = confirmPrimary.deviceId;
                    setConfirmPrimary(null);
                    await handleSetPrimary(deviceId);
                }}
            />
            <ConfirmModal
                open={confirmClearHistory}
                title="Clear device history"
                description="This removes signed-out device history. Active devices are not affected."
                confirmLabel="Clear history"
                tone="danger"
                onCancel={() => setConfirmClearHistory(false)}
                onConfirm={async () => {
                    setConfirmClearHistory(false);
                    await handleClearHistory();
                }}
            />
            <ConfirmModal
                open={!!editingDeviceId}
                title="Edit device label"
                description="Choose an emoji and nickname for this device."
                confirmLabel="Save label"
                onCancel={() => setEditingDeviceId(null)}
                onConfirm={async () => {
                    if (!editingDeviceId) return;
                    await handleSaveLabel(editingDeviceId);
                }}
            >
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {emojiOptions.map((option) => (
                            <button
                                key={option.label}
                                type="button"
                                onClick={() => setDraftEmoji(option.emoji)}
                                style={{
                                    padding: '0.35rem 0.6rem',
                                    borderRadius: '999px',
                                    border: draftEmoji === option.emoji ? '1px solid rgba(212, 175, 55, 0.6)' : '1px solid rgba(167, 171, 180, 0.2)',
                                    background: draftEmoji === option.emoji ? 'rgba(212, 175, 55, 0.2)' : 'rgba(167, 171, 180, 0.08)',
                                    color: '#F3F4F6',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                }}
                            >
                                {option.emoji} {option.label}
                            </button>
                        ))}
                    </div>
                    <input
                        value={draftNickname}
                        onChange={(e) => setDraftNickname(e.target.value)}
                        placeholder="Nickname (e.g. John’s Pixel)"
                        style={{
                            padding: '0.6rem 0.8rem',
                            borderRadius: '10px',
                            border: '1px solid rgba(167, 171, 180, 0.25)',
                            background: 'rgba(167, 171, 180, 0.05)',
                            color: '#F3F4F6',
                        }}
                    />
                </div>
            </ConfirmModal>
        </main>
    );
}
