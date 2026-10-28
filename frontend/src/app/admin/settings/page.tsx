'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, CreditCard, User as UserIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

interface User {
    id: string;
    email: string;
    username: string;
    role: string;
}

interface DeletionRequest {
    id: string;
    userId?: string | null;
    email: string;
    reason?: string | null;
    status: string;
    createdAt: string;
    processedAt?: string | null;
    user?: {
        id: string;
        username: string;
        email: string;
    } | null;
}

interface BillingPlanSettings {
    id: string;
    name: string;
    description?: string | null;
    amountCents: number;
    currency: string;
    interval: string;
    isActive: boolean;
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [promoteQuery, setPromoteQuery] = useState('');
    const [promoting, setPromoting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
    const [deletionLoading, setDeletionLoading] = useState(false);
    const [deletionError, setDeletionError] = useState('');
    const [billingPlan, setBillingPlan] = useState<BillingPlanSettings | null>(null);
    const [billingLoading, setBillingLoading] = useState(false);
    const [billingSaving, setBillingSaving] = useState(false);
    const [trialInfo, setTrialInfo] = useState<{ enabled: boolean; days: number } | null>(null);
    const pageSize = 25;

    useEffect(() => {
        fetchUsers(1);
        fetchDeletionRequests();
        fetchBillingSettings();
    }, [router]);

    const fetchBillingSettings = async () => {
        try {
            setBillingLoading(true);
            const response = await fetch('/api/admin/billing');
            if (response.status === 401) {
                router.push('/auth?redirect=/admin/settings');
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch billing settings');
            }
            const data = await response.json();
            setBillingPlan(data.plan || null);
            setTrialInfo(data.trial || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch billing settings');
        } finally {
            setBillingLoading(false);
        }
    };

    const fetchDeletionRequests = async () => {
        try {
            setDeletionLoading(true);
            setDeletionError('');
            const response = await fetch('/api/admin/deletion-requests');
            if (response.status === 401) {
                router.push('/auth?redirect=/admin/settings');
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch deletion requests');
            }
            const data = await response.json();
            setDeletionRequests(data.requests || []);
        } catch (err) {
            setDeletionError(err instanceof Error ? err.message : 'Failed to fetch deletion requests');
        } finally {
            setDeletionLoading(false);
        }
    };

    const handleDeleteRequest = async (requestId: string) => {
        try {
            setDeletionError('');
            const response = await fetch('/api/admin/deletion-requests', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: requestId })
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete request');
            }
            setDeletionRequests((prev) => prev.filter((request) => request.id !== requestId));
        } catch (err) {
            setDeletionError(err instanceof Error ? err.message : 'Failed to delete request');
        }
    };

    const fetchUsers = async (page: number = 1) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                pageSize: pageSize.toString(),
                search: ''
            });
            const response = await fetch(`/api/admin/users?${queryParams}`);
            if (response.status === 401) {
                router.push('/auth?redirect=/admin/settings');
                return;
            }
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const data = await response.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToAdmin = async () => {
        const query = promoteQuery.trim();
        if (!query) {
            setError('Enter a user email or username');
            return;
        }

        setPromoting(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/admin/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to promote user');
            }

            setSuccessMessage(data.message || 'User promoted to admin successfully.');
            setPromoteQuery('');
            fetchUsers(1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to promote user');
        } finally {
            setPromoting(false);
        }
    };

    const handleSaveBilling = async () => {
        if (!billingPlan) return;

        try {
            setBillingSaving(true);
            setError('');
            setSuccessMessage('');
            const response = await fetch('/api/admin/billing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billingPlan),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to update billing settings');
            }
            setBillingPlan(data.plan || billingPlan);
            setTrialInfo(data.trial || trialInfo);
            setSuccessMessage('Billing settings updated successfully.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update billing settings');
        } finally {
            setBillingSaving(false);
        }
    };

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '80px',
            paddingBottom: '4rem'
        }}>
            <div style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '2rem',
            }}>
                {/* Header */}
                <div style={{
                    marginBottom: '3rem',
                    paddingBottom: '2rem',
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Link
                            href="/admin"
                            style={{
                                color: '#D4AF37',
                                textDecoration: 'none',
                                fontSize: '0.875rem',
                                fontWeight: '600'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </span>
                        </Link>
                    </div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '0.5rem'
                    }}>
                        Admin Settings
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#A7ABB4'
                    }}>
                        Manage administrator access and user roles
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#FCA5A5',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(74, 222, 128, 0.1)',
                        border: '1px solid rgba(74, 222, 128, 0.3)',
                        color: '#86EFAC',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <CheckCircle2 className="w-4 h-4" />
                            {successMessage}
                        </span>
                    </div>
                )}

                <div style={{
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                    }}>
                        <CreditCard className="w-5 h-5" />
                        Subscription Plan
                    </h2>

                    {billingLoading || !billingPlan ? (
                        <div style={{ color: '#A7ABB4' }}>Loading billing plan...</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Plan name</label>
                                <input
                                    type="text"
                                    value={billingPlan.name}
                                    onChange={(e) => setBillingPlan((current) => current ? { ...current, name: e.target.value } : current)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(167, 171, 180, 0.2)',
                                        background: 'rgba(167, 171, 180, 0.05)',
                                        color: '#F3F4F6',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Description</label>
                                <input
                                    type="text"
                                    value={billingPlan.description || ''}
                                    onChange={(e) => setBillingPlan((current) => current ? { ...current, description: e.target.value } : current)}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(167, 171, 180, 0.2)',
                                        background: 'rgba(167, 171, 180, 0.05)',
                                        color: '#F3F4F6',
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Amount in cents</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={billingPlan.amountCents}
                                        onChange={(e) => setBillingPlan((current) => current ? { ...current, amountCents: Number(e.target.value) || 0 } : current)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(167, 171, 180, 0.05)',
                                            color: '#F3F4F6',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Currency</label>
                                    <input
                                        type="text"
                                        value={billingPlan.currency}
                                        onChange={(e) => setBillingPlan((current) => current ? { ...current, currency: e.target.value } : current)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(167, 171, 180, 0.05)',
                                            color: '#F3F4F6',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <label style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Interval</label>
                                    <select
                                        value={billingPlan.interval}
                                        onChange={(e) => setBillingPlan((current) => current ? { ...current, interval: e.target.value } : current)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.5rem',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(167, 171, 180, 0.05)',
                                            color: '#F3F4F6',
                                        }}
                                    >
                                        <option value="month">month</option>
                                        <option value="year">year</option>
                                    </select>
                                </div>
                            </div>

                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', color: '#F3F4F6' }}>
                                <input
                                    type="checkbox"
                                    checked={billingPlan.isActive}
                                    onChange={(e) => setBillingPlan((current) => current ? { ...current, isActive: e.target.checked } : current)}
                                />
                                Plan is available for checkout
                            </label>

                            <div style={{
                                padding: '0.9rem 1rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(212, 175, 55, 0.08)',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                color: '#D1D5DB',
                                fontSize: '0.9rem',
                                lineHeight: 1.6,
                            }}>
                                Free trial env toggle: {trialInfo?.enabled ? 'enabled' : 'disabled'}.
                                {trialInfo ? ` Trial length: ${trialInfo.days} day${trialInfo.days === 1 ? '' : 's'}.` : ''}
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveBilling}
                                disabled={billingSaving}
                                style={{
                                    justifySelf: 'start',
                                    padding: '0.85rem 1.25rem',
                                    borderRadius: '0.65rem',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                                    color: '#0B0B0D',
                                    fontWeight: 700,
                                    cursor: billingSaving ? 'not-allowed' : 'pointer',
                                    opacity: billingSaving ? 0.7 : 1,
                                }}
                            >
                                {billingSaving ? 'Saving...' : 'Save billing settings'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Promote User Section */}
                <div style={{
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    marginBottom: '2rem'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                    }}>
                        Promote User to Admin
                    </h2>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="Exact email or username"
                            value={promoteQuery}
                            onChange={(e) => {
                                setPromoteQuery(e.target.value);
                                setError('');
                                setSuccessMessage('');
                            }}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                background: 'rgba(167, 171, 180, 0.05)',
                                color: '#F3F4F6',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.08)';
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                            }}
                        />
                        <p style={{ color: '#A7ABB4', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            Enter one exact email address or username. Matching users are not listed here.
                        </p>
                        <button
                            onClick={handlePromoteToAdmin}
                            disabled={!promoteQuery.trim() || promoting}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                background: promoteQuery.trim()
                                    ? 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)'
                                    : 'rgba(212, 175, 55, 0.3)',
                                border: 'none',
                                color: promoteQuery.trim() ? '#0B0B0D' : '#A7ABB4',
                                fontWeight: '700',
                                fontSize: '1rem',
                                cursor: promoteQuery.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                opacity: promoteQuery.trim() ? 1 : 0.5
                            }}
                        >
                            {promoting ? 'Promoting...' : 'Promote Matching User'}
                        </button>
                    </div>
                </div>

                {/* Current Admins */}
                <div style={{
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)'
                }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '1.5rem',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
                    }}>
                        Current Administrators
                    </h2>

                    {loading ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            Loading administrators...
                        </div>
                    ) : users.filter(u => u.role === 'admin').length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            No administrators yet. Promote a user above.
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gap: '1rem'
                        }}>
                            {users.filter(u => u.role === 'admin').map((admin) => (
                                <div
                                    key={admin.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(212, 175, 55, 0.05)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#0B0B0D',
                                        fontWeight: '700',
                                        fontSize: '0.875rem'
                                    }}>
                                        <UserIcon className="w-5 h-5" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: '#F3F4F6'
                                        }}>
                                            {admin.username}
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            color: '#A7ABB4'
                                        }}>
                                            {admin.email}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '9999px',
                                        background: 'rgba(212, 175, 55, 0.2)',
                                        color: '#D4AF37',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        textTransform: 'uppercase'
                                    }}>
                                        ADMIN
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{
                    marginTop: '2rem',
                    padding: '2rem',
                    borderRadius: '1.25rem',
                    background: 'rgba(167, 171, 180, 0.03)',
                    border: '1px solid rgba(167, 171, 180, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        flexWrap: 'wrap'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: '#F3F4F6',
                        }}>
                            Account Deletion Requests
                        </h2>
                        <button
                            type="button"
                            onClick={fetchDeletionRequests}
                            style={{
                                padding: '0.55rem 1rem',
                                borderRadius: '0.65rem',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                background: 'rgba(212, 175, 55, 0.12)',
                                color: '#D4AF37',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            Refresh
                        </button>
                    </div>

                    {deletionError && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(244, 63, 94, 0.08)',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            color: '#FCA5A5',
                            marginBottom: '1rem',
                            fontWeight: 600,
                        }}>
                            {deletionError}
                        </div>
                    )}

                    {deletionLoading ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            Loading deletion requests...
                        </div>
                    ) : deletionRequests.length === 0 ? (
                        <div style={{
                            padding: '2rem',
                            textAlign: 'center',
                            color: '#A7ABB4'
                        }}>
                            No deletion requests yet.
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {deletionRequests.map((request) => (
                                <div
                                    key={request.id}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.9rem',
                                        background: 'rgba(11, 11, 13, 0.75)',
                                        border: '1px solid rgba(167, 171, 180, 0.15)',
                                        display: 'grid',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '1rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '1rem',
                                                fontWeight: 700,
                                                color: '#F3F4F6'
                                            }}>
                                                {request.user?.username || request.email}
                                            </div>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: '#A7ABB4'
                                            }}>
                                                {request.email}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '9999px',
                                                background: 'rgba(212, 175, 55, 0.2)',
                                                color: '#D4AF37',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase'
                                            }}>
                                                {request.status}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('Delete this request?')) {
                                                        handleDeleteRequest(request.id);
                                                    }
                                                }}
                                                style={{
                                                    padding: '0.45rem 0.85rem',
                                                    borderRadius: '0.6rem',
                                                    border: '1px solid rgba(244, 63, 94, 0.4)',
                                                    background: 'rgba(244, 63, 94, 0.12)',
                                                    color: '#FCA5A5',
                                                    cursor: 'pointer',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        flexWrap: 'wrap',
                                        color: '#A7ABB4',
                                        fontSize: '0.8rem'
                                    }}>
                                        <span>
                                            Submitted: {formatDateTime(request.createdAt)}
                                        </span>
                                        {request.processedAt && (
                                            <span>
                                                Processed: {formatDateTime(request.processedAt)}
                                            </span>
                                        )}
                                    </div>
                                    {request.reason && (
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: '#F3F4F6',
                                            background: 'rgba(167, 171, 180, 0.08)',
                                            borderRadius: '0.6rem',
                                            padding: '0.6rem 0.75rem',
                                            border: '1px solid rgba(167, 171, 180, 0.12)'
                                        }}>
                                            {request.reason}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
