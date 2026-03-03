import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { COLORS } from '../theme/tokens';
import * as SecureStore from 'expo-secure-store';

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
  const { user, loading } = useSession();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const completed = await SecureStore.getItemAsync('@nolimitflix_onboarding_completed');
        setShowOnboarding(completed !== 'true');
      } finally {
        setReady(true);
      }
    };
    bootstrap();
  }, []);

  if (!ready || loading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {showOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : user ? (
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
            <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="WebView" component={WebViewScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={LoggedOutScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="WebView" component={WebViewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
