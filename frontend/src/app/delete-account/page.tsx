'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

export default function DeleteAccountPage() {
    const { user } = useSession();
    const [email, setEmail] = useState(user?.email || '');
    const [reason, setReason] = useState('');
    const [status, setStatus] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setStatus(null);
        try {
            const res = await fetch('/api/account/delete-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, reason }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to submit request');
            }
            setStatus('Request received. We will process your account deletion shortly.');
        } catch (error: any) {
            setStatus(error.message || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

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
                    marginBottom: '1rem',
                }}>
                    Request Account Deletion
                </h1>
                <p style={{ color: '#A7ABB4', marginBottom: '2rem' }}>
                    Submit a request to delete your account and associated data. Requests are processed in the order received.
                </p>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        background: 'rgba(11, 11, 13, 0.9)',
                        borderRadius: '20px',
                        border: '1px solid rgba(167, 171, 180, 0.1)',
                        padding: '1.5rem',
                        display: 'grid',
                        gap: '1.25rem',
                    }}
                >
                    <label style={{ display: 'grid', gap: '0.5rem', color: '#A7ABB4' }}>
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Email</span>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: '#A7ABB4' }} />
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
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
                        <span style={{ fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Reason (optional)</span>
                        <div style={{ position: 'relative' }}>
                            <MessageSquare size={16} style={{ position: 'absolute', left: '0.9rem', top: '1rem', color: '#A7ABB4' }} />
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Let us know why you're leaving (optional)."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.2)',
                                    color: '#F3F4F6',
                                    resize: 'vertical',
                                }}
                            />
                        </div>
                    </label>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            padding: '0.85rem 1.25rem',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.9) 0%, rgba(244, 63, 94, 0.9) 100%)',
                            border: 'none',
                            color: '#0B0B0D',
                            fontWeight: 700,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            justifyContent: 'center',
                        }}
                    >
                        <Trash2 size={16} />
                        {submitting ? 'Submitting...' : 'Submit deletion request'}
                    </button>

                    {status && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#A7ABB4' }}>
                            <CheckCircle2 size={16} color="#4ADE80" />
                            <span>{status}</span>
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}
