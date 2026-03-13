import React, { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { COLORS } from '../theme/tokens';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

import { HomeScreen } from '../screens/HomeScreen';
import { CollectionsScreen } from '../screens/CollectionsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { TitleDetailScreen } from '../screens/TitleDetailScreen';
import { CollectionDetailScreen } from '../screens/CollectionDetailScreen';
import { WatchScreen } from '../screens/WatchScreen';
import { InternalMoviesScreen } from '../screens/InternalMoviesScreen';
import { InternalTvScreen } from '../screens/InternalTvScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DevicesScreen } from '../screens/DevicesScreen';
import { WatchHistoryScreen } from '../screens/WatchHistoryScreen';
import { WebViewScreen } from '../screens/WebViewScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoggedOutScreen } from '../screens/LoggedOutScreen';
import { useSession } from '../context/SessionContext';

import { CustomTabBar } from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ONBOARDING_COMPLETED_KEY = 'nolimitflix_onboarding_completed';

const linking = {
  prefixes: ['nolimitflix://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Search: 'quick/search',
          Library: 'quick/library',
          Collections: 'quick/collections',
        },
      },
      WatchHistory: 'quick/watch-history',
    },
  },
};

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props: any) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Collections" component={CollectionsScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [navigationReady, setNavigationReady] = useState(false);
  const { user, loading } = useSession();
  const navRef = useRef<any>(null);
  const pendingQuickRouteRef = useRef<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const completed = await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY);
        setShowOnboarding(completed !== 'true');
      } finally {
        setReady(true);
      }
    };
    bootstrap();
  }, []);

  const openQuickRoute = (route: string) => {
    if (!route || !route.startsWith('quick/')) return;
    if (!navRef.current?.isReady?.()) {
      pendingQuickRouteRef.current = route;
      return;
    }
    if (!user) {
      pendingQuickRouteRef.current = route;
      navRef.current.navigate('Auth', { tab: 'login' });
      return;
    }
    pendingQuickRouteRef.current = null;
    if (route === 'quick/search') {
      navRef.current.navigate('MainTabs', { screen: 'Search' });
      return;
    }
    if (route === 'quick/library') {
      navRef.current.navigate('MainTabs', { screen: 'Library' });
      return;
    }
    if (route === 'quick/collections') {
      navRef.current.navigate('MainTabs', { screen: 'Collections' });
      return;
    }
    if (route === 'quick/watch-history') {
      navRef.current.navigate('WatchHistory');
    }
  };

  const handleQuickDeepLink = (url: string) => {
    if (!url) return;
    let route = '';
    try {
      const normalizedUrl = url.includes('://') ? url : `nolimitflix://${url.replace(/^\/+/, '')}`;
      const parsedUrl = new URL(normalizedUrl);
      const host = `${parsedUrl.hostname || ''}`.toLowerCase();
      const path = `${parsedUrl.pathname || ''}`.toLowerCase().replace(/^\/+|\/+$/g, '');
      route = [host, path].filter(Boolean).join('/');
    } catch {
      const parsed = Linking.parse(url);
      const host = `${parsed.hostname || ''}`.toLowerCase();
      const path = `${parsed.path || ''}`.toLowerCase().replace(/^\/+|\/+$/g, '');
      route = [host, path].filter(Boolean).join('/');
    }
    if (!route) {
      const lower = url.toLowerCase();
      if (lower.includes('watch-history')) route = 'quick/watch-history';
      else if (lower.includes('collections')) route = 'quick/collections';
      else if (lower.includes('library')) route = 'quick/library';
      else if (lower.includes('search')) route = 'quick/search';
    }

    openQuickRoute(route);
  };

  useEffect(() => {
    const processInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        setTimeout(() => handleQuickDeepLink(initialUrl), 150);
      }
    };
    processInitialUrl();

    const sub = Linking.addEventListener('url', ({ url }) => {
      handleQuickDeepLink(url);
    });
    return () => sub.remove();
  }, [user]);

  useEffect(() => {
    if (!navigationReady) return;
    if (!pendingQuickRouteRef.current) return;
    openQuickRoute(pendingQuickRouteRef.current);
  }, [navigationReady, user, showOnboarding]);

  useEffect(() => {
    if (!user) return;
    const nav = navRef.current;
    if (!nav?.isReady?.()) return;
    const currentRoute = nav.getCurrentRoute?.();
    const currentName = currentRoute?.name;
    if (currentName === 'Auth' || currentName === 'Welcome') {
      const targetRoute = showOnboarding ? 'Onboarding' : 'MainTabs';
      nav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: targetRoute }],
        })
      );
    }
  }, [user, showOnboarding]);

  if (!ready || loading) {
    return null;
  }

  return (
    <NavigationContainer linking={linking as any} ref={navRef} onReady={() => setNavigationReady(true)}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {showOnboarding && <Stack.Screen name="Onboarding" component={OnboardingScreen} />}

        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="TitleDetail" component={TitleDetailScreen} />
            <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <Stack.Screen name="Watch" component={WatchScreen} />
            <Stack.Screen name="InternalMovies" component={InternalMoviesScreen} />
            <Stack.Screen name="InternalTv" component={InternalTvScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Devices" component={DevicesScreen} />
            <Stack.Screen name="WatchHistory" component={WatchHistoryScreen} />
          </>
        ) : (
          <Stack.Screen name="Welcome" component={LoggedOutScreen} />
        )}

        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="WebView" component={WebViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
