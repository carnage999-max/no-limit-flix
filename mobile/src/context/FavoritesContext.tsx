import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MoviePick } from '../types';
import { apiClient } from '../lib/api';
import { useSession } from './SessionContext';

interface FavoritesContextType {
  favorites: MoviePick[];
  favoriteIds: string[];
  isFavorite: (movieId: string, assetId?: string) => boolean;
  toggleFavorite: (movie: MoviePick) => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSession();
  const [favorites, setFavorites] = useState<MoviePick[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const refreshFavorites = useCallback(async () => {
    try {
      if (!user) {
        setFavorites([]);
        setFavoriteIds([]);
        return;
      }
      const data = await apiClient.getFavorites(1, 100);
      const mapped = (data?.favorites || []).map((favorite: any) => {
        if (favorite.video) {
          return {
            id: favorite.video.tmdbId ? String(favorite.video.tmdbId) : favorite.video.id,
            title: favorite.video.title || favorite.videoTitle,
            poster: favorite.video.thumbnailUrl || favorite.videoPoster,
            year: favorite.video.releaseYear || 0,
            runtime: favorite.video.duration ? Math.floor(favorite.video.duration / 60) : 0,
            genres: favorite.video.genre ? [favorite.video.genre] : [],
            playable: true,
            assetId: favorite.video.id,
            cloudfrontUrl: favorite.video.s3Url,
          } as MoviePick;
        }
        return {
          id: favorite.tmdbId || favorite.videoId || favorite.id,
          title: favorite.videoTitle || 'Unknown',
          poster: favorite.videoPoster || '',
          year: 0,
          runtime: 0,
          genres: [],
          playable: false,
        } as MoviePick;
      });
      const ids = (data?.favorites || []).map((favorite: any) => favorite.videoId || favorite.tmdbId || favorite.video?.id || favorite.id);
      setFavorites(mapped);
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error refreshing favorites:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  const isFavorite = useCallback((movieId: string, assetId?: string) => {
    const key = assetId || movieId;
    return favoriteIds.includes(key);
  }, [favoriteIds]);

  const toggleFavorite = useCallback(async (movie: MoviePick) => {
    if (!user) {
      throw new Error('Sign in to manage favorites');
    }
    const key = movie.assetId || movie.id;
    const currentlyFav = favoriteIds.includes(key);
    try {
      if (currentlyFav) {
        setFavoriteIds((prev) => prev.filter((id) => id !== key));
        setFavorites((prev) => prev.filter((fav) => (fav.assetId || fav.id) !== key));
      } else {
        setFavoriteIds((prev) => (prev.includes(key) ? prev : [key, ...prev]));
        setFavorites((prev) => {
          const exists = prev.some((fav) => (fav.assetId || fav.id) === key);
          if (exists) return prev;
          return [movie, ...prev];
        });
      }

      // Fire-and-forget API update
      (async () => {
        try {
          if (currentlyFav) {
            await apiClient.removeFavorite({
              videoId: movie.assetId || undefined,
              tmdbId: movie.assetId ? undefined : movie.id,
            });
          } else {
            await apiClient.addFavorite({
              videoId: movie.assetId || undefined,
              tmdbId: movie.assetId ? undefined : movie.id,
              title: movie.title,
              poster: movie.poster,
            });
          }
        } catch (error) {
          console.error('Optimistic favorite update failed:', error);
        }
      })();

      return !currentlyFav;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }, [favoriteIds, refreshFavorites, user]);

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
