import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { AppState } from 'react-native';
import { apiClient, setAuthToken, setDeviceId, setDeviceName, setRefreshToken } from '../lib/api';
import {
  captureMonitoringException,
  captureMonitoringMessage,
  setMonitoringUser,
} from '../lib/monitoring';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
  showWelcomeScreen?: boolean;
  role?: string;
  googleId?: string | null;
  appleId?: string | null;
}

interface SessionContextType {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  welcomeVisible: boolean;
  welcomeName: string;
  welcomeSubtitle: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithApple: (identityToken: string, appleEmail?: string | null, appleName?: string | null) => Promise<void>;
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

const isNetworkLikeError = (error: any) => {
  const message = `${error?.message || ''}`.toLowerCase();
  return (
    message.includes('network request failed')
    || message.includes('fetch failed')
    || message.includes('timeout')
    || message.includes('internet')
    || message.includes('connection')
  );
};

const isAuthLikeError = (error: any) => {
  if (error?.status === 401 || error?.status === 403) return true;
  const message = `${error?.message || ''}`.toLowerCase();
  return (
    message.includes('unauthorized')
    || message.includes('invalid token')
    || message.includes('refresh token invalid')
    || message.includes('token expired')
    || message.includes('jwt')
  );
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeSubtitle, setWelcomeSubtitle] = useState('');
  const tokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  const applyToken = async (newToken: string | null) => {
    tokenRef.current = newToken;
    setToken(newToken);
    setAuthToken(newToken);
    if (newToken) {
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newToken);
    } else {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    }
  };

  const applyRefreshToken = async (newToken: string | null) => {
    refreshTokenRef.current = newToken;
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
    const normalized = `${username || ''}`.trim();
    setWelcomeName(normalized || 'Guest');
    setWelcomeSubtitle(getRandomSubtitle());
    setWelcomeVisible(true);
    setTimeout(() => setWelcomeVisible(false), 4200);
  };

  const dismissWelcome = () => setWelcomeVisible(false);

  const refreshSessionInternal = async (
    accessTokenOverride?: string | null,
    refreshTokenOverride?: string | null,
    finalizeLoading = true
  ) => {
    try {
      const activeToken = accessTokenOverride ?? tokenRef.current;
      if (!activeToken) {
        setUser(null);
        return;
      }
      if (accessTokenOverride) {
        setAuthToken(accessTokenOverride);
      }
      try {
        const data = await apiClient.getSession();
        setUser(data?.user || null);
        return;
      } catch (error: any) {
        let activeRefresh = refreshTokenOverride ?? refreshTokenRef.current;
        if (!activeRefresh) {
          activeRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
          if (activeRefresh) {
            refreshTokenRef.current = activeRefresh;
            setRefreshToken(activeRefresh);
            setRefreshTokenState(activeRefresh);
          }
        }
        captureMonitoringMessage(
          'AUTH_SESSION_READ_FAILED',
          'Session read failed, attempting refresh',
          {
            status: error?.status ?? null,
            network: isNetworkLikeError(error),
            hasRefreshToken: Boolean(activeRefresh),
          }
        );
        const canRefresh = Boolean(activeRefresh);
        if (!canRefresh) {
          throw error;
        }
        const refreshed = await apiClient.refreshSession(activeRefresh);
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
    } catch (error: any) {
      // Keep local auth state on transient network failures.
      if (isNetworkLikeError(error)) {
        captureMonitoringMessage(
          'AUTH_SESSION_NETWORK_FAILURE',
          'Session check failed due to network condition',
          { status: error?.status ?? null }
        );
        return;
      }
      if (!isAuthLikeError(error)) {
        captureMonitoringException(error, { scope: 'session_refresh' });
        return;
      }
      captureMonitoringMessage(
        'AUTH_SESSION_INVALIDATED',
        'Session invalidated and cleared on device',
        { status: error?.status ?? null }
      );
      setUser(null);
      await applyToken(null);
      await applyRefreshToken(null);
    } finally {
      if (finalizeLoading) {
        setLoading(false);
      }
    }
  };

  const refreshSession = async () => {
    await refreshSessionInternal(undefined, undefined, true);
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        let resolvedDeviceId = storedDeviceId;
        if (!resolvedDeviceId) {
          resolvedDeviceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          await SecureStore.setItemAsync(DEVICE_ID_KEY, resolvedDeviceId);
        }
        setDeviceId(resolvedDeviceId || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
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
          tokenRef.current = stored;
          setToken(stored);
          setAuthToken(stored);
        }
        if (storedRefresh) {
          refreshTokenRef.current = storedRefresh;
          setRefreshTokenState(storedRefresh);
          setRefreshToken(storedRefresh);
        }

        if (stored) {
          await refreshSessionInternal(stored, storedRefresh, true);
          return;
        }
      } catch (error) {
        captureMonitoringException(error, { scope: 'session_bootstrap' });
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    setMonitoringUser(user ? { id: user.id, email: user.email, username: user.username } : null);
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && token) {
        refreshSession();
      }
    });
    return () => {
      sub.remove();
    };
  }, [token, refreshToken]);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.login(email, password);
      const nextToken = data?.token as string | undefined;
      const nextRefresh = data?.refreshToken as string | undefined;
      if (!nextToken) {
        throw new Error('Login failed');
      }
      if (nextToken) {
        await applyToken(nextToken);
      }
      if (nextRefresh) {
        await applyRefreshToken(nextRefresh);
      }
      setUser(data?.user || null);
      triggerWelcome(data?.user?.username || email.split('@')[0], data?.user?.showWelcomeScreen !== false);
    } catch (error: any) {
      captureMonitoringMessage(
        'AUTH_LOGIN_FAILED',
        'Login attempt failed',
        {
          status: error?.status ?? null,
          network: isNetworkLikeError(error),
          auth: isAuthLikeError(error),
        },
        {
          hasEmail: Boolean(email),
        }
      );
      throw error;
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    try {
      const data = await apiClient.signup(email, username, password);
      const nextToken = data?.token as string | undefined;
      const nextRefresh = data?.refreshToken as string | undefined;
      if (!nextToken) {
        throw new Error('Signup failed');
      }
      if (nextToken) {
        await applyToken(nextToken);
      }
      if (nextRefresh) {
        await applyRefreshToken(nextRefresh);
      }
      setUser(data?.user || null);
      triggerWelcome(data?.user?.username || username, data?.user?.showWelcomeScreen !== false);
    } catch (error: any) {
      captureMonitoringMessage(
        'AUTH_SIGNUP_FAILED',
        'Signup attempt failed',
        {
          status: error?.status ?? null,
          network: isNetworkLikeError(error),
          auth: isAuthLikeError(error),
        },
        {
          hasEmail: Boolean(email),
          hasUsername: Boolean(username),
        }
      );
      throw error;
    }
  };

  const signInWithGoogle = async (idToken: string) => {
    try {
      const data = await apiClient.googleLogin(idToken);
      const nextToken = data?.token as string | undefined;
      const nextRefresh = data?.refreshToken as string | undefined;
      if (!nextToken) {
        throw new Error('Google login failed');
      }
      if (nextToken) {
        await applyToken(nextToken);
      }
      if (nextRefresh) {
        await applyRefreshToken(nextRefresh);
      }
      setUser(data?.user || null);
      triggerWelcome(
        data?.user?.username || data?.user?.email?.split('@')[0] || 'Guest',
        data?.user?.showWelcomeScreen !== false
      );
    } catch (error: any) {
      captureMonitoringMessage(
        'AUTH_GOOGLE_LOGIN_FAILED',
        'Google login attempt failed',
        {
          status: error?.status ?? null,
          network: isNetworkLikeError(error),
          auth: isAuthLikeError(error),
        }
      );
      throw error;
    }
  };

  const signInWithApple = async (identityToken: string, appleEmail?: string | null, appleName?: string | null) => {
    try {
      const data = await apiClient.appleLogin(identityToken, appleEmail, appleName);
      const nextToken = data?.token as string | undefined;
      const nextRefresh = data?.refreshToken as string | undefined;
      if (!nextToken) {
        throw new Error('Apple login failed');
      }
      if (nextToken) {
        await applyToken(nextToken);
      }
      if (nextRefresh) {
        await applyRefreshToken(nextRefresh);
      }
      setUser(data?.user || null);
      triggerWelcome(
        data?.user?.username || data?.user?.email?.split('@')[0] || 'Guest',
        data?.user?.showWelcomeScreen !== false
      );
    } catch (error: any) {
      captureMonitoringMessage(
        'AUTH_APPLE_LOGIN_FAILED',
        'Apple login attempt failed',
        {
          status: error?.status ?? null,
          network: isNetworkLikeError(error),
          auth: isAuthLikeError(error),
        },
        {
          hasEmail: Boolean(appleEmail),
        }
      );
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      captureMonitoringMessage(
        'AUTH_LOGOUT_FAILED',
        'Logout endpoint failed on device',
        {},
        { reason: 'endpoint_failure' }
      );
    } finally {
      await applyToken(null);
      await applyRefreshToken(null);
      setUser(null);
      setWelcomeName('');
    }
  };

  const updateProfile = async (payload: { username?: string; email?: string; avatar?: string | null; showWelcomeScreen?: boolean }) => {
    try {
      const data = await apiClient.updateProfile(payload);
      const updated = data?.user || data;
      setUser(updated);
      return updated;
    } catch (error) {
      captureMonitoringMessage(
        'PROFILE_UPDATE_FAILED',
        'Profile update failed',
        { status: (error as any)?.status ?? null },
        {
          hasUsername: typeof payload.username === 'string',
          hasEmail: typeof payload.email === 'string',
          hasAvatar: Object.prototype.hasOwnProperty.call(payload, 'avatar'),
          hasWelcomeFlag: typeof payload.showWelcomeScreen === 'boolean',
        }
      );
      throw error;
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      welcomeVisible,
      welcomeName,
      welcomeSubtitle,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      refreshSession,
      updateProfile,
      dismissWelcome,
    }),
    [user, token, loading, welcomeVisible, welcomeName, welcomeSubtitle]
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
