'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardViewToggle } from '@/components';
import { useCardView } from '@/context/CardViewContext';
import { ArrowUp, SlidersHorizontal, X } from 'lucide-react';
import { safeBtoa } from '@/lib/base64';

interface MovieItem {
    id: string;
    title: string;
    thumbnailUrl?: string;
    genre?: string;
    description?: string;
    duration?: number;
    releaseYear?: number;
    rating?: string;
    averageRating?: number | null;
    ratingCount?: number | null;
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
    const [filterOpen, setFilterOpen] = useState(false);
    const [genreFilter, setGenreFilter] = useState('all');
    const [yearFilter, setYearFilter] = useState('all');
    const { viewSize } = useCardView();

    useEffect(() => {
        try {
            const stored = localStorage.getItem('nlf_internal_movie_filters');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.genre) setGenreFilter(parsed.genre);
                if (parsed?.year) setYearFilter(parsed.year);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('nlf_internal_movie_filters', JSON.stringify({
                genre: genreFilter,
                year: yearFilter,
            }));
        } catch {
            // ignore storage errors
        }
    }, [genreFilter, yearFilter]);

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
        const encodedData = safeBtoa(JSON.stringify({
            id: movie.id,
            title: movie.title,
            poster: movie.thumbnailUrl,
            year: movie.releaseYear || new Date().getFullYear(),
            runtime: movie.duration,
            genres: [movie.genre || 'Movie'],
            explanation: movie.description || '',
            description: movie.description || '',
            rating: movie.rating || null,
            averageRating: movie.averageRating ?? null,
            ratingCount: movie.ratingCount ?? null,
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

    const getGenresForMovie = (movie: MovieItem) => {
        if (!movie.genre) return [];
        return movie.genre
            .split(',')
            .map((genre) => genre.trim())
            .filter(Boolean);
    };

    const genreOptions = Array.from(
        new Set(
            movies.flatMap((movie) => getGenresForMovie(movie))
        )
    ).sort((a, b) => a.localeCompare(b));

    const yearOptions = Array.from(
        new Set(
            movies.map((movie) => movie.releaseYear).filter(Boolean) as number[]
        )
    ).sort((a, b) => b - a);

    const filteredMovies = movies.filter((movie) => {
        if (genreFilter !== 'all') {
            const genres = getGenresForMovie(movie);
            if (!genres.includes(genreFilter)) return false;
        }
        if (yearFilter !== 'all') {
            if (movie.releaseYear !== Number(yearFilter)) return false;
        }
        return true;
    });

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await fetch('/api/library/movies');
                if (response.ok) {
                    const data = await response.json();
                    const moviesData = (data.movies || []).map((video: any) => ({
                        id: video.id,
                        title: video.title,
                        thumbnailUrl: video.thumbnailUrl || '/poster-placeholder.svg',
                        genre: video.genre,
                        description: video.description,
                        duration: Math.floor((video.duration || 0) / 60),
                        releaseYear: video.releaseYear,
                        rating: video.rating,
                        averageRating: video.averageRating ?? null,
                        ratingCount: video.ratingCount ?? null,
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
                    ) : filteredMovies.length > 0 ? (
                        <div style={gridStyle} className={gridClassName}>
                            {filteredMovies.map((movie) => (
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
                                                onError={(e) => {
                                                    const target = e.currentTarget;
                                                    target.onerror = null;
                                                    target.src = '/poster-placeholder.svg';
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
                            <p style={{ color: '#A7ABB4' }}>
                                {movies.length === 0 ? 'No movies available' : 'No movies match your filters'}
                            </p>
                        </div>
                    )}
                </div>
                {movies.length > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setFilterOpen((prev) => !prev)}
                            style={{
                                position: 'fixed',
                                right: '1.5rem',
                                bottom: '12rem',
                                width: '3.25rem',
                                height: '3.25rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(212, 175, 55, 0.4)',
                                background: 'rgba(11, 11, 13, 0.9)',
                                color: '#D4AF37',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
                                zIndex: 50
                            }}
                            aria-label="Filter library"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                        {filterOpen && (
                            <div
                                style={{
                                    position: 'fixed',
                                    right: '1.5rem',
                                    bottom: '16rem',
                                    width: '260px',
                                    background: 'rgba(11, 11, 13, 0.98)',
                                    border: '1px solid rgba(167, 171, 180, 0.15)',
                                    borderRadius: '16px',
                                    padding: '1rem',
                                    zIndex: 50,
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.55)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#D4AF37', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                        Filters
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setFilterOpen(false)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: '#A7ABB4',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <label style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#A7ABB4' }}>Genre</span>
                                    <select
                                        value={genreFilter}
                                        onChange={(e) => setGenreFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem 0.6rem',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(167, 171, 180, 0.08)',
                                            color: '#F3F4F6',
                                        }}
                                    >
                                        <option value="all">All genres</option>
                                        {genreOptions.map((genre) => (
                                            <option key={genre} value={genre}>
                                                {genre}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#A7ABB4' }}>Year</span>
                                    <select
                                        value={yearFilter}
                                        onChange={(e) => setYearFilter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem 0.6rem',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(167, 171, 180, 0.2)',
                                            background: 'rgba(167, 171, 180, 0.08)',
                                            color: '#F3F4F6',
                                        }}
                                    >
                                        <option value="all">All years</option>
                                        {yearOptions.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGenreFilter('all');
                                        setYearFilter('all');
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(212, 175, 55, 0.4)',
                                        background: 'rgba(212, 175, 55, 0.15)',
                                        color: '#D4AF37',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </>
                )}
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
