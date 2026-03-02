import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/tokens';

interface WelcomeOverlayProps {
  visible: boolean;
  username?: string | null;
  subtitle: string;
  onFinish: () => void;
}

export const WelcomeOverlay = ({ visible, username, subtitle, onFinish }: WelcomeOverlayProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const [typedName, setTypedName] = useState('');

  useEffect(() => {
    if (visible) {
      setTypedName('');
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0.2, duration: 420, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        ])
      ).start();

      const name = (username || 'THERE').toUpperCase();
      let index = 0;
      const typing = setInterval(() => {
        index += 1;
        setTypedName(name.slice(0, index));
        if (index >= name.length) {
          clearInterval(typing);
        }
      }, 90);

      const timer = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => onFinish());
      }, 4200);
      return () => {
        clearTimeout(timer);
        clearInterval(typing);
      };
    }
  }, [visible, onFinish]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <LinearGradient
        colors={['#060608', '#0B0B0D', '#121218']}
        style={styles.gradient}
      />
      <View style={[styles.orb, styles.orbLeft]} />
      <View style={[styles.orb, styles.orbRight]} />
      <View style={styles.content}>
        <Text style={styles.title}>Welcome back</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{typedName}</Text>
          <Animated.Text style={[styles.cursor, { opacity: cursorOpacity }]}>▍</Animated.Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    inset: 0,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    shadowColor: COLORS.gold.mid,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 80,
    opacity: 0.35,
  },
  orbLeft: {
    top: '15%',
    left: '-10%',
  },
  orbRight: {
    bottom: '10%',
    right: '-15%',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: COLORS.silver,
    fontSize: 22,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    maxWidth: '90%',
    justifyContent: 'center',
  },
  name: {
    color: COLORS.gold.mid,
    fontSize: 38,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  cursor: {
    color: COLORS.gold.mid,
    fontSize: 32,
    marginLeft: 4,
  },
  subtitle: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.85,
    lineHeight: 24,
  },
});
