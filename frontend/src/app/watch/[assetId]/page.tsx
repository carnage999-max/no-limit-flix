'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { VideoPlayer } from '@/components';
import { PLAY_STORE_URL } from '@/lib/constants';
import { ExternalLink, Loader2, ArrowLeft } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    s3Url?: string;
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

export default function WatchPage() {
    const params = useParams();
    const router = useRouter();
    const assetId = params.assetId as string;
    const [video, setVideo] = useState<Video | null>(null);
    const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, loading: sessionLoading } = useSession();

    // Check authentication on mount
    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push(`/auth?redirect=/watch/${assetId}`);
        }
    }, [assetId, router, user, sessionLoading]);

    useEffect(() => {
        if (!assetId) {
            setError('No asset ID provided');
            setLoading(false);
            return;
        }

        const fetchVideoData = async () => {
            try {
                const response = await fetch(`/api/watch/video/${assetId}`);
                if (!response.ok) throw new Error('Failed to fetch video');
                const data = await response.json();
                setVideo(data.video);
                
                if (data.video.tmdbId) {
                    try {
                        const tmdbResponse = await fetch(`/api/title/${data.video.tmdbId}`);
                        if (tmdbResponse.ok) {
                            const tmdbData = await tmdbResponse.json();
                            setMovieDetails(tmdbData);
                        }
                    } catch (e) {
                        console.warn('Failed to fetch TMDb details');
                    }
                }
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchVideoData();
    }, [assetId]);

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

    return (
        <>
            <style>{`
                @media (max-width: 1024px) {
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
                        src={movieDetails?.backdrop || video.thumbnailUrl}
                        alt={video.title}
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
                        maxWidth: '1200px',
                        margin: '-200px auto 0',
                        padding: '0 2rem 4rem',
                        position: 'relative',
                        zIndex: 1,
                        width: '100%',
                    }}
                >
                    <div className="watch-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
                        {/* Player Container */}
                        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>
                            <div
                                style={{
                                    borderRadius: '1.5rem',
                                    overflow: 'hidden',
                                    background: '#000',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                    aspectRatio: '16 / 9',
                                }}
                            >
                                <VideoPlayer
                                    assetId={assetId}
                                    src={streamUrl}
                                    poster={video.thumbnailUrl || movieDetails?.backdrop}
                                />
                            </div>
                        </div>

                        {/* Meta Info */}
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
                                    marginBottom: '2.5rem',
                                    fontStyle: 'italic'
                                }}
                            >
                                {video.description || movieDetails?.explanation}
                            </p>

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
                </div>

                {/* Footer shadow */}
                <div style={{ height: '96px', background: 'linear-gradient(to top, black, transparent)', pointerEvents: 'none' }} />
            </main>
        </>
    );
}
