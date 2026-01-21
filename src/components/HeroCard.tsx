'use client';

import Link from 'next/link';
import PermanenceBadge from './PermanenceBadge';
import ButtonPrimary from './ButtonPrimary';
import ButtonSecondary from './ButtonSecondary';
import type { MoviePick } from '@/types';

interface HeroCardProps {
    movie: MoviePick;
}

export default function HeroCard({ movie }: HeroCardProps) {
    return (
        <div
            className="relative overflow-hidden"
            style={{
                borderRadius: '1.5rem',
                background: 'rgba(11, 11, 13, 0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(167, 171, 180, 0.1)',
            }}
        >
            {/* Backdrop Image */}
            <div
                className="relative"
                style={{
                    height: '400px',
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
                        opacity: 0.4,
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
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '2rem',
                }}
            >
                <div style={{ marginBottom: '1rem' }}>
                    <PermanenceBadge type={movie.permanenceBadge} />
                </div>

                <h2
                    style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: '700',
                        color: '#F3F4F6',
                        marginBottom: '0.5rem',
                        lineHeight: '1.2',
                    }}
                >
                    {movie.title}
                </h2>

                <p
                    style={{
                        fontSize: '1rem',
                        color: '#A7ABB4',
                        marginBottom: '1rem',
                    }}
                >
                    {movie.year} · {movie.runtime} min
                </p>

                {/* Why This Fits Your Mood */}
                <div
                    style={{
                        padding: '1.25rem',
                        borderRadius: '0.75rem',
                        background: 'rgba(167, 171, 180, 0.05)',
                        border: '1px solid rgba(167, 171, 180, 0.1)',
                        marginBottom: '1.5rem',
                    }}
                >
                    <p
                        style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#D4AF37',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginBottom: '0.5rem',
                        }}
                    >
                        Why this fits your mood
                    </p>
                    <p
                        style={{
                            fontSize: '1rem',
                            color: '#F3F4F6',
                            lineHeight: '1.6',
                        }}
                    >
                        {movie.explanation}
                    </p>
                </div>

                {/* Action Buttons */}
                <div
                    className="flex flex-wrap gap-3"
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                    }}
                >
                    {movie.trailerUrl && (
                        <ButtonPrimary
                            onClick={() => window.open(movie.trailerUrl, '_blank')}
                        >
                            Watch Trailer
                        </ButtonPrimary>
                    )}

                    <Link href={`/title/${movie.id}`}>
                        <ButtonSecondary>
                            Full Details
                        </ButtonSecondary>
                    </Link>

                    {movie.watchProviders.length > 0 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginLeft: 'auto',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.875rem',
                                    color: '#A7ABB4',
                                }}
                            >
                                Watch on:
                            </span>
                            {movie.watchProviders.slice(0, 3).map((provider, idx) => (
                                <a
                                    key={idx}
                                    href={provider.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={provider.name}
                                    style={{
                                        display: 'block',
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '0.5rem',
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
                    )}
                </div>
            </div>
        </div>
    );
}
