'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ButtonPrimary, ButtonSecondary, MoodChip, HeroCard, TitleTile, HeroSkeleton, TileSkeleton, TabSwitch, CardViewToggle } from '@/components';
import type { MoviePick, AIPickRequest } from '@/types';
import { useSearch } from '@/context/SearchContext';
import { useCardView } from '@/context/CardViewContext';
import {
    Rocket,
    Heart,
    Brain,
    Laugh,
    Moon,
    Sparkles,
    Flame,
    Leaf,
    HeartHandshake,
    Swords,
    Wand2,
    ShieldAlert,
    Bot,
    Film,
    Palette,
    Ghost,
    Search,
    Clapperboard,
    User,
    ArrowRight
} from 'lucide-react';

const MOOD_OPTIONS = [
    { label: 'Thrilling', icon: <Rocket className="w-4 h-4" /> },
    { label: 'Heartwarming', icon: <Heart className="w-4 h-4" /> },
    { label: 'Mind-bending', icon: <Brain className="w-4 h-4" /> },
    { label: 'Funny', icon: <Laugh className="w-4 h-4" /> },
    { label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { label: 'Uplifting', icon: <Sparkles className="w-4 h-4" /> },
    { label: 'Intense', icon: <Flame className="w-4 h-4" /> },
    { label: 'Relaxing', icon: <Leaf className="w-4 h-4" /> },
    { label: 'Romantic', icon: <HeartHandshake className="w-4 h-4" /> },
    { label: 'Epic', icon: <Swords className="w-4 h-4" /> },
    { label: 'Magical', icon: <Wand2 className="w-4 h-4" /> },
    { label: 'Gritty', icon: <ShieldAlert className="w-4 h-4" /> },
    { label: 'Futuristic', icon: <Bot className="w-4 h-4" /> },
    { label: 'Nostalgic', icon: <Film className="w-4 h-4" /> },
    { label: 'Artistic', icon: <Palette className="w-4 h-4" /> },
    { label: 'Spooky', icon: <Ghost className="w-4 h-4" /> },
    { label: 'Mysterious', icon: <Search className="w-4 h-4" /> },
    { label: 'Action-packed', icon: <Clapperboard className="w-4 h-4" /> },
];

const FEEDBACK_OPTIONS = [
    'Too slow',
    'Too dark',
    'Seen it',
    'Not intense enough',
    'Try something lighter',
];

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
    const [activeTab, setActiveTab] = useState<'watch' | 'discovery'>('watch');
    const tabUpdateSource = useRef<'ui' | 'url' | null>(null);
    const searchUpdateSource = useRef<'ui' | 'url' | null>(null);
    const titleSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTitleQuery = useRef<string>('');
    const [hostedMovies, setHostedMovies] = useState<MoviePick[]>([]);
    const [hostedSeries, setHostedSeries] = useState<MoviePick[]>([]);
    const [isWatchLoading, setIsWatchLoading] = useState(true);

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
        const params = new URLSearchParams(urlSearch);
        const tabParam = params.get('tab');
        const nextTab = tabParam === 'discovery' ? 'discovery' : 'watch';

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
    }, [activeTab, searchMode, setSearchMode, urlSearch]);

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

    // Fetch hosted content on mount
    useEffect(() => {
        fetchHostedContent();
    }, []);

    const fetchHostedContent = async () => {
        try {
            setIsWatchLoading(true);
            console.log('Fetching hosted content...');
            
            const [moviesRes, tvRes] = await Promise.all([
                fetch('/api/library/movies'),
                fetch('/api/library/tv')
            ]);

            console.log('Movies response status:', moviesRes.status);
            console.log('TV response status:', tvRes.status);

            if (moviesRes.ok) {
                const moviesData = await moviesRes.json();
                console.log('Movies data:', moviesData);
                const movies = pickRandomItems(moviesData.movies || [], 10).map((video: any) => ({
                    id: video.id,
                    title: video.title,
                    year: video.releaseYear || new Date().getFullYear(),
                    runtime: Math.floor((video.duration || 0) / 60),
                    poster: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genres: video.genre ? [video.genre] : [],
                        explanation: video.description || '',
                        watchProviders: [],
                        permanence: (video.sourceProvider === 'internet_archive' ? 'Licensed' : 'Permanent Core') as const,
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
                const series = pickRandomItems(tvData.series || [], 10).map((tv: any) => ({
                    id: tv.seriesTitle || tv.id,
                    title: tv.seriesTitle,
                    year: tv.releaseYear || new Date().getFullYear(),
                    runtime: 45,
                    poster: tv.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400',
                    genres: tv.genre ? [tv.genre] : [],
                    explanation: `${tv.episodeCount || 0} episodes`,
                    watchProviders: [],
                    permanence: 'Permanent Core' as const,
                    playable: true,
                    assetId: tv.id,
                    cloudfrontUrl: tv.thumbnailUrl,
                }));
                setHostedSeries(series);
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
        tabUpdateSource.current = 'ui';
        setActiveTab(tab);
    };

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
        } catch (err: any) {
            console.error("Search Handler Error:", err);
            setSearchError(err.message || "An unexpected error occurred. Please try again.");
        }
    };

    const fetchInternalMatches = async (query: string) => {
        if (!query || query.length < 2) return [];
        try {
            const response = await fetch(`/api/library/search?q=${encodeURIComponent(query)}&limit=12`);
            if (!response.ok) return [];
            const data = await response.json();
            const items = data.results || [];
            return items.map((video: any) => ({
                id: video.id,
                title: video.title || video.seriesTitle || 'Untitled',
                year: video.releaseYear || new Date().getFullYear(),
                runtime: Math.floor((video.duration || 0) / 60),
                poster: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                genres: video.genre ? [video.genre] : [],
                explanation: 'Available in your library',
                watchProviders: [],
                permanence: (video.sourceProvider === 'internet_archive' ? 'Licensed' : 'Permanent Core') as const,
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

            let finalResults = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            if (onlyPlayable) {
                const all = [data.hero, ...data.alternates];
                const playables = all.filter((m: any) => m.playable);
                if (playables.length > 0) {
                    finalResults.hero = playables[0];
                    finalResults.alternates = playables.slice(1);
                }
            }

            setResults(finalResults);
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

            let finalResults = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            const internalMatches = await fetchInternalMatches(query);
            if (internalMatches.length > 0) {
                const existingIds = new Set([data.hero?.id, ...data.alternates].map((m: any) => m?.id).filter(Boolean));
                const existingTitles = new Set([data.hero?.title, ...data.alternates].map((m: any) => (m?.title || '').toLowerCase()));
                const filteredInternal = internalMatches.filter((movie) => {
                    if (existingIds.has(movie.id)) return false;
                    if (existingTitles.has(movie.title.toLowerCase())) return false;
                    return true;
                });

                finalResults.alternates = [...filteredInternal, ...finalResults.alternates];
            }

            if (onlyPlayable) {
                const all = [finalResults.hero, ...finalResults.alternates].filter(Boolean);
                const playables = all.filter((m: any) => m.playable);
                if (playables.length > 0) {
                    finalResults.hero = playables[0];
                    finalResults.alternates = playables.slice(1);
                }
            }

            setResults(finalResults);
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

            let finalResults = {
                hero: data.hero,
                alternates: data.alternates,
                explanationTokens: data.explanationTokens
            };

            if (onlyPlayable) {
                const all = [data.hero, ...data.alternates];
                const playables = all.filter((m: any) => m.playable);
                if (playables.length > 0) {
                    finalResults.hero = playables[0];
                    finalResults.alternates = playables.slice(1);
                }
            }

            setResults(finalResults);
            setSessionId(data.sessionId);

            // Auto-scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error: any) {
            console.error('Error fetching picks:', error);
            setSearchError(error.message || 'No movies found matching your criteria.');
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
        } catch (error: any) {
            console.error('Error re-picking:', error);
            setSearchError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Tab Switch */}
            <div
                style={{
                    background: 'rgba(11, 11, 13, 0.8)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                    padding: '1rem 0',
                }}
            >
                <TabSwitch activeTab={activeTab} onTabChange={handleTabChange} />
            </div>

            {/* Watch Tab */}
            {activeTab === 'watch' && (
                <section
                    style={{
                        minHeight: '100vh',
                        padding: '2rem',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1400px',
                            margin: '0 auto',
                        }}
                    >
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
                                {hostedMovies.length > 0 && (
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
                                                    See all movies
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </a>
                                        </div>
                                        <div style={cardGridStyle} className={gridClassName}>
                                            {hostedMovies.map((movie) => (
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

                                {hostedSeries.length > 0 && (
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
                                            <a
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
                                                    See all tv
                                                    <ArrowRight className="w-4 h-4" />
                                                </span>
                                            </a>
                                        </div>
                                        <div style={{ ...cardGridStyle, marginBottom: '3rem' }} className={gridClassName}>
                                            {hostedSeries.map((series) => (
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
                                            Can't find what you need?
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

                                {hostedMovies.length === 0 && hostedSeries.length === 0 && (
                                    <div
                                        style={{
                                            textAlign: 'center',
                                            padding: '4rem 2rem',
                                            color: '#A7ABB4',
                                        }}
                                    >
                                        <p style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>No content available yet.</p>
                                        <p style={{ fontSize: '0.95rem' }}>Check back soon or use AI Discovery to find movies from our global catalog!</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            )}

            {/* Discovery Tab */}
            {activeTab === 'discovery' && (
                <>
            {/* Hero Section - Full Screen */}
            <section
                className="snap-section"
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Animated Background Elements */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.1,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        className="animate-fade-in"
                        style={{
                            position: 'absolute',
                            top: '10%',
                            left: '10%',
                            width: '300px',
                            height: '300px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
                            filter: 'blur(60px)',
                        }}
                    />
                    <div
                        className="animate-fade-in"
                        style={{
                            position: 'absolute',
                            bottom: '10%',
                            right: '10%',
                            width: '400px',
                            height: '400px',
                            borderRadius: '50%',
                            background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
                            filter: 'blur(80px)',
                            animationDelay: '0.3s',
                        }}
                    />
                </div>

                {/* Hero Content */}
                <div
                    className="animate-slide-up"
                    style={{
                        maxWidth: '900px',
                        width: '100%',
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <h1
                        style={{
                            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                            fontWeight: '700',
                            lineHeight: '1.1',
                            letterSpacing: '-0.02em',
                            marginBottom: '1.5rem',
                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        What should you watch tonight?
                    </h1>

                    <p
                        style={{
                            fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                            color: '#A7ABB4',
                            marginBottom: '3rem',
                            lineHeight: '1.6',
                        }}
                    >
                        {searchMode === 'vibe' ? "Select your moods, we'll find the perfect match" :
                            searchMode === 'title' ? "Enter a movie you love, we'll find its soulmates" :
                                "Find movies starring your favorite actor"}
                    </p>

                    {/* Search Toggle */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '1.5rem',
                        width: '100%'
                    }}>
                        <button
                            onClick={() => handleSearchModeChange('vibe')}
                            style={{
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1.5rem)',
                                borderRadius: '2rem',
                                fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                                border: searchMode === 'vibe' ? '1px solid #D4AF37' : '1px solid transparent',
                                background: searchMode === 'vibe' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                color: searchMode === 'vibe' ? '#D4AF37' : '#A7ABB4',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Sparkles className="w-4 h-4" />
                                Match My Vibe
                            </span>
                        </button>
                        <button
                            onClick={() => handleSearchModeChange('title')}
                            style={{
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1.5rem)',
                                borderRadius: '2rem',
                                fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                                border: searchMode === 'title' ? '1px solid #D4AF37' : '1px solid transparent',
                                background: searchMode === 'title' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                color: searchMode === 'title' ? '#D4AF37' : '#A7ABB4',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Film className="w-4 h-4" />
                                Similar Movies
                            </span>
                        </button>
                        <button
                            onClick={() => handleSearchModeChange('actor')}
                            style={{
                                padding: 'clamp(0.4rem, 1.5vw, 0.5rem) clamp(0.8rem, 2vw, 1.5rem)',
                                borderRadius: '2rem',
                                fontSize: 'clamp(0.75rem, 2vw, 1rem)',
                                border: searchMode === 'actor' ? '1px solid #D4AF37' : '1px solid transparent',
                                background: searchMode === 'actor' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                color: searchMode === 'actor' ? '#D4AF37' : '#A7ABB4',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <User className="w-4 h-4" />
                                Actor Search
                            </span>
                        </button>
                    </div>

                    {/* Vibe/Title/Actor Search Input */}
                    <div className="animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto 3rem', position: 'relative' }}>
                        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={vibeText}
                                onChange={(e) => { setVibeText(e.target.value); setSearchError(null); }}
                                placeholder={
                                    searchMode === 'vibe' ? "Describe your vibe... (e.g. 'Chill sci-fi with a twist')" :
                                        searchMode === 'title' ? "Enter a movie title... (e.g. 'Inception')" :
                                            "Enter an actor's name... (e.g. 'Ryan Gosling')"
                                }
                                disabled={isInterpreting || isLoading}
                                style={{
                                    width: '100%',
                                    padding: '1.25rem 3.5rem 1.25rem 1.5rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: searchError ? '1px solid #F43F5E' : '1px solid rgba(167, 171, 180, 0.2)',
                                    borderRadius: '9999px', // Pill shape
                                    fontSize: '1.125rem',
                                    color: '#F3F4F6',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    backdropFilter: 'blur(10px)'
                                }}
                                onFocus={(e) => {
                                    if (!searchError) {
                                        e.currentTarget.style.borderColor = '#D4AF37';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                                        e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                                    }
                                }}
                                onBlur={(e) => {
                                    if (!searchError) {
                                        e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                        e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={
                                    isInterpreting ||
                                    isLoading ||
                                    (searchMode === 'vibe' ? (!vibeText.trim() && selectedMoods.length === 0) : !vibeText.trim())
                                }
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: vibeText.trim() || (searchMode === 'vibe' && selectedMoods.length > 0) ? '#D4AF37' : 'rgba(167, 171, 180, 0.3)',
                                    cursor: vibeText.trim() || (searchMode === 'vibe' && selectedMoods.length > 0) ? 'pointer' : 'default',
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isInterpreting || isLoading ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" opacity="0.2" />
                                        <path d="M21 12c0 4.97-4.03 9-9 9m9-9H3" />
                                    </svg>
                                )}
                            </button>
                        </form>

                        {searchError && (
                            <p className="animate-fade-in" style={{ textAlign: 'center', marginTop: '1rem', color: '#F43F5E', fontSize: '0.9375rem', fontWeight: '500' }}>
                                ⚠️ {searchError}
                            </p>
                        )}

                        <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.875rem', color: '#A7ABB4', opacity: 0.7 }}>
                            Powered by DeepSeek R1 • No Limit Flix
                        </p>
                    </div>

                    {/* Playable Filter Toggle */}
                    <div className="flex justify-center mb-8">
                        <button
                            onClick={() => setOnlyPlayable(!onlyPlayable)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '1.25rem',
                                background: onlyPlayable ? '#D4AF37' : 'rgba(212, 175, 55, 0.1)',
                                border: '1px solid rgba(212, 175, 55, 0.3)',
                                color: onlyPlayable ? '#0B0B0D' : '#D4AF37',
                                fontWeight: '800',
                                fontSize: '0.875rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: onlyPlayable ? '0 0 20px rgba(212, 175, 55, 0.4)' : 'none',
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                            </svg>
                            <span>Playable Now</span>
                        </button>
                    </div>

                    {/* Mood Chips */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'clamp(0.25rem, 1.5vw, 0.75rem)',
                            justifyContent: 'center',
                            marginBottom: '3rem',
                            maxWidth: '800px',
                            width: '100%',
                            margin: '0 auto 3rem'
                        }}
                    >
                        {MOOD_OPTIONS.map((mood) => (
                            <MoodChip
                                key={mood.label}
                                label={mood.label}
                                icon={mood.icon}
                                selected={selectedMoods.includes(mood.label)}
                                onToggle={(selected) => handleMoodToggle(mood.label, selected)}
                            />
                        ))}
                    </div>

                    {/* Primary CTA */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.5rem',
                            marginTop: '1rem'
                        }}
                    >
                        {selectedMoods.length > 0 ? (
                            <ButtonPrimary
                                onClick={() => handleSearch()}
                                disabled={isLoading}
                                className="animate-slide-up"
                                style={{
                                    padding: '1.25rem 4rem',
                                    fontSize: '1.125rem',
                                    transform: 'scale(1.1)',
                                    boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
                                }}
                            >
                                {isLoading ? 'Finding magic...' : (
                                    searchMode === 'title' ? `Find Movies like ${vibeText || 'this'}` : `Find ${selectedMoods.length > 0 ? selectedMoods[0] : ''} Films`
                                )}
                            </ButtonPrimary>
                        ) : (
                            <ButtonSecondary onClick={handleSurprise} disabled={isLoading}>
                                Surprise me
                            </ButtonSecondary>
                        )}

                        {selectedMoods.length > 0 && (
                            <button
                                onClick={handleSurprise}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#A7ABB4',
                                    fontSize: '0.875rem',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                }}
                            >
                                Actually, just surprise me
                            </button>
                        )}
                    </div>

                    {/* Microcopy */}
                    <p
                        style={{
                            marginTop: '4rem',
                            fontSize: '0.875rem',
                            color: '#A7ABB4',
                            fontStyle: 'italic',
                        }}
                    >
                        "Permanent library feel. No rotation."
                    </p>
                </div>
            </section>

            {/* Results Section */}
            {(results || isLoading) && (
                <section
                    ref={resultsRef}
                    style={{
                        minHeight: '100vh',
                        padding: '4rem 2rem',
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1400px',
                            margin: '0 auto',
                        }}
                    >
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
                                    gridTemplateColumns: viewSize === 'compact'
                                        ? 'repeat(3, minmax(0, 1fr))'
                                        : viewSize === 'standard'
                                            ? 'repeat(2, minmax(0, 1fr))'
                                            : '1fr',
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
                        Powered by <span style={{ color: '#F3F4F6', fontWeight: '700' }}>Scene Aware</span> — The industry's only real-time content editor
                    </p>
                </div>
            </section>
                </>
            )}
        </div>
    );
}
