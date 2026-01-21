'use client';

import { useState, use, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TitleTile, TileSkeleton } from '@/components';
import { getMoviesByCollection } from '@/lib/tmdb';
import type { Movie, FilterLength } from '@/types';

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
    // Add other meta as needed or catch-all
};

export default function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const meta = COLLECTIONS_META[slug] || { title: slug.replace(/-/g, ' '), promiseStatement: 'A stable collection of curated films.', accentColor: '#D4AF37' };

    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [lengthFilter, setLengthFilter] = useState<FilterLength | null>(null);

    useEffect(() => {
        async function loadCollection() {
            try {
                const results = await getMoviesByCollection(slug);
                setMovies(results);
            } catch (e) {
                console.error('Failed to load collection:', e);
            } finally {
                setLoading(false);
            }
        }
        loadCollection();
    }, [slug]);

    const filteredMovies = movies.filter(movie => {
        if (lengthFilter) {
            if (lengthFilter === 'Short' && movie.runtime >= 100) return false;
            // Note: runtime is mocked for lists, real filtering would need full details
        }
        return true;
    });

    return (
        <main style={{ minHeight: '100vh' }}>
            {/* Header */}
            <div
                style={{
                    padding: '4rem 2rem 2rem',
                    background: `linear-gradient(180deg, ${meta.accentColor}15 0%, transparent 100%)`,
                }}
            >
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: '700', marginBottom: '1.5rem', color: '#F3F4F6' }}>
                        {meta.title}
                    </h1>
                    <p style={{ fontSize: 'clamp(1.125rem, 3vw, 1.375rem)', color: '#A7ABB4', maxWidth: '800px', fontStyle: 'italic' }}>
                        {meta.promiseStatement}
                    </p>
                </div>
            </div>

            {/* Movies Grid */}
            <div style={{ padding: '3rem 2rem 4rem' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
                        {loading ? (
                            Array(12).fill(0).map((_, i) => <TileSkeleton key={i} />)
                        ) : (
                            filteredMovies.map(movie => <TitleTile key={movie.id} movie={movie} />)
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
