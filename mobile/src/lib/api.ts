import { AIPickRequest, AIPickResponse, RepickResponse } from '../types';

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

let authToken: string | null = null;
let deviceId: string | null = null;
let deviceName: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setDeviceId = (id: string | null) => {
  deviceId = id;
};

export const setDeviceName = (name: string | null) => {
  deviceName = name;
};

const authFetch = (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  return fetch(url, { ...options, headers });
};

const parseJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const apiClient = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password, deviceId, deviceName }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Login failed');
    }
    return data;
  },

  signup: async (email: string, username: string, password: string) => {
    const response = await fetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signup', email, username, password, deviceId, deviceName }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Signup failed');
    }
    return data;
  },

  logout: async () => {
    const response = await authFetch(`${BASE_URL}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    if (!response.ok) {
      const data = await parseJson(response);
      throw new Error(data?.error || 'Logout failed');
    }
    return true;
  },

  getSession: async () => {
    const response = await authFetch(`${BASE_URL}/api/auth/session`);
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Session lookup failed');
    }
    return data;
  },

  updateProfile: async (payload: { username?: string; email?: string; avatar?: string | null; showWelcomeScreen?: boolean }) => {
    const response = await authFetch(`${BASE_URL}/api/account/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Profile update failed');
    }
    return data;
  },

  getAvatarUploadUrl: async (fileName: string, fileType: string) => {
    const response = await authFetch(`${BASE_URL}/api/account/avatar-presigned-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, fileType }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to create avatar upload');
    }
    return data;
  },

  getFavorites: async (page = 1, limit = 50) => {
    const response = await authFetch(`${BASE_URL}/api/favorites?page=${page}&limit=${limit}`);
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to fetch favorites');
    }
    return data;
  },

  addFavorite: async (payload: { videoId?: string; tmdbId?: string; title?: string; poster?: string }) => {
    const response = await authFetch(`${BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, action: 'add' }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to add favorite');
    }
    return data;
  },

  removeFavorite: async (payload: { videoId?: string; tmdbId?: string }) => {
    const response = await authFetch(`${BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, action: 'remove' }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to remove favorite');
    }
    return data;
  },

  getSessions: async (includeHistory = false) => {
    const response = await authFetch(`${BASE_URL}/api/account/sessions${includeHistory ? '?includeHistory=1' : ''}`);
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to fetch sessions');
    }
    return data;
  },

  setPrimaryDevice: async (deviceId: string) => {
    const response = await authFetch(`${BASE_URL}/api/account/sessions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to set primary device');
    }
    return data;
  },

  logoutAllSessions: async () => {
    const response = await authFetch(`${BASE_URL}/api/account/sessions`, {
      method: 'POST',
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to log out all devices');
    }
    return data;
  },

  logoutSession: async (sessionId: string) => {
    const response = await authFetch(`${BASE_URL}/api/account/sessions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to log out device');
    }
    return data;
  },

  getWatchHistory: async (page = 1, limit = 20) => {
    const response = await authFetch(`${BASE_URL}/api/watch-history?page=${page}&limit=${limit}`);
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to fetch watch history');
    }
    return data;
  },

  clearWatchHistory: async () => {
    const response = await authFetch(`${BASE_URL}/api/watch-history`, {
      method: 'DELETE',
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to clear watch history');
    }
    return data;
  },

  recordWatchHistory: async (payload: { videoId: string; watchedDuration?: number; totalDuration?: number; title?: string; poster?: string }) => {
    const response = await authFetch(`${BASE_URL}/api/watch-history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to track watch history');
    }
    return data;
  },

  startWatch: async (assetId: string) => {
    const response = await authFetch(`${BASE_URL}/api/watch/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId }),
    });
    const data = await parseJson(response);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to fetch playback');
    }
    return data;
  },

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

  searchInternalLibrary: async (query: string, limit = 12) => {
    try {
      const response = await fetch(`${BASE_URL}/api/library/search?q=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to search internal library');
      return await response.json();
    } catch (error) {
      console.error('API Error (searchInternalLibrary):', error);
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
