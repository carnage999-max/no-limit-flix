'use client';

import Link from 'next/link';

import type { Movie } from '@/types';

interface TitleTileProps {
    movie: Movie;
}

export default function TitleTile({ movie }: TitleTileProps) {
    return (
        <Link
            href={`/title/${movie.id}`}
            className="block transition-all duration-300"
            style={{
                textDecoration: 'none',
                transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div
                className="relative overflow-hidden"
                style={{
                    borderRadius: '0.75rem',
                    background: 'rgba(167, 171, 180, 0.05)',
                    minWidth: 0,
                }}
            >
                {/* Poster Image */}
                <div
                    className="relative"
                    style={{
                        aspectRatio: '2/3',
                        overflow: 'hidden',
                    }}
                >
                    <img
                        src={movie.poster}
                        alt={movie.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />

                </div>

                {/* Title Info */}
                <div
                    style={{
                        padding: 'clamp(0.5rem, 2vw, 1rem)',
                    }}
                >
                    {movie.genres.length > 0 && (
                        <p style={{
                            fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)',
                            color: '#D4AF37',
                            fontStyle: 'italic',
                            marginBottom: '0.5rem',
                            lineHeight: 1.4
                        }}>
                            {movie.genres.slice(0, 3).join(', ')}
                        </p>
                    )}
                    <h3
                        style={{
                            fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
                            fontWeight: '600',
                            color: '#F3F4F6',
                            marginBottom: '0.25rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {movie.title}
                    </h3>
                    <p
                        style={{
                            fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                            color: '#A7ABB4',
                        }}
                    >
                        {movie.year} · {movie.runtime} min
                    </p>
                </div>
            </div>
        </Link>
    );
}
