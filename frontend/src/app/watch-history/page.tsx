'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { History, ArrowLeft } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { safeBtoa } from '@/lib/base64';

interface WatchEntry {
    id: string;
    videoId: string;
    videoTitle: string;
    videoPoster?: string | null;
    watchedAt: string;
    duration?: number | null;
    totalDuration?: number | null;
    completionPercent?: number | null;
    video?: {
        id: string;
        title: string;
        thumbnailUrl?: string | null;
        genre?: string | null;
        description?: string | null;
        duration?: number | null;
        releaseYear?: number | null;
        tmdbId?: string | null;
        sourceProvider?: string | null;
        sourcePageUrl?: string | null;
        sourceRights?: string | null;
        sourceLicenseUrl?: string | null;
    } | null;
}

export default function WatchHistoryPage() {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSession();
    const [entries, setEntries] = useState<WatchEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth?redirect=/watch-history');
            return;
        }
        fetchHistory();
    }, [user, page, sessionLoading]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/watch-history?page=${page}&limit=20`);
            if (!response.ok) {
                setEntries([]);
                return;
            }
            const data = await response.json();
            setEntries(data.watchHistory || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (error) {
            console.error('Failed to fetch watch history:', error);
        } finally {
            setLoading(false);
        }
    };

    const buildLink = (entry: WatchEntry) => {
        const video = entry.video;
        const encodedData = safeBtoa(JSON.stringify({
            id: video?.id || entry.videoId,
            title: video?.title || entry.videoTitle,
            poster: video?.thumbnailUrl || entry.videoPoster || '/poster-placeholder.svg',
            year: video?.releaseYear || new Date().getFullYear(),
            runtime: video?.duration ? Math.floor(video.duration / 60) : 0,
            genres: video?.genre ? [video.genre] : [],
            explanation: video?.description || '',
            playable: true,
            assetId: video?.id || entry.videoId,
            tmdbId: video?.tmdbId,
            tmdb_id: video?.tmdbId,
            sourceProvider: video?.sourceProvider,
            sourcePageUrl: video?.sourcePageUrl,
            sourceRights: video?.sourceRights,
            sourceLicenseUrl: video?.sourceLicenseUrl,
        }));
        return `/title/${video?.id || entry.videoId}?data=${encodedData}`;
    };

    if (sessionLoading) return null;

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '96px', paddingBottom: '140px' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <Link href="/" style={{ color: '#A7ABB4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowLeft size={16} />
                        Back
                    </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <History className="w-6 h-6 text-gold-mid" />
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#F3F4F6' }}>
                        Watch History
                    </h1>
                </div>
                <p style={{ color: '#A7ABB4', marginBottom: '2rem' }}>Your viewing history across devices.</p>

                {loading ? (
                    <div style={{ color: '#A7ABB4', padding: '2rem', textAlign: 'center' }}>Loading history...</div>
                ) : entries.length === 0 ? (
                    <div style={{ color: '#A7ABB4', padding: '2rem', textAlign: 'center' }}>No watch history yet.</div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {entries.map((entry) => (
                            <Link
                                key={entry.id}
                                href={buildLink(entry)}
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(167, 171, 180, 0.12)',
                                    background: 'rgba(11, 11, 13, 0.9)',
                                }}
                            >
                                <img
                                    src={entry.video?.thumbnailUrl || entry.videoPoster || '/poster-placeholder.svg'}
                                    alt={entry.videoTitle}
                                    style={{ width: 64, height: 96, borderRadius: 10, objectFit: 'cover' }}
                                    onError={(e) => {
                                        const target = e.currentTarget;
                                        target.onerror = null;
                                        target.src = '/poster-placeholder.svg';
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: '#F3F4F6' }}>{entry.videoTitle}</div>
                                    <div style={{ fontSize: '0.85rem', color: '#A7ABB4', marginTop: '0.25rem' }}>
                                        {entry.video?.releaseYear || '—'} {entry.video?.genre ? `· ${entry.video.genre}` : ''}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#8C9099', marginTop: '0.4rem' }}>
                                        Last watched {new Date(entry.watchedAt).toLocaleString()}
                                    </div>
                                    {entry.completionPercent !== null && entry.completionPercent !== undefined && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(167, 171, 180, 0.15)' }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        borderRadius: '999px',
                                                        width: `${Math.min(100, Math.round(entry.completionPercent))}%`,
                                                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                background: 'rgba(167, 171, 180, 0.08)',
                                color: '#F3F4F6',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.6 : 1,
                            }}
                        >
                            Prev
                        </button>
                        <span style={{ color: '#A7ABB4', padding: '0.6rem 0.9rem' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            style={{
                                padding: '0.6rem 1rem',
                                borderRadius: '10px',
                                border: '1px solid rgba(167, 171, 180, 0.2)',
                                background: 'rgba(167, 171, 180, 0.08)',
                                color: '#F3F4F6',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                opacity: page === totalPages ? 0.6 : 1,
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
