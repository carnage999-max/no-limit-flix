import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="TitleDetail" component={TitleDetailScreen} />
        <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
        <Stack.Screen name="Watch" component={WatchScreen} />
        <Stack.Screen name="InternalMovies" component={InternalMoviesScreen} />
        <Stack.Screen name="InternalTv" component={InternalTvScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
