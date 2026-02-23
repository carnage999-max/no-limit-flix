'use client';

import { useEffect, useState } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components';
import Link from 'next/link';

export default function SeriesDetailContent() {
    const searchParams = useSearchParams();
    const seriesTitle = searchParams.get('name');

    const [series, setSeries] = useState<any>(null);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

    useEffect(() => {
        if (!seriesTitle) {
            notFound();
        }

        const fetchSeries = async () => {
            try {
                const response = await fetch('/api/library/tv');
                if (response.ok) {
                    const data = await response.json();
                    // Find exact series match (case-insensitive)
                    const foundSeries = (data.series || []).find((s: any) => 
                        s.seriesTitle.toLowerCase() === seriesTitle.toLowerCase()
                    );
                    
                    if (foundSeries) {
                        setSeries(foundSeries);
                        setEpisodes(foundSeries.episodes || []);
                        // Set initial season filter
                        const seasons = [...new Set((foundSeries.episodes || []).map((ep: any) => ep.seasonNumber))];
                        if (seasons.length > 0) {
                            setSelectedSeason(Math.min(...seasons));
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to fetch series:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSeries();
    }, [seriesTitle]);

    const seasons = [...new Set(episodes.map((ep: any) => ep.seasonNumber))].sort((a, b) => a - b);
    const filteredEpisodes = selectedSeason !== null 
        ? episodes.filter((ep: any) => ep.seasonNumber === selectedSeason)
        : episodes;

    if (loading) {
        return (
            <main style={{ minHeight: '100vh', background: '#0B0B0D' }}>
                <div style={{ height: '60vh', background: '#111' }} />
                <div style={{ maxWidth: '1200px', margin: '-200px auto 0', padding: '0 2rem 4rem', position: 'relative', zIndex: 1 }}>
                        <div className="detail-grid">
                            <div style={{ width: '100%', maxWidth: '350px', margin: '0 auto' }}>
                                <Skeleton height="500px" borderRadius="1rem" />
                            </div>
                            <div>
                                <Skeleton width="150px" height="1.5rem" className="mb-4" />
                                <Skeleton width="60%" height="3.5rem" className="mb-4" />
                                <Skeleton width="200px" height="1.5rem" className="mb-8" />
                                <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(167, 171, 180, 0.05)', marginBottom: '2rem' }}>
                                    <Skeleton width="100px" height="0.875rem" className="mb-3" />
                                    <Skeleton width="100%" height="1.125rem" className="mb-2" />
                                    <Skeleton width="90%" height="1.125rem" />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
        );
    }

    if (!series) {
        notFound();
    }

    return (
        <main style={{ minHeight: '100vh' }}>
                {/* Hero Section with Backdrop */}
                <div
                    className="relative"
                    style={{
                        height: '60vh',
                        minHeight: '500px',
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={series.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400'}
                        alt={series.seriesTitle}
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
                    <div className="detail-grid">
                        {/* Poster */}
                        <div className="animate-slide-up" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                            <img
                                src={series.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400'}
                                alt={series.seriesTitle}
                                style={{
                                    width: '100%',
                                    borderRadius: '1rem',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                }}
                            />
                        </div>

                        {/* Details */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                {series.genre && (
                                    <span style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '9999px',
                                        color: '#A7ABB4',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {series.genre}
                                    </span>
                                )}
                                {series.rating && (
                                    <span style={{
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '9999px',
                                        color: '#A7ABB4',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {series.rating}
                                    </span>
                                )}
                            </div>

                            <h1 style={{
                                fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
                                fontWeight: '700',
                                lineHeight: '1.1',
                                letterSpacing: '-0.02em',
                                marginBottom: '1.5rem',
                                color: '#F3F4F6'
                            }}>
                                {series.seriesTitle}
                            </h1>

                            <div style={{
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(167, 171, 180, 0.05)',
                                border: '1px solid rgba(167, 171, 180, 0.1)',
                                marginBottom: '2rem'
                            }}>
                                <div style={{ fontSize: '0.875rem', color: '#A7ABB4', fontWeight: '600', marginBottom: '0.5rem' }}>SERIES INFO</div>
                                <div style={{ fontSize: '1rem', color: '#F3F4F6', lineHeight: '1.6' }}>
                                    {episodes.length} episodes
                                    {seasons.length > 1 && ` across ${seasons.length} seasons`}
                                </div>
                            </div>

                            {/* Season Selector */}
                            {seasons.length > 1 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: '#A7ABB4', fontWeight: '600', marginBottom: '1rem' }}>SELECT SEASON</div>
                                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        {seasons.map((season) => (
                                            <button
                                                key={season}
                                                onClick={() => setSelectedSeason(season)}
                                                style={{
                                                    padding: '0.75rem 1.5rem',
                                                    borderRadius: '0.5rem',
                                                    border: selectedSeason === season ? 'none' : '1px solid rgba(167, 171, 180, 0.3)',
                                                    background: selectedSeason === season ? 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)' : 'transparent',
                                                    color: selectedSeason === season ? '#0B0B0D' : '#F3F4F6',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '0.9375rem'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (selectedSeason !== season) {
                                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.5)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (selectedSeason !== season) {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.3)';
                                                    }
                                                }}
                                            >
                                                Season {season}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Episodes Section */}
                    <div style={{ marginTop: '3rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#A7ABB4', fontWeight: '600', marginBottom: '1.5rem' }}>
                            {selectedSeason !== null ? `SEASON ${selectedSeason}` : 'ALL EPISODES'} ({filteredEpisodes.length})
                        </div>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {filteredEpisodes.map((episode) => (
                                <Link
                                    key={episode.id}
                                    href={`/watch/${episode.id}`}
                                    className="block"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '1rem',
                                            padding: '1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(167, 171, 180, 0.05)',
                                            border: '1px solid rgba(167, 171, 180, 0.1)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(167, 171, 180, 0.1)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167, 171, 180, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(167, 171, 180, 0.05)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(167, 171, 180, 0.1)';
                                        }}
                                    >
                                        <div style={{ flexShrink: 0, width: '140px', height: '79px', overflow: 'hidden', borderRadius: '0.5rem' }}>
                                            <img
                                                src={episode.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=300'}
                                                alt={episode.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.8125rem', color: '#D4AF37', fontWeight: '600', marginBottom: '0.25rem' }}>
                                                S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
                                            </div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#F3F4F6', marginBottom: '0.5rem' }}>
                                                {episode.title}
                                            </h3>
                                            <p style={{ fontSize: '0.875rem', color: '#A7ABB4', lineHeight: '1.4' }}>
                                                {episode.description || 'No description available'}
                                            </p>
                                        </div>
                                        {episode.duration && (
                                            <div style={{ flexShrink: 0, textAlign: 'right', color: '#A7ABB4', fontSize: '0.875rem', fontWeight: '500' }}>
                                                {Math.floor(episode.duration / 60)}m
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
    );
}
