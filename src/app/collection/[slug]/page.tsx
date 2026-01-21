'use client';

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TitleTile } from '@/components';
import type { Movie, FilterLength, FilterIntensity, FilterTone } from '@/types';

// Mock collection data
// ... (omitting database lines for brevity)
const COLLECTIONS: Record<string, {
    title: string;
    promiseStatement: string;
    accentColor: string;
    movies: Movie[];
}> = {
    'mind-benders': {
        title: 'Mind Benders',
        promiseStatement: 'Every film in this collection will challenge your perception of reality and leave you questioning what you just watched.',
        accentColor: '#8B5CF6',
        movies: [
            {
                id: '1',
                title: 'Inception',
                year: 2010,
                runtime: 148,
                poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
                permanenceBadge: 'Permanent Core',
            },
            {
                id: '3',
                title: 'Parasite',
                year: 2019,
                runtime: 132,
                poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
                permanenceBadge: 'Long-Term',
            },
        ],
    },
    'feel-good-classics': {
        title: 'Feel-Good Classics',
        promiseStatement: 'These timeless films are guaranteed to lift your spirits and remind you of the good in the world.',
        accentColor: '#F43F5E',
        movies: [
            {
                id: '2',
                title: 'The Grand Budapest Hotel',
                year: 2014,
                runtime: 99,
                poster: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
                permanenceBadge: 'Permanent Core',
            },
            {
                id: '4',
                title: 'Amélie',
                year: 2001,
                runtime: 122,
                poster: 'https://image.tmdb.org/t/p/w500/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
                permanenceBadge: 'Permanent Core',
            },
        ],
    },
};

const LENGTH_FILTERS: FilterLength[] = ['Short', 'Medium', 'Long'];
const INTENSITY_FILTERS: FilterIntensity[] = ['Low', 'Medium', 'High'];
const TONE_FILTERS: FilterTone[] = ['Light', 'Neutral', 'Heavy'];

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const collection = COLLECTIONS[slug];

    const [lengthFilter, setLengthFilter] = useState<FilterLength | null>(null);
    const [intensityFilter, setIntensityFilter] = useState<FilterIntensity | null>(null);
    const [toneFilter, setToneFilter] = useState<FilterTone | null>(null);

    if (!collection) {
        notFound();
    }

    // Simple filtering logic
    const filteredMovies = collection.movies.filter(movie => {
        if (lengthFilter) {
            if (lengthFilter === 'Short' && movie.runtime >= 100) return false;
            if (lengthFilter === 'Medium' && (movie.runtime < 100 || movie.runtime > 140)) return false;
            if (lengthFilter === 'Long' && movie.runtime <= 140) return false;
        }
        return true;
    });

    const FilterButton = ({
        label,
        active,
        onClick
    }: {
        label: string;
        active: boolean;
        onClick: () => void;
    }) => (
        <button
            onClick={onClick}
            style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: active ? `2px solid ${collection.accentColor}` : '2px solid #A7ABB4',
                background: active ? `${collection.accentColor}20` : 'transparent',
                color: active ? collection.accentColor : '#A7ABB4',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.borderColor = '#F3F4F6';
                    e.currentTarget.style.color = '#F3F4F6';
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.borderColor = '#A7ABB4';
                    e.currentTarget.style.color = '#A7ABB4';
                }
            }}
        >
            {label}
        </button>
    );

    return (
        <main style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div
                style={{
                    padding: '4rem 2rem 2rem',
                    background: `linear-gradient(180deg, ${collection.accentColor}15 0%, transparent 100%)`,
                }}
            >
                <div
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                    }}
                >
                    <Link
                        href="/collections"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#A7ABB4',
                            textDecoration: 'none',
                            fontSize: '0.9375rem',
                            fontWeight: '500',
                            marginBottom: '2rem',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#A7ABB4';
                        }}
                    >
                        ← All Collections
                    </Link>

                    <h1
                        className="animate-slide-up"
                        style={{
                            fontSize: 'clamp(2.5rem, 8vw, 4rem)',
                            fontWeight: '700',
                            lineHeight: '1.1',
                            letterSpacing: '-0.02em',
                            marginBottom: '1.5rem',
                            color: '#F3F4F6',
                        }}
                    >
                        {collection.title}
                    </h1>

                    <p
                        className="animate-slide-up"
                        style={{
                            fontSize: 'clamp(1.125rem, 3vw, 1.375rem)',
                            color: '#A7ABB4',
                            maxWidth: '800px',
                            lineHeight: '1.7',
                            fontStyle: 'italic',
                            animationDelay: '0.1s',
                        }}
                    >
                        {collection.promiseStatement}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div
                style={{
                    padding: '2rem',
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                }}
            >
                <div
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2rem',
                        }}
                    >
                        {/* Length Filter */}
                        <div>
                            <p
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#A7ABB4',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                Length
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {LENGTH_FILTERS.map(filter => (
                                    <FilterButton
                                        key={filter}
                                        label={filter}
                                        active={lengthFilter === filter}
                                        onClick={() => setLengthFilter(lengthFilter === filter ? null : filter)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Intensity Filter */}
                        <div>
                            <p
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#A7ABB4',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                Intensity
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {INTENSITY_FILTERS.map(filter => (
                                    <FilterButton
                                        key={filter}
                                        label={filter}
                                        active={intensityFilter === filter}
                                        onClick={() => setIntensityFilter(intensityFilter === filter ? null : filter)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tone Filter */}
                        <div>
                            <p
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: '600',
                                    color: '#A7ABB4',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                Tone
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {TONE_FILTERS.map(filter => (
                                    <FilterButton
                                        key={filter}
                                        label={filter}
                                        active={toneFilter === filter}
                                        onClick={() => setToneFilter(toneFilter === filter ? null : filter)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movies Grid */}
            <div style={{ padding: '3rem 2rem 4rem' }}>
                <div
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                    }}
                >
                    <div
                        className="animate-fade-in"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '2rem',
                        }}
                    >
                        {filteredMovies.map(movie => (
                            <TitleTile key={movie.id} movie={movie} />
                        ))}
                    </div>

                    {filteredMovies.length === 0 && (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '4rem 2rem',
                            }}
                        >
                            <p
                                style={{
                                    fontSize: '1.125rem',
                                    color: '#A7ABB4',
                                }}
                            >
                                No films match your current filters. Try adjusting your selection.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
