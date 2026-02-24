'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MoviePick } from '@/types';

interface FavoritesContextType {
    favorites: MoviePick[];
    isFavorite: (movieId: string | number) => boolean;
    toggleFavorite: (movie: MoviePick) => Promise<void>;
    addFavorite: (movie: MoviePick) => Promise<void>;
    removeFavorite: (movieId: string | number) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<MoviePick[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Load favorites from API on mount
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                setLoaded(true);
                return;
            }

            const response = await fetch('/api/favorites');
            if (response.ok) {
                const data = await response.json();
                setFavorites(data.favorites || []);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
        } finally {
            setLoaded(true);
        }
    };

    const isFavorite = (movieId: string | number): boolean => {
        return favorites.some(fav => String(fav.id) === String(movieId) || String(fav.tmdb_id) === String(movieId));
    };

    const addFavorite = async (movie: MoviePick) => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tmdbId: movie.tmdb_id,
                    title: movie.title,
                    poster: movie.poster,
                    assetId: movie.assetId
                })
            });

            if (response.ok) {
                setFavorites([...favorites, movie]);
            } else {
                console.error('Failed to add favorite:', await response.text());
            }
        } catch (error) {
            console.error('Failed to add favorite:', error);
        }
    };

    const removeFavorite = async (movieId: string | number) => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`/api/favorites/${movieId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setFavorites(favorites.filter(fav => String(fav.id) !== String(movieId) && String(fav.tmdb_id) !== String(movieId)));
            }
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    };

    const toggleFavorite = async (movie: MoviePick) => {
        if (isFavorite(movie.id || movie.tmdb_id)) {
            await removeFavorite(movie.id || movie.tmdb_id);
        } else {
            await addFavorite(movie);
        }
    };

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite }}>
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
