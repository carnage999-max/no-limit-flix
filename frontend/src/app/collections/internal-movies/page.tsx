'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardViewToggle } from '@/components';
import { useCardView } from '@/context/CardViewContext';
import { ArrowUp } from 'lucide-react';

interface MovieItem {
    id: string;
    title: string;
    thumbnailUrl?: string;
    genre?: string;
    description?: string;
    duration?: number;
    releaseYear?: number;
    rating?: string;
    tmdbId?: string;
    sourceProvider?: string;
    sourcePageUrl?: string;
    sourceRights?: string;
    sourceLicenseUrl?: string;
}

export default function InternalMoviesPage() {
    const [movies, setMovies] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const { viewSize } = useCardView();

    const gridStyle = {
        display: 'grid',
        gap: viewSize === 'compact' ? '1rem' : viewSize === 'standard' ? '1.5rem' : '2rem',
    };

    const gridClassName =
        viewSize === 'compact'
            ? 'grid-compact-responsive'
            : viewSize === 'standard'
                ? 'grid-standard-responsive'
                : 'grid-large-responsive';

    const getMovieLink = (movie: MovieItem) => {
        // Encode movie data to pass to title page
        const encodedData = btoa(JSON.stringify({
            id: movie.id,
            title: movie.title,
            poster: movie.thumbnailUrl,
            year: movie.releaseYear || new Date().getFullYear(),
            runtime: movie.duration,
            genres: [movie.genre || 'Movie'],
            explanation: movie.description || '',
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
                        description: video.description,
                        duration: Math.floor((video.duration || 0) / 60),
                        releaseYear: video.releaseYear,
                        rating: video.rating,
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

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 600);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
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
                        <div style={gridStyle} className={gridClassName}>
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
                        <div style={gridStyle} className={gridClassName}>
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
                                                {movie.releaseYear || '—'} {movie.duration ? `· ${movie.duration}m` : ''}
                                            </p>
                                            {movie.description && (
                                                <p style={{
                                                    fontSize: '0.7rem',
                                                    color: '#8C9099',
                                                    marginTop: '0.4rem',
                                                    lineHeight: 1.4,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}>
                                                    {movie.description}
                                                </p>
                                            )}
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
                {showScrollTop && (
                    <button
                        type="button"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        style={{
                            position: 'fixed',
                            right: '1.5rem',
                            bottom: '7rem',
                            width: '3rem',
                            height: '3rem',
                            borderRadius: '999px',
                            border: '1px solid rgba(212, 175, 55, 0.4)',
                            background: 'rgba(11, 11, 13, 0.85)',
                            color: '#D4AF37',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
                            zIndex: 40
                        }}
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                )}
            </main>
    );
}
