'use client';

import { use, useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ButtonPrimary, ButtonSecondary, Skeleton, TrailerModal } from '@/components';
import { getMovieDetails } from '@/lib/tmdb';
import type { MoviePick } from '@/types';

export default function TitlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [movie, setMovie] = useState<MoviePick | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);

    useEffect(() => {
        async function loadMovie() {
            try {
                const details = await getMovieDetails(id);
                setMovie(details);
            } catch (e) {
                console.warn('Failed to fetch from TMDB:', e);
                setMovie(null);
            } finally {
                setLoading(false);
            }
        }
        loadMovie();
    }, [id]);

    if (loading) {
        return (
            <main style={{ minHeight: '100vh', background: '#0B0B0D' }}>
                <div style={{ height: '60vh', background: '#111' }} />
                <div style={{ maxWidth: '1200px', margin: '-200px auto 0', padding: '0 2rem 4rem', position: 'relative', zIndex: 1 }}>
                    <div className="detail-grid">
                        <div style={{ width: '100%', maxWidth: '350px', margin: '0 auto' }}>
                            <Skeleton height="500px" borderRadius="1rem" />
                        </div>
                        <div>
                            <Skeleton width="150px" height="1.5rem" className="mb-4" />
                            <Skeleton width="60%" height="3.5rem" className="mb-4" />
                            <Skeleton width="200px" height="1.5rem" className="mb-8" />
                            <div style={{ padding: '1.5rem', borderRadius: '0.75rem', background: 'rgba(167, 171, 180, 0.05)', marginBottom: '2rem' }}>
                                <Skeleton width="100px" height="0.875rem" className="mb-3" />
                                <Skeleton width="100%" height="1.125rem" className="mb-2" />
                                <Skeleton width="90%" height="1.125rem" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (!movie) {
        notFound();
    }

    return (
        <>
            <main style={{ minHeight: '100vh' }}>
                {/* Hero Section with Backdrop */}
                <div
                    className="relative"
                    style={{
                        height: '60vh',
                        minHeight: '500px',
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={movie.backdrop || movie.poster}
                        alt={movie.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.3,
                        }}
                    />

                    {/* Gradient Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, #0B0B0D 0%, transparent 100%)',
                        }}
                    />
                </div>

                {/* Content */}
                <div
                    style={{
                        maxWidth: '1200px',
                        margin: '-200px auto 0',
                        padding: '0 2rem 4rem',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    <div className="detail-grid">
                        {/* Poster */}
                        <div className="animate-slide-up" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                            <img
                                src={movie.poster}
                                alt={movie.title}
                                style={{
                                    width: '100%',
                                    borderRadius: '1rem',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                }}
                            />
                        </div>

                        {/* Details */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                {movie.genres.map(genre => (
                                    <span key={genre} style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: '9999px',
                                        background: 'rgba(212, 175, 55, 0.1)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        color: '#D4AF37',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {genre}
                                    </span>
                                ))}
                            </div>

                            <h1
                                style={{
                                    fontSize: 'clamp(2rem, 5vw, 4rem)',
                                    fontWeight: '700',
                                    color: '#F3F4F6',
                                    marginBottom: '0.75rem',
                                    lineHeight: '1.1',
                                }}
                            >
                                {movie.title}
                            </h1>

                            <p
                                style={{
                                    fontSize: '1.25rem',
                                    color: '#A7ABB4',
                                    marginBottom: '2rem',
                                }}
                            >
                                {movie.year} · {movie.runtime} min
                            </p>

                            {/* Why You Might Like This */}
                            <div
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    border: '1px solid rgba(167, 171, 180, 0.1)',
                                    marginBottom: '2rem',
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#D4AF37',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        marginBottom: '0.75rem',
                                    }}
                                >
                                    Plot Summary
                                </h3>
                                <p
                                    style={{
                                        fontSize: '1.0625rem',
                                        color: '#F3F4F6',
                                        lineHeight: '1.7',
                                    }}
                                >
                                    {movie.explanation}
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                    marginBottom: '3rem',
                                }}
                            >
                                {movie.trailerUrl && (
                                    <ButtonPrimary
                                        onClick={() => setIsTrailerOpen(true)}
                                    >
                                        Watch Trailer
                                    </ButtonPrimary>
                                )}
                                <ButtonSecondary onClick={() => window.history.back()}>
                                    Back to Results
                                </ButtonSecondary>
                            </div>

                            {/* Where to Watch */}
                            {movie.watchProviders.length > 0 && (
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '1.25rem',
                                            fontWeight: '600',
                                            color: '#F3F4F6',
                                            marginBottom: '1rem',
                                        }}
                                    >
                                        Where to Watch
                                    </h3>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                        }}
                                    >
                                        {movie.watchProviders.map((provider, idx) => (
                                            <a
                                                key={idx}
                                                href={provider.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.875rem 1.25rem',
                                                    borderRadius: '0.75rem',
                                                    background: 'rgba(167, 171, 180, 0.05)',
                                                    border: '2px solid rgba(167, 171, 180, 0.2)',
                                                    textDecoration: 'none',
                                                    transition: 'all 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = '#D4AF37';
                                                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = 'rgba(167, 171, 180, 0.2)';
                                                    e.currentTarget.style.background = 'rgba(167, 171, 180, 0.05)';
                                                }}
                                            >
                                                <img
                                                    src={provider.logoUrl}
                                                    alt={provider.name}
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '0.375rem',
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        fontSize: '1rem',
                                                        fontWeight: '500',
                                                        color: '#F3F4F6',
                                                    }}
                                                >
                                                    {provider.name}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            {movie && (
                <TrailerModal
                    videoUrl={movie.trailerUrl || ''}
                    isOpen={isTrailerOpen}
                    onClose={() => setIsTrailerOpen(false)}
                />
            )}
        </>
    );
}
