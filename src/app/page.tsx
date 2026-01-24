'use client';

import { useState, useRef } from 'react';
import { ButtonPrimary, ButtonSecondary, MoodChip, HeroCard, TitleTile, HeroSkeleton, TileSkeleton } from '@/components';
import type { MoviePick, AIPickRequest } from '@/types';

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

type ViewSize = 'compact' | 'standard' | 'large';

export default function HomePage() {
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [vibeText, setVibeText] = useState('');
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [adjustments, setAdjustments] = useState<AIPickRequest['adjustments']>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ hero: MoviePick; alternates: MoviePick[]; explanationTokens?: string[] } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewSize, setViewSize] = useState<ViewSize>('standard');
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleMoodToggle = (moodLabel: string, selected: boolean) => {
    // If manually toggling, we might want to clear adjustments or keep them depending on logic.
    // For now, let's keep them mixed.
    setSelectedMoods(prev =>
      selected ? [...prev, moodLabel] : prev.filter(m => m !== moodLabel)
    );
  };

  const handleInterpretVibe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vibeText.trim()) return;

    setIsInterpreting(true);

    try {
      const response = await fetch('/api/ai/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeText: vibeText }),
      });

      if (!response.ok) throw new Error('Interpretation failed');

      const data = await response.json();

      // Update state with interpreted results
      if (data.mood_tags && Array.isArray(data.mood_tags)) {
        // Merge with existing or replace? "Select 1-3 most relevant" implies replacement of "current vibe"
        // But let's replace to be clear what the AI chose.
        const validMoods = data.mood_tags.filter((t: string) => MOOD_OPTIONS.some(m => m.label === t));
        setSelectedMoods(validMoods);
      }

      if (data.adjustments) {
        setAdjustments(data.adjustments);
      }

      // Optional: Auto-search after successful interpretation? 
      // Instructions say "Auto-scroll to results after AI response" but that's for "pick". 
      // For interpretation, it might normally just fill the UI.
      // IF the user pressed enter, we probably want to search.
      // Let's call search automatically if we got moods.
      if (data.mood_tags?.length > 0) {
        // We need to wait for state update or pass directly.
        // React state updates are async, so pass directly to a modified handlePick.
        await handlePickForMe(data.mood_tags, data.adjustments);
      }

    } catch (error) {
      console.error('Error interpreting vibe:', error);
    } finally {
      setIsInterpreting(false);
    }
  };

  const handlePickForMe = async (overrideMoods?: string[], overrideAdjustments?: AIPickRequest['adjustments']) => {
    setIsLoading(true);

    const moodsToUse = overrideMoods || selectedMoods;
    const adjustmentsToUse = overrideAdjustments || adjustments;

    try {
      const response = await fetch('/api/ai/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moods: moodsToUse,
          adjustments: adjustmentsToUse, // Pass adjustments to backend
          constraints: {},
        }),
      });

      const data = await response.json();
      setResults({ hero: data.hero, alternates: data.alternates, explanationTokens: data.explanationTokens });
      setSessionId(data.sessionId);

      // Auto-scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error fetching picks:', error);
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

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/repick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          feedback: [feedback],
        }),
      });

      const data = await response.json();
      setResults({ hero: data.hero, alternates: data.alternates, explanationTokens: data.explanationTokens });
    } catch (error) {
      console.error('Error re-picking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
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
            Select your moods, we'll find the perfect match
          </p>

          {/* Vibe Search Input */}
          <div className="animate-slide-up" style={{ maxWidth: '600px', margin: '0 auto 3rem', position: 'relative' }}>
            <form onSubmit={handleInterpretVibe} style={{ position: 'relative' }}>
              <input
                type="text"
                value={vibeText}
                onChange={(e) => setVibeText(e.target.value)}
                placeholder="Describe your vibe... (e.g. 'Chill sci-fi with a twist')"
                disabled={isInterpreting || isLoading}
                style={{
                  width: '100%',
                  padding: '1.25rem 3.5rem 1.25rem 1.5rem',
                  background: 'rgba(167, 171, 180, 0.05)',
                  border: '1px solid rgba(167, 171, 180, 0.2)',
                  borderRadius: '9999px', // Pill shape
                  fontSize: '1.125rem',
                  color: '#F3F4F6',
                  outline: 'none',
                  transition: 'all 0.3s',
                  backdropFilter: 'blur(10px)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#D4AF37';
                  e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                  e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="submit"
                disabled={!vibeText.trim() || isInterpreting || isLoading}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: vibeText.trim() ? '#D4AF37' : 'rgba(167, 171, 180, 0.3)',
                  cursor: vibeText.trim() ? 'pointer' : 'default',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {isInterpreting ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" opacity="0.2" />
                    <path d="M21 12c0 4.97-4.03 9-9 9m9-9H3" />
                  </svg> // Simple arrow or icon
                )}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.875rem', color: '#A7ABB4', opacity: 0.7 }}>
              Powered by DeepSeek R1
            </p>
          </div>

          {/* Mood Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
              marginBottom: '3rem',
              maxWidth: '800px',
              margin: '0 auto 3rem'
            }}
          >
            {MOOD_OPTIONS.map((mood) => (
              <MoodChip
                key={mood.label}
                label={mood.label}
                emoji={mood.emoji}
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
                onClick={() => handlePickForMe()}
                disabled={isLoading}
                className="animate-slide-up"
                style={{
                  padding: '1.25rem 4rem',
                  fontSize: '1.125rem',
                  transform: 'scale(1.1)',
                  boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
                }}
              >
                {isLoading ? 'Finding magic...' : `Find ${selectedMoods.length > 0 ? selectedMoods[0] : ''} Films`}
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
                <h2
                  style={{
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    fontWeight: '600',
                    color: '#F3F4F6',
                    margin: 0,
                  }}
                >
                  {isLoading ? 'Finding your perfect match...' : 'Your Matching Films'}
                </h2>

                {/* Fixed View Size Toggle */}
                {!isLoading && results && (
                  <div style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    zIndex: 100
                  }}>
                    {/* Dropdown Menu */}
                    {isViewMenuOpen && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4.5rem',
                        right: 0,
                        background: 'rgba(11, 11, 13, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(167, 171, 180, 0.2)',
                        borderRadius: '0.75rem',
                        padding: '0.5rem',
                        minWidth: '150px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
                      }}>
                        <button
                          onClick={() => { setViewSize('compact'); setIsViewMenuOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            border: 'none',
                            background: viewSize === 'compact' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                            color: viewSize === 'compact' ? '#D4AF37' : '#A7ABB4',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            marginBottom: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            if (viewSize !== 'compact') e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            if (viewSize !== 'compact') e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ⊞ Compact
                        </button>
                        <button
                          onClick={() => { setViewSize('standard'); setIsViewMenuOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            border: 'none',
                            background: viewSize === 'standard' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                            color: viewSize === 'standard' ? '#D4AF37' : '#A7ABB4',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            marginBottom: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            if (viewSize !== 'standard') e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            if (viewSize !== 'standard') e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ⊟ Standard
                        </button>
                        <button
                          onClick={() => { setViewSize('large'); setIsViewMenuOpen(false); }}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            border: 'none',
                            background: viewSize === 'large' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                            color: viewSize === 'large' ? '#D4AF37' : '#A7ABB4',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => {
                            if (viewSize !== 'large') e.currentTarget.style.background = 'rgba(167, 171, 180, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            if (viewSize !== 'large') e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ▭ Large
                        </button>
                      </div>
                    )}

                    {/* Toggle Button */}
                    <button
                      onClick={() => setIsViewMenuOpen(!isViewMenuOpen)}
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                        border: 'none',
                        color: '#0B0B0D',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(212, 175, 55, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
                      }}
                    >
                      ⊞
                    </button>
                  </div>
                )}

                {!isLoading && results?.explanationTokens && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {results.explanationTokens.map(tag => (
                      <span key={tag} style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '9999px',
                        background: 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        color: '#D4AF37',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        # {tag}
                      </span>
                    ))}
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
    </div>
  );
}
