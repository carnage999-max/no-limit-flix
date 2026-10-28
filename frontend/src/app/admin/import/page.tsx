'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ButtonPrimary } from '@/components';
import { ARCHIVE_PRESETS, DEFAULT_ARCHIVE_PRESET_ID } from '@/lib/internet-archive';
import { Archive, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, Film } from 'lucide-react';

interface ImportResult {
    identifier: string;
    title: string;
    fileName?: string;
    seriesTitle?: string | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
    playbackUrl?: string;
    fileSize?: string | null;
    duration?: number | null;
    sourcePageUrl?: string;
    titleKey?: string | null;
    status: 'imported' | 'updated' | 'skipped' | 'failed' | 'ready' | 'queued' | 'reconciled' | 'existing';
    reason?: string;
}

interface SearchCursor {
    page: number;
    offset: number;
}

// Films examined per request while searching; small enough that results appear within a few seconds.
const SCAN_BATCH_SIZE = 40;

const FILTER_LABELS: Record<string, string> = {
    alreadyInLibrary: 'already in the library',
    duplicateTitle: 'duplicate titles',
    excludedTitle: 'trailers, shorts or clips',
    tooShort: 'too short for a feature',
    noPlayableFile: 'no playable file',
    notAMovie: 'not a movie',
    lookupFailed: 'archive lookup failed',
};

interface ImportSummary {
    requested?: number;
    imported?: number;
    updated?: number;
    refreshed?: number;
    skipped?: number;
    failed?: number;
    ready?: number;
    queued?: number;
    all?: boolean;
    sourceRows?: number;
    affectedRows?: number;
    force?: boolean;
    searchQuery?: string | null;
    seriesTitle?: string | null;
    shuffleSeed?: string | null;
    totalAvailable?: number | null;
    scanned?: number;
    filtered?: Record<string, number>;
    filteredTotal?: number;
    cursor?: SearchCursor;
    exhausted?: boolean;
}

interface WorkerJobStatus {
    id?: string;
    type?: string;
    status?: string;
    total?: number;
    processed?: number;
    reconciled?: number;
    refreshed?: number;
    existing?: number;
    imported?: number;
    updated?: number;
    skipped?: number;
    failed?: number;
    affectedRows?: number;
    sourceRows?: number;
    all?: boolean;
    force?: boolean;
    summary?: ImportSummary;
    failures?: Array<{
        identifier?: string;
        fileName?: string | null;
        title?: string | null;
        reason?: string | null;
    }>;
}

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

type ApiErrorBody = {
    error?: string;
    details?: string;
    results?: ImportResult[];
    job?: WorkerJobStatus;
};

const readApiJson = async <T,>(response: Response): Promise<T & ApiErrorBody> => {
    const text = await response.text();
    if (!text) return {} as T & ApiErrorBody;
    try {
        return JSON.parse(text) as T & ApiErrorBody;
    } catch {
        return {
            error: 'Server returned a non-JSON response',
            details: text.slice(0, 500),
        } as T & ApiErrorBody;
    }
};

const buildApiErrorMessage = (data: ApiErrorBody, fallback: string) => {
    const parts = [data.error || fallback];
    if (data.details) parts.push(data.details);

    const failedResults = (data.results || [])
        .filter((result) => result.status === 'failed' && result.reason)
        .slice(0, 3)
        .map((result) => `${result.title || result.identifier}: ${result.reason}`);
    const jobFailures = (data.job?.failures || [])
        .slice(0, 3)
        .map((failure) => `${failure.title || failure.identifier || 'Item'}: ${failure.reason || 'Failed'}`);

    const failures = failedResults.length > 0 ? failedResults : jobFailures;
    if (failures.length > 0) {
        parts.push(failures.join(' | '));
    }

    return parts.filter(Boolean).join(' - ');
};

export default function AdminImportPage() {
    const [preset, setPreset] = useState(DEFAULT_ARCHIVE_PRESET_ID);
    const [limit, setLimit] = useState(6);
    const [allowMkv, setAllowMkv] = useState(false);
    const [importType, setImportType] = useState<'movie' | 'series'>('movie');
    const [seriesListUrl, setSeriesListUrl] = useState('');
    const [page, setPage] = useState(1);
    const [shuffleSeed, setShuffleSeed] = useState<string | null>(null);
    const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState<ImportResult[]>([]);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [selectedIdentifiers, setSelectedIdentifiers] = useState<Record<string, boolean>>({});
    const [jobId, setJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<WorkerJobStatus | null>(null);
    const [reconcileLoading, setReconcileLoading] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [cursor, setCursor] = useState<SearchCursor | null>(null);
    const [exhausted, setExhausted] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanStats, setScanStats] = useState<{ scanned: number; filtered: Record<string, number> }>({ scanned: 0, filtered: {} });
    const stopRequested = useRef(false);

    const presetOptions = useMemo(() => ARCHIVE_PRESETS, []);

    const formatSize = (value?: string | null) => {
        if (!value) return '—';
        const bytes = Number(value);
        if (!Number.isFinite(bytes)) return '—';
        if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
        if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    const formatDuration = (seconds?: number | null) => {
        if (!seconds || !Number.isFinite(seconds)) return '—';
        const minutes = Math.round(seconds / 60);
        return `${minutes}m`;
    };

    const getRowKey = (result: ImportResult) => `${result.identifier}::${result.fileName || ''}`;

    const handlePreview = async (pageOverride?: number) => {
        setLoading(true);
        setError('');
        setSummary(null);
        setResults([]);
        setSelectedIdentifiers({});
        setJobId(null);
        setJobStatus(null);

        try {
            const targetPage = Number.isFinite(pageOverride) ? (pageOverride as number) : page;
            const res = await fetch('/api/admin/archive/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preset,
                    limit,
                    allowMkv,
                    importType,
                    archiveSource: importType === 'series' ? seriesListUrl : undefined,
                    page: targetPage,
                    shuffleSeed,
                    dryRun: true
                })
            });

            const data = await readApiJson<{
                summary?: ImportSummary;
                results?: ImportResult[];
            }>(res);
            if (!res.ok) {
                throw new Error(buildApiErrorMessage(data, 'Import failed'));
            }

            setSummary(data.summary || null);
            setResults(data.results || []);
            if (importType === 'series') {
                const selected: Record<string, boolean> = {};
                (data.results || [])
                    .filter((item: ImportResult) => item.status === 'ready')
                    .forEach((item: ImportResult) => {
                        selected[getRowKey(item)] = true;
                    });
                setSelectedIdentifiers(selected);
            }
            setJobId(null);
            setJobStatus(null);
            setShuffleSeed(data.summary?.shuffleSeed || shuffleSeed);
            setTotalAvailable(data.summary?.totalAvailable ?? null);
            setPage(targetPage);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Import failed'));
        } finally {
            setLoading(false);
        }
    };

    // Movie search: keeps asking the server for the next batch from a cursor until `limit` new films
    // are found, showing each batch as it arrives instead of waiting for one long request.
    const runFind = async (reset: boolean) => {
        stopRequested.current = false;
        setScanning(true);
        setError('');
        if (reset) {
            setSelectedIdentifiers({});
            setJobId(null);
            setJobStatus(null);
        }

        let collected = reset ? [] : results;
        let position: SearchCursor = reset || !cursor ? { page: 1, offset: 0 } : cursor;
        let stats = reset ? { scanned: 0, filtered: {} as Record<string, number> } : scanStats;
        const target = collected.length + limit;
        const knownTitles = new Set(collected.map((item) => item.titleKey).filter(Boolean));
        const knownIds = new Set(collected.map((item) => item.identifier));
        let selectBudget = limit;
        if (reset) {
            setResults([]);
            setExhausted(false);
            setScanStats(stats);
        }

        try {
            while (!stopRequested.current && collected.length < target) {
                const res = await fetch('/api/admin/archive/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        preset,
                        limit: SCAN_BATCH_SIZE,
                        allowMkv,
                        importType: 'movie',
                        cursor: position,
                        dryRun: true
                    })
                });
                const data = await readApiJson<{ summary?: ImportSummary; results?: ImportResult[] }>(res);
                if (!res.ok) {
                    throw new Error(buildApiErrorMessage(data, 'Search failed'));
                }

                const filtered = { ...stats.filtered };
                const fresh: ImportResult[] = [];
                for (const item of data.results || []) {
                    const duplicate = knownIds.has(item.identifier) || (item.titleKey && knownTitles.has(item.titleKey));
                    if (duplicate) {
                        filtered.duplicateTitle = (filtered.duplicateTitle || 0) + 1;
                        continue;
                    }
                    knownIds.add(item.identifier);
                    if (item.titleKey) knownTitles.add(item.titleKey);
                    fresh.push(item);
                }
                for (const [reason, count] of Object.entries(data.summary?.filtered || {})) {
                    filtered[reason] = (filtered[reason] || 0) + count;
                }
                stats = { scanned: stats.scanned + (data.summary?.scanned ?? 0), filtered };

                collected = [...collected, ...fresh];
                const autoSelect = fresh.slice(0, Math.max(selectBudget, 0));
                selectBudget -= autoSelect.length;
                setResults(collected);
                setSelectedIdentifiers((prev) => {
                    const next = { ...prev };
                    autoSelect.forEach((item) => {
                        next[getRowKey(item)] = true;
                    });
                    return next;
                });
                setScanStats(stats);
                setSummary({ ready: collected.length, searchQuery: data.summary?.searchQuery });

                position = data.summary?.cursor || position;
                setCursor(position);
                if (data.summary?.exhausted) {
                    setExhausted(true);
                    break;
                }
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Search failed'));
        } finally {
            setScanning(false);
        }
    };

    const handleImportSelected = async () => {
        const selected = results.filter((item) => item.status === 'ready' && selectedIdentifiers[getRowKey(item)]);
        if (selected.length === 0) {
            setError('Select at least one item to import.');
            return;
        }

        setLoading(true);
        setError('');
        setSummary(null);

        try {
            const res = await fetch('/api/admin/archive/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preset,
                    limit: selected.length,
                    allowMkv,
                    importType,
                    seriesTitle: importType === 'series' ? selected[0]?.seriesTitle : undefined,
                    archiveSource: importType === 'series' ? seriesListUrl : undefined,
                    items: selected.map((item) => ({
                        identifier: item.identifier,
                        fileName: item.fileName || null,
                        title: item.title,
                        seriesTitle: item.seriesTitle || null,
                        seasonNumber: item.seasonNumber ?? null,
                        episodeNumber: item.episodeNumber ?? null
                    })),
                })
            });

            const data = await readApiJson<{
                summary?: ImportSummary;
                results?: ImportResult[];
                jobId?: string | null;
            }>(res);
            if (!res.ok) {
                throw new Error(buildApiErrorMessage(data, 'Import failed'));
            }

            setSummary(data.summary || null);
            setResults(data.results || []);
            setSelectedIdentifiers({});
            setJobId(data.jobId || null);
            setJobStatus(null);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Import failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async () => {
        setReconcileLoading(true);
        setError('');
        setSummary(null);
        setResults([]);

        try {
            const res = await fetch('/api/admin/archive/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bundleIdentifier: preset === DEFAULT_ARCHIVE_PRESET_ID ? 'publicmovies212' : undefined,
                    limit
                })
            });

            const data = await readApiJson<{
                jobId?: string | null;
                summary?: ImportSummary;
            }>(res);
            if (!res.ok) {
                throw new Error(buildApiErrorMessage(data, 'Reconcile failed'));
            }

            setJobId(data.jobId || null);
            setJobStatus(null);
            setSummary(data.summary || null);
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Reconcile failed'));
        } finally {
            setReconcileLoading(false);
        }
    };

    const handleRefreshPosters = async () => {
        setRefreshLoading(true);
        setError('');
        setSummary(null);
        setResults([]);

        try {
            const res = await fetch('/api/admin/archive/posters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: 500,
                    offset: 0,
                    all: true,
                    force: true
                })
            });

            const data = await readApiJson<{
                jobId?: string | null;
                summary?: ImportSummary;
                job?: WorkerJobStatus;
            }>(res);
            if (!res.ok) {
                throw new Error(buildApiErrorMessage(data, 'Poster refresh failed'));
            }

            setJobId(data.jobId || null);
            setJobStatus(null);
            setSummary(data.summary || null);
            if (data.job) {
                setJobStatus(data.job);
            }
        } catch (err: unknown) {
            setError(getErrorMessage(err, 'Poster refresh failed'));
        } finally {
            setRefreshLoading(false);
        }
    };

    const progressPercent = jobStatus?.total
        ? Math.min(100, Math.round(((jobStatus.processed ?? 0) / jobStatus.total) * 100))
        : 0;

    const pollJobStatus = async (id: string) => {
        const res = await fetch(`/api/admin/archive/jobs?jobId=${encodeURIComponent(id)}`);
        const data = await readApiJson<{ job?: WorkerJobStatus }>(res);
        if (!res.ok) {
            throw new Error(buildApiErrorMessage(data, 'Failed to fetch job status'));
        }
        if (data?.job) {
            setJobStatus(data.job);
            if (data.job.summary) {
                setSummary(data.job.summary);
            }
        }
    };

    useEffect(() => {
        if (!jobId) return;
        const timer = setInterval(() => {
            pollJobStatus(jobId).catch(() => null);
        }, 3000);
        return () => clearInterval(timer);
    }, [jobId]);

    const readyIdentifiers = useMemo(
        () => results.filter((item) => item.status === 'ready').map((item) => getRowKey(item)),
        [results]
    );

    const allReadySelected = readyIdentifiers.length > 0
        && readyIdentifiers.every((id) => selectedIdentifiers[id]);

    const totalPages = totalAvailable ? Math.max(1, Math.ceil(totalAvailable / limit)) : null;

    useEffect(() => {
        setPage(1);
        setShuffleSeed(null);
        setTotalAvailable(null);
    }, [preset, importType, seriesListUrl, limit]);

    useEffect(() => {
        stopRequested.current = true;
        setCursor(null);
        setExhausted(false);
        setScanStats({ scanned: 0, filtered: {} });
    }, [preset, importType]);

    // Rows the admin cannot act on (already owned, unplayable, ...) are never listed.
    const visibleResults = useMemo(() => results.filter((item) => item.status !== 'skipped'), [results]);
    const busy = loading || scanning;
    const filteredTotal = Object.values(scanStats.filtered).reduce((sum, count) => sum + count, 0);
    const filteredBreakdown = Object.entries(scanStats.filtered)
        .filter(([, count]) => count > 0)
        .map(([reason, count]) => `${count} ${FILTER_LABELS[reason] || reason}`)
        .join(', ');

    const toggleSelectAll = () => {
        if (readyIdentifiers.length === 0) return;
        if (allReadySelected) {
            setSelectedIdentifiers({});
            return;
        }
        const next: Record<string, boolean> = {};
        readyIdentifiers.forEach((id) => {
            next[id] = true;
        });
        setSelectedIdentifiers(next);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                    <p style={{ color: '#A7ABB4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Admin</p>
                    <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Archive className="w-8 h-8 text-gold-mid" />
                        Import From Internet Archive
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                    <Link
                        href="/admin/reels"
                        style={{
                            textDecoration: 'none',
                            color: '#A7ABB4',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Film className="w-4 h-4" />
                        Reels Import
                    </Link>
                    <Link
                        href="/admin/upload"
                        style={{
                            textDecoration: 'none',
                            color: '#A7ABB4',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Film className="w-4 h-4" />
                        Upload Library
                    </Link>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                background: 'rgba(167, 171, 180, 0.05)',
                borderRadius: '1.25rem',
                padding: '2rem',
                border: '1px solid rgba(167, 171, 180, 0.1)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Import Type</label>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {(['movie', 'series'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setImportType(type)}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '999px',
                                    border: importType === type ? '1px solid #D4AF37' : '1px solid rgba(167, 171, 180, 0.3)',
                                    background: importType === type ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                                    color: importType === type ? '#D4AF37' : '#A7ABB4',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {type === 'movie' ? 'Movie' : 'Series'}
                            </button>
                        ))}
                    </div>
                    <span style={{ color: '#A7ABB4', fontSize: '0.75rem' }}>
                        Series imports can use an Archive search page or a details page that contains all episodes.
                    </span>
                </div>

                {importType === 'series' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Series URL</label>
                        <input
                            type="text"
                            value={seriesListUrl}
                            onChange={(e) => setSeriesListUrl(e.target.value)}
                            placeholder="https://archive.org/details/... or https://archive.org/search?query=..."
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
                        <span style={{ color: '#A7ABB4', fontSize: '0.75rem' }}>
                            Paste a details page with episode files, or a search page where each result is an episode.
                        </span>
                    </div>
                )}
                {importType === 'movie' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Preset</label>
                        <select
                            value={preset}
                            onChange={(e) => setPreset(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(11, 11, 13, 0.7)',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                color: '#F3F4F6',
                                fontSize: '0.95rem'
                            }}
                        >
                            {presetOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Number To Import</label>
                    <input
                        type="number"
                        min={1}
                        max={1000}
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

                {importType === 'series' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Discovery Page
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => handlePreview(Math.max(1, page - 1))}
                            disabled={loading || page <= 1}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.6rem',
                                border: '1px solid rgba(167, 171, 180, 0.3)',
                                background: 'transparent',
                                color: '#A7ABB4',
                                cursor: loading || page <= 1 ? 'not-allowed' : 'pointer',
                                opacity: loading || page <= 1 ? 0.5 : 1
                            }}
                        >
                            Prev
                        </button>
                        <input
                            type="number"
                            min={1}
                            value={page}
                            onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
                            style={{
                                width: '72px',
                                padding: '0.6rem',
                                borderRadius: '0.6rem',
                                background: 'rgba(11, 11, 13, 0.7)',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                color: '#F3F4F6',
                                fontSize: '0.95rem',
                                textAlign: 'center'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => handlePreview(page + 1)}
                            disabled={loading || (totalPages ? page >= totalPages : false)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.6rem',
                                border: '1px solid rgba(167, 171, 180, 0.3)',
                                background: 'transparent',
                                color: '#A7ABB4',
                                cursor: loading || (totalPages ? page >= totalPages : false) ? 'not-allowed' : 'pointer',
                                opacity: loading || (totalPages ? page >= totalPages : false) ? 0.5 : 1
                            }}
                        >
                            Next
                        </button>
                        {totalPages && (
                            <span style={{ color: '#A7ABB4', fontSize: '0.8rem' }}>
                                of {totalPages}
                            </span>
                        )}
                    </div>
                    <span style={{ color: '#A7ABB4', fontSize: '0.75rem' }}>
                        {importType === 'series' ? 'Use Next if you want a different detected series.' : ''}
                    </span>
                </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>File Preference</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                            type="checkbox"
                            checked={allowMkv}
                            onChange={(e) => setAllowMkv(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#D4AF37' }}
                        />
                        <span style={{ color: '#F3F4F6', fontSize: '0.9rem' }}>Allow MKV fallback</span>
                    </div>
                    <span style={{ color: '#A7ABB4', fontSize: '0.75rem' }}>MP4 is always preferred when available.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <ButtonPrimary
                        onClick={() => (importType === 'movie' ? runFind(true) : handlePreview())}
                        disabled={busy || (importType === 'series' && !seriesListUrl.trim())}
                        fullWidth
                    >
                        {busy ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {scanning ? `Searching... ${results.length} found` : 'Loading...'}
                            </span>
                        ) : importType === 'movie' ? 'Find films' : 'Preview'}
                    </ButtonPrimary>
                    {scanning && (
                        <button
                            type="button"
                            onClick={() => {
                                stopRequested.current = true;
                            }}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '0.75rem',
                                background: 'transparent',
                                border: '1px solid rgba(167, 171, 180, 0.3)',
                                color: '#A7ABB4',
                                fontSize: '0.9rem',
                                cursor: 'pointer'
                            }}
                        >
                            Stop searching
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleImportSelected}
                        disabled={busy || readyIdentifiers.length === 0 || !readyIdentifiers.some((id) => selectedIdentifiers[id])}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(212, 175, 55, 0.15)',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            color: '#D4AF37',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: busy ? 'not-allowed' : 'pointer',
                            opacity: busy || readyIdentifiers.length === 0 || !readyIdentifiers.some((id) => selectedIdentifiers[id]) ? 0.5 : 1
                        }}
                    >
                        Import Selected
                    </button>
                    <button
                        type="button"
                        onClick={handleReconcile}
                        disabled={reconcileLoading}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38BDF8',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: reconcileLoading ? 'not-allowed' : 'pointer',
                            opacity: reconcileLoading ? 0.6 : 1
                        }}
                    >
                        {reconcileLoading ? 'Reconciling...' : 'Reconcile S3'}
                    </button>
                    <button
                        type="button"
                        onClick={handleRefreshPosters}
                        disabled={refreshLoading}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(14, 165, 233, 0.12)',
                            border: '1px solid rgba(14, 165, 233, 0.35)',
                            color: '#38BDF8',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: refreshLoading ? 'not-allowed' : 'pointer',
                            opacity: refreshLoading ? 0.6 : 1
                        }}
                    >
                        {refreshLoading ? 'Refreshing...' : 'Refresh Posters'}
                    </button>
                    {error && (
                        <div style={{ color: '#F87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {(summary || jobId) && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {summary && <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                        { label: 'Ready', value: summary.ready, color: '#D4AF37' },
                        { label: 'Queued', value: summary.queued, color: '#D4AF37' },
                        { label: 'Imported', value: summary.imported, color: '#22C55E' },
                        { label: 'Updated', value: summary.updated, color: '#38BDF8' },
                        { label: 'Refreshed', value: summary.refreshed, color: '#38BDF8' },
                        { label: 'Rows Updated', value: summary.affectedRows, color: '#22C55E' },
                        { label: 'Skipped', value: summary.skipped, color: '#FACC15' },
                        { label: 'Failed', value: summary.failed, color: '#F87171' },
                        ].filter((item) => item.value !== undefined).map((item) => (
                        <div key={item.label} style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(11, 11, 13, 0.6)',
                            borderRadius: '999px',
                            border: '1px solid rgba(167, 171, 180, 0.1)',
                            color: item.color,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <CheckCircle2 className="w-4 h-4" />
                            {item.label}: {item.value}
                        </div>
                        ))}
                    </div>}
                        {summary?.searchQuery && (
                            <div style={{ color: '#A7ABB4', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                                Query: {summary.searchQuery}
                            </div>
                        )}
                    {jobId && (
                        <div style={{
                            padding: '1rem',
                            borderRadius: '1rem',
                            border: '1px solid rgba(167, 171, 180, 0.15)',
                            background: 'rgba(11, 11, 13, 0.6)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ color: '#F3F4F6', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {jobStatus?.type === 'poster_refresh' ? 'Poster Refresh Job' : 'Import Job'} {jobId}
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
                                <span>Processed: {jobStatus?.processed ?? 0}/{jobStatus?.total ?? summary?.requested ?? 0}</span>
                                {jobStatus?.reconciled !== undefined && <span>Reconciled: {jobStatus.reconciled}</span>}
                                {jobStatus?.refreshed !== undefined && <span>Refreshed: {jobStatus.refreshed}</span>}
                                {jobStatus?.affectedRows !== undefined && <span>Rows updated: {jobStatus.affectedRows}</span>}
                                {jobStatus?.sourceRows !== undefined && <span>Rows scanned: {jobStatus.sourceRows}</span>}
                                {jobStatus?.existing !== undefined && <span>Existing: {jobStatus.existing}</span>}
                                <span>Imported: {jobStatus?.imported ?? 0}</span>
                                <span>Updated: {jobStatus?.updated ?? 0}</span>
                                <span>Skipped: {jobStatus?.skipped ?? 0}</span>
                                <span>Failed: {jobStatus?.failed ?? 0}</span>
                            </div>
                            {jobStatus?.failures && jobStatus.failures.length > 0 && (
                                <div style={{
                                    marginTop: '0.85rem',
                                    paddingTop: '0.85rem',
                                    borderTop: '1px solid rgba(248, 113, 113, 0.2)',
                                    color: '#FCA5A5',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem'
                                }}>
                                    <strong style={{ color: '#F87171' }}>Failure samples</strong>
                                    {jobStatus.failures.slice(0, 5).map((failure, index) => (
                                        <span key={`${failure.identifier || 'failure'}-${failure.fileName || index}`}>
                                            {failure.title || failure.identifier || 'Item'}{failure.fileName ? ` / ${failure.fileName}` : ''}: {failure.reason || 'Failed'}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '2.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#F3F4F6', marginBottom: '1rem' }}>Results</h2>
                <div style={{
                    overflowX: 'auto',
                    borderRadius: '1rem',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    background: 'rgba(11, 11, 13, 0.6)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#A7ABB4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <th style={{ padding: '1rem', width: '64px' }}>
                                    <input
                                        type="checkbox"
                                        aria-label="Select all preview items"
                                        checked={allReadySelected}
                                        onChange={toggleSelectAll}
                                        disabled={readyIdentifiers.length === 0}
                                        style={{ width: '16px', height: '16px', accentColor: '#D4AF37' }}
                                    />
                                </th>
                                <th style={{ padding: '1rem' }}>Title</th>
                                <th style={{ padding: '1rem' }}>Episode</th>
                                <th style={{ padding: '1rem' }}>Selected File</th>
                                <th style={{ padding: '1rem' }}>Duration</th>
                                <th style={{ padding: '1rem' }}>Size</th>
                                <th style={{ padding: '1rem' }}>Source</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleResults.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: '1.5rem', color: '#A7ABB4' }}>
                                        {scanning ? 'Searching the archive...' : exhausted ? 'No new films left for this preset.' : 'No results yet.'}
                                    </td>
                                </tr>
                            ) : visibleResults.map((result) => (
                                <tr key={`${result.identifier}-${result.fileName || 'none'}`} style={{ borderTop: '1px solid rgba(167, 171, 180, 0.05)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        {result.status === 'ready' ? (
                                            <input
                                                type="checkbox"
                                                aria-label={`Select ${result.title}`}
                                                checked={Boolean(selectedIdentifiers[getRowKey(result)])}
                                                onChange={() =>
                                                    setSelectedIdentifiers((prev) => ({
                                                        ...prev,
                                                        [getRowKey(result)]: !prev[getRowKey(result)]
                                                    }))
                                                }
                                                style={{ width: '16px', height: '16px', accentColor: '#D4AF37' }}
                                            />
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#F3F4F6', fontWeight: 600 }}>
                                        {result.title}
                                        {result.seriesTitle && (
                                            <div style={{ marginTop: '0.35rem', color: '#A7ABB4', fontSize: '0.75rem', fontWeight: 500 }}>
                                                {result.seriesTitle}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4', whiteSpace: 'nowrap' }}>
                                        {result.seasonNumber && result.episodeNumber
                                            ? `S${String(result.seasonNumber).padStart(2, '0')}E${String(result.episodeNumber).padStart(2, '0')}`
                                            : '—'}
                                    </td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{result.fileName || '—'}</td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{formatDuration(result.duration)}</td>
                                    <td style={{ padding: '1rem', color: '#A7ABB4' }}>{formatSize(result.fileSize)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {result.sourcePageUrl ? (
                                            <a
                                                href={result.sourcePageUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{ color: '#D4AF37', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                            >
                                                <LinkIcon className="w-4 h-4" />
                                                View
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.35rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.08em',
                                            background: result.status === 'reconciled'
                                                ? 'rgba(34, 197, 94, 0.18)'
                                                : result.status === 'existing'
                                                ? 'rgba(100, 116, 139, 0.2)'
                                                : result.status === 'queued'
                                                ? 'rgba(59, 130, 246, 0.15)'
                                                : result.status === 'ready'
                                                ? 'rgba(212, 175, 55, 0.15)'
                                                : result.status === 'imported'
                                                ? 'rgba(34, 197, 94, 0.15)'
                                                : result.status === 'updated'
                                                    ? 'rgba(56, 189, 248, 0.15)'
                                                    : result.status === 'skipped'
                                                        ? 'rgba(250, 204, 21, 0.15)'
                                                        : 'rgba(248, 113, 113, 0.15)',
                                            color: result.status === 'reconciled'
                                                ? '#22C55E'
                                                : result.status === 'existing'
                                                ? '#94A3B8'
                                                : result.status === 'queued'
                                                ? '#60A5FA'
                                                : result.status === 'ready'
                                                ? '#D4AF37'
                                                : result.status === 'imported'
                                                ? '#22C55E'
                                                : result.status === 'updated'
                                                    ? '#38BDF8'
                                                    : result.status === 'skipped'
                                                        ? '#FACC15'
                                                        : '#F87171'
                                        }}>
                                            {result.status}
                                        </span>
                                        {result.reason && (
                                            <div style={{ marginTop: '0.5rem', color: '#A7ABB4', fontSize: '0.75rem' }}>{result.reason}</div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {importType === 'movie' && (scanStats.scanned > 0 || scanning) && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#A7ABB4', fontSize: '0.8rem' }} title={filteredBreakdown}>
                            {visibleResults.length} new films found after checking {scanStats.scanned}
                            {filteredTotal > 0 ? ` (${filteredTotal} not importable${filteredBreakdown ? `: ${filteredBreakdown}` : ''})` : ''}
                        </span>
                        {!scanning && !exhausted && cursor && (
                            <button
                                type="button"
                                onClick={() => runFind(false)}
                                disabled={busy}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(212, 175, 55, 0.15)',
                                    border: '1px solid rgba(212, 175, 55, 0.35)',
                                    color: '#D4AF37',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Find {limit} more
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
