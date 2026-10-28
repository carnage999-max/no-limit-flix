'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, ExternalLink, Flag, Loader2 } from 'lucide-react';
import { buildWatchHref } from '@/lib/watch-asset';

interface FlaggedMovie {
    id: string;
    videoId: string;
    reason: string | null;
    createdAt: string;
    flaggedBy: { username: string } | null;
    video: {
        id: string;
        title: string;
        thumbnailUrl: string | null;
        type: string;
        releaseYear: number | null;
    };
}

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function AdminFlagsPage() {
    const [flags, setFlags] = useState<FlaggedMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [clearingId, setClearingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await fetch('/api/admin/flags', { cache: 'no-store' });
            if (!response.ok) throw new Error('Failed to load flagged movies');
            const data = await response.json();
            setFlags(data.flags || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load flagged movies');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const clearFlag = async (videoId: string) => {
        setClearingId(videoId);
        setError('');
        try {
            const response = await fetch(`/api/admin/flags?videoId=${encodeURIComponent(videoId)}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Could not clear the flag');
            setFlags((previous) => previous.filter((flag) => flag.videoId !== videoId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not clear the flag');
        } finally {
            setClearingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Link
                href="/admin"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#A7ABB4', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1.5rem' }}
            >
                <ArrowLeft className="w-4 h-4" />
                Admin dashboard
            </Link>

            <p style={{ color: '#A7ABB4', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Admin</p>
            <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, color: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Flag className="w-8 h-8 text-gold-mid" />
                Flagged movies
            </h1>
            <p style={{ color: '#A7ABB4', marginBottom: '2rem' }}>
                Movies an admin marked as having wrong metadata. Fix them, then clear the flag.
            </p>

            {error && <p style={{ color: '#F87171', marginBottom: '1rem' }}>{error}</p>}

            {loading ? (
                <div style={{ color: '#A7ABB4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                </div>
            ) : flags.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#A7ABB4', border: '1px solid rgba(167, 171, 180, 0.1)', borderRadius: '1rem' }}>
                    Nothing flagged. Use the Flag metadata button on a movie to add one.
                </div>
            ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {flags.map((flag) => (
                        <li
                            key={flag.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '64px minmax(0, 1fr) auto',
                                gap: '1rem',
                                alignItems: 'center',
                                padding: '0.85rem',
                                borderRadius: '1rem',
                                border: '1px solid rgba(167, 171, 180, 0.12)',
                                background: 'rgba(11, 11, 13, 0.6)',
                            }}
                        >
                            <span style={{ position: 'relative', width: '64px', height: '88px', borderRadius: '0.5rem', overflow: 'hidden', background: 'rgba(167, 171, 180, 0.08)' }}>
                                <Image
                                    src={flag.video.thumbnailUrl || '/poster-placeholder.svg'}
                                    alt={flag.video.title}
                                    fill
                                    sizes="64px"
                                    style={{ objectFit: 'cover' }}
                                    unoptimized
                                />
                            </span>
                            <span style={{ minWidth: 0 }}>
                                <span style={{ display: 'block', color: '#F3F4F6', fontWeight: 700, overflowWrap: 'anywhere' }}>
                                    {flag.video.title}
                                    {flag.video.releaseYear ? <span style={{ color: '#A7ABB4', fontWeight: 500 }}> ({flag.video.releaseYear})</span> : null}
                                </span>
                                <span style={{ display: 'block', color: flag.reason ? '#E5E7EB' : '#6B7280', fontSize: '0.9rem', marginTop: '0.3rem', overflowWrap: 'anywhere' }}>
                                    {flag.reason || 'No reason given'}
                                </span>
                                <span style={{ display: 'block', color: '#A7ABB4', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                                    Flagged {formatDate(flag.createdAt)}{flag.flaggedBy ? ` by ${flag.flaggedBy.username}` : ''}
                                </span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                                <Link
                                    href={buildWatchHref(flag.video.id)}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', minHeight: '34px', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(167, 171, 180, 0.3)', color: '#A7ABB4', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Open
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => clearFlag(flag.videoId)}
                                    disabled={clearingId === flag.videoId}
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', minHeight: '34px', padding: '0.35rem 0.8rem', borderRadius: '999px', border: '1px solid rgba(34, 197, 94, 0.4)', background: 'rgba(34, 197, 94, 0.12)', color: '#22C55E', fontSize: '0.8rem', fontWeight: 700, cursor: clearingId === flag.videoId ? 'wait' : 'pointer', opacity: clearingId === flag.videoId ? 0.6 : 1 }}
                                >
                                    <Check className="w-3 h-3" />
                                    Clear flag
                                </button>
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
