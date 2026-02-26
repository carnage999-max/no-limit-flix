'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ButtonPrimary } from '@/components';
import { ARCHIVE_PRESETS, DEFAULT_ARCHIVE_PRESET_ID } from '@/lib/internet-archive';
import { Archive, CheckCircle2, AlertCircle, Loader2, Link as LinkIcon, Film } from 'lucide-react';

interface ImportResult {
    identifier: string;
    title: string;
    fileName?: string;
    playbackUrl?: string;
    fileSize?: string | null;
    duration?: number | null;
    sourcePageUrl?: string;
    status: 'imported' | 'updated' | 'skipped' | 'failed' | 'ready';
    reason?: string;
}

export default function AdminImportPage() {
    const [preset, setPreset] = useState(DEFAULT_ARCHIVE_PRESET_ID);
    const [limit, setLimit] = useState(6);
    const [allowMkv, setAllowMkv] = useState(false);
    const [importType, setImportType] = useState<'movie' | 'series'>('movie');
    const [seriesTitle, setSeriesTitle] = useState('');
    const [seasonNumber, setSeasonNumber] = useState(1);
    const [startEpisodeNumber, setStartEpisodeNumber] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState<ImportResult[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [selectedIdentifiers, setSelectedIdentifiers] = useState<Record<string, boolean>>({});

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

    const handlePreview = async () => {
        setLoading(true);
        setError('');
        setSummary(null);
        setResults([]);
        setSelectedIdentifiers({});

        try {
            const res = await fetch('/api/admin/archive/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preset,
                    limit,
                    allowMkv,
                    importType,
                    seriesTitle: importType === 'series' ? seriesTitle : undefined,
                    seasonNumber: importType === 'series' ? seasonNumber : undefined,
                    startEpisodeNumber: importType === 'series' ? startEpisodeNumber : undefined,
                    dryRun: true
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setSummary(data.summary);
            setResults(data.results || []);
        } catch (err: any) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
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
                    seriesTitle: importType === 'series' ? seriesTitle : undefined,
                    seasonNumber: importType === 'series' ? seasonNumber : undefined,
                    startEpisodeNumber: importType === 'series' ? startEpisodeNumber : undefined,
                    items: selected.map((item) => ({
                        identifier: item.identifier,
                        fileName: item.fileName || null
                    })),
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setSummary(data.summary);
            setResults(data.results || []);
            setSelectedIdentifiers({});
        } catch (err: any) {
            setError(err.message || 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    const readyIdentifiers = useMemo(
        () => results.filter((item) => item.status === 'ready').map((item) => getRowKey(item)),
        [results]
    );

    const allReadySelected = readyIdentifiers.length > 0
        && readyIdentifiers.every((id) => selectedIdentifiers[id]);

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
                        Series imports filter by title and attempt to parse season/episode.
                    </span>
                </div>

                {importType === 'series' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Series Title</label>
                        <input
                            type="text"
                            value={seriesTitle}
                            onChange={(e) => setSeriesTitle(e.target.value)}
                            placeholder="Enter series title"
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
                )}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Number To Import</label>
                    <input
                        type="number"
                        min={1}
                        max={50}
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
                        <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Season #</label>
                        <input
                            type="number"
                            min={1}
                            value={seasonNumber}
                            onChange={(e) => setSeasonNumber(Number(e.target.value))}
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
                )}

                {importType === 'series' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#A7ABB4', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Start Episode #</label>
                        <input
                            type="number"
                            min={1}
                            value={startEpisodeNumber}
                            onChange={(e) => setStartEpisodeNumber(Number(e.target.value))}
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
                        onClick={handlePreview}
                        disabled={loading || (importType === 'series' && !seriesTitle.trim())}
                        fullWidth
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading...
                            </span>
                        ) : 'Preview'}
                    </ButtonPrimary>
                    <button
                        type="button"
                        onClick={handleImportSelected}
                        disabled={loading || readyIdentifiers.length === 0 || !readyIdentifiers.some((id) => selectedIdentifiers[id])}
                        style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(212, 175, 55, 0.15)',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            color: '#D4AF37',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading || readyIdentifiers.length === 0 || !readyIdentifiers.some((id) => selectedIdentifiers[id]) ? 0.5 : 1
                        }}
                    >
                        Import Selected
                    </button>
                    {error && (
                        <div style={{ color: '#F87171', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {summary && (
                <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                        { label: 'Ready', value: summary.ready, color: '#D4AF37' },
                        { label: 'Imported', value: summary.imported, color: '#22C55E' },
                        { label: 'Updated', value: summary.updated, color: '#38BDF8' },
                        { label: 'Skipped', value: summary.skipped, color: '#FACC15' },
                        { label: 'Failed', value: summary.failed, color: '#F87171' },
                        ].map((item) => (
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
                    </div>
                    {summary.searchQuery && (
                        <div style={{ color: '#A7ABB4', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                            Query: {summary.searchQuery}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
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
                                <th style={{ padding: '1rem' }}>Selected File</th>
                                <th style={{ padding: '1rem' }}>Duration</th>
                                <th style={{ padding: '1rem' }}>Size</th>
                                <th style={{ padding: '1rem' }}>Source</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '1.5rem', color: '#A7ABB4' }}>
                                        No results yet.
                                    </td>
                                </tr>
                            ) : results.map((result) => (
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
                                    <td style={{ padding: '1rem', color: '#F3F4F6', fontWeight: 600 }}>{result.title}</td>
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
                                            background: result.status === 'ready'
                                                ? 'rgba(212, 175, 55, 0.15)'
                                                : result.status === 'imported'
                                                ? 'rgba(34, 197, 94, 0.15)'
                                                : result.status === 'updated'
                                                    ? 'rgba(56, 189, 248, 0.15)'
                                                    : result.status === 'skipped'
                                                        ? 'rgba(250, 204, 21, 0.15)'
                                                        : 'rgba(248, 113, 113, 0.15)',
                                            color: result.status === 'ready'
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
            </div>
        </div>
    );
}
