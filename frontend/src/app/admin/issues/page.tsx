'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

interface IssueItem {
    id: string;
    userId?: string | null;
    name?: string | null;
    email?: string | null;
    issue: string;
    attachments?: Array<{ name: string; type: string; size: number; dataUrl: string }> | null;
    status: string;
    createdAt: string;
    resolvedAt?: string | null;
}

export default function AdminIssuesPage() {
    const router = useRouter();
    const [issues, setIssues] = useState<IssueItem[]>([]);
    const [resolved, setResolved] = useState<IssueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [processing, setProcessing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'open' | 'resolved'>('open');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        fetchIssues();
    }, []);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/issues');
            if (response.status === 401) {
                router.push('/admin?redirect=/admin/issues');
                return;
            }
            if (!response.ok) throw new Error('Failed to fetch issues');
            const data = await response.json();
            const openIssues = data.issues || [];
            const resolvedIssues = data.resolved || [];
            setIssues(openIssues);
            setResolved(resolvedIssues);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const markComplete = async (ids: string[]) => {
        if (!ids.length) return;
        try {
            setProcessing(true);
            const response = await fetch('/api/admin/issues', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            if (!response.ok) throw new Error('Failed to mark complete');
            setSelected({});
            await fetchIssues();
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    const activeList = statusFilter === 'open' ? issues : resolved;
    const filteredIssues = activeList.filter((issue) => {
        const created = new Date(issue.createdAt).getTime();
        if (fromDate) {
            const from = new Date(fromDate).getTime();
            if (created < from) return false;
        }
        if (toDate) {
            const to = new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1;
            if (created > to) return false;
        }
        return true;
    });

    return (
        <div style={{
            background: '#0B0B0D',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid rgba(167, 171, 180, 0.12)',
            color: '#F3F4F6',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>Issue Reports</div>
                    <div style={{ color: '#A7ABB4', fontSize: '0.9rem' }}>Track reported issues from users</div>
                </div>
                <button
                    type="button"
                    onClick={() => markComplete(selectedIds)}
                    disabled={!selectedIds.length || processing}
                    style={{
                        padding: '0.7rem 1rem',
                        borderRadius: '12px',
                        background: selectedIds.length ? '#D4AF37' : 'rgba(212,175,55,0.2)',
                        color: '#0B0B0D',
                        border: 'none',
                        fontWeight: 700,
                        cursor: selectedIds.length ? 'pointer' : 'not-allowed',
                    }}
                >
                    {processing ? 'Working...' : `Mark selected complete (${selectedIds.length})`}
                </button>
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                alignItems: 'center',
                marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['open', 'resolved'] as const).map((value) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setStatusFilter(value)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                background: statusFilter === value ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
                                color: '#F3F4F6',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {value === 'open' ? 'Open' : 'Resolved'}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ color: '#A7ABB4', fontSize: '0.8rem' }}>From</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{
                            background: 'rgba(17, 17, 20, 0.8)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            borderRadius: '8px',
                            padding: '0.35rem 0.5rem',
                        }}
                    />
                    <label style={{ color: '#A7ABB4', fontSize: '0.8rem' }}>To</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{
                            background: 'rgba(17, 17, 20, 0.8)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            borderRadius: '8px',
                            padding: '0.35rem 0.5rem',
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#A7ABB4' }}>Loading issues...</div>
            ) : filteredIssues.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#A7ABB4' }}>No issues match this filter.</div>
            ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {filteredIssues.map((issue) => (
                        <div key={issue.id} style={{
                            display: 'grid',
                            gridTemplateColumns: '32px 1fr auto',
                            gap: '1rem',
                            padding: '1rem',
                            borderRadius: '16px',
                            background: 'rgba(167, 171, 180, 0.06)',
                            border: '1px solid rgba(167, 171, 180, 0.1)',
                        }}>
                            <input
                                type="checkbox"
                                checked={!!selected[issue.id]}
                                onChange={() => toggleSelect(issue.id)}
                                style={{ width: '16px', height: '16px', marginTop: '4px' }}
                            />
                            <div style={{ display: 'grid', gap: '0.4rem' }}>
                                <div style={{ fontWeight: 700 }}>{issue.issue}</div>
                                <div style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>
                                    {issue.name || 'Anonymous'} · {issue.email || 'no email'} · {new Date(issue.createdAt).toLocaleString()}
                                </div>
                                {issue.attachments?.length ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                                        {issue.attachments.map((file, idx) => (
                                            <a
                                                key={`${issue.id}-${idx}`}
                                                href={file.dataUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(212, 175, 55, 0.3)',
                                                    color: '#D4AF37',
                                                    fontSize: '0.75rem',
                                                    textDecoration: 'none',
                                                }}
                                            >
                                                {file.name}
                                            </a>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => markComplete([issue.id])}
                                disabled={statusFilter === 'resolved'}
                                style={{
                                    alignSelf: 'center',
                                    padding: '0.5rem 0.8rem',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(74, 222, 128, 0.3)',
                                    background: statusFilter === 'resolved' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(34, 197, 94, 0.15)',
                                    color: statusFilter === 'resolved' ? '#94A3B8' : '#86EFAC',
                                    fontWeight: 600,
                                    cursor: statusFilter === 'resolved' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {statusFilter === 'resolved' ? 'Resolved' : 'Mark complete'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
