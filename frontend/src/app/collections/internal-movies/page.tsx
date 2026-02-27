'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardViewToggle } from '@/components';
import { useCardView } from '@/context/CardViewContext';

interface MovieItem {
    id: string;
    title: string;
    thumbnailUrl?: string;
    genre?: string;
    duration?: number;
    tmdbId?: string;
    sourceProvider?: string;
    sourcePageUrl?: string;
    sourceRights?: string;
    sourceLicenseUrl?: string;
}

export default function InternalMoviesPage() {
    const [movies, setMovies] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { viewSize } = useCardView();

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns:
            viewSize === 'compact'
                ? 'repeat(auto-fill, minmax(140px, 1fr))'
                : viewSize === 'standard'
                    ? 'repeat(auto-fill, minmax(180px, 1fr))'
                    : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: viewSize === 'compact' ? '1rem' : viewSize === 'standard' ? '1.5rem' : '2rem',
    };

    const getMovieLink = (movie: MovieItem) => {
        // Encode movie data to pass to title page
        const encodedData = btoa(JSON.stringify({
            id: movie.id,
            title: movie.title,
            poster: movie.thumbnailUrl,
            year: new Date().getFullYear(),
            runtime: movie.duration,
            genres: [movie.genre || 'Movie'],
            explanation: '',
            playable: true,
            assetId: movie.id,
            tmdbId: movie.tmdbId,
            tmdb_id: movie.tmdbId,
            sourceProvider: movie.sourceProvider,
            sourcePageUrl: movie.sourcePageUrl,
            sourceRights: movie.sourceRights,
            sourceLicenseUrl: movie.sourceLicenseUrl,
        }));
        return `/title/${movie.id}?data=${encodedData}`;
    };

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await fetch('/api/library/movies');
                if (response.ok) {
                    const data = await response.json();
                    const moviesData = (data.movies || []).map((video: any) => ({
                        id: video.id,
                        title: video.title,
                        thumbnailUrl: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genre: video.genre,
                        duration: Math.floor((video.duration || 0) / 60),
                        tmdbId: video.tmdbId || video.tmdb_id,
                        sourceProvider: video.sourceProvider,
                        sourcePageUrl: video.sourcePageUrl,
                        sourceRights: video.sourceRights,
                        sourceLicenseUrl: video.sourceLicenseUrl,
                    }));
                    setMovies(moviesData);
                }
            } catch (error) {
                console.error('Failed to fetch movies:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, []);

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '80px', paddingBottom: '140px' }}>
                {/* Content */}
                <div style={{ maxWidth: '1200px', margin: '0 auto', paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div>
                            <h1 style={{
                                color: '#F3F4F6',
                                fontSize: 'clamp(2rem, 8vw, 3.2rem)',
                                fontWeight: '700',
                                marginBottom: '0.5rem'
                            }}>
                                All Movies
                            </h1>
                            <p style={{
                                color: '#A7ABB4',
                                fontSize: '1rem',
                                marginBottom: '0.5rem'
                            }}>
                                Watch all available movies from our library
                            </p>
                        </div>
                        <CardViewToggle />
                    </div>

                    {loading ? (
                        <div style={gridStyle}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} style={{
                                    aspectRatio: '2/3',
                                    background: 'rgba(167, 171, 180, 0.1)',
                                    borderRadius: '0.5rem',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }} />
                            ))}
                        </div>
                    ) : movies.length > 0 ? (
                        <div style={gridStyle}>
                            {movies.map((movie) => (
                                <Link
                                    key={movie.id}
                                    href={getMovieLink(movie)}
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
                                                src={movie.thumbnailUrl}
                                                alt={movie.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    maxWidth: '100%',
                                                    maxHeight: '100%',
                                                    display: 'block',
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
                                                {movie.title}
                                            </h3>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#A7ABB4'
                                            }}>
                                                {movie.duration ? `${movie.duration}m` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
                            <p style={{ color: '#A7ABB4' }}>No movies available</p>
                        </div>
                    )}
                </div>
            </main>
    );
}
