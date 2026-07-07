'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';
import { ShellPage, ShellPageHeader } from '@/components';

export default function DeleteAccountPage() {
    const [email, setEmail] = useState('');
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
        } catch (error: unknown) {
            setStatus(error instanceof Error ? error.message : 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ShellPage width="narrow">
            <ShellPageHeader
                eyebrow="Account"
                title="Request Account Deletion"
                subtitle="Submit a request to delete your account and associated data. Requests are processed in the order received."
            />

            <form onSubmit={handleSubmit} className="glass-panel utility-panel utility-stack">
                <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span className="section-label" style={{ marginBottom: 0 }}>Email</span>
                    <div className="utility-search-input">
                        <Mail size={16} color="#B5AFBD" />
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                </label>

                <label style={{ display: 'grid', gap: '0.5rem' }}>
                    <span className="section-label" style={{ marginBottom: 0 }}>Reason</span>
                    <div style={{ position: 'relative' }}>
                        <MessageSquare size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#B5AFBD' }} />
                        <textarea
                            className="utility-textarea"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Let us know why you're leaving (optional)."
                            rows={4}
                            style={{ paddingLeft: '2.8rem', resize: 'vertical' }}
                        />
                    </div>
                </label>

                <button type="submit" disabled={submitting} className="utility-danger-button" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                    <Trash2 size={16} />
                    {submitting ? 'Submitting...' : 'Submit deletion request'}
                </button>

                {status ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B5AFBD' }}>
                        <CheckCircle2 size={16} color="#4ADE80" />
                        <span>{status}</span>
                    </div>
                ) : null}
            </form>
        </ShellPage>
    );
}
