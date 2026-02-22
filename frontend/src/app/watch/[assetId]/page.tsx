import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import { ButtonSecondary, VideoPlayer } from '@/components';
import { PLAY_STORE_URL } from '@/lib/constants';
import { Tv, ExternalLink } from 'lucide-react';
import { transformToCloudFront } from '@/lib/utils';

export default async function WatchPage({ params }: { params: Promise<{ assetId: string }> }) {
    const { assetId } = await params;

    // 1. Fetch Video from DB
    const video = await prisma.video.findUnique({
        where: { id: assetId }
    });

    if (!video || video.status !== 'completed') {
        notFound();
    }

    // 2. Fetch TMDb details if linked
    let movieDetails = null;
    if (video.tmdbId) {
        try {
            movieDetails = await getMovieDetails(video.tmdbId);
        } catch (e) {
            console.warn('Metadata fetch failed for watch page:', e);
        }
    }

    // 3. Prepare Stream URL - use CloudFront URL directly
    // s3Url is already a CloudFront URL from the presigned-url endpoint
    const streamUrl = video.s3Url || '';

    return (
        <>
            <main style={{ minHeight: '100vh', background: '#0B0B0D', color: 'white', display: 'flex', flexDirection: 'column' }}>
                {/* Hero Section with Backdrop */}
                <div
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
                    style={{
                        maxWidth: '1200px',
                        margin: '-200px auto 0',
                        padding: '0 2rem 4rem',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'start' }}>
                        {/* Player Container */}
                        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                            <div
                                style={{
                                    borderRadius: '1.5rem',
                                    overflow: 'hidden',
                                    background: '#000',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
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
                                    <a
                                        href={`vlc://${streamUrl}`}
                                        title="Play in VLC"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            background: 'rgba(234, 88, 12, 0.1)',
                                            border: '1px solid rgba(234, 88, 12, 0.3)',
                                            borderRadius: '0.75rem',
                                            textDecoration: 'none',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(234, 88, 12, 0.2)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(234, 88, 12, 0.1)')}
                                    >
                                        <Tv size={16} style={{ color: '#EA580C' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VLC</span>
                                    </a>
                                    <a
                                        href={`iina://weblink?url=${streamUrl}`}
                                        title="Play in IINA (Mac)"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            padding: '10px 16px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            border: '1px solid rgba(59, 130, 246, 0.3)',
                                            borderRadius: '0.75rem',
                                            textDecoration: 'none',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer'
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
                                    >
                                        <Tv size={16} style={{ color: '#3B82F6' }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IINA</span>
                                    </a>
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
