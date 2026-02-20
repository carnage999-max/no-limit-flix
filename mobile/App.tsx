import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { AnimatedSplashScreen } from './src/screens/AnimatedSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, which is safe to ignore */
});

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashAnimationFinished, setSplashAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! Only call this after
      // the App has been rendered and is ready to show the content.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <FavoritesProvider>
          <StatusBar style="light" />
          <RootNavigator />
          {!splashAnimationFinished && (
            <AnimatedSplashScreen onAnimationFinish={() => setSplashAnimationFinished(true)} />
          )}
        </FavoritesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
