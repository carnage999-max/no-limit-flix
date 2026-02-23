'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { VideoPlayer } from '@/components';
import { PLAY_STORE_URL } from '@/lib/constants';
import { transformToCloudFront } from '@/lib/utils';
import { Tv } from 'lucide-react';

interface Video {
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    s3Url?: string;
    resolution?: string;
    duration?: number;
    tmdbId?: string;
}

interface MovieDetails {
    backdrop?: string;
    explanation?: string;
}

export default function WatchPage() {
    const params = useParams();
    const assetId = params.assetId as string;
    const [video, setVideo] = useState<Video | null>(null);
    const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    <div style={{ fontSize: '32px', marginBottom: '1rem' }}>⏳</div>
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
                    <Link href="/" style={{ color: '#D4AF37', marginTop: '1rem', display: 'inline-block' }}>← Back to home</Link>
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
                    <div className="watch-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}
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
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <span style={{
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    color: '#0B0B0D',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    background: '#D4AF37'
                                }}>Internal Library</span>
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

                            {/* Why You Might Like This */}
                            <div
                                style={{
                                    padding: '2rem',
                                    borderRadius: '1.25rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    marginBottom: '2.5rem'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '4px',
                                    height: '100%',
                                    background: 'linear-gradient(to bottom, #F6D365, #D4AF37)'
                                }} />

                                <h3
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        color: '#D4AF37',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.2em',
                                        marginBottom: '1rem',
                                    }}
                                >
                                    About this video
                                </h3>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.6 }}>
                                    <span style={{ fontSize: '12px', color: '#A7ABB4', fontWeight: '500' }}>Streaming Ready</span>
                                    <span style={{ fontSize: '12px', color: '#4ADE80' }}>✓</span>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Play on</span>
                                    <ExternalPlayerLink
                                        href={`vlc://${streamUrl}`}
                                        title="Play in VLC"
                                        bgColor="rgba(234, 88, 12, 0.1)"
                                        hoverColor="rgba(234, 88, 12, 0.2)"
                                        borderColor="rgba(234, 88, 12, 0.3)"
                                        textColor="#EA580C"
                                        label="VLC"
                                    />
                                    <ExternalPlayerLink
                                        href={`iina://weblink?url=${streamUrl}`}
                                        title="Play in IINA (Mac)"
                                        bgColor="rgba(59, 130, 246, 0.1)"
                                        hoverColor="rgba(59, 130, 246, 0.2)"
                                        borderColor="rgba(59, 130, 246, 0.3)"
                                        textColor="#3B82F6"
                                        label="IINA"
                                    />
                                </div>

                                {/* Mobile App Promo */}
                                <div style={{ padding: '1.5rem', borderRadius: '1rem', background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(246,211,101,0.04) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                </div>

                {/* Footer shadow */}
                <div style={{ height: '96px', background: 'linear-gradient(to top, black, transparent)', pointerEvents: 'none' }} />
            </main>
        </>
    );
}

// Separate component for external player links with hover effects
function ExternalPlayerLink({
    href,
    title,
    bgColor,
    hoverColor,
    borderColor,
    textColor,
    label
}: {
    href: string;
    title: string;
    bgColor: string;
    hoverColor: string;
    borderColor: string;
    textColor: string;
    label: string;
}) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <a
            href={href}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: isHovered ? hoverColor : bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '0.75rem',
                textDecoration: 'none',
                transition: 'all 0.3s',
                cursor: 'pointer'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Tv size={16} style={{ color: textColor }} />
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: textColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        </a>
    );
}
