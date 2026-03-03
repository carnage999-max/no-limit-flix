import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/tokens';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const translateY = useRef(new Animated.Value(40)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = ({ message, type = 'info', duration = 2400 }: ToastOptions) => {
    setToast({ message, type });
    translateX.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    hideTimer.current = setTimeout(() => {
      dismissToast();
    }, duration);
  };

  const value = useMemo(() => ({ showToast }), []);

  const dismissToast = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 40, duration: 180, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
        const nextOpacity = Math.max(0.2, 1 - Math.abs(gesture.dx) / 200);
        opacity.setValue(nextOpacity);
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 80) {
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: gesture.dx > 0 ? 360 : -360,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
          ]).start(() => setToast(null));
        } else {
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            {
              bottom: Math.max(insets.bottom + 24, 32),
              opacity,
              transform: [{ translateY }, { translateX }],
              borderColor:
                toast.type === 'success'
                  ? 'rgba(74, 222, 128, 0.35)'
                  : toast.type === 'error'
                  ? 'rgba(248, 113, 113, 0.35)'
                  : 'rgba(212, 175, 55, 0.35)',
              backgroundColor:
                toast.type === 'success'
                  ? 'rgba(74, 222, 128, 0.12)'
                  : toast.type === 'error'
                  ? 'rgba(248, 113, 113, 0.12)'
                  : 'rgba(212, 175, 55, 0.12)',
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={dismissToast} style={styles.toastContent}>
            <Ionicons
              name={toast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
              size={20}
              color={toast.type === 'error' ? '#F87171' : toast.type === 'success' ? '#4ADE80' : '#D4AF37'}
            />
            <Text
              style={[
                styles.toastText,
                {
                  color:
                    toast.type === 'error'
                      ? '#F87171'
                      : toast.type === 'success'
                      ? '#4ADE80'
                      : '#D4AF37',
                },
              ]}
            >
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    right: 20,
    maxWidth: 320,
    backgroundColor: 'rgba(11, 11, 13, 0.92)',
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 200,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toastText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
