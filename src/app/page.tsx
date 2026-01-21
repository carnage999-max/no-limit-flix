'use client';

import { useState, useRef } from 'react';
import { ButtonPrimary, ButtonSecondary, MoodChip, HeroCard, TitleTile } from '@/components';
import type { MoviePick } from '@/types';

const MOOD_OPTIONS = [
  'Thrilling',
  'Heartwarming',
  'Mind-bending',
  'Funny',
  'Dark',
  'Uplifting',
  'Intense',
  'Relaxing',
  'Romantic',
  'Epic',
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
  const [freeText, setFreeText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ hero: MoviePick; alternates: MoviePick[] } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleMoodToggle = (mood: string, selected: boolean) => {
    setSelectedMoods(prev =>
      selected ? [...prev, mood] : prev.filter(m => m !== mood)
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
          freeText,
          constraints: {},
        }),
      });

      const data = await response.json();
      setResults({ hero: data.hero, alternates: data.alternates });
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
    setFreeText('');
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
      setResults({ hero: data.hero, alternates: data.alternates });
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
            Tell us your mood, we'll find the perfect match
          </p>

          {/* Mood Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
              marginBottom: '2rem',
            }}
          >
            {MOOD_OPTIONS.map((mood) => (
              <MoodChip
                key={mood}
                label={mood}
                onToggle={(selected) => handleMoodToggle(mood, selected)}
              />
            ))}
          </div>

          {/* Optional Text Input */}
          <div style={{ marginBottom: '2rem' }}>
            <input
              type="text"
              placeholder="Or describe what you're looking for... (optional)"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              className="animate-scale-in"
              style={{
                width: '100%',
                maxWidth: '600px',
                padding: '1rem 1.5rem',
                fontSize: '1rem',
                background: 'rgba(167, 171, 180, 0.05)',
                border: '2px solid rgba(167, 171, 180, 0.2)',
                borderRadius: '9999px',
                color: '#F3F4F6',
                outline: 'none',
                transition: 'all 0.3s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#D4AF37';
                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
              }}
            />
          </div>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <ButtonPrimary onClick={handlePickForMe} disabled={isLoading}>
              {isLoading ? 'Finding your match...' : 'Pick for me'}
            </ButtonPrimary>
            <ButtonSecondary onClick={handleSurprise} disabled={isLoading}>
              Surprise me
            </ButtonSecondary>
          </div>

          {/* Microcopy */}
          <p
            style={{
              marginTop: '3rem',
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
      {results && (
        <section
          ref={resultsRef}
          className="snap-section"
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
            {/* Hero Pick */}
            <div
              className="animate-slide-up"
              style={{ marginBottom: '3rem' }}
            >
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                  fontWeight: '600',
                  color: '#F3F4F6',
                  marginBottom: '1.5rem',
                }}
              >
                Your Perfect Match
              </h2>
              <HeroCard movie={results.hero} />
            </div>

            {/* Alternate Picks */}
            {results.alternates.length > 0 && (
              <div className="animate-slide-up" style={{ marginBottom: '3rem' }}>
                <h3
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                    fontWeight: '600',
                    color: '#F3F4F6',
                    marginBottom: '1.5rem',
                  }}
                >
                  Or Try These
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1.5rem',
                  }}
                >
                  {results.alternates.map((movie) => (
                    <TitleTile key={movie.id} movie={movie} />
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Chips - Re-pick */}
            <div className="animate-fade-in">
              <p
                style={{
                  fontSize: '1rem',
                  color: '#A7ABB4',
                  marginBottom: '1rem',
                  textAlign: 'center',
                }}
              >
                Not quite right?
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
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#F3F4F6';
                      e.currentTarget.style.color = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#A7ABB4';
                      e.currentTarget.style.color = '#A7ABB4';
                    }}
                  >
                    {feedback}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 11, 13, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="loading-shimmer" style={{
            width: '200px',
            height: '4px',
            borderRadius: '2px',
          }} />
        </div>
      )}
    </div>
  );
}
