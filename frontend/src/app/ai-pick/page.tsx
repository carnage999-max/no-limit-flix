'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { safeBtoa } from '@/lib/base64';
import type { MoviePick, ActorResponse } from '@/types';

const MOOD_TAGS = [
    'Intense', 'Dark', 'Tense', 'Gritty', 'Mysterious',
    'Heartwarming', 'Funny', 'Romantic', 'Epic', 'Thrilling',
    'Relaxing', 'Nostalgic', 'Mind-bending', 'Uplifting', 'Artistic',
    'Futuristic', 'Spooky', 'Action-packed', 'Emotional', 'Quirky', 'Stylish',
];

function AiPickContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const actorName = searchParams.get('actorName') || '';
    const actorTmdbId = searchParams.get('actorTmdbId') || '';
    const profilePath = searchParams.get('profilePath') || '';

    const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
    const [pacing, setPacing] = useState<'slow' | 'medium' | 'fast'>('medium');
    const [intensity, setIntensity] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ActorResponse | null>(null);
    const [error, setError] = useState('');

    const toggleMood = (mood: string) => {
        setSelectedMoods(prev =>
            prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
        );
    };

    const handleSearch = async () => {
        if (!actorName && !actorTmdbId) return;
        setIsLoading(true);
        setError('');
        setResults(null);

        const derivedMoods = [...selectedMoods];
        if (intensity >= 7 && !derivedMoods.includes('Intense')) derivedMoods.push('Intense');
        if (intensity <= 3 && !derivedMoods.includes('Relaxing')) derivedMoods.push('Relaxing');
        if (pacing === 'slow' && !derivedMoods.includes('Relaxing')) derivedMoods.push('Relaxing');
        if (pacing === 'fast' && !derivedMoods.includes('Thrilling')) derivedMoods.push('Thrilling');

        try {
            const res = await fetch('/api/ai/actor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actorName: actorName || undefined,
                    actorTmdbId: actorTmdbId || undefined,
                    moodTags: [...new Set(derivedMoods)],
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to find recommendations');
            }

            const data: ActorResponse = await res.json();
            setResults(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const profileUrl = profilePath
        ? `https://image.tmdb.org/t/p/w185${profilePath}`
        : null;

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>

                {/* Back */}
                <button
                    onClick={() => router.back()}
                    style={{ color: '#A7ABB4', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem', fontSize: '0.875rem', padding: 0 }}
                >
                    ← Back
                </button>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '3rem' }}>
                    {profileUrl ? (
                        <img
                            src={profileUrl}
                            alt={actorName}
                            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,175,55,0.4)', flexShrink: 0 }}
                        />
                    ) : (
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(212,175,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0 }}>
                            🎬
                        </div>
                    )}
                    <div>
                        <p style={{ color: '#A7ABB4', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
                            Find something like
                        </p>
                        <h1 style={{ color: '#F3F4F6', fontSize: '1.875rem', fontWeight: '700', lineHeight: 1.1 }}>
                            {actorName || 'This Actor'}
                        </h1>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(167,171,180,0.04)',
                    border: '1px solid rgba(167,171,180,0.1)',
                    borderRadius: '1.25rem',
                    padding: '2rem',
                    marginBottom: '1.5rem',
                }}>
                    <h2 style={{ color: '#F3F4F6', fontWeight: '700', marginBottom: '1.75rem', fontSize: '1.125rem' }}>
                        How do you want to feel?
                    </h2>

                    {/* Mood tags */}
                    <div style={{ marginBottom: '2rem' }}>
                        <p style={{ color: '#A7ABB4', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                            Mood
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {MOOD_TAGS.map(mood => (
                                <button
                                    key={mood}
                                    onClick={() => toggleMood(mood)}
                                    style={{
                                        padding: '0.4rem 0.875rem',
                                        borderRadius: '999px',
                                        border: selectedMoods.includes(mood)
                                            ? '1px solid rgba(212,175,55,0.6)'
                                            : '1px solid rgba(167,171,180,0.18)',
                                        background: selectedMoods.includes(mood)
                                            ? 'rgba(212,175,55,0.14)'
                                            : 'rgba(167,171,180,0.04)',
                                        color: selectedMoods.includes(mood) ? '#D4AF37' : '#A7ABB4',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {mood}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <p style={{ color: '#A7ABB4', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                Intensity
                            </p>
                            <span style={{ color: '#D4AF37', fontSize: '0.875rem', fontWeight: '700' }}>{intensity}/10</span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={intensity}
                            onChange={e => setIntensity(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(167,171,180,0.45)', fontSize: '0.7rem' }}>Chill</span>
                            <span style={{ color: 'rgba(167,171,180,0.45)', fontSize: '0.7rem' }}>Intense</span>
                        </div>
                    </div>

                    <div>
                        <p style={{ color: '#A7ABB4', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>
                            Pacing
                        </p>
                        <div style={{ display: 'flex', gap: '0.625rem' }}>
                            {([
                                { key: 'slow', label: ' Slow' },
                                { key: 'medium', label: ' Medium' },
                                { key: 'fast', label: 'Fast' },
                            ] as const).map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setPacing(key)}
                                    style={{
                                        flex: 1,
                                        padding: '0.625rem',
                                        borderRadius: '0.625rem',
                                        border: pacing === key
                                            ? '1px solid rgba(212,175,55,0.6)'
                                            : '1px solid rgba(167,171,180,0.18)',
                                        background: pacing === key
                                            ? 'rgba(212,175,55,0.14)'
                                            : 'rgba(167,171,180,0.04)',
                                        color: pacing === key ? '#D4AF37' : '#A7ABB4',
                                        fontWeight: '600',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        borderRadius: '999px',
                        background: isLoading
                            ? 'rgba(212,175,55,0.35)'
                            : 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                        color: '#0B0B0D',
                        fontWeight: '700',
                        fontSize: '1rem',
                        border: 'none',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        marginBottom: '2rem',
                        transition: 'opacity 0.15s',
                    }}
                >
                    {isLoading ? 'Finding your match...' : 'Find My Match'}
                </button>

                {error && (
                    <p style={{ color: '#ef4444', textAlign: 'center', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                        {error}
                    </p>
                )}

                {results && (
                    <div>
                        {results.explanation && (
                            <div style={{
                                padding: '1.25rem 1.5rem',
                                borderRadius: '1rem',
                                background: 'rgba(212,175,55,0.06)',
                                border: '1px solid rgba(212,175,55,0.2)',
                                borderLeft: '4px solid #D4AF37',
                                marginBottom: '2rem',
                            }}>
                                <p style={{ color: '#D4AF37', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>
                                    Why this pick
                                </p>
                                <p style={{ color: '#F3F4F6', fontSize: '0.9375rem', lineHeight: '1.65' }}>
                                    {results.explanation}
                                </p>
                                {results.confidence_score && (
                                    <p style={{ color: 'rgba(167,171,180,0.4)', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                                        Confidence: {(results.confidence_score * 100).toFixed(0)}%
                                    </p>
                                )}
                            </div>
                        )}

                        <h2 style={{ color: '#F3F4F6', fontWeight: '700', marginBottom: '1rem', fontSize: '1.125rem' }}>
                            Top Pick
                        </h2>
                        <MovieCard movie={results.hero} hero />

                        {results.alternates && results.alternates.length > 0 && (
                            <>
                                <h2 style={{ color: '#F3F4F6', fontWeight: '700', margin: '2rem 0 1rem', fontSize: '1.125rem' }}>
                                    Alternates
                                </h2>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                    gap: '1rem',
                                }}>
                                    {results.alternates.map(movie => (
                                        <MovieCard key={movie.id} movie={movie} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

function MovieCard({ movie, hero }: { movie: MoviePick; hero?: boolean }) {
    const encoded = safeBtoa(JSON.stringify(movie));
    const href = `/title/${movie.tmdb_id || movie.id}?data=${encoded}`;

    if (hero) {
        return (
            <Link
                href={href}
                style={{
                    display: 'flex',
                    gap: '1.5rem',
                    padding: '1.25rem',
                    borderRadius: '1rem',
                    background: 'rgba(167,171,180,0.04)',
                    border: '1px solid rgba(167,171,180,0.12)',
                    textDecoration: 'none',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem',
                    transition: 'border-color 0.15s',
                }}
            >
                <img
                    src={movie.poster}
                    alt={movie.title}
                    style={{ width: '100px', borderRadius: '0.625rem', aspectRatio: '2/3', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                    <p style={{ color: '#F3F4F6', fontWeight: '700', fontSize: '1.25rem', marginBottom: '0.25rem', lineHeight: 1.2 }}>
                        {movie.title}
                    </p>
                    <p style={{ color: '#A7ABB4', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        {movie.year}{movie.runtime ? ` · ${movie.runtime} min` : ''}
                    </p>
                    {movie.genres && movie.genres.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                            {movie.genres.slice(0, 3).map(g => (
                                <span key={g} style={{
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '999px',
                                    background: 'rgba(212,175,55,0.1)',
                                    color: '#D4AF37',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                }}>{g}</span>
                            ))}
                        </div>
                    )}
                    {movie.playable && (
                        <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            background: 'rgba(34,197,94,0.12)',
                            color: '#22c55e',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                        }}>
                            Playable on App
                        </span>
                    )}
                </div>
            </Link>
        );
    }

    return (
        <Link
            href={href}
            style={{
                display: 'block',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                textDecoration: 'none',
                background: 'rgba(167,171,180,0.04)',
                border: '1px solid rgba(167,171,180,0.1)',
                transition: 'transform 0.15s, border-color 0.15s',
            }}
        >
            <img
                src={movie.poster}
                alt={movie.title}
                style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '0.625rem' }}>
                <p style={{ color: '#F3F4F6', fontWeight: '600', fontSize: '0.8rem', marginBottom: '0.2rem', lineHeight: 1.3 }}>
                    {movie.title}
                </p>
                <p style={{ color: '#A7ABB4', fontSize: '0.7rem' }}>{movie.year}</p>
                {movie.playable && (
                    <div style={{
                        marginTop: '0.4rem',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        display: 'inline-block',
                        title: 'Playable',
                    }} />
                )}
            </div>
        </Link>
    );
}

export default function AiPickPage() {
    return (
        <Suspense fallback={
            <main style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#A7ABB4' }}>Loading...</p>
            </main>
        }>
            <AiPickContent />
        </Suspense>
    );
}
