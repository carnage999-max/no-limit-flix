import AsyncStorage from '@react-native-async-storage/async-storage';
import { MoviePick } from '../types';

const FAVORITES_KEY = '@nolimitflix_favorites';

export const favoritesStorage = {
  // Get all favorite movie IDs
  getFavoriteIds: async (): Promise<string[]> => {
    try {
      const favorites = await AsyncStorage.getItem(FAVORITES_KEY);
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error('Error getting favorites:', error);
      return [];
    }
  },

  // Get all favorite movies with full details
  getFavorites: async (): Promise<MoviePick[]> => {
    try {
      const favoritesData = await AsyncStorage.getItem(`${FAVORITES_KEY}_data`);
      return favoritesData ? JSON.parse(favoritesData) : [];
    } catch (error) {
      console.error('Error getting favorite movies:', error);
      return [];
    }
  },

  // Check if a movie is favorited
  isFavorite: async (movieId: string): Promise<boolean> => {
    try {
      const favorites = await favoritesStorage.getFavoriteIds();
      return favorites.includes(movieId);
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  },

  // Add a movie to favorites
  addFavorite: async (movie: MoviePick): Promise<void> => {
    try {
      const favoriteIds = await favoritesStorage.getFavoriteIds();
      const favoriteMovies = await favoritesStorage.getFavorites();

      if (!favoriteIds.includes(movie.id)) {
        const newFavoriteIds = [...favoriteIds, movie.id];
        const newFavoriteMovies = [...favoriteMovies, movie];

        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavoriteIds));
        await AsyncStorage.setItem(`${FAVORITES_KEY}_data`, JSON.stringify(newFavoriteMovies));
      }
    } catch (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
  },

  // Remove a movie from favorites
  removeFavorite: async (movieId: string): Promise<void> => {
    try {
      const favoriteIds = await favoritesStorage.getFavoriteIds();
      const favoriteMovies = await favoritesStorage.getFavorites();

      const newFavoriteIds = favoriteIds.filter(id => id !== movieId);
      const newFavoriteMovies = favoriteMovies.filter(movie => movie.id !== movieId);

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavoriteIds));
      await AsyncStorage.setItem(`${FAVORITES_KEY}_data`, JSON.stringify(newFavoriteMovies));
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },

  // Toggle favorite status
  toggleFavorite: async (movie: MoviePick): Promise<boolean> => {
    try {
      const isFav = await favoritesStorage.isFavorite(movie.id);
      if (isFav) {
        await favoritesStorage.removeFavorite(movie.id);
        return false;
      } else {
        await favoritesStorage.addFavorite(movie);
        return true;
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  // Clear all favorites
  clearFavorites: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      await AsyncStorage.removeItem(`${FAVORITES_KEY}_data`);
    } catch (error) {
      console.error('Error clearing favorites:', error);
      throw error;
    }
  },
};
