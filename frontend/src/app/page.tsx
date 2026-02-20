'use client';

import { useRef, useState, useEffect } from 'react';
import { ButtonPrimary, ButtonSecondary, MoodChip, HeroCard, TitleTile, HeroSkeleton, TileSkeleton } from '@/components';
import type { MoviePick, AIPickRequest } from '@/types';
import { useSearch } from '@/context/SearchContext';

const MOOD_OPTIONS = [
  { label: 'Thrilling', emoji: '🚀' },
  { label: 'Heartwarming', emoji: '❤️' },
  { label: 'Mind-bending', emoji: '🌀' },
  { label: 'Funny', emoji: '😂' },
  { label: 'Dark', emoji: '🌑' },
  { label: 'Uplifting', emoji: '✨' },
  { label: 'Intense', emoji: '🔥' },
  { label: 'Relaxing', emoji: '🌿' },
  { label: 'Romantic', emoji: '💖' },
  { label: 'Epic', emoji: '⚔️' },
  { label: 'Magical', emoji: '✨' },
  { label: 'Gritty', emoji: '🚬' },
  { label: 'Futuristic', emoji: '🤖' },
  { label: 'Nostalgic', emoji: '🎞️' },
  { label: 'Artistic', emoji: '🎨' },
  { label: 'Spooky', emoji: '👻' },
  { label: 'Mysterious', emoji: '🕵️' },
  { label: 'Action-packed', emoji: '🎦' },
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
    viewSize, setViewSize,
    onlyPlayable, setOnlyPlayable
  } = useSearch();

  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on mount if results exist (for "Back to Results" behavior)
  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleMoodToggle = (moodLabel: string, selected: boolean) => {
    setSelectedMoods(prev =>
      selected ? [...prev, moodLabel] : prev.filter(m => m !== moodLabel)
    );
  };

  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || isInterpreting) return;

    setSearchError(null);
    setResults(null);

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

        await handlePickForMe(validMoods, data.adjustments, newSearchParams);
      } else {
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

  const handlePickForMe = async (
    overrideMoods?: string[],
    overrideAdjustments?: AIPickRequest['adjustments'],
    overrideSearchParams?: AIPickRequest['searchParams']
  ) => {
    setIsLoading(true);

    const moodsToUse = overrideMoods || selectedMoods;
    const adjustmentsToUse = overrideAdjustments || adjustments;
    const searchParamsToUse = overrideSearchParams || searchParams;

    try {
      const response = await fetch('/api/ai/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moods: moodsToUse,
          adjustments: adjustmentsToUse,
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
    <main className="min-h-screen bg-[#050505] text-white selection:bg-gold/30 selection:text-gold">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-gold/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gold/10 blur-[150px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Navbar */}
      <div className="sticky top-0 z-50">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md border-b border-white/5" />
        <div className="relative max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
          </div>
        </div>
      </div>

      {/* Hero Content Section */}
      <section className="relative z-10 pt-20 pb-12 px-6 flex flex-col items-center justify-center text-center">
        <div className="max-w-4xl w-full animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 mb-6 transition-all hover:bg-gold/20 group">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gold">AI Movie Intelligence</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent italic">
            WATCH<br />SOMETHING<br />
            <span className="text-gold bg-none italic not-italic font-black">LEGENDARY</span>
          </h1>

          <p className="text-lg md:text-xl text-silver/60 max-w-2xl mx-auto leading-relaxed mb-12 font-medium">
            {searchMode === 'vibe' ? "Select your moods or describe a vibe. Our AI scans the deep library to find your perfect cinema match." :
              searchMode === 'title' ? "Enter a movie you love, we'll find its true soulmates based on plot and atmosphere." :
                "Find every masterpiece starring your favorite actor."}
          </p>
        </div>

        <div className="max-w-3xl mx-auto w-full z-10 px-4">
          {/* Mode Toggles */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { id: 'vibe', label: 'Match My Vibe', icon: '✨' },
              { id: 'title', label: 'Similar Movies', icon: '🎬' },
              { id: 'actor', label: 'Actor Search', icon: '👤' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => { setSearchMode(mode.id as any); setSearchError(null); }}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 border ${searchMode === mode.id
                  ? 'bg-gold text-black border-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 text-silver/40 border-white/10 hover:bg-white/10'
                  }`}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative group mb-12">
            <div className="absolute inset-0 bg-gold/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={vibeText}
                onChange={(e) => { setVibeText(e.target.value); setSearchError(null); }}
                placeholder={
                  searchMode === 'vibe' ? "E.g. 'Slow-burn thriller with a massive twist'..." :
                    searchMode === 'title' ? "E.g. 'Blade Runner 2049'..." :
                      "E.g. 'Christopher Nolan'..."
                }
                disabled={isInterpreting || isLoading}
                className={`w-full h-16 pl-8 pr-20 rounded-2xl bg-black/40 backdrop-blur-xl border-2 transition-all outline-none text-lg font-medium ${searchError ? 'border-red-500/50' : 'border-white/10 focus:border-gold shadow-2xl'
                  }`}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-2 bottom-2 px-6 rounded-xl bg-gold text-black font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : 'Match'}
              </button>
            </form>
            {searchError && (
              <p className="absolute -bottom-7 left-4 text-xs font-bold text-red-400 animate-fade-in">
                ⚠️ {searchError}
              </p>
            )}
          </div>

          {/* Playable Filter */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => setOnlyPlayable(!onlyPlayable)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 text-[10px] font-black uppercase tracking-widest ${onlyPlayable
                  ? 'bg-gold text-black border-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]'
                  : 'bg-white/5 text-gold border-gold/20 hover:bg-gold/10'
                }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              <span>Playable Now</span>
            </button>
          </div>

          {/* Mood Grid */}
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {MOOD_OPTIONS.map((mood) => (
              <MoodChip
                key={mood.label}
                label={mood.label}
                emoji={mood.emoji}
                selected={selectedMoods.includes(mood.label)}
                onToggle={(selected) => handleMoodToggle(mood.label, selected)}
              />
            ))}
          </div>

          {/* CTA Section */}
          <div className="flex flex-col items-center gap-6 pb-20 border-b border-white/5 mb-12">
            {selectedMoods.length > 0 ? (
              <ButtonPrimary
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="py-5 px-16 text-lg tracking-widest shadow-[0_0_40px_rgba(212,175,55,0.4)]"
              >
                {isLoading ? 'Finding magic...' : (
                  searchMode === 'title' ? `Find Movies like ${vibeText || 'this'}` : `Find ${selectedMoods.length > 0 ? selectedMoods[0] : ''} Films`
                )}
              </ButtonPrimary>
            ) : (
              <ButtonSecondary onClick={handleSurprise} disabled={isLoading} className="opacity-60 hover:opacity-100">
                Just Surprise Me
              </ButtonSecondary>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      {(results || isLoading) && (
        <section ref={resultsRef} className="relative z-10 py-20 px-6 max-w-7xl mx-auto">
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-4">
                  {isLoading ? 'FINDING YOUR PERFECT MATCH' : 'THE GOLD SELECTION'}
                </h2>
                {!isLoading && results?.explanationTokens && results.explanationTokens.length > 0 && (
                  <p className="text-silver/60 text-lg font-medium">
                    Matches decoded by mood: <span className="text-gold uppercase text-sm tracking-widest">{results.explanationTokens.slice(0, 5).join(' • ')}</span>
                  </p>
                )}
              </div>

              {/* Grid View Controls */}
              {!isLoading && results && (
                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                  {['compact', 'standard', 'large'].map((size) => (
                    <button
                      key={size}
                      onClick={() => setViewSize(size as any)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewSize === size ? 'bg-gold text-black' : 'text-silver/40 hover:text-silver hover:bg-white/5'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Hero Pick */}
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/40">The Highlight</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>
              {isLoading ? <HeroSkeleton /> : results?.hero && <HeroCard movie={results.hero} />}
            </div>

            {/* Grid Results */}
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gold/40">Broad Spectrum Recommendations</span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <div
                className={`grid gap-6 ${viewSize === 'compact' ? 'grid-cols-2 lg:grid-cols-4' :
                    viewSize === 'standard' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' :
                      'grid-cols-1'
                  }`}
              >
                {isLoading ? (
                  Array(8).fill(0).map((_, i) => <TileSkeleton key={i} />)
                ) : (
                  results?.alternates?.map((movie) => (
                    <TitleTile key={movie.id} movie={movie} />
                  ))
                )}
              </div>
            </div>

            {/* Feedback Loop */}
            {!isLoading && results && (
              <div className="max-w-2xl mx-auto text-center p-12 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                <h3 className="text-xl font-bold text-white mb-2 italic">Not quite the right vibe?</h3>
                <p className="text-silver/60 text-sm mb-8">Refine your search with one click and let DeepSeek R1 re-calculate your path.</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {FEEDBACK_OPTIONS.map((feedback) => (
                    <button
                      key={feedback}
                      onClick={() => handleRepick(feedback)}
                      className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest text-silver/60 hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all active:scale-95"
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

      {/* Footer Branding */}
      <footer className="relative z-10 py-24 px-6 mt-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/scene-aware.png"
              alt="Scene Aware"
              className="h-14 w-auto grayscale brightness-50 hover:grayscale-0 hover:brightness-100 transition-all duration-700 cursor-pointer"
            />
            <p className="max-w-md text-silver/30 text-xs font-bold uppercase tracking-[0.3em] leading-relaxed">
              Powered by Scene Aware — The industry standard for content intelligence and real-time cinematic editing.
            </p>
          </div>

          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-silver/20">
            "Permanent library feel. No rotation."
          </div>
        </div>
      </footer>
    </main>
  );
}
