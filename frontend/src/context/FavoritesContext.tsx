'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { MoviePick } from '@/types';

interface FavoritesContextType {
    favorites: MoviePick[];
    isFavorite: (movieId: string | number) => boolean;
    toggleFavorite: (movie: MoviePick) => Promise<void>;
    addFavorite: (movie: MoviePick) => Promise<void>;
    removeFavorite: (movieId: string | number, tmdbId?: string | number) => Promise<void>;
    refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<MoviePick[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Load favorites from API on mount
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = useCallback(async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setLoaded(true);
                return;
            }

            const response = await fetch(`/api/favorites?userId=${userId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded favorites:', data);
                const normalized = (data.favorites || []).map((favorite: any) => {
                    const video = favorite.video;
                    const tmdbId = favorite.tmdbId || video?.tmdbId || video?.tmdb_id;
                    const id = video?.id || favorite.videoId || tmdbId || favorite.id;
                    return {
                        id: String(id),
                        tmdb_id: tmdbId ? String(tmdbId) : undefined,
                        title: video?.title || favorite.videoTitle || 'Unknown',
                        year: video?.releaseYear || new Date().getFullYear(),
                        runtime: video?.duration ? Math.floor(video.duration / 60) : 0,
                        poster: video?.thumbnailUrl || favorite.videoPoster || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genres: video?.genre ? [video.genre] : [],
                        explanation: video?.description || '',
                        watchProviders: [],
                        playable: Boolean(video?.id),
                        assetId: video?.id,
                        cloudfrontUrl: video?.s3Url,
                        sourceProvider: video?.sourceProvider,
                        sourcePageUrl: video?.sourcePageUrl,
                        sourceRights: video?.sourceRights,
                        sourceLicenseUrl: video?.sourceLicenseUrl,
                    } as MoviePick;
                });
                setFavorites(normalized);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        } finally {
            setLoaded(true);
        }
    }, []);

    const isFavorite = useCallback((movieId: string | number): boolean => {
        const target = String(movieId);
        return favorites.some(fav => String(fav.assetId || fav.id) === target || String(fav.tmdb_id) === target);
    }, [favorites]);

    const addFavorite = useCallback(async (movie: MoviePick) => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const videoId = movie.assetId ? String(movie.assetId) : undefined;
        const tmdbId = movie.tmdb_id ? String(movie.tmdb_id) : (!videoId ? String(movie.id) : undefined);
        const favoriteKey = videoId || tmdbId || String(movie.id);
        
        // Optimistic update
        if (!isFavorite(favoriteKey)) {
            setFavorites(prev => [...prev, movie]);
        }

        try {
            console.log('Adding favorite:', { userId, videoId, tmdbId, action: 'add', title: movie.title, poster: movie.poster });
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId,
                    tmdbId,
                    action: 'add',
                    title: movie.title,
                    poster: movie.poster
                })
            });

            if (!response.ok) {
                console.error('Failed to add favorite:', await response.text());
                // Rollback on error
                setFavorites(prev => prev.filter(fav => String(fav.assetId || fav.id) !== favoriteKey && String(fav.tmdb_id) !== favoriteKey));
            }
        } catch (error) {
            console.error('Failed to add favorite:', error);
            // Rollback on error
            setFavorites(prev => prev.filter(fav => String(fav.assetId || fav.id) !== favoriteKey && String(fav.tmdb_id) !== favoriteKey));
        }
    }, [isFavorite]);

    const removeFavorite = useCallback(async (movieId: string | number, tmdbId?: string | number) => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // Optimistic update
        const removedFavorite = favorites.find(fav => String(fav.assetId || fav.id) === String(movieId) || String(fav.tmdb_id) === String(movieId));
        setFavorites(prev => prev.filter(fav => String(fav.assetId || fav.id) !== String(movieId) && String(fav.tmdb_id) !== String(movieId)));

        try {
            console.log('Removing favorite:', { userId, videoId: movieId, tmdbId, action: 'remove' });
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId: movieId,
                    tmdbId,
                    action: 'remove'
                })
            });

            if (!response.ok) {
                console.error('Failed to remove favorite:', await response.text());
                // Rollback on error
                if (removedFavorite) {
                    setFavorites(prev => [...prev, removedFavorite]);
                }
            }
        } catch (error) {
            console.error('Failed to remove favorite:', error);
            // Rollback on error
            if (removedFavorite) {
                setFavorites(prev => [...prev, removedFavorite]);
            }
        }
    }, [favorites]);

    const toggleFavorite = useCallback(async (movie: MoviePick) => {
        const movieId = movie.assetId || movie.tmdb_id || movie.id;
        const tmdbId = movie.tmdb_id || (!movie.assetId ? movie.id : undefined);
        if (isFavorite(movieId)) {
            await removeFavorite(movieId, tmdbId);
        } else {
            await addFavorite(movie);
        }
    }, [isFavorite, removeFavorite, addFavorite]);

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite, refetch: loadFavorites }}>
            {children}
        </FavoritesContext.Provider>
    );
}

export function useFavorites() {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within FavoritesProvider');
    }
    return context;
}
