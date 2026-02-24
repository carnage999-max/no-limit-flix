'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import type { MoviePick } from '@/types';
import { useFavorites } from '@/context/FavoritesContext';

interface TitleTileProps {
    movie: MoviePick;
}

export default function TitleTile({ movie }: TitleTileProps) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const [isFav, setIsFav] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const id = localStorage.getItem('userId');
        setUserId(id);
    }, []);

    useEffect(() => {
        setIsFav(isFavorite(movie.id || movie.tmdb_id));
    }, [movie, isFavorite]);

    // Determine if this is a series based on the explanation field (contains "episodes")
    const isSeries = movie.explanation?.toLowerCase().includes('episodes');
    
    console.log('TitleTile - Title:', movie.title, 'isSeries:', isSeries, 'explanation:', movie.explanation, 'playable:', movie.playable, 'assetId:', movie.assetId);

    // For playable content, navigate directly to watch page for immediate player
    const getHref = () => {
        // For series, use the series detail page with query params (regardless of assetId)
        if (isSeries) {
            const href = `/series/detail?name=${encodeURIComponent(movie.title)}`;
            console.log('Series href:', href);
            return href;
        }
        
        if (movie.playable && movie.assetId) {
            // For movies, go directly to watch page
            return `/watch/${movie.assetId}`;
        }
        // For TMDB content, use the title detail page
        return `/title/${movie.tmdb_id || movie.id}`;
    };

    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!userId) return;
        
        setIsLoading(true);
        try {
            await toggleFavorite(movie);
            setIsFav(!isFav);
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        } finally {
            setIsLoading(false);
        }
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
                        position: 'relative',
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

                    {/* Favorite Button - visible if user is authenticated */}
                    {userId && (
                        <button
                            onClick={handleFavoriteClick}
                            disabled={isLoading}
                            style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderRadius: '50%',
                                background: 'rgba(11, 11, 13, 0.7)',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                opacity: isFav ? 1 : 0.6,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.background = 'rgba(11, 11, 13, 0.9)';
                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = isFav ? '1' : '0.6';
                                e.currentTarget.style.background = 'rgba(11, 11, 13, 0.7)';
                                e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                            }}
                        >
                            <Heart
                                size={18}
                                fill={isFav ? '#EF4444' : 'none'}
                                color={isFav ? '#EF4444' : '#D4AF37'}
                                style={{ transition: 'all 0.2s' }}
                            />
                        </button>
                    )}
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
