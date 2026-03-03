import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { apiClient, setAuthToken, setDeviceId, setDeviceName, setRefreshToken } from '../lib/api';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  showWelcomeScreen?: boolean;
  role?: string;
  googleId?: string | null;
}

interface SessionContextType {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  welcomeVisible: boolean;
  welcomeSubtitle: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (payload: { username?: string; email?: string; avatar?: string | null; showWelcomeScreen?: boolean }) => Promise<SessionUser>;
  dismissWelcome: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'nolimitflixAuthToken';
const DEVICE_ID_KEY = 'nolimitflixDeviceId';
const REFRESH_TOKEN_KEY = 'nolimitflixRefreshToken';

const WELCOME_SUBTITLES = [
  'The world of discovery awaits you.',
  'Tonight’s lineup is ready for you.',
  'Your cinema sanctuary is open.',
  'Fresh gems are waiting in your queue.',
  'Pick up where the story left off.',
  'Your next favorite is closer than you think.',
  'New moods, new stories, same you.',
  'Let the night unfold with a perfect pick.',
  'We saved your seat in the front row.',
  'A new chapter of discovery starts now.',
  'Lights down. Curated stories ahead.',
  'We tuned the catalog to your vibe.',
  'Welcome to your private screening room.',
  'The collection is ready when you are.',
  'Curated films. Zero noise.',
  'Time to explore the deeper cuts.',
  'Every vibe has a matching film tonight.',
  'Your watchlist misses you.',
  'Press play on something unforgettable.',
  'Your cinematic journey continues here.',
  'Small moments. Big screens.',
  'Discoveries curated just for you.',
  'Film night just got better.',
  'Start with the classics. Stay for the gems.',
  'Stories that match your mood are waiting.',
  'Your taste, your tempo.',
  'A fresh lineup is on deck.',
  'Let’s find the perfect mood match.',
  'The archive is alive tonight.',
  'Buckle up. The reel starts now.',
  'Your watch history unlocked new paths.',
  'Old favorites, new surprises.',
  'Step into the vault of cinema.',
  'A cinematic detour awaits.',
  'Enjoy the quiet glow of great films.',
  'Roll credits on ordinary nights.',
  'Curated viewing starts here.',
  'Keep it classic. Keep it bold.',
  'You’re one play away from a classic.',
  'Let’s keep the story going.',
  'Tonight is made for good cinema.',
  'Find the film that feels like you.',
  'A new vibe is just a tap away.',
  'Your library is alive with stories.',
  'Pick a mood. We’ll handle the rest.',
  'More to watch. Less to search.',
  'The spotlight is yours tonight.',
  'Welcome back to the vault.',
  'Settle in. The film is about to start.',
  'This is your cinema, your way.'
];

const getRandomSubtitle = () => {
  const index = Math.floor(Math.random() * WELCOME_SUBTITLES.length);
  return WELCOME_SUBTITLES[index];
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeSubtitle, setWelcomeSubtitle] = useState('');

  const applyToken = async (newToken: string | null) => {
    setToken(newToken);
    setAuthToken(newToken);
    if (newToken) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  };

  const applyRefreshToken = async (newToken: string | null) => {
    setRefreshTokenState(newToken);
    setRefreshToken(newToken);
    if (newToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newToken);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  };

  const triggerWelcome = (username?: string | null, allow = true) => {
    if (!allow) return;
    setWelcomeSubtitle(getRandomSubtitle());
    setWelcomeVisible(true);
    setTimeout(() => setWelcomeVisible(false), 4200);
  };

  const dismissWelcome = () => setWelcomeVisible(false);

  const refreshSession = async () => {
    try {
      if (!token) {
        setUser(null);
        return;
      }
      try {
        const data = await apiClient.getSession();
        setUser(data?.user || null);
        return;
      } catch (error: any) {
        const canRefresh = Boolean(refreshToken);
        if (!canRefresh) {
          throw error;
        }
        const refreshed = await apiClient.refreshSession(refreshToken);
        const nextToken = refreshed?.token as string | undefined;
        const nextRefresh = refreshed?.refreshToken as string | undefined;
        if (nextToken) {
          await applyToken(nextToken);
        }
        if (nextRefresh) {
          await applyRefreshToken(nextRefresh);
        }
        const data = await apiClient.getSession();
        setUser(data?.user || null);
      }
    } catch {
      setUser(null);
      await applyToken(null);
      await applyRefreshToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        let resolvedDeviceId = storedDeviceId;
        if (!resolvedDeviceId) {
          try {
            resolvedDeviceId = await Application.getInstallationIdAsync();
          } catch {
            resolvedDeviceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          }
          await SecureStore.setItemAsync(DEVICE_ID_KEY, resolvedDeviceId);
        }
        setDeviceId(resolvedDeviceId);
        const resolvedDeviceName =
          Device.deviceName
          || Device.modelName
          || Device.modelId
          || `${Device.manufacturer || 'Device'} ${Device.modelName || ''}`.trim();
        if (resolvedDeviceName) {
          setDeviceName(resolvedDeviceName);
        }

        const stored = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (stored) {
          await applyToken(stored);
        }
        if (storedRefresh) {
          await applyRefreshToken(storedRefresh);
        }
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (token) {
      refreshSession();
    }
  }, [token]);

  const signIn = async (email: string, password: string) => {
    const data = await apiClient.login(email, password);
    const nextToken = data?.token as string | undefined;
    const nextRefresh = data?.refreshToken as string | undefined;
    if (nextToken) {
      await applyToken(nextToken);
    }
    if (nextRefresh) {
      await applyRefreshToken(nextRefresh);
    }
    setUser(data?.user || null);
    triggerWelcome(data?.user?.username, data?.user?.showWelcomeScreen !== false);
  };

  const signUp = async (email: string, username: string, password: string) => {
    const data = await apiClient.signup(email, username, password);
    const nextToken = data?.token as string | undefined;
    const nextRefresh = data?.refreshToken as string | undefined;
    if (nextToken) {
      await applyToken(nextToken);
    }
    if (nextRefresh) {
      await applyRefreshToken(nextRefresh);
    }
    setUser(data?.user || null);
    triggerWelcome(data?.user?.username, data?.user?.showWelcomeScreen !== false);
  };

  const signInWithGoogle = async (idToken: string) => {
    const data = await apiClient.googleLogin(idToken);
    const nextToken = data?.token as string | undefined;
    const nextRefresh = data?.refreshToken as string | undefined;
    if (nextToken) {
      await applyToken(nextToken);
    }
    if (nextRefresh) {
      await applyRefreshToken(nextRefresh);
    }
    setUser(data?.user || null);
    triggerWelcome(data?.user?.username, data?.user?.showWelcomeScreen !== false);
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch {
      // ignore logout failures
    } finally {
      await applyToken(null);
      await applyRefreshToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (payload: { username?: string; email?: string; avatar?: string | null; showWelcomeScreen?: boolean }) => {
    const data = await apiClient.updateProfile(payload);
    const updated = data?.user || data;
    setUser(updated);
    return updated;
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      welcomeVisible,
      welcomeSubtitle,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshSession,
      updateProfile,
      dismissWelcome,
    }),
    [user, token, loading, welcomeVisible, welcomeSubtitle]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
};
