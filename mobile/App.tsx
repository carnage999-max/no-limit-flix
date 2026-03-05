import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { AnimatedSplashScreen } from './src/screens/AnimatedSplashScreen';
import { SessionProvider, useSession } from './src/context/SessionContext';
import { ToastProvider, useToast } from './src/context/ToastContext';
import { WelcomeOverlay } from './src/components/WelcomeOverlay';
import * as WebBrowser from 'expo-web-browser';
import { BASE_URL } from './src/lib/api';
import { initMonitoring, wrapAppWithMonitoring } from './src/lib/monitoring';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might cause some errors here, which is safe to ignore */
});

import { GestureHandlerRootView } from 'react-native-gesture-handler';

WebBrowser.maybeCompleteAuthSession();
initMonitoring();

function App() {
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
        <SessionProvider>
          <ToastProvider>
            <FavoritesProvider>
              <StatusBar style="light" />
              <RootNavigator />
              <ConnectivityGate />
              <WelcomeGate />
              {!splashAnimationFinished && (
                <AnimatedSplashScreen onAnimationFinish={() => setSplashAnimationFinished(true)} />
              )}
            </FavoritesProvider>
          </ToastProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const WelcomeGate = () => {
  const { user, welcomeVisible, welcomeName, welcomeSubtitle, dismissWelcome } = useSession();
  return (
    <WelcomeOverlay
      visible={welcomeVisible}
      username={welcomeName || user?.username}
      subtitle={welcomeSubtitle}
      onFinish={dismissWelcome}
    />
  );
};

const ConnectivityGate = () => {
  const { showToast } = useToast();
  const lastReachableRef = React.useRef<boolean | null>(null);

  useEffect(() => {
    let active = true;

    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        await fetch(`${BASE_URL}/api/auth/session`, {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timeout);
        if (!active) return;
        if (lastReachableRef.current === false) {
          showToast({ message: 'Back online', type: 'success' });
        }
        lastReachableRef.current = true;
      } catch {
        if (!active) return;
        if (lastReachableRef.current !== false) {
          showToast({ message: 'No internet connection', type: 'error', duration: 3000 });
        }
        lastReachableRef.current = false;
      }
    };

    checkConnectivity();
    const intervalId = setInterval(checkConnectivity, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [showToast]);

  return null;
};

export default wrapAppWithMonitoring(App);
