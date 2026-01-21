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
                        padding: '1rem',
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                        {movie.genres.slice(0, 3).map(genre => (
                            <span key={genre} style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '9999px',
                                background: 'rgba(167, 171, 180, 0.1)',
                                color: '#A7ABB4',
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                border: '1px solid rgba(167, 171, 180, 0.2)'
                            }}>
                                {genre}
                            </span>
                        ))}
                    </div>
                    <h3
                        style={{
                            fontSize: '1.125rem',
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
                            fontSize: '0.875rem',
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
