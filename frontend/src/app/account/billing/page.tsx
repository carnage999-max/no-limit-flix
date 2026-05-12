'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

interface BillingSummary {
    plan: {
        id: string;
        name: string;
        description?: string | null;
        amountCents: number;
        currency: string;
        interval: string;
        isActive: boolean;
    };
    billing: {
        access: boolean;
        requiresSubscription: boolean;
        customerConfigured: boolean;
        status: string;
        currentPeriodEnd: string | null;
        cancelAtPeriodEnd: boolean;
        trialEligible: boolean;
        freeTrialEnabled: boolean;
        freeTrialDays: number;
    };
    subscription: {
        status: string;
        cancelAtPeriodEnd: boolean;
        currentPeriodStart: string | null;
        currentPeriodEnd: string | null;
        trialStart: string | null;
        trialEnd: string | null;
    } | null;
}

const formatPrice = (amountCents: number, currency: string, interval: string) => {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amount) + ` / ${interval}`;
};

function BillingPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: sessionLoading, refresh } = useSession();
    const [summary, setSummary] = useState<BillingSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<'checkout' | 'portal' | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth?redirect=/account/billing');
            return;
        }

        const fetchSummary = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await fetch('/api/billing/summary', { cache: 'no-store' });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data?.error || 'Failed to load billing details');
                }
                setSummary(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load billing details');
            } finally {
                setLoading(false);
            }
        };

        fetchSummary();
    }, [router, sessionLoading, user]);

    const handleAction = async (kind: 'checkout' | 'portal') => {
        try {
            setActionLoading(kind);
            setError('');
            const response = await fetch(`/api/billing/${kind}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || `Failed to start ${kind}`);
            }
            if (data?.url) {
                window.location.href = data.url;
                return;
            }
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to start ${kind}`);
            setActionLoading(null);
        }
    };

    if (sessionLoading || !user) return null;

    const status = summary?.billing.status || user.subscriptionStatus || 'inactive';
    const checkoutState = searchParams.get('checkout');
    const gated = searchParams.get('gated') === '1';
    const redirectTarget = searchParams.get('redirect');

    return (
        <main
            style={{
                minHeight: '100vh',
                background: '#0B0B0D',
                paddingTop: '96px',
                paddingBottom: '4rem',
            }}
        >
            <div
                style={{
                    maxWidth: '960px',
                    margin: '0 auto',
                    padding: '0 2rem',
                }}
            >
                <section
                    style={{
                        padding: '2rem',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(212, 175, 55, 0.22)',
                        background: 'linear-gradient(160deg, rgba(212, 175, 55, 0.12), rgba(11, 11, 13, 0.96) 58%)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ maxWidth: '560px' }}>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.45rem 0.75rem',
                                    borderRadius: '999px',
                                    background: 'rgba(212, 175, 55, 0.12)',
                                    border: '1px solid rgba(212, 175, 55, 0.28)',
                                    color: '#F6D365',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    marginBottom: '1rem',
                                }}
                            >
                                <CreditCard size={14} />
                                Membership
                            </div>
                            <h1
                                style={{
                                    fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                                    fontWeight: 700,
                                    color: '#F3F4F6',
                                    lineHeight: 1,
                                    marginBottom: '0.75rem',
                                }}
                            >
                                Billing and subscription
                            </h1>
                            <p
                                style={{
                                    color: '#D6D6D8',
                                    fontSize: '1rem',
                                    lineHeight: 1.7,
                                }}
                            >
                                Access to the app is tied to an active membership. Start, renew, or manage your plan here.
                            </p>
                        </div>
                        <div
                            style={{
                                minWidth: '220px',
                                padding: '1rem 1.1rem',
                                borderRadius: '1rem',
                                background: 'rgba(11, 11, 13, 0.58)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                alignSelf: 'flex-start',
                            }}
                        >
                            <div style={{ color: '#A7ABB4', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                                Current status
                            </div>
                            <div style={{ color: '#F3F4F6', fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize' }}>
                                {status.replace(/_/g, ' ')}
                            </div>
                            {summary?.billing.currentPeriodEnd && (
                                <div style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.55rem', lineHeight: 1.5 }}>
                                    {summary.billing.cancelAtPeriodEnd ? 'Access ends' : 'Renews'} on{' '}
                                    {new Date(summary.billing.currentPeriodEnd).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {gated && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '1rem 1.1rem',
                            borderRadius: '1rem',
                            background: 'rgba(248, 113, 113, 0.08)',
                            border: '1px solid rgba(248, 113, 113, 0.22)',
                            color: '#FCA5A5',
                        }}
                    >
                        An active subscription is required before the app content becomes available.
                    </div>
                )}

                {checkoutState === 'success' && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '1rem 1.1rem',
                            borderRadius: '1rem',
                            background: 'rgba(74, 222, 128, 0.08)',
                            border: '1px solid rgba(74, 222, 128, 0.24)',
                            color: '#86EFAC',
                        }}
                    >
                        Checkout completed. Stripe will finish provisioning your membership in a moment.
                    </div>
                )}

                {checkoutState === 'canceled' && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '1rem 1.1rem',
                            borderRadius: '1rem',
                            background: 'rgba(167, 171, 180, 0.08)',
                            border: '1px solid rgba(167, 171, 180, 0.18)',
                            color: '#D1D5DB',
                        }}
                    >
                        Checkout was canceled. Your account remains on its current billing status.
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            marginBottom: '1rem',
                            padding: '1rem 1.1rem',
                            borderRadius: '1rem',
                            background: 'rgba(248, 113, 113, 0.08)',
                            border: '1px solid rgba(248, 113, 113, 0.22)',
                            color: '#FCA5A5',
                        }}
                    >
                        {error}
                    </div>
                )}

                {loading || !summary ? (
                    <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
                        <Loader2 className="w-6 h-6 animate-spin" color="#D4AF37" />
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                        <section
                            style={{
                                padding: '1.5rem',
                                borderRadius: '1.25rem',
                                background: 'rgba(167, 171, 180, 0.04)',
                                border: '1px solid rgba(167, 171, 180, 0.1)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ color: '#F3F4F6', fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                                        {summary.plan.name}
                                    </div>
                                    <div style={{ color: '#A7ABB4', fontSize: '0.95rem', lineHeight: 1.6 }}>
                                        {summary.plan.description || 'Streaming membership with recurring billing managed by Stripe.'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: '#F6D365', fontSize: '1.5rem', fontWeight: 700 }}>
                                        {formatPrice(summary.plan.amountCents, summary.plan.currency, summary.plan.interval)}
                                    </div>
                                    {summary.billing.freeTrialEnabled && summary.billing.trialEligible && (
                                        <div style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                                            Includes a {summary.billing.freeTrialDays}-day free trial
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                                {!summary.billing.access ? (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('checkout')}
                                        disabled={actionLoading !== null || !summary.plan.isActive}
                                        style={{
                                            padding: '0.9rem 1.25rem',
                                            borderRadius: '0.85rem',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 55%, #B8860B 100%)',
                                            color: '#0B0B0D',
                                            fontWeight: 700,
                                            cursor: actionLoading !== null || !summary.plan.isActive ? 'not-allowed' : 'pointer',
                                            opacity: actionLoading !== null || !summary.plan.isActive ? 0.7 : 1,
                                        }}
                                    >
                                        {actionLoading === 'checkout' ? 'Redirecting to Stripe...' : summary.billing.trialEligible ? 'Start free trial' : 'Subscribe with Stripe'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleAction('portal')}
                                        disabled={actionLoading !== null}
                                        style={{
                                            padding: '0.9rem 1.25rem',
                                            borderRadius: '0.85rem',
                                            border: '1px solid rgba(212, 175, 55, 0.28)',
                                            background: 'rgba(212, 175, 55, 0.1)',
                                            color: '#F6D365',
                                            fontWeight: 700,
                                            cursor: actionLoading !== null ? 'not-allowed' : 'pointer',
                                            opacity: actionLoading !== null ? 0.7 : 1,
                                        }}
                                    >
                                        {actionLoading === 'portal' ? 'Opening Stripe portal...' : 'Manage in Stripe'}
                                    </button>
                                )}

                                {summary.billing.access && redirectTarget && (
                                    <button
                                        type="button"
                                        onClick={() => router.push(redirectTarget)}
                                        style={{
                                            padding: '0.9rem 1.25rem',
                                            borderRadius: '0.85rem',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 55%, #B8860B 100%)',
                                            color: '#0B0B0D',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Continue to app
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={async () => {
                                        await refresh();
                                        window.location.reload();
                                    }}
                                    style={{
                                        padding: '0.9rem 1.25rem',
                                        borderRadius: '0.85rem',
                                        border: '1px solid rgba(167, 171, 180, 0.18)',
                                        background: 'rgba(167, 171, 180, 0.04)',
                                        color: '#F3F4F6',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Refresh status
                                </button>
                            </div>
                        </section>

                        <section
                            style={{
                                padding: '1.5rem',
                                borderRadius: '1.25rem',
                                background: 'rgba(167, 171, 180, 0.04)',
                                border: '1px solid rgba(167, 171, 180, 0.1)',
                                display: 'grid',
                                gap: '1rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <ShieldCheck color="#D4AF37" />
                                <div style={{ color: '#F3F4F6', fontSize: '1.05rem', fontWeight: 700 }}>Billing controls</div>
                            </div>
                            <div style={{ color: '#A7ABB4', fontSize: '0.95rem', lineHeight: 1.7 }}>
                                Stripe manages payment methods, automatic renewal, failed payment recovery, and cancellations. Trial eligibility is controlled by environment configuration so you can switch it on during testing without changing code.
                            </div>
                            {summary.subscription?.trialEnd && (
                                <div style={{ color: '#F6D365', fontSize: '0.92rem' }}>
                                    Trial ends on {new Date(summary.subscription.trialEnd).toLocaleDateString()}.
                                </div>
                            )}
                            {summary.subscription?.currentPeriodEnd && (
                                <div style={{ color: '#D1D5DB', fontSize: '0.92rem' }}>
                                    {summary.subscription.cancelAtPeriodEnd ? 'Membership ends' : 'Next renewal'} on {new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()}.
                                </div>
                            )}
                            {summary.billing.requiresSubscription && !summary.billing.access && (
                                <div
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.95rem',
                                        background: 'rgba(212, 175, 55, 0.08)',
                                        border: '1px solid rgba(212, 175, 55, 0.18)',
                                        color: '#F3F4F6',
                                        display: 'flex',
                                        gap: '0.75rem',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Sparkles size={18} color="#F6D365" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <span>
                                        Once Stripe marks your subscription active, the rest of the app unlocks automatically.
                                    </span>
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function BillingPage() {
    return (
        <Suspense
            fallback={
                <main
                    style={{
                        minHeight: '100vh',
                        background: '#0B0B0D',
                        paddingTop: '96px',
                        paddingBottom: '4rem',
                    }}
                >
                    <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
                        <Loader2 className="w-6 h-6 animate-spin" color="#D4AF37" />
                    </div>
                </main>
            }
        >
            <BillingPageContent />
        </Suspense>
    );
}
