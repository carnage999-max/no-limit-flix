'use client';

import { useState, useRef } from 'react';
import { ButtonPrimary, ButtonSecondary, MoodChip, HeroCard, TitleTile, HeroSkeleton, TileSkeleton } from '@/components';
import type { MoviePick } from '@/types';

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
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ hero: MoviePick; alternates: MoviePick[]; explanationTokens?: string[] } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleMoodToggle = (moodLabel: string, selected: boolean) => {
    setSelectedMoods(prev =>
      selected ? [...prev, moodLabel] : prev.filter(m => m !== moodLabel)
    );
  };

  const handlePickForMe = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moods: selectedMoods,
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
                onClick={handlePickForMe}
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
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                  fontWeight: '600',
                  color: '#F3F4F6',
                  marginBottom: '1rem',
                }}
              >
                {isLoading ? 'Finding your perfect match...' : 'Your Matching Films'}
              </h2>

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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => <TileSkeleton key={i} />)
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
