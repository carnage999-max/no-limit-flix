'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components';

interface SeriesItem {
    seriesTitle: string;
    thumbnailUrl?: string;
    genre?: string;
    episodeCount: number;
}

export default function InternalTVPage() {
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
        <>
            <Navbar />
            <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '80px', paddingBottom: '140px' }}>
                {/* Content */}
                <div style={{ maxWidth: '1200px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '2rem' }}>
                    <h1 style={{
                        color: '#F3F4F6',
                        fontSize: 'clamp(2rem, 8vw, 3.2rem)',
                        fontWeight: '700',
                        marginBottom: '0.5rem'
                    }}>
                        All Series & Documentaries
                    </h1>
                    <p style={{
                        color: '#A7ABB4',
                        fontSize: '1rem',
                        marginBottom: '2rem'
                    }}>
                        Watch all available series from our library
                    </p>

                    {loading ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} style={{
                                    aspectRatio: '2/3',
                                    background: 'rgba(167, 171, 180, 0.1)',
                                    borderRadius: '0.5rem',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }} />
                            ))}
                        </div>
                    ) : series.length > 0 ? (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {series.map((show) => (
                                <Link
                                    key={show.seriesTitle}
                                    href={`/series/detail?name=${encodeURIComponent(show.seriesTitle)}`}
                                    style={{
                                        textDecoration: 'none',
                                        display: 'block',
                                    }}
                                >
                                    <div
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'transform 0.3s ease',
                                            borderRadius: '0.5rem',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                        }}
                                    >
                                        <div
                                            style={{
                                                aspectRatio: '2/3',
                                                overflow: 'hidden',
                                                borderRadius: '0.5rem'
                                            }}
                                        >
                                            <img
                                                src={show.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=300'}
                                                alt={show.seriesTitle}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </div>
                                        <div style={{ marginTop: '0.75rem' }}>
                                            <h3
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#F3F4F6',
                                                    marginBottom: '0.25rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {show.seriesTitle}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#A7ABB4'
                                            }}>
                                                {show.episodeCount} episodes
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
                            <p style={{ color: '#A7ABB4' }}>No series available</p>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
