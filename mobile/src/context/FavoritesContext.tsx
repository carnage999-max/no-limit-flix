import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MoviePick } from '../types';
import { favoritesStorage } from '../lib/favoritesStorage';

interface FavoritesContextType {
  favorites: MoviePick[];
  favoriteIds: string[];
  isFavorite: (movieId: string) => boolean;
  toggleFavorite: (movie: MoviePick) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<MoviePick[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const refreshFavorites = useCallback(async () => {
    try {
      const [favs, ids] = await Promise.all([
        favoritesStorage.getFavorites(),
        favoritesStorage.getFavoriteIds(),
      ]);
      setFavorites(favs);
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error refreshing favorites:', error);
    }
  }, []);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback((movieId: string) => {
    return favoriteIds.includes(movieId);
  }, [favoriteIds]);

  const toggleFavorite = useCallback(async (movie: MoviePick) => {
    try {
      await favoritesStorage.toggleFavorite(movie);
      await refreshFavorites();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [refreshFavorites]);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds,
        isFavorite,
        toggleFavorite,
        refreshFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};
