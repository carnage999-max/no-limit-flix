'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUp, Clapperboard, Filter, X } from 'lucide-react';
import { buildWatchHref } from '@/lib/watch-asset';

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

interface LibraryMoviesResponse {
    movies?: MovieItem[];
}

const titleCollator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

const getGenresForMovie = (movie: MovieItem) => {
    if (!movie.genre) return [];
    return movie.genre
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean);
};

const formatRuntime = (duration?: number) => {
    if (!duration) return null;
    return `${duration}m`;
};

export default function InternalMoviesPage() {
    const [movies, setMovies] = useState<MovieItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState('all');

    useEffect(() => {
        try {
            const stored = localStorage.getItem('nlf_internal_movie_category');
            if (stored) setCategoryFilter(stored);
        } catch {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('nlf_internal_movie_category', categoryFilter);
        } catch {
            // ignore storage errors
        }
    }, [categoryFilter]);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await fetch('/api/library/movies');
                if (response.ok) {
                    const data = await response.json() as LibraryMoviesResponse;
                    const moviesData = (data.movies || []).map((video) => ({
                        id: video.id,
                        title: video.title || 'Untitled',
                        thumbnailUrl: video.thumbnailUrl || '/poster-placeholder.svg',
                        genre: video.genre,
                        description: video.description,
                        duration: Math.floor((video.duration || 0) / 60),
                        releaseYear: video.releaseYear,
                        rating: video.rating,
                        averageRating: video.averageRating ?? null,
                        ratingCount: video.ratingCount ?? null,
                        tmdbId: video.tmdbId,
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

    const categoryOptions = useMemo(() => {
        return Array.from(
            new Set(movies.flatMap((movie) => getGenresForMovie(movie)))
        ).sort((a, b) => titleCollator.compare(a, b));
    }, [movies]);

    useEffect(() => {
        if (categoryFilter === 'all' || movies.length === 0) return;
        if (!categoryOptions.includes(categoryFilter)) {
            setCategoryFilter('all');
        }
    }, [categoryFilter, categoryOptions, movies.length]);

    const filteredMovies = useMemo(() => {
        return movies
            .filter((movie) => {
                if (categoryFilter === 'all') return true;
                return getGenresForMovie(movie).includes(categoryFilter);
            })
            .sort((a, b) => titleCollator.compare(a.title, b.title));
    }, [categoryFilter, movies]);

    const activeCategoryLabel = categoryFilter === 'all' ? 'All Categories' : categoryFilter;

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '80px', paddingBottom: '140px' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem clamp(1rem, 4vw, 2rem) 0' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                        gap: '1.25rem',
                        marginBottom: '1.5rem',
                    }}
                >
                    <div>
                        <p
                            style={{
                                color: '#D4AF37',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                marginBottom: '0.55rem',
                            }}
                        >
                            Movies to Watch
                        </p>
                        <h1
                            style={{
                                color: '#F3F4F6',
                                fontSize: 'clamp(2rem, 6vw, 3rem)',
                                fontWeight: 760,
                                lineHeight: 1.05,
                                marginBottom: '0.5rem',
                            }}
                        >
                            Alphabetical Movie List
                        </h1>
                        <p style={{ color: '#A7ABB4', fontSize: '1rem', margin: 0 }}>
                            {loading ? 'Loading movies...' : `${filteredMovies.length} of ${movies.length} movies shown`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setFilterOpen((prev) => !prev)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.55rem',
                            border: '1px solid rgba(212, 175, 55, 0.35)',
                            borderRadius: '999px',
                            background: categoryFilter === 'all' ? 'rgba(18, 18, 24, 0.86)' : 'rgba(212, 175, 55, 0.16)',
                            color: categoryFilter === 'all' ? '#F3F4F6' : '#F6D365',
                            padding: '0.72rem 1rem',
                            fontWeight: 700,
                            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
                        }}
                        aria-expanded={filterOpen}
                        aria-label="Filter by category"
                    >
                        <Filter className="w-4 h-4" />
                        {activeCategoryLabel}
                    </button>
                </div>

                {filterOpen && (
                    <section
                        style={{
                            marginBottom: '1.25rem',
                            border: '1px solid rgba(167, 171, 180, 0.16)',
                            borderRadius: '0.75rem',
                            background: 'rgba(18, 18, 24, 0.72)',
                            padding: '1rem',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                marginBottom: '0.8rem',
                            }}
                        >
                            <h2
                                style={{
                                    color: '#F3F4F6',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.12em',
                                    textTransform: 'uppercase',
                                    margin: 0,
                                }}
                            >
                                Category
                            </h2>
                            <button
                                type="button"
                                onClick={() => setFilterOpen(false)}
                                style={{
                                    width: '2rem',
                                    height: '2rem',
                                    border: 'none',
                                    borderRadius: '999px',
                                    background: 'rgba(167, 171, 180, 0.08)',
                                    color: '#A7ABB4',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                                aria-label="Close category filter"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.55rem' }}>
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('all')}
                                aria-pressed={categoryFilter === 'all'}
                                style={{
                                    border: '1px solid rgba(212, 175, 55, 0.34)',
                                    borderRadius: '999px',
                                    background: categoryFilter === 'all' ? '#D4AF37' : 'rgba(212, 175, 55, 0.08)',
                                    color: categoryFilter === 'all' ? '#0B0B0D' : '#F6D365',
                                    padding: '0.48rem 0.78rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                }}
                            >
                                All Categories
                            </button>
                            {categoryOptions.map((category) => (
                                <button
                                    key={category}
                                    type="button"
                                    onClick={() => setCategoryFilter(category)}
                                    aria-pressed={categoryFilter === category}
                                    style={{
                                        border: '1px solid rgba(167, 171, 180, 0.18)',
                                        borderRadius: '999px',
                                        background: categoryFilter === category ? '#D4AF37' : 'rgba(167, 171, 180, 0.08)',
                                        color: categoryFilter === category ? '#0B0B0D' : '#F3F4F6',
                                        padding: '0.48rem 0.78rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                    }}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section
                    style={{
                        borderTop: '1px solid rgba(167, 171, 180, 0.15)',
                    }}
                    aria-label={`${activeCategoryLabel} movies in alphabetical order`}
                >
                    {loading ? (
                        <div style={{ display: 'grid', gap: '0.65rem', paddingTop: '1rem' }}>
                            {[...Array(10)].map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        height: '76px',
                                        borderRadius: '0.5rem',
                                        background: 'linear-gradient(90deg, rgba(167, 171, 180, 0.07), rgba(167, 171, 180, 0.13), rgba(167, 171, 180, 0.07))',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}
                                />
                            ))}
                        </div>
                    ) : filteredMovies.length > 0 ? (
                        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {filteredMovies.map((movie, index) => {
                                const genres = getGenresForMovie(movie);
                                const runtime = formatRuntime(movie.duration);
                                return (
                                    <li key={movie.id}>
                                        <Link
                                            href={buildWatchHref(movie.id)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '4.5rem minmax(0, 1fr) auto',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                minHeight: '76px',
                                                padding: '0.85rem 0',
                                                borderBottom: '1px solid rgba(167, 171, 180, 0.12)',
                                                color: 'inherit',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: '#D4AF37',
                                                    fontSize: '0.95rem',
                                                    fontVariantNumeric: 'tabular-nums',
                                                    fontWeight: 800,
                                                }}
                                            >
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <span style={{ minWidth: 0 }}>
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        color: '#F3F4F6',
                                                        fontSize: 'clamp(1rem, 2.4vw, 1.18rem)',
                                                        fontWeight: 720,
                                                        lineHeight: 1.25,
                                                        overflowWrap: 'anywhere',
                                                    }}
                                                >
                                                    {movie.title}
                                                </span>
                                                <span
                                                    style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '0.35rem 0.55rem',
                                                        color: '#A7ABB4',
                                                        fontSize: '0.85rem',
                                                        marginTop: '0.28rem',
                                                    }}
                                                >
                                                    {movie.releaseYear ? <span>{movie.releaseYear}</span> : null}
                                                    {runtime ? <span>{runtime}</span> : null}
                                                    {genres.length > 0 ? <span>{genres.slice(0, 3).join(', ')}</span> : null}
                                                </span>
                                            </span>
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.35rem',
                                                    color: '#D4AF37',
                                                    fontSize: '0.84rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.08em',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                <Clapperboard className="w-4 h-4" />
                                                Watch
                                                <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                            <p style={{ color: '#A7ABB4', fontSize: '1rem' }}>
                                {movies.length === 0 ? 'No movies available' : 'No movies match this category'}
                            </p>
                        </div>
                    )}
                </section>
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
                        zIndex: 40,
                    }}
                    aria-label="Scroll to top"
                >
                    <ArrowUp className="w-4 h-4" />
                </button>
            )}
        </main>
    );
}
