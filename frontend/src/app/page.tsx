'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HeroCard, TitleTile, HeroSkeleton, TileSkeleton, TabSwitch, CardViewToggle, IconTile } from '@/components';
import type { MoviePick, AIPickRequest } from '@/types';
import { useSearch } from '@/context/SearchContext';
import { useCardView } from '@/context/CardViewContext';
import { useSession } from '@/context/SessionContext';
import {
    Sparkles,
    Film,
    User,
    ArrowRight,
    SlidersHorizontal,
    X
} from 'lucide-react';

const MOOD_OPTIONS = [
    { label: 'Thrilling' },
    { label: 'Heartwarming' },
    { label: 'Mind-bending' },
    { label: 'Funny' },
    { label: 'Dark' },
    { label: 'Uplifting' },
    { label: 'Intense' },
    { label: 'Relaxing' },
    { label: 'Romantic' },
    { label: 'Epic' },
    { label: 'Magical' },
    { label: 'Gritty' },
    { label: 'Futuristic' },
    { label: 'Nostalgic' },
    { label: 'Artistic' },
    { label: 'Spooky' },
    { label: 'Mysterious' },
    { label: 'Action-packed' },
    { label: 'Family' },
];

const MOOD_TILE_ART: Record<string, string> = {
    Thrilling: '/new-icons/exciting.png',
    Heartwarming: '/new-icons/emotional.png',
    Funny: '/new-icons/funny.png',
    'Mind-bending': '/new-icons/thought-provoking.png',
    Dark: '/new-icons/dark.png',
    Uplifting: '/new-icons/uplifting.png',
    Intense: '/new-icons/intense.png',
    Relaxing: '/new-icons/relaxing.png',
    Romantic: '/new-icons/romantic.png',
    Epic: '/new-icons/adventure.png',
    Magical: '/new-icons/fantasy.png',
    Gritty: '/new-icons/crime.png',
    Futuristic: '/new-icons/sci-fi.png',
    Nostalgic: '/new-icons/historical.png',
    Artistic: '/new-icons/documentary.png',
    Spooky: '/new-icons/thriller.png',
    Mysterious: '/new-icons/mystery.png',
    'Action-packed': '/new-icons/action.png',
    Family: '/new-icons/family.png',
};

const FEEDBACK_OPTIONS = [
    'Too slow',
    'Too dark',
    'Seen it',
    'Not intense enough',
    'Try something lighter',
];

interface HostedLibraryItem {
    id: string;
    title?: string;
    seriesTitle?: string;
    releaseYear?: number;
    duration?: number;
    thumbnailUrl?: string;
    genre?: string;
    description?: string;
    rating?: string | null;
    averageRating?: number | null;
    ratingCount?: number | null;
    sourceProvider?: string;
    sourcePageUrl?: string;
    sourceRights?: string;
    sourceLicenseUrl?: string;
    s3Url?: string;
    episodeCount?: number;
    archiveIdentifier?: string;
    format?: string;
    fileSize?: string | number;
}

interface WatchHistoryLibraryEntry {
    videoId: string;
    videoTitle: string;
    videoPoster?: string;
    duration?: number;
    totalDuration?: number;
    completionPercent?: number;
    video?: HostedLibraryItem;
}

type ContinueWatchingPick = MoviePick & { progressPercent: number };

interface SearchResultsState {
    hero: MoviePick;
    alternates: MoviePick[];
    explanationTokens: string[];
}

const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
};

const filterPlayableResults = (results: SearchResultsState): SearchResultsState => {
    const playable = [results.hero, ...results.alternates].filter(
        (movie): movie is MoviePick => Boolean(movie?.playable)
    );

    if (playable.length === 0) {
        return results;
    }

    return {
        hero: playable[0],
        alternates: playable.slice(1),
        explanationTokens: results.explanationTokens,
    };
};

export default function HomePage() {
    const {
        searchMode, setSearchMode,
        selectedMoods, setSelectedMoods,
        vibeText, setVibeText,
        isInterpreting, setIsInterpreting,
        adjustments, setAdjustments,
        searchParams, setSearchParams,
        isLoading, setIsLoading,
        results, setResults,
        sessionId, setSessionId,
        onlyPlayable, setOnlyPlayable
    } = useSearch();
    const { viewSize } = useCardView();

    const resultsRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const router = useRouter();
    const [urlSearch, setUrlSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'watch' | 'discovery'>('discovery');
    const tabUpdateSource = useRef<'ui' | 'url' | null>(null);
    const searchUpdateSource = useRef<'ui' | 'url' | null>(null);
    const titleSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTitleQuery = useRef<string>('');
    const [hostedMovies, setHostedMovies] = useState<MoviePick[]>([]);
    const [hostedSeries, setHostedSeries] = useState<MoviePick[]>([]);
    const [continueWatching, setContinueWatching] = useState<ContinueWatchingPick[]>([]);
    const [isWatchLoading, setIsWatchLoading] = useState(true);
    const [watchFilterOpen, setWatchFilterOpen] = useState(false);
    const [watchGenreFilter, setWatchGenreFilter] = useState('all');
    const [watchYearFilter, setWatchYearFilter] = useState('all');
    const { user, loading: sessionLoading } = useSession();

    useEffect(() => {
        try {
            const stored = localStorage.getItem('nlf_watch_filters');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.genre) setWatchGenreFilter(parsed.genre);
                if (parsed?.year) setWatchYearFilter(parsed.year);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('nlf_watch_filters', JSON.stringify({
                genre: watchGenreFilter,
                year: watchYearFilter,
            }));
        } catch {
            // ignore storage errors
        }
    }, [watchGenreFilter, watchYearFilter]);

    const cardGridStyle: React.CSSProperties = {
        display: 'grid',
        gap: viewSize === 'compact' ? '1rem' : viewSize === 'standard' ? '1.5rem' : '2rem',
        width: '100%',
    };

    const gridClassName =
        viewSize === 'compact'
            ? 'grid-compact-responsive'
            : viewSize === 'standard'
                ? 'grid-standard-responsive'
                : 'grid-large-responsive';

    const cardTileStyle: React.CSSProperties =
        viewSize === 'compact'
            ? { width: '100%', maxWidth: '220px', margin: '0 auto' }
            : { width: '100%' };

    const pickRandomItems = <T,>(items: T[], count: number) => {
        const copy = [...items];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, count);
    };

    // Auto-scroll on mount if results exist (for "Back to Results" behavior)
    useEffect(() => {
        if (results && resultsRef.current) {
            resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateUrlSearch = () => {
            setUrlSearch(window.location.search || '');
        };

        updateUrlSearch();
        window.addEventListener('popstate', updateUrlSearch);

        return () => window.removeEventListener('popstate', updateUrlSearch);
    }, []);

    useEffect(() => {
        if (tabUpdateSource.current === 'ui' || searchUpdateSource.current === 'ui') {
            tabUpdateSource.current = null;
            searchUpdateSource.current = null;
            return;
        }
        const params = new URLSearchParams(urlSearch);
        const tabParam = params.get('tab');
        const nextTab = tabParam === 'discovery' ? 'discovery' : 'watch';

        if (nextTab === 'watch' && !sessionLoading && !user) {
            router.push(`/auth?redirect=${encodeURIComponent('/?tab=watch')}`);
            return;
        }

        if (nextTab !== activeTab) {
            tabUpdateSource.current = 'url';
            setActiveTab(nextTab);
        }

        const modeParam = params.get('mode');
        if (modeParam === 'title' || modeParam === 'actor' || modeParam === 'vibe') {
            if (modeParam !== searchMode) {
                searchUpdateSource.current = 'url';
                setSearchMode(modeParam);
            }
        }
    }, [activeTab, searchMode, setSearchMode, urlSearch, user, sessionLoading, router]);

    useEffect(() => {
        if (tabUpdateSource.current === 'url' || searchUpdateSource.current === 'url') {
            tabUpdateSource.current = null;
            searchUpdateSource.current = null;
            return;
        }

        const params = new URLSearchParams(urlSearch);
        const currentTabParam = params.get('tab');
        const currentModeParam = params.get('mode');
        const nextTabParam = activeTab === 'discovery' ? 'discovery' : null;
        const nextModeParam = activeTab === 'discovery' && searchMode !== 'vibe' ? searchMode : null;

        if (currentTabParam === nextTabParam && currentModeParam === nextModeParam) {
            tabUpdateSource.current = null;
            return;
        }

        const nextParams = new URLSearchParams(params.toString());
        if (nextTabParam) {
            nextParams.set('tab', nextTabParam);
        } else {
            nextParams.delete('tab');
        }
        if (nextModeParam) {
            nextParams.set('mode', nextModeParam);
        } else {
            nextParams.delete('mode');
        }
        const queryString = nextParams.toString();
        const nextSearch = queryString ? `?${queryString}` : '';
        if (nextSearch !== urlSearch) {
            router.replace(queryString ? `/?${queryString}` : '/', { scroll: false });
            setUrlSearch(nextSearch);
        }
        tabUpdateSource.current = null;
        searchUpdateSource.current = null;
    }, [activeTab, router, urlSearch, searchMode]);

    useEffect(() => {
        if (activeTab !== 'discovery' || searchMode !== 'title') return;
        if (!searchInputRef.current) return;

        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInputRef.current.focus();
        searchInputRef.current.select();
    }, [activeTab, searchMode]);

    useEffect(() => {
        if (searchMode !== 'title' || activeTab !== 'discovery') return;
        if (isInterpreting || isLoading) return;

        if (titleSearchTimeout.current) {
            clearTimeout(titleSearchTimeout.current);
        }

        const query = vibeText.trim();
        if (query.length < 2) return;

        titleSearchTimeout.current = setTimeout(() => {
            if (lastTitleQuery.current === query) return;
            lastTitleQuery.current = query;
            handleTitleSearch();
        }, 400);

        return () => {
            if (titleSearchTimeout.current) {
                clearTimeout(titleSearchTimeout.current);
            }
        };
    }, [activeTab, vibeText, searchMode, isInterpreting, isLoading]);

    // Fetch hosted content when authenticated
    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            setHostedMovies([]);
            setHostedSeries([]);
            setContinueWatching([]);
            setIsWatchLoading(false);
            return;
        }
        fetchHostedContent();
    }, [user, sessionLoading]);

    const fetchHostedContent = async () => {
        try {
            setIsWatchLoading(true);
            console.log('Fetching hosted content...');
            
            const [moviesRes, tvRes, historyRes] = await Promise.all([
                fetch('/api/library/movies'),
                fetch('/api/library/tv'),
                fetch('/api/watch-history?page=1&limit=10')
            ]);

            console.log('Movies response status:', moviesRes.status);
            console.log('TV response status:', tvRes.status);

            if (moviesRes.ok) {
                const moviesData = await moviesRes.json();
                console.log('Movies data:', moviesData);
                    const movies = pickRandomItems(moviesData.movies || [], 10).map((video: HostedLibraryItem) => ({
                        id: video.id,
                        title: video.title,
                        year: video.releaseYear || new Date().getFullYear(),
                        runtime: Math.floor((video.duration || 0) / 60),
                        poster: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genres: video.genre ? [video.genre] : [],
                        explanation: video.description || '',
                        description: video.description || '',
                        rating: video.rating || null,
                        averageRating: video.averageRating ?? null,
                        ratingCount: video.ratingCount ?? null,
                        watchProviders: [],
                        playable: true,
                        assetId: video.id,
                        cloudfrontUrl: video.s3Url,
                        sourceProvider: video.sourceProvider,
                        sourcePageUrl: video.sourcePageUrl,
                        sourceRights: video.sourceRights,
                        sourceLicenseUrl: video.sourceLicenseUrl,
                    }));
                setHostedMovies(movies);
            }

            if (tvRes.ok) {
                const tvData = await tvRes.json();
                console.log('TV data:', tvData);
                    const series = pickRandomItems(tvData.series || [], 10).map((tv: HostedLibraryItem) => ({
                        id: tv.seriesTitle || tv.id,
                        title: tv.seriesTitle,
                        year: tv.releaseYear || new Date().getFullYear(),
                        runtime: 45,
                        poster: tv.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400',
                        genres: tv.genre ? [tv.genre] : [],
                        explanation: `${tv.episodeCount || 0} episodes`,
                        description: tv.description || '',
                        rating: tv.rating || null,
                        averageRating: tv.averageRating ?? null,
                        ratingCount: tv.ratingCount ?? null,
                        watchProviders: [],
                        playable: true,
                        assetId: tv.id,
                        cloudfrontUrl: tv.thumbnailUrl,
                }));
                setHostedSeries(series);
            }

            if (historyRes.ok) {
                const historyData = await historyRes.json();
                const entries = historyData.watchHistory || [];
                const historyItems = entries.map((entry: WatchHistoryLibraryEntry) => {
                    const video = entry.video || {};
                    const progress = typeof entry.completionPercent === 'number'
                        ? entry.completionPercent
                        : (entry.totalDuration && entry.duration)
                            ? Math.min(100, Math.round((entry.duration / entry.totalDuration) * 100))
                            : 0;
                    return {
                        id: video.id || entry.videoId,
                        title: video.title || entry.videoTitle,
                        year: video.releaseYear || new Date().getFullYear(),
                        runtime: Math.floor((video.duration || 0) / 60),
                        poster: video.thumbnailUrl || entry.videoPoster || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genres: video.genre ? [video.genre] : [],
                        explanation: video.description || '',
                        description: video.description || '',
                        rating: video.rating || null,
                        averageRating: video.averageRating ?? null,
                        ratingCount: video.ratingCount ?? null,
                        watchProviders: [],
                        playable: true,
                        assetId: video.id || entry.videoId,
                        cloudfrontUrl: video.s3Url,
                        sourceProvider: video.sourceProvider,
                        sourcePageUrl: video.sourcePageUrl,
                        sourceRights: video.sourceRights,
                        sourceLicenseUrl: video.sourceLicenseUrl,
                        progressPercent: progress,
                    };
                });
                setContinueWatching(historyItems);
            }
        } catch (error) {
            console.error('Failed to fetch hosted content:', error);
        } finally {
            setIsWatchLoading(false);
        }
    };

    // ... (keep handleMoodToggle) ...
    const handleMoodToggle = (moodLabel: string, selected: boolean) => {
        setSelectedMoods(prev =>
            selected ? [...prev, moodLabel] : prev.filter(m => m !== moodLabel)
        );
    };

    const handleTabChange = (tab: 'watch' | 'discovery') => {
        if (tab === 'watch' && !user && !sessionLoading) {
            router.push(`/auth?redirect=${encodeURIComponent('/?tab=watch')}`);
            return;
        }
        tabUpdateSource.current = 'ui';
        setActiveTab(tab);
    };

    const normalizeGenres = (genres: string[] | undefined) => {
        if (!genres) return [];
        return genres
            .flatMap((genre) => genre.split(','))
            .map((genre) => genre.trim())
            .filter(Boolean);
    };

    const watchGenreOptions = Array.from(
        new Set(
            [...hostedMovies, ...hostedSeries].flatMap((item) => normalizeGenres(item.genres))
        )
    ).sort((a, b) => a.localeCompare(b));

    const watchYearOptions = Array.from(
        new Set(
            [...hostedMovies, ...hostedSeries]
                .map((item) => item.year)
                .filter(Boolean)
        )
    ).sort((a, b) => (b as number) - (a as number));

    const applyWatchFilters = (item: MoviePick) => {
        if (watchGenreFilter !== 'all') {
            const genres = normalizeGenres(item.genres);
            if (!genres.includes(watchGenreFilter)) return false;
        }
        if (watchYearFilter !== 'all') {
            if (item.year !== Number(watchYearFilter)) return false;
        }
        return true;
    };

    const filteredHostedMovies = hostedMovies.filter(applyWatchFilters);
    const filteredHostedSeries = hostedSeries.filter(applyWatchFilters);

    const handleSearchModeChange = (mode: 'vibe' | 'title' | 'actor') => {
        searchUpdateSource.current = 'ui';
        setSearchMode(mode);
        setSearchError(null);
    };

    const [searchError, setSearchError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isLoading || isInterpreting) return;

        setSearchError(null);
        setResults(null); // Clear previous results on new search

        console.log("Search Flow Start:", { mode: searchMode, text: vibeText, moods: selectedMoods });

        try {
            if (searchMode === 'vibe') {
                if (vibeText.trim()) {
                    await handleInterpretVibe();
                } else if (selectedMoods.length > 0) {
                    await handlePickForMe();
                } else {
                    setSearchError("Please select a mood or describe your vibe.");
                }
            } else if (searchMode === 'title') {
                if (!vibeText.trim()) {
                    setSearchError("Please enter a movie title.");
                    return;
                }
                await handleTitleSearch();
            } else if (searchMode === 'actor') {
                if (!vibeText.trim()) {
                    setSearchError("Please enter an actor's name.");
                    return;
                }
                await handleActorSearch();
            }
        } catch (err: unknown) {
            console.error("Search Handler Error:", err);
            setSearchError(getErrorMessage(err, "An unexpected error occurred. Please try again."));
        }
    };

    const fetchInternalMatches = async (query: string) => {
        if (!query || query.length < 2) return [];
        try {
            const response = await fetch(`/api/library/search?q=${encodeURIComponent(query)}&limit=12`);
            if (!response.ok) return [];
            const data = await response.json();
            const items = data.results || [];
            return items.map((video: HostedLibraryItem) => ({
                id: video.id,
                title: video.title || video.seriesTitle || 'Untitled',
                year: video.releaseYear || new Date().getFullYear(),
                runtime: Math.floor((video.duration || 0) / 60),
                poster: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                genres: video.genre ? [video.genre] : [],
                explanation: video.description || '',
                description: video.description || '',
                rating: video.rating || null,
                averageRating: video.averageRating ?? null,
                ratingCount: video.ratingCount ?? null,
                watchProviders: [],
                playable: true,
                assetId: video.id,
                cloudfrontUrl: video.s3Url,
                sourceProvider: video.sourceProvider,
                sourcePageUrl: video.sourcePageUrl,
                sourceRights: video.sourceRights,
                sourceLicenseUrl: video.sourceLicenseUrl,
                archiveIdentifier: video.archiveIdentifier,
                format: video.format,
                fileSize: video.fileSize,
            }));
        } catch (error) {
            console.error('Internal search error:', error);
            return [];
        }
    };

    const handleActorSearch = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/actor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actorName: vibeText,
                    moodTags: selectedMoods
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Actor search failed');
            }

            const data = await response.json();

            const finalResults: SearchResultsState = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            setResults(onlyPlayable ? filterPlayableResults(finalResults) : finalResults);
            setSessionId(null);

            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

        } finally {
            setIsLoading(false);
        }
    };

    const handleTitleSearch = async () => {
        setIsLoading(true);
        try {
            const query = vibeText.trim();
            if (query) {
                lastTitleQuery.current = query;
            }

            const response = await fetch('/api/ai/similar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    referenceTitle: vibeText,
                    moodTags: selectedMoods
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Title search failed');
            }

            const data = await response.json();

            const finalResults: SearchResultsState = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            const internalMatches = await fetchInternalMatches(query);
            if (internalMatches.length > 0) {
                const existingResults = [data.hero, ...data.alternates].filter(
                    (movie: MoviePick | null | undefined): movie is MoviePick => Boolean(movie)
                );
                const existingIds = new Set(existingResults.map((movie) => movie.id));
                const existingTitles = new Set(existingResults.map((movie) => movie.title.toLowerCase()));
                const filteredInternal = internalMatches.filter((movie) => {
                    if (existingIds.has(movie.id)) return false;
                    if (existingTitles.has(movie.title.toLowerCase())) return false;
                    return true;
                });

                finalResults.alternates = [...filteredInternal, ...finalResults.alternates];
            }

            setResults(onlyPlayable ? filterPlayableResults(finalResults) : finalResults);
            setSessionId(data.sessionId);
            if (data.inferredParams) setSearchParams(data.inferredParams);

            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);

        } finally {
            setIsLoading(false);
        }
    };

    const handleInterpretVibe = async () => {
        setIsInterpreting(true);

        try {
            const response = await fetch('/api/ai/interpret', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    freeText: vibeText,
                    existingMoods: selectedMoods
                }),
            });

            if (!response.ok) throw new Error('Interpretation failed');

            const data = await response.json();

            // Update state with interpreted results
            if (data.mood_tags && Array.isArray(data.mood_tags) && data.mood_tags.length > 0) {
                const validMoods = data.mood_tags.filter((t: string) => MOOD_OPTIONS.some(m => m.label === t));
                setSelectedMoods(validMoods);

                if (data.adjustments) setAdjustments(data.adjustments);

                const newSearchParams = {
                    tmdb_genres: data.tmdb_genres,
                    keywords: data.keywords,
                    year_range: data.year_range,
                    sort_by: data.sort_by
                };
                setSearchParams(newSearchParams);

                // Chain to Pick
                await handlePickForMe(validMoods, data.adjustments, newSearchParams);
            } else {
                // If AI fails to interpret specific moods, try a direct search with keywords if present
                const fallbackParams = {
                    keywords: data.keywords || [vibeText],
                    tmdb_genres: data.tmdb_genres,
                };
                await handlePickForMe([], {}, fallbackParams);
            }

        } catch (error) {
            console.error('Error interpreting vibe:', error);
        } finally {
            setIsInterpreting(false);
        }
    };

    // ... (keep handlePickForMe, handleSurprise, handleRepick) ...
    const handlePickForMe = async (
        overrideMoods?: string[],
        overrideAdjustments?: AIPickRequest['adjustments'],
        overrideSearchParams?: AIPickRequest['searchParams']
    ) => {
        setIsLoading(true);

        const moodsToUse = overrideMoods || selectedMoods;
        const adjustmentsToUse = overrideAdjustments || adjustments;
        const searchParamsToUse = overrideSearchParams || searchParams;

        console.log("Picking for:", { moods: moodsToUse });

        try {
            const response = await fetch('/api/ai/pick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moods: moodsToUse,
                    adjustments: adjustmentsToUse, // Pass adjustments to backend
                    searchParams: searchParamsToUse,
                    constraints: {},
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch picks');
            }

            const data = await response.json();

            const finalResults: SearchResultsState = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            setResults(onlyPlayable ? filterPlayableResults(finalResults) : finalResults);
            setSessionId(data.sessionId);

            // Auto-scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error: unknown) {
            console.error('Error fetching picks:', error);
            setSearchError(getErrorMessage(error, 'No movies found matching your criteria.'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSurprise = async () => {
        setSelectedMoods([]);
        await handlePickForMe();
    };

    const handleRepick = async (feedback: string) => {
        if (!sessionId) return;
        setSearchError(null);
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/repick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    feedback: [feedback],
                    currentSearchParams: searchParams,
                }),
            });

            if (!response.ok) throw new Error('Failed to adjust picks');

            const data = await response.json();
            setResults({ hero: data.hero, alternates: data.alternates, explanationTokens: data.explanationTokens });
        } catch (error: unknown) {
            console.error('Error re-picking:', error);
            setSearchError(getErrorMessage(error, 'Failed to adjust picks'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="home-shell">
            {/* Watch Tab */}
            {activeTab === 'watch' && (
                <section className="home-stage">
                    <div className="home-hero-card" style={{ marginBottom: '1rem' }}>
                        <div className="home-hero-nav">
                            <TabSwitch activeTab={activeTab} onTabChange={handleTabChange} />
                        </div>
                    </div>
                    <div
                        style={{
                            maxWidth: '1400px',
                            margin: '0 auto',
                        }}
                    >
                        {!user && !sessionLoading ? (
                            <div style={{
                                padding: '3rem',
                                borderRadius: '1.5rem',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                background: 'rgba(212, 175, 55, 0.05)',
                                textAlign: 'center'
                            }}>
                                <h2 style={{ color: '#F3F4F6', fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>
                                    Sign in to access Watch
                                </h2>
                                <p style={{ color: '#A7ABB4', marginBottom: '1.5rem' }}>
                                    Your watch library is available once you&apos;re authenticated.
                                </p>
                                <Link
                                    href={`/auth?redirect=${encodeURIComponent('/?tab=watch')}`}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '999px',
                                        background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                                        color: '#0B0B0D',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                    }}
                                >
                                    Sign In
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Watch Header */}
                                <div
                                    style={{
                                        textAlign: 'center',
                                        marginBottom: '3rem',
                                    }}
                                >
                                    <h2
                                        style={{
                                            fontSize: 'clamp(2rem, 5vw, 3rem)',
                                            fontWeight: '800',
                                            color: '#F3F4F6',
                                            margin: 0,
                                            marginBottom: '0.5rem',
                                            letterSpacing: '-0.5px',
                                        }}
                                    >
                                        Premium Content
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: '1rem',
                                            color: '#D4AF37',
                                            fontWeight: '600',
                                            margin: 0,
                                        }}
                                    >
                                        Hand-picked, permanent library
                                    </p>
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        marginBottom: '2rem',
                                    }}
                                >
                                    <CardViewToggle />
                                </div>

                                {continueWatching.length > 0 && (
                                    <div style={{ marginBottom: '4rem' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '2rem',
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '700',
                                                    margin: 0,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em',
                                                    color: '#A7ABB4',
                                                }}
                                            >
                                                CONTINUE WATCHING
                                            </h3>
                                            <a
                                                href="/watch-history"
                                                style={{
                                                    fontSize: '0.875rem',
                                                    color: '#D4AF37',
                                                    textDecoration: 'none',
                                                    fontWeight: '600',
                                                    transition: 'color 0.2s',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#F6D365')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    View history
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </a>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: viewSize === 'compact' ? '0.75rem' : '1rem',
                                                overflowX: 'auto',
                                                paddingBottom: '0.5rem',
                                                scrollSnapType: 'x mandatory',
                                            }}
                                        >
                                            {continueWatching.slice(0, 5).map((movie) => (
                                                <div
                                                    key={movie.id}
                                                    style={{
                                                        ...cardTileStyle,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                        flex: '0 0 auto',
                                                        scrollSnapAlign: 'start',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    <TitleTile movie={movie} progressPercent={movie.progressPercent} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Movies Section */}
                                {isWatchLoading ? (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: '400px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        border: '3px solid rgba(212, 175, 55, 0.2)',
                                        borderTop: '3px solid #D4AF37',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                    }}
                                />
                                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                            </div>
                        ) : (
                            <>
                                {filteredHostedMovies.length > 0 && (
                                    <div style={{ marginBottom: '4rem' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '2rem',
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '700',
                                                    margin: 0,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em',
                                                    color: '#A7ABB4',
                                                }}
                                            >
                                                READY TO STREAM
                                            </h3>
                                            <a
                                                href="/collections/internal-movies"
                                                style={{
                                                    fontSize: '0.875rem',
                                                    color: '#D4AF37',
                                                    textDecoration: 'none',
                                                    fontWeight: '600',
                                                    transition: 'color 0.2s',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#F6D365')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    See all movies ({hostedMovies.length})
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </a>
                                        </div>
                                        <div style={cardGridStyle} className={gridClassName}>
                                            {filteredHostedMovies.map((movie) => (
                                                <div
                                                    key={movie.id}
                                                    style={{
                                                        ...cardTileStyle,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    <TitleTile
                                                        movie={movie}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredHostedSeries.length > 0 && (
                                    <div style={{ marginBottom: '4rem' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: '2rem',
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '700',
                                                    margin: 0,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em',
                                                    color: '#A7ABB4',
                                                }}
                                            >
                                                SERIES & DOCUMENTARIES
                                            </h3>
                                            <Link
                                                href="/series"
                                                style={{
                                                    fontSize: '0.875rem',
                                                    color: '#D4AF37',
                                                    textDecoration: 'none',
                                                    fontWeight: '600',
                                                    transition: 'color 0.2s',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = '#F6D365')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = '#D4AF37')}
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    See all series ({hostedSeries.length})
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </Link>
                                        </div>
                                        <div style={{ ...cardGridStyle, marginBottom: '3rem' }} className={gridClassName}>
                                            {filteredHostedSeries.map((series) => (
                                                <div
                                                    key={series.id}
                                                    style={{
                                                        ...cardTileStyle,
                                                        cursor: 'pointer',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                                    }}
                                                >
                                                    <TitleTile
                                                        movie={series}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* "Can't find what you need?" Prompt */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%)',
                                        border: '1px solid rgba(212, 175, 55, 0.2)',
                                        borderRadius: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                    onClick={() => setActiveTab('discovery')}
                                    onMouseEnter={(e) => {
                                        const elem = e.currentTarget as HTMLElement;
                                        elem.style.borderColor = '#D4AF37';
                                        elem.style.transform = 'translateY(-2px)';
                                        elem.style.boxShadow = '0 8px 16px rgba(212, 175, 55, 0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        const elem = e.currentTarget as HTMLElement;
                                        elem.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                                        elem.style.transform = 'translateY(0)';
                                        elem.style.boxShadow = 'none';
                                    }}
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <div style={{ flex: 1 }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                color: '#F3F4F6',
                                            }}
                                        >
                                            Can&apos;t find what you need?
                                        </p>
                                        <p
                                            style={{
                                                margin: '0.25rem 0 0 0',
                                                fontSize: '0.875rem',
                                                color: '#A7ABB4',
                                            }}
                                        >
                                            Use AI Discovery to find matches from our global catalog
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5" style={{ color: '#A7ABB4' }} />
                                </div>

                                {filteredHostedMovies.length === 0 && filteredHostedSeries.length === 0 && (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '4rem 2rem',
                                            color: '#A7ABB4',
                                        }}
                                    >
                                        <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
                                            {hostedMovies.length === 0 && hostedSeries.length === 0
                                                ? 'No content available yet.'
                                                : 'No titles match your filters.'}
                                        </p>
                                        <p style={{ fontSize: '0.95rem' }}>
                                            {hostedMovies.length === 0 && hostedSeries.length === 0
                                                ? 'Check back soon or use AI Discovery to find movies from our global catalog!'
                                                : 'Try adjusting the genre or year filters.'}
                                        </p>
                                    </div>
                                )}
                            </>
                                )}
                            </>
                        )}
                    </div>
                    {(hostedMovies.length > 0 || hostedSeries.length > 0) && (
                        <>
                            <button
                                type="button"
                                onClick={() => setWatchFilterOpen((prev) => !prev)}
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
                                aria-label="Filter watch library"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            {watchFilterOpen && (
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
                                            onClick={() => setWatchFilterOpen(false)}
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
                                            value={watchGenreFilter}
                                            onChange={(e) => setWatchGenreFilter(e.target.value)}
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
                                            {watchGenreOptions.map((genre) => (
                                                <option key={genre} value={genre}>
                                                    {genre}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#A7ABB4' }}>Year</span>
                                        <select
                                            value={watchYearFilter}
                                            onChange={(e) => setWatchYearFilter(e.target.value)}
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
                                            {watchYearOptions.map((year) => (
                                                <option key={year} value={year}>
                                                    {year}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setWatchGenreFilter('all');
                                            setWatchYearFilter('all');
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
                </section>
            )}

            {/* Discovery Tab */}
            {activeTab === 'discovery' && (
                <>
                    <section className="home-stage">
                        <div className="home-hero-card">
                            <div className="home-hero-nav">
                                <TabSwitch activeTab={activeTab} onTabChange={handleTabChange} />
                            </div>

                            <div className="home-hero">
                                <div className="home-hero__copy animate-slide-up">
                                    <p className="section-label">Permanent entertainment</p>
                                    <h1 className="home-hero__title">
                                        What should you
                                        <span> watch tonight?</span>
                                    </h1>
                                    <p className="home-hero__subtitle">
                                        {searchMode === 'vibe'
                                            ? "Tell us your vibe. We'll find the perfect match."
                                            : searchMode === 'title'
                                                ? "Tell us a title you love. We'll match its energy."
                                                : "Tell us an actor you love. We'll build the short list."}
                                    </p>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleSearchModeChange('vibe')}
                                            style={{
                                                padding: '0.55rem 1rem',
                                                borderRadius: '999px',
                                                border: searchMode === 'vibe' ? '1px solid rgba(255, 214, 122, 0.4)' : '1px solid rgba(255, 214, 122, 0.12)',
                                                background: searchMode === 'vibe' ? 'rgba(255, 214, 122, 0.1)' : 'rgba(15, 16, 22, 0.65)',
                                                color: searchMode === 'vibe' ? '#FFD26F' : '#B5AFBD',
                                            }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Sparkles className="w-4 h-4" />
                                                Match My Vibe
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSearchModeChange('title')}
                                            style={{
                                                padding: '0.55rem 1rem',
                                                borderRadius: '999px',
                                                border: searchMode === 'title' ? '1px solid rgba(255, 214, 122, 0.4)' : '1px solid rgba(255, 214, 122, 0.12)',
                                                background: searchMode === 'title' ? 'rgba(255, 214, 122, 0.1)' : 'rgba(15, 16, 22, 0.65)',
                                                color: searchMode === 'title' ? '#FFD26F' : '#B5AFBD',
                                            }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Film className="w-4 h-4" />
                                                Similar Movies
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSearchModeChange('actor')}
                                            style={{
                                                padding: '0.55rem 1rem',
                                                borderRadius: '999px',
                                                border: searchMode === 'actor' ? '1px solid rgba(255, 214, 122, 0.4)' : '1px solid rgba(255, 214, 122, 0.12)',
                                                background: searchMode === 'actor' ? 'rgba(255, 214, 122, 0.1)' : 'rgba(15, 16, 22, 0.65)',
                                                color: searchMode === 'actor' ? '#FFD26F' : '#B5AFBD',
                                            }}
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <User className="w-4 h-4" />
                                                Actor Search
                                            </span>
                                        </button>
                                    </div>

                                    <form onSubmit={handleSearch} className="home-search-form">
                                        <div className="home-search-form__input">
                                            <span className="home-search-form__leading">
                                                <Sparkles className="w-4 h-4" />
                                            </span>
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={vibeText}
                                                onChange={(e) => {
                                                    setVibeText(e.target.value);
                                                    setSearchError(null);
                                                }}
                                                placeholder={
                                                    searchMode === 'vibe'
                                                        ? 'Describe your vibe...'
                                                        : searchMode === 'title'
                                                            ? 'Enter a movie title...'
                                                            : "Enter an actor's name..."
                                                }
                                                disabled={isInterpreting || isLoading}
                                            />
                                            <button
                                                type="submit"
                                                disabled={
                                                    isInterpreting ||
                                                    isLoading ||
                                                    (searchMode === 'vibe' ? (!vibeText.trim() && selectedMoods.length === 0) : !vibeText.trim())
                                                }
                                            >
                                                {isInterpreting || isLoading ? (
                                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <ArrowRight className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>

                                        {searchError ? <p className="home-search-form__error">{searchError}</p> : null}
                                    </form>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => setOnlyPlayable(!onlyPlayable)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.65rem',
                                                padding: '0.75rem 1.15rem',
                                                borderRadius: '999px',
                                                background: onlyPlayable ? '#D4AF37' : 'rgba(212, 175, 55, 0.1)',
                                                border: '1px solid rgba(212, 175, 55, 0.24)',
                                                color: onlyPlayable ? '#0B0B0D' : '#FFD26F',
                                                fontWeight: 800,
                                                fontSize: '0.82rem',
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                                            </svg>
                                            Playable Now
                                        </button>
                                        <span style={{ color: '#B5AFBD', fontSize: '0.9rem' }}>Permanent library feel. No rotation.</span>
                                    </div>
                                </div>

                                <div className="home-hero__art animate-scale-in" aria-hidden="true" />
                            </div>
                        </div>

                        <div className="home-sections">
                            <section className="glass-panel home-section-panel">
                                <div className="home-section-heading">
                                    <span className="section-label" style={{ marginBottom: 0 }}>How are you feeling?</span>
                                    <span className="home-section-meta">Select multiple</span>
                                </div>
                                <div className="home-mood-grid">
                                    {MOOD_OPTIONS.map((mood) => (
                                        <IconTile
                                            key={mood.label}
                                            label={mood.label}
                                            imageSrc={MOOD_TILE_ART[mood.label] ?? '/new-icons/exciting.png'}
                                            selected={selectedMoods.includes(mood.label)}
                                            onClick={() => handleMoodToggle(mood.label, !selectedMoods.includes(mood.label))}
                                        />
                                    ))}
                                </div>
                            </section>

                            <div className="home-cta-row">
                                <button type="button" className="home-cta home-cta--gold" onClick={() => handleSearch()}>
                                    <span>See My Picks</span>
                                    <small>AI curated for you</small>
                                </button>
                                <button type="button" className="home-cta home-cta--violet" onClick={handleSurprise}>
                                    <span>Surprise Me</span>
                                    <small>I&apos;m feeling lucky</small>
                                </button>
                            </div>
                        </div>
                    </section>

            {/* Results Section */}
            {(results || isLoading) && (
                <section ref={resultsRef} className="home-stage">
                    <div
                        style={{
                            maxWidth: '1400px',
                            margin: '0 auto',
                        }}
                    >
                        <div className="glass-panel home-results">
                        {/* Header / Tags */}
                        <div style={{ marginBottom: '3rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h2
                                        style={{
                                            fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                                            fontWeight: '600',
                                            color: '#F3F4F6',
                                            margin: 0,
                                            marginBottom: '0.5rem'
                                        }}
                                    >
                                        {isLoading ? 'Finding your perfect match...' : 'Your Matching Films'}
                                    </h2>
                                    {!isLoading && results?.explanationTokens && results.explanationTokens.length > 0 && (
                                        <p style={{
                                            color: '#A7ABB4',
                                            fontSize: '1rem',
                                            maxWidth: '700px',
                                            lineHeight: '1.5'
                                        }}>
                                            Matches based on: <span style={{ color: '#D4AF37' }}>{results.explanationTokens.slice(0, 5).join(', ')}</span>...
                                        </p>
                                    )}
                                </div>

                                {!isLoading && results && (
                                    <div style={{ marginLeft: 'auto' }}>
                                        <CardViewToggle />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hero Pick */}
                        <div
                            className="animate-slide-up"
                            style={{ marginBottom: '3rem' }}
                        >
                            <h3
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#A7ABB4',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginBottom: '1.5rem',
                                }}
                            >
                                The Highlight
                            </h3>
                            {isLoading ? <HeroSkeleton /> : results?.hero && <HeroCard movie={results.hero} />}
                        </div>

                        {/* Alternate Picks */}
                        <div className="animate-slide-up" style={{ marginBottom: '3rem' }}>
                            <h3
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: '#A7ABB4',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginBottom: '1.5rem',
                                }}
                            >
                                Other Recommendations
                            </h3>
                            <div
                                style={{
                                    display: 'grid',
                                    gap: viewSize === 'compact' ? '0.75rem' : '1.5rem',
                                    width: '100%',
                                    overflow: 'hidden'
                                }}
                                className={
                                    viewSize === 'compact'
                                        ? 'grid-compact-responsive'
                                        : viewSize === 'standard'
                                            ? 'grid-standard-responsive'
                                            : 'grid-large-responsive'
                                }
                            >
                                {isLoading ? (
                                    Array(9).fill(0).map((_, i) => <TileSkeleton key={i} />)
                                ) : (
                                    results?.alternates?.map((movie) => (
                                        <TitleTile key={movie.id} movie={movie} />
                                    ))
                                )}
                            </div>
                        </div>

                        {!isLoading && results && (
                            /* Feedback Chips - Re-pick */
                            <div className="animate-fade-in">
                                <p
                                    style={{
                                        fontSize: '1rem',
                                        color: '#A7ABB4',
                                        marginBottom: '1rem',
                                        textAlign: 'center',
                                    }}
                                >
                                    Not quite right? Let us know what to adjust:
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '0.75rem',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {FEEDBACK_OPTIONS.map((feedback) => (
                                        <button
                                            key={feedback}
                                            onClick={() => handleRepick(feedback)}
                                            disabled={isLoading}
                                            style={{
                                                padding: '0.625rem 1.5rem',
                                                borderRadius: '9999px',
                                                fontSize: '0.9375rem',
                                                fontWeight: '500',
                                                border: '2px solid #A7ABB4',
                                                background: 'transparent',
                                                color: '#A7ABB4',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                transform: 'scale(1)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#F3F4F6';
                                                e.currentTarget.style.color = '#F3F4F6';
                                                e.currentTarget.style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#A7ABB4';
                                                e.currentTarget.style.color = '#A7ABB4';
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            {feedback}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </section>
            )}

            {/* Powered by Scene Aware Footer */}
            <section
                style={{
                    padding: '4rem 1rem',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)',
                    borderTop: '1px solid rgba(167, 171, 180, 0.2)',
                    marginTop: '4rem',
                }}
            >
                <div
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.5rem',
                        justifyContent: 'center',
                        textAlign: 'center',
                    }}
                >
                    <img
                        src="/scene-aware.png"
                        alt="Scene Aware Logo"
                        style={{
                            height: '5rem',
                            width: 'auto',
                            opacity: 1,
                            marginBottom: '1rem',
                            filter: 'drop-shadow(0 4px 6px rgba(139, 92, 246, 0.1))',
                        }}
                    />
                    <p
                        style={{
                            fontSize: '1rem',
                            color: '#A7ABB4',
                            fontWeight: '500',
                            margin: 0,
                            maxWidth: '600px',
                        }}
                    >
                        Powered by <span style={{ color: '#F3F4F6', fontWeight: '700' }}>Scene Aware</span> - The industry&apos;s only real-time content editor
                    </p>
                </div>
            </section>
                </>
            )}
        </div>
    );
}
