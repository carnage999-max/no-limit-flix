'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, XCircle, ChevronRight, Film } from 'lucide-react';

interface TmdbResult {
    id: string;
    title: string;
    year: number;
}

interface LibraryResult {
    id: string;
    title: string;
    seriesTitle?: string | null;
    thumbnailUrl?: string | null;
    genre?: string | null;
    duration?: number | null;
    releaseYear?: number | null;
    tmdbId?: string | null;
    sourceProvider?: string | null;
    sourcePageUrl?: string | null;
    sourceRights?: string | null;
    sourceLicenseUrl?: string | null;
}

const DEFAULT_POSTER = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
    const [libraryResults, setLibraryResults] = useState<LibraryResult[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setTmdbResults([]);
            setLibraryResults([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const [tmdbRes, libraryRes] = await Promise.all([
                fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`),
                fetch(`/api/library/search?q=${encodeURIComponent(searchQuery)}&limit=12`),
            ]);

            const tmdbData = tmdbRes.ok ? await tmdbRes.json() : [];
            const libraryData = libraryRes.ok ? await libraryRes.json() : { results: [] };

            setTmdbResults(Array.isArray(tmdbData) ? tmdbData : []);
            setLibraryResults(libraryData.results || []);
        } catch (error) {
            console.error('Search error:', error);
            setTmdbResults([]);
            setLibraryResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (query.trim().length >= 2) {
            debounceRef.current = setTimeout(() => {
                performSearch(query);
            }, 400);
        } else {
            setTmdbResults([]);
            setLibraryResults([]);
            setLoading(false);
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [query, performSearch]);

    const buildLibraryLink = (item: LibraryResult) => {
        const encodedData = btoa(JSON.stringify({
            id: item.id,
            title: item.title || item.seriesTitle || 'Untitled',
            poster: item.thumbnailUrl || DEFAULT_POSTER,
            year: item.releaseYear || new Date().getFullYear(),
            runtime: item.duration ? Math.floor(item.duration / 60) : 0,
            genres: item.genre ? [item.genre] : [],
            explanation: 'Available in your library',
            playable: true,
            assetId: item.id,
            tmdbId: item.tmdbId,
            tmdb_id: item.tmdbId,
            sourceProvider: item.sourceProvider,
            sourcePageUrl: item.sourcePageUrl,
            sourceRights: item.sourceRights,
            sourceLicenseUrl: item.sourceLicenseUrl,
        }));
        return `/title/${item.id}?data=${encodedData}`;
    };

    const renderEmptyState = () => {
        if (loading) return null;

        if (!query.length) {
            return (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                    <Search size={56} color="#A7ABB4" style={{ opacity: 0.4 }} />
                    <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', color: '#F3F4F6' }}>Search for Movies</h3>
                    <p style={{ color: '#A7ABB4', marginTop: '0.75rem' }}>
                        Start typing to find films from TMDB and your internal library.
                    </p>
                </div>
            );
        }

        if (query.length < 2) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <p style={{ color: '#A7ABB4' }}>Type at least 2 characters to search.</p>
                </div>
            );
        }

        if (tmdbResults.length === 0 && libraryResults.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <Film size={56} color="#A7ABB4" style={{ opacity: 0.35 }} />
                    <h3 style={{ marginTop: '1.5rem', fontSize: '1.25rem', color: '#F3F4F6' }}>No Results Found</h3>
                    <p style={{ color: '#A7ABB4', marginTop: '0.75rem' }}>
                        We couldn&apos;t find a match for that query. Try a different title.
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', paddingTop: '90px', paddingBottom: '140px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', fontWeight: 700, color: '#F3F4F6', marginBottom: '0.5rem' }}>
                        Search
                    </h1>
                    <p style={{ color: '#A7ABB4' }}>
                        Find films from the global catalog and your library.
                    </p>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: 'rgba(167, 171, 180, 0.05)',
                    borderRadius: '14px',
                    border: '1px solid rgba(167, 171, 180, 0.2)',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.5rem',
                }}>
                    <Search size={18} color="#A7ABB4" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search movies..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#F3F4F6',
                            fontSize: '1rem',
                        }}
                    />
                    {query.length > 0 && (
                        <button
                            onClick={() => setQuery('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                            aria-label="Clear search"
                        >
                            <XCircle size={18} color="#A7ABB4" />
                        </button>
                    )}
                </div>

                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#A7ABB4', marginBottom: '1.5rem' }}>
                        <div style={{ width: 18, height: 18, border: '2px solid rgba(212, 175, 55, 0.4)', borderTopColor: '#D4AF37', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        Searching...
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                )}

                {libraryResults.length > 0 && (
                    <section style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4AF37', margin: 0 }}>
                                From Your Library
                            </h2>
                            {tmdbResults.length === 0 && query.length >= 2 && !loading && (
                                <span style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>
                                    We couldn&apos;t find a match. Showing results from your library instead.
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {libraryResults.map((item) => (
                                <Link
                                    key={item.id}
                                    href={buildLibraryLink(item)}
                                    style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '12px',
                                        background: 'rgba(167, 171, 180, 0.04)',
                                        border: '1px solid rgba(167, 171, 180, 0.1)',
                                    }}
                                >
                                    <img
                                        src={item.thumbnailUrl || DEFAULT_POSTER}
                                        alt={item.title}
                                        style={{ width: 48, height: 64, borderRadius: 8, objectFit: 'cover' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#F3F4F6', margin: 0 }}>
                                            {item.title || item.seriesTitle}
                                        </p>
                                        <p style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                                            {item.releaseYear || ''} {item.genre ? `· ${item.genre}` : ''}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} color="#A7ABB4" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {tmdbResults.length > 0 && (
                    <section style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '0.85rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A7ABB4', marginBottom: '1rem' }}>
                            From the Catalog
                        </h2>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {tmdbResults.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/title/${item.id}`}
                                    style={{
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.85rem 1rem',
                                        borderRadius: '12px',
                                        background: 'rgba(167, 171, 180, 0.03)',
                                        border: '1px solid rgba(167, 171, 180, 0.08)',
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#F3F4F6', margin: 0 }}>
                                            {item.title}
                                        </p>
                                        <p style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                                            {item.year || '—'}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} color="#A7ABB4" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {renderEmptyState()}
            </div>
        </main>
    );
}
