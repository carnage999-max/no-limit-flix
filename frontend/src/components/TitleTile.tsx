'use client';

import Link from 'next/link';

import type { MoviePick } from '@/types';

interface TitleTileProps {
    movie: MoviePick;
}

export default function TitleTile({ movie }: TitleTileProps) {
    // For playable content, we need to pass the full movie data via query params
    // since the ID is a database ID, not a TMDB ID
    const getHref = () => {
        if (movie.playable && movie.assetId) {
            // Pass movie data as JSON in query param for hosted content
            const movieData = btoa(JSON.stringify({
                id: movie.id,
                title: movie.title,
                year: movie.year,
                runtime: movie.runtime,
                poster: movie.poster,
                genres: movie.genres,
                explanation: movie.explanation,
                playable: movie.playable,
                assetId: movie.assetId,
                cloudfrontUrl: movie.cloudfrontUrl,
                permanence: movie.permanence,
            }));
            return `/title/${movie.assetId}?data=${movieData}`;
        }
        // For TMDB content, use the tmdb_id or id
        return `/title/${movie.tmdb_id || movie.id}`;
    };

    return (
        <Link
            href={getHref()}
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
                    {movie.genres && movie.genres.length > 0 && (
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
