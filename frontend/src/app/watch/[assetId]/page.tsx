'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlagMovieButton, UserRatingPanel, VideoPlayer } from '@/components';
import { PLAY_STORE_URL } from '@/lib/constants';
import { ExternalLink, Loader2, ArrowLeft, ListVideo, Play } from 'lucide-react';
import { useSession } from '@/context/SessionContext';
import { buildWatchHref, normalizeAssetReference } from '@/lib/watch-asset';
import { useVideoFlags } from '@/lib/use-video-flags';

interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    s3Url?: string;
    type?: string;
    seriesTitle?: string;
    seasonNumber?: number;
    episodeNumber?: number;
    genre?: string;
    rating?: string;
    averageRating?: number;
    ratingCount?: number;
    resolution?: string;
    duration?: number;
    tmdbId?: string;
    sourceType?: string;
    sourceProvider?: string;
    sourcePageUrl?: string;
    sourceRights?: string;
    sourceLicenseUrl?: string;
}

interface MovieDetails {
    backdrop?: string;
    explanation?: string;
}

interface SeriesContext {
    seriesTitle: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    genre?: string | null;
    rating?: string | null;
    averageRating?: number | null;
    ratingCount?: number | null;
    episodes: Video[];
}

export default function WatchPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = normalizeAssetReference(params.assetId as string);
    const [selectedAssetId, setSelectedAssetId] = useState(assetId);
    const [video, setVideo] = useState<Video | null>(null);
    const [series, setSeries] = useState<SeriesContext | null>(null);
    const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [episodeLoading, setEpisodeLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
    const { user, loading: sessionLoading } = useSession();
    const isAdmin = user?.role === 'admin';
    const { flaggedIds, busyId, error: flagError, flag, unflag } = useVideoFlags(isAdmin);

    // Check authentication on mount
    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push(`/auth?redirect=${encodeURIComponent(buildWatchHref(assetId))}`);
        }
    }, [assetId, router, user, sessionLoading]);

    const loadVideoData = useCallback(async (targetAssetId: string, options: { initial?: boolean } = {}) => {
        if (!targetAssetId) {
            setError('No asset ID provided');
            setLoading(false);
            return;
        }

        if (options.initial) {
            setLoading(true);
        } else {
            setEpisodeLoading(true);
        }
        setError(null);

            try {
                const response = await fetch(`/api/watch/video/${encodeURIComponent(targetAssetId)}`);
                if (!response.ok) throw new Error('Failed to fetch video');
                const data = await response.json();
                setVideo(data.video);
                setSeries(data.series || null);
                setSelectedAssetId(data.video?.id || targetAssetId);

                if (data.series?.episodes?.length) {
                    const currentSeason = data.video?.seasonNumber ?? data.series.episodes[0]?.seasonNumber ?? null;
                    setSelectedSeason((previousSeason) => previousSeason ?? currentSeason);
                } else {
                    setSelectedSeason(null);
                }

                if (data.video.tmdbId) {
                    try {
                        const tmdbResponse = await fetch(`/api/title/${data.video.tmdbId}`);
                        if (tmdbResponse.ok) {
                            const tmdbData = await tmdbResponse.json();
                            setMovieDetails(tmdbData);
                        }
                    } catch {
                        console.warn('Failed to fetch TMDb details');
                    }
                } else {
                    setMovieDetails(null);
                }
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
                setEpisodeLoading(false);
            }
    }, []);

    useEffect(() => {
        loadVideoData(assetId, { initial: true });
    }, [assetId, loadVideoData]);

    const seasons = useMemo(() => {
        const values = (series?.episodes || [])
            .map((episode) => episode.seasonNumber ?? 1)
            .filter((season) => Number.isFinite(season));
        return Array.from(new Set(values)).sort((a, b) => a - b);
    }, [series]);

    const filteredEpisodes = useMemo(() => {
        if (!series?.episodes?.length) return [];
        if (selectedSeason === null) return series.episodes;
        return series.episodes.filter((episode) => (episode.seasonNumber ?? 1) === selectedSeason);
    }, [series, selectedSeason]);

    if (loading) {
        return (
            <main style={{ minHeight: '100vh', background: '#0B0B0D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ marginBottom: '1rem', display: 'inline-block' }} />
                    <p>Loading...</p>
                </div>
            </main>
        );
    }

    if (error || !video) {
        return (
            <main style={{ minHeight: '100vh', background: '#0B0B0D', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#F87171' }}>Error: {error || 'Video not found'}</p>
                    <Link href="/" style={{ color: '#D4AF37', marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowLeft className="w-4 h-4" />
                        Back to home
                    </Link>
                </div>
            </main>
        );
    }

    const streamUrl = video.s3Url || '';
    const isSeries = Boolean(series && video.type === 'series');
    const displayTitle = series?.seriesTitle || video.title;
    const displayDescription = series?.description || video.description || movieDetails?.explanation || '';
    const currentSeason = video.seasonNumber ?? 1;
    const currentEpisode = video.episodeNumber ?? null;

    return (
        <>
            <style>{`
                @media (max-width: 1024px) {
                    .watch-meta-grid {
                        grid-template-columns: 1fr !important;
                        gap: 1.5rem !important;
                    }
                    .watch-grid {
                        grid-template-columns: 1fr !important;
                        gap: 2rem !important;
                    }
                    .watch-content {
                        margin: -100px auto 0 !important;
                        padding: 0 1rem 2rem !important;
                    }
                    .hero-section {
                        height: 40vh !important;
                    }
                    .series-episode-panel {
                        position: static !important;
                    }
                }
                @media (max-width: 640px) {
                    .watch-content {
                        margin: -80px auto 0 !important;
                        padding: 0 1rem 2rem !important;
                    }
                    .hero-section {
                        height: 30vh !important;
                    }
                    .watch-title {
                        font-size: 1.875rem !important;
                    }
                    .episode-button-grid {
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                    }
                }
            `}</style>
            <main style={{ minHeight: '100vh', background: '#0B0B0D', color: 'white', display: 'flex', flexDirection: 'column' }}>
                {/* Hero Section with Backdrop */}
                <div
                    className="hero-section"
                    style={{
                        height: '60vh',
                        minHeight: '500px',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <img
                        src={series?.thumbnailUrl || movieDetails?.backdrop || video.thumbnailUrl}
                        alt={displayTitle}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.3,
                        }}
                    />

                    {/* Gradient Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, #0B0B0D 0%, transparent 100%)',
                        }}
                    />
                </div>

                {/* Content */}
                <div
                    className="watch-content"
                    style={{
                        maxWidth: '1500px',
                        ...(isSeries ? { maxWidth: '1600px' } : {}),
                        margin: '-200px auto 0',
                        padding: '0 2rem 4rem',
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                    }}
                >
                    <div
                        className="watch-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: isSeries ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)',
                            gap: isSeries ? '1.25rem' : '2.5rem',
                            alignItems: 'start'
                        }}
                    >
                        {/* Player Container */}
                        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
                            <div
                                style={{
                                    borderRadius: '1.5rem',
                                    overflow: 'hidden',
                                    background: '#000',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                    aspectRatio: '16 / 9',
                                    // Fill the column, but stay inside the window so the controls are never pushed off-screen.
                                    width: 'min(100%, calc((100vh - 96px) * 16 / 9))',
                                    margin: '0 auto',
                                }}
                            >
                                <VideoPlayer
                                    key={selectedAssetId}
                                    assetId={selectedAssetId}
                                    src={streamUrl}
                                    poster={video.thumbnailUrl || series?.thumbnailUrl || movieDetails?.backdrop}
                                    title={video.title}
                                />
                            </div>
                            {episodeLoading && (
                                <div style={{ marginTop: '0.75rem', color: '#A7ABB4', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading episode
                                </div>
                            )}
                            {isSeries && (
                                <div style={{ marginTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#A7ABB4', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                                        <span>{displayTitle}</span>
                                        <span>Season {currentSeason}</span>
                                        {currentEpisode && <span>Episode {currentEpisode}</span>}
                                    </div>
                                    <h1
                                        className="watch-title"
                                        style={{
                                            fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                                            fontWeight: '700',
                                            color: '#F3F4F6',
                                            marginBottom: '0.75rem',
                                            lineHeight: '1',
                                            letterSpacing: '0'
                                        }}
                                    >
                                        {video.title}
                                    </h1>
                                    {displayDescription && (
                                        <p style={{ maxWidth: '880px', fontSize: '1rem', color: '#D1D5DB', lineHeight: '1.7', marginBottom: '1.25rem' }}>
                                            {displayDescription}
                                        </p>
                                    )}
                                    <UserRatingPanel videoId={video.id} />
                                    {isAdmin && (
                                        <div style={{ marginTop: '1rem' }}>
                                            <FlagMovieButton
                                                flagged={flaggedIds.has(video.id)}
                                                busy={busyId === video.id}
                                                onFlag={(reason) => flag(video.id, reason)}
                                                onUnflag={() => unflag(video.id)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Meta Info */}
                        {isSeries ? (
                            <aside
                                className="series-episode-panel"
                                style={{
                                    position: 'sticky',
                                    top: '1rem',
                                    minHeight: '520px',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(31, 34, 40, 0.94)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    padding: '1.25rem',
                                    boxShadow: '0 18px 50px rgba(0,0,0,0.35)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#F3F4F6', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                                    <ListVideo className="w-5 h-5" />
                                    Episodes
                                </div>
                                <div style={{ color: '#9CA3AF', fontSize: '0.82rem', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                                    No Limit Flix · {series?.episodes.length || 0} episodes
                                </div>
                                {seasons.length > 1 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {seasons.map((season) => (
                                            <button
                                                key={season}
                                                type="button"
                                                onClick={() => setSelectedSeason(season)}
                                                style={{
                                                    minWidth: '58px',
                                                    height: '34px',
                                                    borderRadius: '0.3rem',
                                                    border: '0',
                                                    background: selectedSeason === season ? '#14532D' : 'rgba(255,255,255,0.1)',
                                                    color: selectedSeason === season ? '#22C55E' : '#E5E7EB',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                S{String(season).padStart(2, '0')}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="episode-button-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '0.55rem' }}>
                                    {filteredEpisodes.map((episode) => {
                                        const active = episode.id === video.id;
                                        const label = episode.episodeNumber
                                            ? String(episode.episodeNumber).padStart(2, '0')
                                            : String(filteredEpisodes.indexOf(episode) + 1).padStart(2, '0');
                                        return (
                                            <button
                                                key={episode.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSeason(episode.seasonNumber ?? 1);
                                                    loadVideoData(episode.id);
                                                }}
                                                disabled={episodeLoading || active}
                                                title={episode.title}
                                                style={{
                                                    height: '48px',
                                                    borderRadius: '0.3rem',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: active ? '#14532D' : 'rgba(255,255,255,0.12)',
                                                    color: active ? '#22C55E' : '#E5E7EB',
                                                    fontWeight: 700,
                                                    cursor: active || episodeLoading ? 'default' : 'pointer',
                                                    opacity: episodeLoading && !active ? 0.65 : 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {active ? <Play className="w-4 h-4" /> : label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {displayDescription && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div style={{ color: '#F3F4F6', fontWeight: 700, marginBottom: '0.5rem' }}>Synopsis</div>
                                        <p style={{ color: '#C7CBD1', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                                            {displayDescription}
                                        </p>
                                    </div>
                                )}
                            </aside>
                        ) : (
                        <div
                            className="watch-meta-grid"
                            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '3rem', alignItems: 'start' }}
                        >
                            <div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                <span style={{
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    color: '#0B0B0D',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    background: video.sourceProvider === 'internet_archive' ? '#38BDF8' : '#D4AF37'
                                }}>
                                    {video.sourceProvider === 'internet_archive' ? 'Internet Archive' : 'Internal Library'}
                                </span>
                                <span style={{ fontSize: '0.875rem', color: '#A7ABB4', fontWeight: '500' }}>{video.resolution || 'HD'}</span>
                                <span style={{ fontSize: '0.875rem', color: '#A7ABB4', fontWeight: '500' }}>
                                    {video.duration ? `${Math.floor(video.duration / 60)}m` : ''}
                                </span>
                            </div>

                            <h1
                                className="watch-title"
                                style={{
                                    fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                                    fontWeight: '700',
                                    color: '#F3F4F6',
                                    marginBottom: '0.75rem',
                                    lineHeight: '1',
                                    letterSpacing: '-0.03em'
                                }}
                            >
                                {video.title}
                            </h1>

                            <p
                                style={{
                                    fontSize: '1.125rem',
                                    color: '#F3F4F6',
                                    lineHeight: '1.7',
                                    marginBottom: '1.5rem',
                                    fontStyle: 'italic'
                                }}
                            >
                                {video.description || movieDetails?.explanation}
                            </p>

                            <UserRatingPanel videoId={video.id} />

                            {isAdmin && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <FlagMovieButton
                                        flagged={flaggedIds.has(video.id)}
                                        busy={busyId === video.id}
                                        onFlag={(reason) => flag(video.id, reason)}
                                        onUnflag={() => unflag(video.id)}
                                    />
                                    {flagError && (
                                        <div style={{ color: '#FFB3BB', fontSize: '0.8rem', marginTop: '0.5rem' }}>{flagError}</div>
                                    )}
                                </div>
                            )}
                            </div>

                            <div>
                            {video.sourceProvider === 'internet_archive' && (
                                <div style={{
                                    marginBottom: '2rem',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(56, 189, 248, 0.3)',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    color: '#E2E8F0'
                                }}>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#93C5FD', marginBottom: '0.5rem' }}>
                                        Source
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                        Internet Archive
                                    </div>
                                    {video.sourceRights && (
                                        <div style={{ fontSize: '0.85rem', color: '#A7ABB4', marginTop: '0.5rem' }}>
                                            Rights: {video.sourceRights}
                                        </div>
                                    )}
                                    {video.sourceLicenseUrl && (
                                        <a
                                            href={video.sourceLicenseUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem', color: '#93C5FD', textDecoration: 'none', fontSize: '0.85rem' }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            License details
                                        </a>
                                    )}
                                    {video.sourcePageUrl && (
                                        <a
                                            href={video.sourcePageUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', color: '#93C5FD', textDecoration: 'none', fontSize: '0.85rem' }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View on Internet Archive
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Mobile App Promo */}
                            <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(246,211,101,0.04) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#D4AF37', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>Better on Mobile</p>
                                    <p style={{ fontSize: '0.875rem', color: '#A7ABB4', lineHeight: '1.5' }}>H.265/4K & offline viewing</p>
                                </div>
                                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
                                    <img src="/google-play.svg" alt="Google Play" style={{ height: '40px', width: 'auto' }} />
                                </a>
                            </div>
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                {/* Footer shadow */}
                <div style={{ height: '96px', background: 'linear-gradient(to top, black, transparent)', pointerEvents: 'none' }} />
            </main>
        </>
    );
}
