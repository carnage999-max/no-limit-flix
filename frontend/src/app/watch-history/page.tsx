'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { safeBtoa } from '@/lib/base64';
import { ConfirmModal, ShellPage, ShellPageHeader } from '@/components';
import { useToast } from '@/components/Toast';

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

const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
};

export default function WatchHistoryPage() {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSession();
    const [entries, setEntries] = useState<WatchEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const { showToast } = useToast();

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
        <ShellPage width="default">
            <div className="utility-actions" style={{ marginBottom: '1.5rem' }}>
                <Link href="/" style={{ color: '#A7ABB4', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowLeft size={16} />
                        Back
                </Link>
            </div>

            <ShellPageHeader
                eyebrow="Library"
                title="Watch History"
                subtitle="Your viewing history across devices."
                actions={entries.length > 0 ? (
                    <button type="button" onClick={() => setShowClearConfirm(true)} className="utility-danger-button">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Trash2 size={16} />
                            Clear history
                        </span>
                    </button>
                ) : null}
            />

            <div className="glass-panel utility-panel">
                {loading ? (
                    <div className="utility-empty">Loading history...</div>
                ) : entries.length === 0 ? (
                    <div className="utility-empty">No watch history yet.</div>
                ) : (
                    <div className="utility-list">
                        {entries.map((entry) => (
                            <Link
                                key={entry.id}
                                href={buildLink(entry)}
                                className="utility-result-row"
                                style={{ padding: '1rem' }}
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
                    <div className="utility-pagination" style={{ marginTop: '2rem' }}>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="utility-secondary-button"
                            style={{ opacity: page === 1 ? 0.6 : 1 }}
                        >
                            Prev
                        </button>
                        <span style={{ color: '#A7ABB4', padding: '0.6rem 0.9rem' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="utility-secondary-button"
                            style={{ opacity: page === totalPages ? 0.6 : 1 }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
            <ConfirmModal
                open={showClearConfirm}
                title="Clear watch history?"
                description="This will remove your entire watch history across devices. This action cannot be undone."
                confirmText="Clear history"
                onConfirm={async () => {
                    try {
                        const res = await fetch('/api/watch-history', { method: 'DELETE' });
                        if (!res.ok) {
                            throw new Error('Failed to clear watch history');
                        }
                        setEntries([]);
                        setTotalPages(1);
                        setPage(1);
                        showToast('Watch history cleared', 'success');
                    } catch (error: unknown) {
                        showToast(getErrorMessage(error, 'Failed to clear watch history'), 'error');
                    } finally {
                        setShowClearConfirm(false);
                    }
                }}
                onCancel={() => setShowClearConfirm(false)}
            />
        </ShellPage>
    );
}
