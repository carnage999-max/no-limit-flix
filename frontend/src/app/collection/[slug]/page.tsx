'use client';

import { useState, use, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TitleTile, TileSkeleton } from '@/components';
import { getMoviesByCollection } from '@/lib/tmdb';
import type { Movie, MoviePick, FilterLength, FilterIntensity, FilterTone } from '@/types';

const COLLECTIONS_META: Record<string, { title: string; promiseStatement: string; accentColor: string }> = {
    'mind-benders': {
        title: 'Mind Benders',
        promiseStatement: 'Every film in this collection will challenge your perception of reality and leave you questioning what you just watched.',
        accentColor: '#8B5CF6',
    },
    'feel-good-classics': {
        title: 'Feel-Good Classics',
        promiseStatement: 'These timeless films are guaranteed to lift your spirits and remind you of the good in the world.',
        accentColor: '#F43F5E',
    },
    'visual-masterpieces': {
        title: 'Visual Masterpieces',
        promiseStatement: 'Stunning cinematography and art direction that define visual excellence in cinema.',
        accentColor: '#D4AF37',
    },
    'adrenaline-rush': {
        title: 'Adrenaline Rush',
        promiseStatement: 'High-octane action and thrills that keep you on the edge of your seat.',
        accentColor: '#3B82F6',
    },
    'hidden-gems': {
        title: 'Hidden Gems',
        promiseStatement: 'Underrated films worth discovering, hand-picked for their unique voice and artistic merit.',
        accentColor: '#14B8A6',
    },
    'slow-cinema': {
        title: 'Slow Cinema',
        promiseStatement: 'Contemplative, meditative experiences that prioritize atmosphere and timing over traditional pacing.',
        accentColor: '#A7ABB4',
    },
    'cult-favorites': {
        title: 'Cult Favorites',
        promiseStatement: 'Bizarre, bold, and brilliantly unique films that have earned their place in the hearts of devotees.',
        accentColor: '#8B5CF6',
    },
    'foreign-language': {
        title: 'Foreign Language Excellence',
        promiseStatement: 'International masterworks that transcend language barriers through the universal power of cinema.',
        accentColor: '#F43F5E',
    },
    'directors-vision': {
        title: "Director's Vision",
        promiseStatement: 'Auteur-driven works where the specific creative vision of the director is felt in every frame.',
        accentColor: '#D4AF37',
    },
    'comfort-watches': {
        title: 'Comfort Watches',
        promiseStatement: 'The cinematic equivalent of a warm blanket—films you can return to time and time again.',
        accentColor: '#14B8A6',
    },
    'edge-of-your-seat': {
        title: 'Edge of Your Seat',
        promiseStatement: 'Relentless tension and suspense that will hold your attention from the first shot to the last.',
        accentColor: '#3B82F6',
    },
    'animation-excellence': {
        title: 'Animation Excellence',
        promiseStatement: 'Pushing the boundaries of what is possible through the art of animation and digital storytelling.',
        accentColor: '#F43F5E',
    },
};

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const meta = COLLECTIONS_META[slug] || { title: slug.replace(/-/g, ' '), promiseStatement: 'A stable collection of curated films.', accentColor: '#D4AF37' };

    const [movies, setMovies] = useState<MoviePick[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [lengthFilter, setLengthFilter] = useState<FilterLength | null>(null);
    const [intensityFilter, setIntensityFilter] = useState<FilterIntensity | null>(null);
    const [toneFilter, setToneFilter] = useState<FilterTone | null>(null);

    useEffect(() => {
        async function loadCollection() {
            try {
                const results = await getMoviesByCollection(slug);
                // Transform Movie[] to MoviePick[] by adding required fields
                const moviePicks: MoviePick[] = results.map((movie: Movie) => ({
                    ...movie,
                    explanation: 'Collection feature',
                    watchProviders: [],
                    permanence: 'Permanent Core' as const,
                    playable: false,
                }));
                setMovies(moviePicks);
            } catch (e) {
                console.error('Failed to load collection:', e);
            } finally {
                setLoading(false);
            }
        }
        loadCollection();
    }, [slug]);

    const filteredMovies = movies.filter(movie => {
        // Length Filtering (Runtime Mocked/Real)
        if (lengthFilter) {
            if (lengthFilter === 'Short' && movie.runtime >= 100) return false;
            if (lengthFilter === 'Medium' && (movie.runtime < 100 || movie.runtime > 140)) return false;
            if (lengthFilter === 'Long' && movie.runtime <= 140) return false;
        }

        // Intensity/Tone simulated via Genres for demo purposes
        if (intensityFilter) {
            const highIntensityGenres = ['Action', 'Thriller', 'Horror', 'Adventure'];
            const isHigh = movie.genres.some(g => highIntensityGenres.includes(g));
            if (intensityFilter === 'High' && !isHigh) return false;
            if (intensityFilter === 'Low' && isHigh) return false;
        }

        if (toneFilter) {
            const lightToneGenres = ['Comedy', 'Family', 'Animation', 'Romance'];
            const isLight = movie.genres.some(g => lightToneGenres.includes(g));
            if (toneFilter === 'Light' && !isLight) return false;
            if (toneFilter === 'Heavy' && isLight) return false;
        }

        return true;
    });

    const FilterGroup = ({ label, options, current, onChange }: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '700', color: '#6B7280', letterSpacing: '0.05em' }}>{label}</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => onChange(null)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        background: current === null ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                        border: current === null ? '1px solid #D4AF37' : '1px solid rgba(167, 171, 180, 0.2)',
                        color: current === null ? '#D4AF37' : '#A7ABB4',
                        cursor: 'pointer'
                    }}
                >
                    All
                </button>
                {options.map((opt: string) => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            background: current === opt ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                            border: current === opt ? '1px solid #D4AF37' : '1px solid rgba(167, 171, 180, 0.2)',
                            color: current === opt ? '#D4AF37' : '#A7ABB4',
                            cursor: 'pointer'
                        }}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <main style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div
                style={{
                    padding: '6rem 2rem 4rem',
                    background: `linear-gradient(180deg, ${meta.accentColor}15 0%, transparent 100%)`,
                    borderBottom: '1px solid rgba(167, 171, 180, 0.05)'
                }}
            >
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <Link href="/collections" style={{ color: meta.accentColor, fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', marginBottom: '2rem', display: 'inline-block' }}>
                        ← Back to Collections
                    </Link>
                    <h1 style={{ fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: '700', marginBottom: '1.5rem', color: '#F3F4F6', letterSpacing: '-0.02em' }}>
                        {meta.title}
                    </h1>
                    <p style={{ fontSize: 'clamp(1.125rem, 3vw, 1.5rem)', color: '#A7ABB4', maxWidth: '800px', fontWeight: '500', lineHeight: '1.6' }}>
                        {meta.promiseStatement}
                    </p>
                </div>
            </div>

            {/* Filters Section */}
            <div style={{ padding: '2rem', borderBottom: '1px solid rgba(167, 171, 180, 0.05)', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                    <FilterGroup
                        label="Length"
                        options={['Short', 'Medium', 'Long']}
                        current={lengthFilter}
                        onChange={setLengthFilter}
                    />
                    <FilterGroup
                        label="Intensity"
                        options={['Low', 'Medium', 'High']}
                        current={intensityFilter}
                        onChange={setIntensityFilter}
                    />
                    <FilterGroup
                        label="Tone"
                        options={['Light', 'Neutral', 'Heavy']}
                        current={toneFilter}
                        onChange={setToneFilter}
                    />
                </div>
            </div>

            {/* Movies Grid */}
            <div style={{ padding: '4rem 2rem' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                            {Array(12).fill(0).map((_, i) => <TileSkeleton key={i} />)}
                        </div>
                    ) : filteredMovies.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                            {filteredMovies.map(movie => <TitleTile key={movie.id} movie={movie} />)}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '10rem 0' }}>
                            <p style={{ color: '#A7ABB4', fontSize: '1.25rem' }}>No films match your selected filters in this collection.</p>
                            <button
                                onClick={() => { setLengthFilter(null); setIntensityFilter(null); setToneFilter(null); }}
                                style={{ marginTop: '1rem', color: '#D4AF37', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
