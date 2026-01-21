'use client';

import Link from 'next/link';

import ButtonPrimary from './ButtonPrimary';
import ButtonSecondary from './ButtonSecondary';
import TrailerModal from './TrailerModal';
import { useState } from 'react';
import type { MoviePick } from '@/types';

interface HeroCardProps {
    movie: MoviePick;
}

export default function HeroCard({ movie }: HeroCardProps) {
    const [isTrailerOpen, setIsTrailerOpen] = useState(false);

    if (!movie) return null;

    return (
        <>
            <TrailerModal
                videoUrl={movie.trailerUrl || ''}
                isOpen={isTrailerOpen}
                onClose={() => setIsTrailerOpen(false)}
            />
            <div
                className="relative overflow-hidden"
                style={{
                    borderRadius: '1.5rem',
                    background: '#0B0B0D',
                    border: '1px solid rgba(167, 171, 180, 0.1)',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                }}
            >
                {/* Backdrop Image - Background */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 0,
                    }}
                >
                    <img
                        src={movie.backdrop || movie.poster}
                        alt={movie.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            opacity: 0.4,
                        }}
                    />

                    {/* Gradient Overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, #0B0B0D 10%, rgba(11, 11, 13, 0.6) 50%, transparent 100%)',
                        }}
                    />
                </div>

                {/* Content - Relative to push parent height */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        padding: 'clamp(1.5rem, 5vw, 3rem)',
                        paddingTop: '8rem', // Space for the backdrop to show
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                        {movie.genres.map(genre => (
                            <span key={genre} style={{
                                padding: '0.35rem 0.85rem',
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

                    <h2
                        style={{
                            fontSize: 'clamp(2.25rem, 6vw, 3.5rem)',
                            fontWeight: '700',
                            color: '#F3F4F6',
                            marginBottom: '0.75rem',
                            lineHeight: '1.1',
                        }}
                    >
                        {movie.title}
                    </h2>

                    <p
                        style={{
                            fontSize: '1.125rem',
                            color: '#A7ABB4',
                            marginBottom: '1.5rem',
                        }}
                    >
                        {movie.year} · {movie.runtime} min
                    </p>

                    {/* Why This Fits Your Mood */}
                    <div
                        style={{
                            padding: '1.5rem',
                            borderRadius: '0.75rem',
                            background: 'rgba(11, 11, 13, 0.6)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            marginBottom: '2rem',
                            maxWidth: '800px',
                        }}
                    >
                        <p
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#D4AF37',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                marginBottom: '0.75rem',
                            }}
                        >
                            Why this fits your mood
                        </p>
                        <p
                            style={{
                                fontSize: '1.125rem',
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
                            alignItems: 'center',
                            gap: '1.25rem',
                        }}
                    >
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {movie.trailerUrl && (
                                <ButtonPrimary
                                    onClick={() => setIsTrailerOpen(true)}
                                >
                                    Watch Trailer
                                </ButtonPrimary>
                            )}

                            <Link href={`/title/${movie.id}`}>
                                <ButtonSecondary>
                                    Full Details
                                </ButtonSecondary>
                            </Link>
                        </div>

                        {movie.watchProviders.length > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.5rem 1rem',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    borderRadius: '9999px',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.875rem',
                                        color: '#A7ABB4',
                                        fontWeight: '500',
                                    }}
                                >
                                    Watch on:
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {movie.watchProviders.slice(0, 3).map((provider, idx) => (
                                        <a
                                            key={idx}
                                            href={provider.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={provider.name}
                                            style={{
                                                display: 'block',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '6px',
                                                overflow: 'hidden',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform = 'scale(1.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                            }}
                                        >
                                            <img
                                                src={provider.logoUrl}
                                                alt={provider.name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
