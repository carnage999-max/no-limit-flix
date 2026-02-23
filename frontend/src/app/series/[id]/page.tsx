'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ButtonSecondary } from '@/components';
import type { MoviePick } from '@/types';

export default function SeriesDetailPage({ params }: { params: { id: string } }) {
    const [series, setSeries] = useState<any>(null);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

    const decodedSeriesTitle = decodeURIComponent(params.id);

    useEffect(() => {
        const fetchSeries = async () => {
            try {
                const response = await fetch('/api/library/tv');
                if (response.ok) {
                    const data = await response.json();
                    const foundSeries = (data.series || []).find((s: any) => s.seriesTitle === decodedSeriesTitle);
                    
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
    }, [decodedSeriesTitle]);

    const seasons = [...new Set(episodes.map((ep: any) => ep.seasonNumber))].sort((a, b) => a - b);
    const filteredEpisodes = selectedSeason !== null 
        ? episodes.filter((ep: any) => ep.seasonNumber === selectedSeason)
        : episodes;

    if (loading) {
        return (
            <main className="min-h-screen bg-[#0B0B0D] text-white">
                <header className="p-6 flex items-center justify-between z-10 border-b border-white/10">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                    </Link>
                    <Link href="/series">
                        <ButtonSecondary>Back to Series</ButtonSecondary>
                    </Link>
                </header>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <p className="text-silver/60">Loading...</p>
                </div>
            </main>
        );
    }

    if (!series) {
        return (
            <main className="min-h-screen bg-[#0B0B0D] text-white">
                <header className="p-6 flex items-center justify-between z-10 border-b border-white/10">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                    </Link>
                    <Link href="/series">
                        <ButtonSecondary>Back to Series</ButtonSecondary>
                    </Link>
                </header>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                    <p className="text-silver/60">Series not found</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#0B0B0D] text-white">
            {/* Header */}
            <header className="p-6 flex items-center justify-between z-10 border-b border-white/10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                </Link>
                <Link href="/series">
                    <ButtonSecondary>Back to Series</ButtonSecondary>
                </Link>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Series Header */}
                <div className="mb-8 flex gap-6 flex-col md:flex-row">
                    <div className="w-40 h-60 flex-shrink-0">
                        <img
                            src={series.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400'}
                            alt={series.seriesTitle}
                            className="w-full h-full object-cover rounded-lg"
                        />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">{series.seriesTitle}</h1>
                        <div className="flex gap-4 mb-4">
                            {series.genre && (
                                <span className="text-gold">{series.genre}</span>
                            )}
                            {series.rating && (
                                <span className="text-silver/60">{series.rating}</span>
                            )}
                            <span className="text-silver/60">{episodes.length} episodes</span>
                        </div>
                    </div>
                </div>

                {/* Season Selector */}
                {seasons.length > 1 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-3">Seasons</h2>
                        <div className="flex gap-2 flex-wrap">
                            {seasons.map((season) => (
                                <button
                                    key={season}
                                    onClick={() => setSelectedSeason(season)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.5rem',
                                        border: selectedSeason === season ? 'none' : '1px solid #A7ABB4',
                                        background: selectedSeason === season ? 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)' : 'transparent',
                                        color: selectedSeason === season ? '#0B0B0D' : '#F3F4F6',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedSeason !== season) {
                                            e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedSeason !== season) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    Season {season}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Episodes List */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">
                        {selectedSeason !== null ? `Season ${selectedSeason}` : 'Episodes'} ({filteredEpisodes.length})
                    </h2>
                    <div className="space-y-3">
                        {filteredEpisodes.map((episode, index) => (
                            <Link
                                key={episode.id}
                                href={`/watch/${episode.id}`}
                                className="block"
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
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
                                    <div style={{ flexShrink: 0, width: '120px', height: '68px', overflow: 'hidden', borderRadius: '0.375rem' }}>
                                        <img
                                            src={episode.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=200'}
                                            alt={episode.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.875rem', color: '#D4AF37', marginBottom: '0.25rem' }}>
                                            S{String(episode.seasonNumber).padStart(2, '0')}E{String(episode.episodeNumber).padStart(2, '0')}
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#F3F4F6', marginBottom: '0.25rem' }}>
                                            {episode.title}
                                        </h3>
                                        <p style={{ fontSize: '0.875rem', color: '#A7ABB4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {episode.description || 'No description available'}
                                        </p>
                                    </div>
                                    <div style={{ flexShrink: 0, textAlign: 'right', fontSize: '0.875rem', color: '#A7ABB4' }}>
                                        {episode.duration ? `${Math.floor(episode.duration / 60)}m` : ''}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
