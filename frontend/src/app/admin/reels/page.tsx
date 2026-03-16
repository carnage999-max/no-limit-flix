'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ButtonPrimary } from '@/components';
import { Archive, Clapperboard, Loader2, AlertCircle, CheckCircle2, Link as LinkIcon } from 'lucide-react';

type ReelsJob = {
    id: string;
    type?: string | null;
    status: 'running' | 'completed' | 'failed' | string;
    total?: number;
    processed?: number;
    imported?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
    error?: string;
    startedAt?: number;
    lastUpdatedAt?: number;
    finishedAt?: number | null;
    summary?: {
        requested?: number;
        candidatesQueued?: number;
        candidatesProcessed?: number;
        imported?: number;
        updated?: number;
        skipped?: number;
        failed?: number;
        minDurationSeconds?: number;
        maxDurationSeconds?: number;
        requireAudio?: boolean;
        skippedReasons?: Record<string, number>;
        failedReasons?: Record<string, number>;
    };
};

type ReelsListItem = {
    id: string;
    title: string;
    description: string | null;
    fileName: string | null;
    thumbnailUrl: string | null;
    playbackType: string | null;
    cloudfrontPath: string;
    s3Url: string | null;
    duration: number | null;
    fileSize: string | null;
    hasAudio: boolean | null;
    status: string;
    sourceIdentifier: string;
    sourcePageUrl: string | null;
    createdAt: string;
};

const DEFAULT_QUERY = '(mediatype:(movies)) AND (subject:(short) OR title:(short) OR description:(short)) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR sample)';

const formatDuration = (seconds?: number | null) => {
    if (!seconds || !Number.isFinite(seconds)) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
};

const formatSize = (value?: string | null) => {
    if (!value) return '—';
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return '—';
    if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

const formatReasonMap = (value?: Record<string, number>) => {
    if (!value) return [];
    return Object.entries(value)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => `${reason} (${count})`);
};

export default function AdminReelsPage() {
    const [query, setQuery] = useState(DEFAULT_QUERY);
    const [limit, setLimit] = useState(20);
    const [minDurationSeconds, setMinDurationSeconds] = useState(8);
    const [maxDurationSeconds, setMaxDurationSeconds] = useState(150);
    const [requireAudio, setRequireAudio] = useState(true);
    const [allowMkv, setAllowMkv] = useState(false);

    const [importing, setImporting] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<ReelsJob | null>(null);

    const [items, setItems] = useState<ReelsListItem[]>([]);

    const progressPercent = useMemo(() => {
        if (!jobStatus?.total || !jobStatus.processed) return 0;
        return Math.min(100, Math.round((jobStatus.processed / jobStatus.total) * 100));
    }, [jobStatus]);

    const topSkippedReasons = useMemo(
        () => formatReasonMap(jobStatus?.summary?.skippedReasons),
        [jobStatus?.summary?.skippedReasons]
    );
    const topFailedReasons = useMemo(
        () => formatReasonMap(jobStatus?.summary?.failedReasons),
        [jobStatus?.summary?.failedReasons]
    );

    const loadItems = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await fetch('/api/admin/reels/list?limit=20');
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'Failed to fetch reels');
            }
            setItems(Array.isArray(data?.items) ? data.items : []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch reels';
            setError(message);
        } finally {
            setLoadingList(false);
        }
    }, []);

    const pollJob = useCallback(async (id: string) => {
        const res = await fetch(`/api/admin/reels/jobs?jobId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data?.error || 'Failed to fetch job status');
        }
        if (data?.job) {
            const job = data.job as ReelsJob;
            setJobStatus(job);
            if (job.status === 'completed') {
                setSuccess('Reels import completed.');
                await loadItems();
            }
            if (job.status === 'failed') {
                setError(job.error || 'Reels import failed.');
            }
        }
    }, [loadItems]);

    const handleStartImport = async () => {
        setImporting(true);
        setError('');
        setSuccess('');
        setJobStatus(null);

        try {
            const safeMin = Math.max(1, Number(minDurationSeconds) || 8);
            const safeMax = Math.max(safeMin, Number(maxDurationSeconds) || 150);
            const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));

            const res = await fetch('/api/admin/reels/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    limit: safeLimit,
                    minDurationSeconds: safeMin,
                    maxDurationSeconds: safeMax,
                    requireAudio,
                    allowMkv,
                    async: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const details = typeof data?.details === 'string' ? data.details : '';
                const upstream = data?.upstreamStatus ? ` (worker ${data.upstreamStatus})` : '';
                throw new Error(`${data?.error || 'Failed to queue reels import'}${upstream}${details ? `: ${details}` : ''}`);
            }

            const nextJobId = typeof data?.jobId === 'string' ? data.jobId : null;
            if (nextJobId) {
                setJobId(nextJobId);
                setSuccess(`Reels import queued. Job: ${nextJobId}`);
            } else {
                setSuccess('Reels import started.');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to queue reels import';
            setError(message);
        } finally {
            setImporting(false);
        }
    };

    useEffect(() => {
        loadItems().catch(() => null);
    }, [loadItems]);

    useEffect(() => {
        if (!jobId) return;

        let stopped = false;
        const tick = async () => {
            if (stopped) return;
            try {
                await pollJob(jobId);
            } catch {
                // swallow polling blips
            }
        };

        tick().catch(() => null);
        const timer = setInterval(tick, 3000);

        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [jobId, pollJob]);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <p style={{ color: '#A7ABB4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Admin</p>
                    <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Clapperboard className="w-8 h-8 text-gold-mid" />
                        Reels Import Pipeline
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Link
                        href="/admin/import"
                        style={{
                            textDecoration: 'none',
                            color: '#A7ABB4',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Archive className="w-4 h-4" />
                        Movie Import
                    </Link>
                    <Link
                        href="/admin/upload"
                        style={{
                            textDecoration: 'none',
                            color: '#A7ABB4',
                            fontSize: '0.875rem'
                        }}
                    >
                        Upload Library
                    </Link>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.5rem',
                background: 'rgba(167, 171, 180, 0.05)',
                borderRadius: '1.25rem',
                padding: '2rem',
                border: '1px solid rgba(167, 171, 180, 0.1)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Internet Archive Query</label>
                    <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        rows={4}
                        style={{
                            width: '100%',
                            padding: '0.85rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(11, 11, 13, 0.7)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            fontSize: '0.9rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Import Limit</label>
                    <input
                        type="number"
                        min={1}
                        max={200}
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(11, 11, 13, 0.7)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Min Duration (sec)</label>
                    <input
                        type="number"
                        min={1}
                        max={150}
                        value={minDurationSeconds}
                        onChange={(e) => setMinDurationSeconds(Number(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(11, 11, 13, 0.7)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Max Duration (sec)</label>
                    <input
                        type="number"
                        min={1}
                        max={300}
                        value={maxDurationSeconds}
                        onChange={(e) => setMaxDurationSeconds(Number(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(11, 11, 13, 0.7)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            color: '#F3F4F6',
                            fontSize: '0.95rem'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Audio Preference</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={requireAudio}
                            onChange={(e) => setRequireAudio(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                        />
                        <span style={{ color: '#F3F4F6', fontSize: '0.9rem' }}>Require audio</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>File Fallback</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={allowMkv}
                            onChange={(e) => setAllowMkv(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                        />
                        <span style={{ color: '#F3F4F6', fontSize: '0.9rem' }}>Allow MKV fallback</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <ButtonPrimary onClick={handleStartImport} disabled={importing || !query.trim()} fullWidth>
                        {importing ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Queueing...
                            </span>
                        ) : 'Queue Reels Import'}
                    </ButtonPrimary>
                    <button
                        type="button"
                        onClick={() => loadItems().catch(() => null)}
                        disabled={loadingList}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38BDF8',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: loadingList ? 'not-allowed' : 'pointer',
                            opacity: loadingList ? 0.6 : 1
                        }}
                    >
                        {loadingList ? 'Refreshing...' : 'Refresh Reels List'}
                    </button>
                </div>
            </div>

            {(error || success) && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {error && (
                        <div style={{ color: '#F87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ color: '#22C55E', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 className="w-4 h-4" />
                            {success}
                        </div>
                    )}
                </div>
            )}

            {jobId && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(167, 171, 180, 0.15)',
                    background: 'rgba(11, 11, 13, 0.6)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#F3F4F6', fontSize: '0.9rem', fontWeight: 600 }}>
                            Reels Job {jobId}
                        </span>
                        <span style={{ color: '#A7ABB4', fontSize: '0.8rem' }}>
                            {jobStatus?.status || 'queued'}
                        </span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: '8px',
                        borderRadius: '999px',
                        background: 'rgba(167, 171, 180, 0.2)',
                        overflow: 'hidden',
                        marginBottom: '0.5rem'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #D4AF37, #FACC15)',
                            transition: 'width 0.4s ease'
                        }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#A7ABB4', fontSize: '0.75rem' }}>
                        <span>Processed: {jobStatus?.processed ?? 0}/{jobStatus?.total ?? 0}</span>
                        {typeof jobStatus?.summary?.requested === 'number' && (
                            <span>Requested: {jobStatus.summary.requested}</span>
                        )}
                        <span>Imported: {jobStatus?.imported ?? 0}</span>
                        <span>Updated: {jobStatus?.updated ?? 0}</span>
                        <span>Skipped: {jobStatus?.skipped ?? 0}</span>
                        <span>Failed: {jobStatus?.failed ?? 0}</span>
                    </div>
                    {(topSkippedReasons.length > 0 || topFailedReasons.length > 0) && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#A7ABB4', fontSize: '0.75rem' }}>
                            {topSkippedReasons.length > 0 && (
                                <span>Top skipped: {topSkippedReasons.join(' | ')}</span>
                            )}
                            {topFailedReasons.length > 0 && (
                                <span>Top failed: {topFailedReasons.join(' | ')}</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#F3F4F6', marginBottom: '1rem' }}>Latest Reels In Database</h2>
                <div style={{
                    overflowX: 'auto',
                    borderRadius: '1rem',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    background: 'rgba(11, 11, 13, 0.6)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#A7ABB4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <th style={{ padding: '1rem' }}>Title</th>
                                <th style={{ padding: '1rem' }}>File</th>
                                <th style={{ padding: '1rem' }}>Duration</th>
                                <th style={{ padding: '1rem' }}>Size</th>
                                <th style={{ padding: '1rem' }}>Audio</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                                <th style={{ padding: '1rem' }}>Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '1.5rem', color: '#A7ABB4' }}>
                                        No reels imported yet.
                                    </td>
                                </tr>
                            ) : items.map((item) => (
                                <tr key={item.id} style={{ borderTop: '1px solid rgba(167, 171, 180, 0.05)' }}>
                                    <td style={{ padding: '1rem', color: '#F3F4F6', fontWeight: 600 }}>{item.title}</td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{item.fileName || '—'}</td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{formatDuration(item.duration)}</td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{formatSize(item.fileSize)}</td>
                                    <td style={{ padding: '1rem', color: item.hasAudio ? '#22C55E' : '#FACC15' }}>
                                        {item.hasAudio === null ? 'Unknown' : item.hasAudio ? 'Yes' : 'No'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            background: item.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(250, 204, 21, 0.15)',
                                            color: item.status === 'completed' ? '#22C55E' : '#FACC15'
                                        }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        {item.sourcePageUrl ? (
                                            <a
                                                href={item.sourcePageUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#D4AF37', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                {item.sourceIdentifier}
                                            </a>
                                        ) : (
                                            <span style={{ color: '#A7ABB4' }}>{item.sourceIdentifier}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
