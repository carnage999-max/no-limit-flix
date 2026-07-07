'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, XCircle, ChevronRight, Film } from 'lucide-react';
import { ShellPage, ShellPageHeader } from '@/components';
import { safeBtoa } from '@/lib/base64';

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
    rating?: string | null;
    averageRating?: number | null;
    ratingCount?: number | null;
    tmdbId?: string | null;
    sourceProvider?: string | null;
    sourcePageUrl?: string | null;
    sourceRights?: string | null;
    sourceLicenseUrl?: string | null;
    description?: string | null;
}

const DEFAULT_POSTER = '/poster-placeholder.svg';

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
        const encodedData = safeBtoa(JSON.stringify({
            id: item.id,
            title: item.title || item.seriesTitle || 'Untitled',
            poster: item.thumbnailUrl || DEFAULT_POSTER,
            year: item.releaseYear || new Date().getFullYear(),
            runtime: item.duration ? Math.floor(item.duration / 60) : 0,
            genres: item.genre ? [item.genre] : [],
            explanation: item.description || '',
            description: item.description || '',
            rating: item.rating || null,
            averageRating: item.averageRating ?? null,
            ratingCount: item.ratingCount ?? null,
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
                <div className="utility-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <Search size={56} color="#B5AFBD" style={{ opacity: 0.35, marginInline: 'auto' }} />
                    <h3 style={{ marginTop: '1.25rem', fontSize: '1.25rem', color: '#F7F4EE' }}>Search for Movies</h3>
                    <p style={{ color: '#B5AFBD', marginTop: '0.65rem' }}>
                        Start typing to find films from the global catalog and your internal library.
                    </p>
                </div>
            );
        }

        if (query.length < 2) {
            return (
                <div className="utility-card" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#B5AFBD' }}>
                    Type at least 2 characters to search.
                </div>
            );
        }

        if (tmdbResults.length === 0 && libraryResults.length === 0) {
            return (
                <div className="utility-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <Film size={56} color="#B5AFBD" style={{ opacity: 0.35, marginInline: 'auto' }} />
                    <h3 style={{ marginTop: '1.25rem', fontSize: '1.25rem', color: '#F7F4EE' }}>No Results Found</h3>
                    <p style={{ color: '#B5AFBD', marginTop: '0.65rem' }}>
                        We couldn&apos;t find a match for that query. Try a different title.
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <ShellPage width="wide">
            <ShellPageHeader
                eyebrow="Library"
                title="Search"
                subtitle="Find films from the global catalog and your permanent library."
            />

            <section className="glass-panel utility-panel utility-stack">
                <div className="utility-search-input">
                    <Search size={18} color="#B5AFBD" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search movies..."
                    />
                    {query.length > 0 ? (
                        <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                            <XCircle size={18} color="#B5AFBD" />
                        </button>
                    ) : null}
                </div>

                {loading ? (
                    <div className="utility-card" style={{ color: '#B5AFBD' }}>
                        Searching...
                    </div>
                ) : null}

                {libraryResults.length > 0 ? (
                    <section className="utility-results-section">
                        <h2>Ready to Watch Now</h2>
                        {tmdbResults.length === 0 && query.length >= 2 && !loading ? (
                            <p style={{ color: '#B5AFBD', fontSize: '0.85rem', marginBottom: '0.8rem' }}>
                                We couldn&apos;t find a match in the global catalog. Showing results from your library instead.
                            </p>
                        ) : null}
                        <div className="utility-results-list">
                            {libraryResults.map((item) => (
                                <Link key={item.id} href={buildLibraryLink(item)} className="utility-result-row">
                                    <img
                                        src={item.thumbnailUrl || DEFAULT_POSTER}
                                        alt={item.title}
                                        onError={(e) => {
                                            const target = e.currentTarget;
                                            target.onerror = null;
                                            target.src = DEFAULT_POSTER;
                                        }}
                                    />
                                    <div>
                                        <p>{item.title || item.seriesTitle}</p>
                                        <span>{item.releaseYear || ''} {item.genre ? `· ${item.genre}` : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="detail-shell__tag">Watch now</span>
                                        <ChevronRight size={18} color="#B5AFBD" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}

                {tmdbResults.length > 0 ? (
                    <section className="utility-results-section">
                        <h2 style={{ color: '#B5AFBD' }}>Curated Picks</h2>
                        <div className="utility-results-list">
                            {tmdbResults.map((item) => (
                                <Link key={item.id} href={`/title/${item.id}`} className="utility-result-row">
                                    <div>
                                        <p>{item.title}</p>
                                        <span>{item.year || '—'}</span>
                                    </div>
                                    <ChevronRight size={18} color="#B5AFBD" />
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}

                {renderEmptyState()}
            </section>
        </ShellPage>
    );
}
