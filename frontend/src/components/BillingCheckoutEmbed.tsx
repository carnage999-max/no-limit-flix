'use client';

import { useState } from 'react';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function BillingCheckoutEmbed({ onComplete }: { onComplete: () => void }) {
    const [loadError, setLoadError] = useState('');

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

    return (
        <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{
                fetchClientSecret: async () => {
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
                },
                onComplete,
            }}
        >
            {loadError ? (
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
            ) : (
                <div
                    style={{
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        background: '#fff',
                    }}
                >
                    <EmbeddedCheckout />
                </div>
            )}
        </EmbeddedCheckoutProvider>
    );
}
