'use client';

import { useCallback, useMemo, useState } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function BillingCheckoutEmbed({ onComplete }: { onComplete: () => void }) {
    const [loadError, setLoadError] = useState('');
    const [instanceKey, setInstanceKey] = useState(0);

    if (!publishableKey || !stripePromise) {
        return (
            <div
                style={{
                    padding: '1rem 1.1rem',
                    borderRadius: '1rem',
                    background: 'rgba(248, 113, 113, 0.08)',
                    border: '1px solid rgba(248, 113, 113, 0.22)',
                    color: '#FCA5A5',
                }}
            >
                Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
            </div>
        );
    }

    const fetchClientSecret = useCallback(async () => {
        const response = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok || !data?.clientSecret) {
            const message = data?.error || 'Failed to initialize secure checkout';
            setLoadError(message);
            throw new Error(message);
        }
        return data.clientSecret;
    }, []);

    const options = useMemo(() => ({
        fetchClientSecret,
        onComplete,
    }), [fetchClientSecret, onComplete]);

    if (loadError) {
        return (
            <div
                style={{
                    display: 'grid',
                    gap: '0.85rem',
                }}
            >
                <div
                    style={{
                        padding: '1rem 1.1rem',
                        borderRadius: '1rem',
                        background: 'rgba(248, 113, 113, 0.08)',
                        border: '1px solid rgba(248, 113, 113, 0.22)',
                        color: '#FCA5A5',
                    }}
                >
                    {loadError}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setLoadError('');
                        setInstanceKey((current) => current + 1);
                    }}
                    style={{
                        width: 'fit-content',
                        padding: '0.9rem 1.25rem',
                        borderRadius: '0.85rem',
                        border: '1px solid rgba(167, 171, 180, 0.18)',
                        background: 'rgba(167, 171, 180, 0.04)',
                        color: '#F3F4F6',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Retry checkout
                </button>
            </div>
        );
    }

    return (
        <EmbeddedCheckoutProvider
            key={instanceKey}
            stripe={stripePromise}
            options={options}
        >
            <div
                style={{
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    background: '#fff',
                }}
            >
                <EmbeddedCheckout />
            </div>
        </EmbeddedCheckoutProvider>
    );
}
