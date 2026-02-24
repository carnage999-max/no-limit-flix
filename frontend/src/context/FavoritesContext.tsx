'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { MoviePick } from '@/types';

interface FavoritesContextType {
    favorites: MoviePick[];
    isFavorite: (movieId: string | number) => boolean;
    toggleFavorite: (movie: MoviePick) => Promise<void>;
    addFavorite: (movie: MoviePick) => Promise<void>;
    removeFavorite: (movieId: string | number) => Promise<void>;
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
                setFavorites(data.favorites || []);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        } finally {
            setLoaded(true);
        }
    }, []);

    const isFavorite = useCallback((movieId: string | number): boolean => {
        return favorites.some(fav => String(fav.id) === String(movieId) || String(fav.tmdb_id) === String(movieId));
    }, [favorites]);

    const addFavorite = useCallback(async (movie: MoviePick) => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const videoId = movie.assetId || movie.id;
        
        // Optimistic update
        if (!isFavorite(videoId)) {
            setFavorites(prev => [...prev, movie]);
        }

        try {
            console.log('Adding favorite:', { userId, videoId, action: 'add', title: movie.title, poster: movie.poster });
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId,
                    action: 'add',
                    title: movie.title,
                    poster: movie.poster
                })
            });

            if (!response.ok) {
                console.error('Failed to add favorite:', await response.text());
                // Rollback on error
                setFavorites(prev => prev.filter(fav => String(fav.id) !== String(videoId)));
            }
        } catch (error) {
            console.error('Failed to add favorite:', error);
            // Rollback on error
            setFavorites(prev => prev.filter(fav => String(fav.id) !== String(videoId)));
        }
    }, [isFavorite]);

    const removeFavorite = useCallback(async (movieId: string | number) => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        // Optimistic update
        const removedFavorite = favorites.find(fav => String(fav.id) === String(movieId) || String(fav.tmdb_id) === String(movieId));
        setFavorites(prev => prev.filter(fav => String(fav.id) !== String(movieId) && String(fav.tmdb_id) !== String(movieId)));

        try {
            console.log('Removing favorite:', { userId, videoId: movieId, action: 'remove' });
            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId: movieId,
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
        const movieId = movie.assetId || movie.id;
        if (isFavorite(movieId)) {
            await removeFavorite(movieId);
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
