import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../theme/tokens';

export const LoggedOutScreen = () => {
  const navigation = useNavigation<any>();
  const pulse = useRef(new Animated.Value(0)).current;
  const floatUp = useRef(new Animated.Value(0)).current;
  const ctaRise = useRef(new Animated.Value(12)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatUp, { toValue: 1, duration: 3600, useNativeDriver: true }),
        Animated.timing(floatUp, { toValue: 0, duration: 3600, useNativeDriver: true }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(ctaRise, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [pulse, floatUp, ctaOpacity, ctaRise]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.65] });
  const floatTranslate = floatUp.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#040405', '#0B0B0D', '#0F1115']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.glowOrb, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={[styles.glowOrbSecondary, { transform: [{ translateY: floatTranslate }] }]} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoWrap, { transform: [{ translateY: floatTranslate }] }]}>
          <Image source={require('../../assets/no-limit-flix-logo.png')} style={styles.logo} />
        </Animated.View>

        <Text style={styles.kicker}>No Limit Flix</Text>
        <Text style={styles.title}>Your private cinema{'\n'}starts here.</Text>
        <Text style={styles.subtitle}>Stream the vault. Pick a mood. We will handle the rest.</Text>

        <Animated.View style={[styles.ctaStack, { opacity: ctaOpacity, transform: [{ translateY: ctaRise }] }]}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('Auth', { tab: 'login' })}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Auth', { tab: 'signup' })}>
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.footerLinks}>
        <Pressable onPress={() => navigation.navigate('WebView', { url: 'https://www.nolimitflix.com/privacy', title: 'Privacy Policy' })}>
          <Text style={styles.footerText}>Privacy</Text>
        </Pressable>
        <Text style={styles.footerDivider}>•</Text>
        <Pressable onPress={() => navigation.navigate('WebView', { url: 'https://www.nolimitflix.com/terms', title: 'Terms of Service' })}>
          <Text style={styles.footerText}>Terms</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0D',
  },
  glowOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(212, 175, 55, 0.22)',
    top: -80,
    right: -80,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(75, 85, 99, 0.3)',
    bottom: 140,
    left: -60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: 16,
  },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  kicker: {
    color: 'rgba(212, 175, 55, 0.9)',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    color: COLORS.silver,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  ctaStack: {
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.gold.mid,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: COLORS.gold.mid,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 24,
  },
  footerText: {
    color: COLORS.silver,
    fontSize: 12,
  },
  footerDivider: {
    color: 'rgba(255,255,255,0.3)',
  },
});
