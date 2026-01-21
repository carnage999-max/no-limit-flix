'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ButtonPrimary, ButtonSecondary, PermanenceBadge } from '@/components';
import type { MoviePick } from '@/types';

// Mock movie data - in production this would fetch from API
const MOCK_MOVIES: Record<string, MoviePick> = {
    '1': {
        id: '1',
        title: 'Inception',
        year: 2010,
        runtime: 148,
        poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A mind-bending thriller that matches your desire for something intense and thought-provoking. The layered narrative and stunning visuals create an immersive experience perfect for focused viewing.',
        trailerUrl: 'https://www.youtube.com/watch?v=YoHD9XEInc0',
        watchProviders: [
            {
                name: 'Netflix',
                logoUrl: 'https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg',
                link: 'https://www.netflix.com',
            },
            {
                name: 'Amazon Prime',
                logoUrl: 'https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg',
                link: 'https://www.amazon.com/prime-video',
            },
        ],
    },
    '2': {
        id: '2',
        title: 'The Grand Budapest Hotel',
        year: 2014,
        runtime: 99,
        poster: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
        backdrop: 'https://image.tmdb.org/t/p/original/nP6RliHjxsU3pWI6Vl3XzqNgJqr.jpg',
        permanenceBadge: 'Permanent Core',
        explanation: 'A whimsical and visually stunning comedy-drama that balances humor with heart. Perfect for when you want something uplifting yet sophisticated.',
        trailerUrl: 'https://www.youtube.com/watch?v=1Fg5iWmQjwk',
        watchProviders: [
            {
                name: 'Amazon Prime',
                logoUrl: 'https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg',
                link: 'https://www.amazon.com/prime-video',
            },
        ],
    },
};

export default function TitlePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const movie = MOCK_MOVIES[id];

    if (!movie) {
        notFound();
    }

    return (
        <main style={{ minHeight: '100vh' }}>
            {/* Back Navigation */}
            <div
                style={{
                    padding: '1.5rem 2rem',
                    position: 'sticky',
                    top: 0,
                    background: 'rgba(11, 11, 13, 0.9)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 10,
                    borderBottom: '1px solid rgba(167, 171, 180, 0.1)',
                }}
            >
                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#A7ABB4',
                        textDecoration: 'none',
                        fontSize: '0.9375rem',
                        fontWeight: '500',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#A7ABB4';
                    }}
                >
                    ← Back to Discovery
                </Link>
            </div>

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
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 300px) 1fr',
                        gap: '3rem',
                    }}
                    className="title-page-grid"
                >
                    {/* Poster */}
                    <div className="animate-slide-up">
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
                        <div style={{ marginBottom: '1rem' }}>
                            <PermanenceBadge type={movie.permanenceBadge} />
                        </div>

                        <h1
                            style={{
                                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
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
                                Why you might like this
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
                                    onClick={() => window.open(movie.trailerUrl, '_blank')}
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

            {/* Responsive Styles */}
            <style jsx>{`
        @media (max-width: 768px) {
          .title-page-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
      `}</style>
        </main>
    );
}
