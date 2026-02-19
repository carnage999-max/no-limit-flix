import { AIPickRequest, AIPickResponse, RepickResponse } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export const apiClient = {
  pickForMe: async (moods: string[], freeText?: string): Promise<AIPickResponse> => {
    try {
      console.log('Finalizing search with moods:', moods, 'and text:', freeText);

      // Defensively ensure we only send primitive data to prevent [TypeError: cyclical structure]
      const moodsArray = Array.isArray(moods)
        ? moods.filter(m => typeof m === 'string')
        : [];
      const vibeText = typeof freeText === 'string' ? freeText : '';

      const response = await fetch(`${BASE_URL}/api/ai/pick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          moods: moodsArray,
          freeText: vibeText,
          constraints: {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch picks');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (pickForMe):', error);
      throw error;
    }
  },

  repick: async (sessionId: string, feedback: string): Promise<RepickResponse> => {
    try {
      const response = await fetch(`${BASE_URL}/api/ai/repick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          feedback: [feedback],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to adjust picks');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (repick):', error);
      throw error;
    }
  },

  interpretVibe: async (freeText: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/ai/interpret`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ freeText }),
      });

      if (!response.ok) {
        throw new Error('Failed to interpret vibe');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error (interpretVibe):', error);
      throw error;
    }
  },

  getTitleDetails: async (id: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/title/${id}`);
      if (!response.ok) throw new Error('Failed to fetch title details');
      return await response.json();
    } catch (error) {
      console.error('API Error (getTitleDetails):', error);
      throw error;
    }
  },

  getMoviesByCollection: async (slug: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/collection/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch collection');
      return await response.json();
    } catch (error) {
      console.error('API Error (getMoviesByCollection):', error);
      throw error;
    }
  },

  searchMovies: async (query: string) => {
    try {
      const response = await fetch(`${BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search movies');
      return await response.json();
    } catch (error) {
      console.error('API Error (searchMovies):', error);
      throw error;
    }
  },

  getInternalMovies: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/library/movies`);
      if (!response.ok) throw new Error('Failed to fetch internal movies');
      return await response.json();
    } catch (error) {
      console.error('API Error (getInternalMovies):', error);
      throw error;
    }
  },

  getInternalTv: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/library/tv`);
      if (!response.ok) throw new Error('Failed to fetch internal TV library');
      return await response.json();
    } catch (error) {
      console.error('API Error (getInternalTv):', error);
      throw error;
    }
  }
};
