'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUp, Clapperboard, Filter, LayoutGrid, List, Star, X } from 'lucide-react';
import { buildWatchHref } from '@/lib/watch-asset';
import type { RatingSummary } from '@/types';

interface MovieItem {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    genre?: string | null;
    description?: string | null;
    duration?: number | null;
    releaseYear?: number | null;
    rating?: string | null;
    averageRating?: number | null;
    ratingCount?: number | null;
    hybridRating?: number | null;
    ratingSummary?: RatingSummary | null;
    tmdbId?: string | null;
    sourceProvider?: string | null;
    sourcePageUrl?: string | null;
    sourceRights?: string | null;
    sourceLicenseUrl?: string | null;
}

interface LibraryMoviesResponse {
    movies?: MovieItem[];
    categories?: string[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

const PAGE_SIZE = 60;
type SortMode = 'title' | 'title-desc';
type ViewMode = 'list' | 'grid';

const getGenresForMovie = (movie: MovieItem) => {
    if (!movie.genre) return [];
    return movie.genre
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean);
};

const formatRuntime = (duration?: number | null) => {
    if (!duration) return null;
    return `${Math.floor(duration / 60)}m`;
};

const buildMoviesUrl = (page: number, category: string, sortMode: SortMode, includeCategories = false) => {
    const params = new URLSearchParams({
        sort: sortMode,
        page: String(page),
        limit: String(PAGE_SIZE),
    });

    if (category !== 'all') {
        params.set('category', category);
    }

    if (includeCategories) {
        params.set('includeCategories', '1');
    }

    return `/api/library/movies?${params.toString()}`;
};

export default function InternalMoviesPage() {
    const [movies, setMovies] = useState<MovieItem[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortMode, setSortMode] = useState<SortMode>('title');
    const [page, setPage] = useState(1);
    const [totalMovies, setTotalMovies] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('list');

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
        const controller = new AbortController();

        const fetchFirstPage = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(buildMoviesUrl(1, categoryFilter, sortMode, true), {
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch movies.');
                }

                const data = await response.json() as LibraryMoviesResponse;
                setMovies(data.movies || []);
                setCategoryOptions(data.categories || []);
                setPage(data.pagination?.page || 1);
                setTotalMovies(data.pagination?.total || 0);
                setHasMore(Boolean(data.pagination?.hasMore));
            } catch (fetchError) {
                if (controller.signal.aborted) return;
                console.error('Failed to fetch movies:', fetchError);
                setMovies([]);
                setTotalMovies(0);
                setHasMore(false);
                setError('Movies could not be loaded. Please try again.');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchFirstPage();

        return () => controller.abort();
    }, [categoryFilter, sortMode]);

    useEffect(() => {
        if (categoryFilter === 'all' || categoryOptions.length === 0) return;
        if (!categoryOptions.includes(categoryFilter)) {
            setCategoryFilter('all');
        }
    }, [categoryFilter, categoryOptions]);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 600);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const loadMoreMovies = async () => {
        if (loadingMore || loading || !hasMore) return;

        const nextPage = page + 1;
        setLoadingMore(true);
        setError(null);

        try {
            const response = await fetch(buildMoviesUrl(nextPage, categoryFilter, sortMode));

            if (!response.ok) {
                throw new Error('Failed to fetch more movies.');
            }

            const data = await response.json() as LibraryMoviesResponse;
            setMovies((currentMovies) => [...currentMovies, ...(data.movies || [])]);
            setPage(data.pagination?.page || nextPage);
            setTotalMovies(data.pagination?.total || totalMovies);
            setHasMore(Boolean(data.pagination?.hasMore));
        } catch (fetchError) {
            console.error('Failed to fetch more movies:', fetchError);
            setError('More movies could not be loaded. Please try again.');
        } finally {
            setLoadingMore(false);
        }
    };

    const activeCategoryLabel = categoryFilter === 'all' ? 'All Categories' : categoryFilter;
    const sortLabel = sortMode === 'title' ? 'A-Z' : 'Z-A';
    const nextViewLabel = viewMode === 'list' ? 'Grid view' : 'List view';

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
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            minWidth: 0,
                        }}
                    >
                        <Image
                            src="/no-limit-flix-logo.png"
                            alt="No Limit Flix"
                            width={116}
                            height={58}
                            style={{
                                width: 'clamp(74px, 13vw, 116px)',
                                height: 'auto',
                                flex: '0 0 auto',
                            }}
                        />
                        <div style={{ minWidth: 0 }}>
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
                                    fontSize: 'clamp(1.85rem, 6vw, 3rem)',
                                    fontWeight: 760,
                                    lineHeight: 1.05,
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Movie Library
                            </h1>
                            <p style={{ color: '#A7ABB4', fontSize: '1rem', margin: 0 }}>
                                {loading ? 'Loading movies...' : `${movies.length} of ${totalMovies} movies loaded`}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.9rem',
                        padding: '0.85rem 0',
                        borderTop: '1px solid rgba(167, 171, 180, 0.12)',
                        borderBottom: '1px solid rgba(167, 171, 180, 0.12)',
                        marginBottom: '1.25rem',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setFilterOpen((prev) => !prev)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.55rem',
                                minHeight: '2.5rem',
                                border: '1px solid rgba(212, 175, 55, 0.35)',
                                borderRadius: '0.5rem',
                                background: categoryFilter === 'all' ? 'rgba(18, 18, 24, 0.86)' : 'rgba(212, 175, 55, 0.16)',
                                color: categoryFilter === 'all' ? '#F3F4F6' : '#F6D365',
                                padding: '0.62rem 0.82rem',
                                fontWeight: 800,
                            }}
                            aria-expanded={filterOpen}
                            aria-label="Filter by category"
                        >
                            <Filter className="w-4 h-4" />
                            Filter: {activeCategoryLabel}
                        </button>
                        {categoryFilter !== 'all' ? (
                            <button
                                type="button"
                                onClick={() => setCategoryFilter('all')}
                                style={{
                                    minHeight: '2.5rem',
                                    border: '1px solid rgba(167, 171, 180, 0.18)',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(167, 171, 180, 0.06)',
                                    color: '#A7ABB4',
                                    padding: '0.56rem 0.72rem',
                                    fontWeight: 700,
                                }}
                            >
                                Clear
                            </button>
                        ) : null}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setViewMode((currentView) => (currentView === 'list' ? 'grid' : 'list'))}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.45rem',
                                minHeight: '2.4rem',
                                border: '1px solid rgba(167, 171, 180, 0.16)',
                                borderRadius: '0.55rem',
                                background: 'rgba(18, 18, 24, 0.72)',
                                color: '#F3F4F6',
                                padding: '0.58rem 0.78rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                            }}
                            aria-label={`Switch to ${nextViewLabel}`}
                            title={`Switch to ${nextViewLabel}`}
                        >
                            {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                            {nextViewLabel}
                        </button>
                        <span style={{ color: '#A7ABB4', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>
                            Sort
                        </span>
                        <div
                            style={{
                                display: 'inline-flex',
                                border: '1px solid rgba(167, 171, 180, 0.16)',
                                borderRadius: '0.55rem',
                                overflow: 'hidden',
                                background: 'rgba(18, 18, 24, 0.72)',
                            }}
                            aria-label="Sort movies"
                        >
                            {([
                                ['title', 'A-Z'],
                                ['title-desc', 'Z-A'],
                            ] as Array<[SortMode, string]>).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setSortMode(value)}
                                    aria-pressed={sortMode === value}
                                    style={{
                                        minHeight: '2.4rem',
                                        border: 'none',
                                        borderRight: value === 'title' ? '1px solid rgba(167, 171, 180, 0.12)' : 'none',
                                        background: sortMode === value ? '#D4AF37' : 'transparent',
                                        color: sortMode === value ? '#0B0B0D' : '#F3F4F6',
                                        padding: '0.58rem 0.84rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
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
                    aria-label={`${activeCategoryLabel} movies sorted by ${sortLabel}`}
                >
                    {loading ? (
                        <div style={{ display: 'grid', gap: '0.65rem', paddingTop: '1rem' }}>
                            {[...Array(10)].map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        height: '118px',
                                        borderRadius: '0.5rem',
                                        background: 'linear-gradient(90deg, rgba(167, 171, 180, 0.07), rgba(167, 171, 180, 0.13), rgba(167, 171, 180, 0.07))',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}
                                />
                            ))}
                        </div>
                    ) : movies.length > 0 ? (
                        <>
                            {viewMode === 'list' ? (
                                <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {movies.map((movie, index) => {
                                    const genres = getGenresForMovie(movie);
                                    const runtime = formatRuntime(movie.duration);
                                    const displayRating = movie.hybridRating
                                        ?? movie.ratingSummary?.finalScore
                                        ?? movie.averageRating
                                        ?? null;
                                    return (
                                        <li key={movie.id}>
                                            <Link
                                                href={buildWatchHref(movie.id)}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '4.25rem 72px minmax(0, 1fr)',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    minHeight: '116px',
                                                    padding: '0.95rem 0',
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
                                                <span
                                                    style={{
                                                        position: 'relative',
                                                        width: '72px',
                                                        height: '96px',
                                                        borderRadius: '0.5rem',
                                                        overflow: 'hidden',
                                                        background: 'rgba(167, 171, 180, 0.08)',
                                                        border: '1px solid rgba(167, 171, 180, 0.12)',
                                                    }}
                                                >
                                                    <Image
                                                        src={movie.thumbnailUrl || '/poster-placeholder.svg'}
                                                        alt={movie.title}
                                                        fill
                                                        sizes="72px"
                                                        style={{ objectFit: 'cover' }}
                                                        unoptimized
                                                    />
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
                                                            alignItems: 'center',
                                                            gap: '0.35rem 0.55rem',
                                                            color: '#A7ABB4',
                                                            fontSize: '0.85rem',
                                                            marginTop: '0.28rem',
                                                        }}
                                                    >
                                                        {movie.releaseYear ? <span>{movie.releaseYear}</span> : null}
                                                        {runtime ? <span>{runtime}</span> : null}
                                                        {displayRating ? (
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#F6D365', fontWeight: 800 }}>
                                                                <Star className="w-3 h-3" fill="#F6D365" />
                                                                {Number(displayRating).toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                        {genres.length > 0 ? <span>{genres.slice(0, 3).join(', ')}</span> : null}
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.32rem',
                                                                color: '#D4AF37',
                                                                fontSize: '0.78rem',
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
                                                    </span>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                                </ol>
                            ) : (
                                <ol
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: '1rem',
                                        listStyle: 'none',
                                        margin: 0,
                                        padding: '1rem 0 0',
                                    }}
                                >
                                    {movies.map((movie, index) => {
                                        const genres = getGenresForMovie(movie);
                                        const runtime = formatRuntime(movie.duration);
                                        const displayRating = movie.hybridRating
                                            ?? movie.ratingSummary?.finalScore
                                            ?? movie.averageRating
                                            ?? null;
                                        return (
                                            <li key={movie.id}>
                                                <Link
                                                    href={buildWatchHref(movie.id)}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateRows: 'auto minmax(3.4rem, auto)',
                                                        gap: '0.72rem',
                                                        color: 'inherit',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            position: 'relative',
                                                            aspectRatio: '2 / 3',
                                                            width: '100%',
                                                            borderRadius: '0.5rem',
                                                            overflow: 'hidden',
                                                            background: 'rgba(167, 171, 180, 0.08)',
                                                            border: '1px solid rgba(167, 171, 180, 0.12)',
                                                        }}
                                                    >
                                                        <Image
                                                            src={movie.thumbnailUrl || '/poster-placeholder.svg'}
                                                            alt={movie.title}
                                                            fill
                                                            sizes="(max-width: 640px) 46vw, (max-width: 1100px) 22vw, 170px"
                                                            style={{ objectFit: 'cover' }}
                                                            unoptimized
                                                        />
                                                        <span
                                                            style={{
                                                                position: 'absolute',
                                                                top: '0.55rem',
                                                                left: '0.55rem',
                                                                minWidth: '2.2rem',
                                                                minHeight: '1.55rem',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderRadius: '999px',
                                                                background: 'rgba(11, 11, 13, 0.82)',
                                                                border: '1px solid rgba(212, 175, 55, 0.45)',
                                                                color: '#D4AF37',
                                                                fontSize: '0.78rem',
                                                                fontVariantNumeric: 'tabular-nums',
                                                                fontWeight: 900,
                                                            }}
                                                        >
                                                            {String(index + 1).padStart(2, '0')}
                                                        </span>
                                                        {displayRating ? (
                                                            <span
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: '0.55rem',
                                                                    top: '0.55rem',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.22rem',
                                                                    borderRadius: '999px',
                                                                    background: 'rgba(11, 11, 13, 0.82)',
                                                                    color: '#F6D365',
                                                                    padding: '0.28rem 0.42rem',
                                                                    fontSize: '0.76rem',
                                                                    fontWeight: 900,
                                                                }}
                                                            >
                                                                <Star className="w-3 h-3" fill="#F6D365" />
                                                                {Number(displayRating).toFixed(1)}
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                    <span style={{ minWidth: 0 }}>
                                                        <span
                                                            style={{
                                                                display: 'block',
                                                                color: '#F3F4F6',
                                                                fontSize: '0.95rem',
                                                                fontWeight: 760,
                                                                lineHeight: 1.22,
                                                                overflowWrap: 'anywhere',
                                                            }}
                                                        >
                                                            {movie.title}
                                                        </span>
                                                        <span
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap',
                                                                gap: '0.28rem 0.45rem',
                                                                color: '#A7ABB4',
                                                                fontSize: '0.78rem',
                                                                lineHeight: 1.3,
                                                                marginTop: '0.26rem',
                                                            }}
                                                        >
                                                            {movie.releaseYear ? <span>{movie.releaseYear}</span> : null}
                                                            {runtime ? <span>{runtime}</span> : null}
                                                            {genres.length > 0 ? <span>{genres.slice(0, 2).join(', ')}</span> : null}
                                                        </span>
                                                    </span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ol>
                            )}

                            {hasMore && (
                                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '1.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={loadMoreMovies}
                                        disabled={loadingMore}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '150px',
                                            minHeight: '44px',
                                            borderRadius: '999px',
                                            border: '1px solid rgba(212, 175, 55, 0.4)',
                                            background: 'rgba(212, 175, 55, 0.14)',
                                            color: '#F6D365',
                                            fontWeight: 800,
                                            opacity: loadingMore ? 0.68 : 1,
                                        }}
                                    >
                                        {loadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                            <p style={{ color: '#A7ABB4', fontSize: '1rem' }}>
                                {error || (totalMovies === 0 ? 'No movies available' : 'No movies match this category')}
                            </p>
                        </div>
                    )}
                </section>

                {error && movies.length > 0 ? (
                    <p style={{ color: '#FFB3BB', fontSize: '0.9rem', marginTop: '1rem', textAlign: 'center' }}>
                        {error}
                    </p>
                ) : null}
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
