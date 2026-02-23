'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components';
import { ButtonSecondary } from '@/components';

interface SeriesItem {
    seriesTitle: string;
    thumbnailUrl?: string;
    genre?: string;
    episodeCount: number;
}

export default function SeriesPage() {
    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeries = async () => {
            try {
                const response = await fetch('/api/library/tv');
                if (response.ok) {
                    const data = await response.json();
                    setSeries(data.series || []);
                }
            } catch (error) {
                console.error('Failed to fetch series:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSeries();
    }, []);

    return (
        <main className="min-h-screen bg-[#0B0B0D] text-white">
            {/* Header */}
            <header className="p-6 flex items-center justify-between z-10 border-b border-white/10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                </Link>
                <Link href="/">
                    <ButtonSecondary>Back to Home</ButtonSecondary>
                </Link>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">Series & Documentaries</h1>
                    <p className="text-silver/60">Binge-worthy series and documentaries from our library</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} height="400px" borderRadius="0.75rem" />
                        ))}
                    </div>
                ) : series.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {series.map((show) => (
                            <Link
                                key={show.seriesTitle}
                                href={`/series/${encodeURIComponent(show.seriesTitle)}`}
                                className="block transition-all duration-300"
                                style={{
                                    textDecoration: 'none',
                                    transform: 'translateY(0)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-8px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div
                                    className="relative overflow-hidden"
                                    style={{
                                        borderRadius: '0.75rem',
                                        background: 'rgba(167, 171, 180, 0.05)',
                                        minWidth: 0,
                                    }}
                                >
                                    {/* Poster Image */}
                                    <div
                                        className="relative"
                                        style={{
                                            aspectRatio: '2/3',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <img
                                            src={show.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400'}
                                            alt={show.seriesTitle}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    </div>

                                    {/* Title Info */}
                                    <div
                                        style={{
                                            padding: 'clamp(0.5rem, 2vw, 1rem)',
                                        }}
                                    >
                                        {show.genre && (
                                            <p style={{
                                                fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                                                color: '#D4AF37',
                                                fontStyle: 'italic',
                                                marginBottom: '0.5rem',
                                                lineHeight: 1.4
                                            }}>
                                                {show.genre}
                                            </p>
                                        )}
                                        <h3
                                            style={{
                                                fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                                                fontWeight: '600',
                                                color: '#F3F4F6',
                                                marginBottom: '0.25rem',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {show.seriesTitle}
                                        </h3>
                                        <p
                                            style={{
                                                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                                                color: '#A7ABB4',
                                            }}
                                        >
                                            {show.episodeCount} episodes
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-silver/60">No series available</p>
                    </div>
                )}
            </div>
        </main>
    );
}
