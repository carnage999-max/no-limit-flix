import React, { useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserFacingError } from '../lib/errors';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');
const googleLogo = require('../../assets/Google_logo.png');

const extractGoogleIdToken = (response: any): string | null => {
  if (!response) return null;
  return (
    response?.params?.id_token
    || response?.params?.idToken
    || response?.authentication?.idToken
    || null
  );
};

export const AuthScreen = ({ route }: any) => {
  const initialTab = route?.params?.tab === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const scrollRef = useRef<ScrollView | null>(null);
  const sliderWidth = (width - SPACING.xl * 2 - 8) / 2;
  const { signIn, signUp, signInWithGoogle, signInWithApple } = useSession();
  const { showToast } = useToast();
  const scrollX = useRef(new Animated.Value(initialTab === 'signup' ? width : 0)).current;
  const insets = useSafeAreaInsets();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureLogin, setSecureLogin] = useState(true);
  const [secureSignup, setSecureSignup] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const platformClientId = Platform.OS === 'ios' ? iosClientId : androidClientId;
  const googleEnabled = Boolean(platformClientId && webClientId);

  const handleGoogleSuccess = useCallback(async (idToken: string) => {
    setLoading(true);
    try {
      await signInWithGoogle(idToken);
      showToast({ message: 'Signed in with Google.', type: 'success' });
    } catch (error: any) {
      showToast({
        message: getUserFacingError(error, ['google login failed', 'maximum active devices reached']),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [showToast, signInWithGoogle]);
  const handleGoogleUnavailable = useCallback(() => {
    showToast({ message: 'Google sign-in is unavailable right now.', type: 'info' });
  }, [showToast]);

  const handleAppleLogin = useCallback(async () => {
    if (Platform.OS !== 'ios' || !appleAvailable) {
      showToast({ message: 'Apple sign-in is unavailable on this device.', type: 'info' });
      return;
    }
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return a sign-in token.');
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim();
      await signInWithApple(
        credential.identityToken,
        credential.email || null,
        fullName || null
      );
      showToast({ message: 'Signed in with Apple.', type: 'success' });
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }
      showToast({
        message: getUserFacingError(error, ['apple login failed', 'missing apple token', 'apple token invalid']),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [appleAvailable, showToast, signInWithApple]);

  const handleTabChange = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    scrollRef.current?.scrollTo({ x: tab === 'login' ? 0 : width, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const tab = offsetX < width / 2 ? 'login' : 'signup';
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      showToast({ message: 'Enter your email and password.', type: 'info' });
      return;
    }
    setLoading(true);
    try {
      await signIn(loginEmail.trim(), loginPassword);
      showToast({ message: 'Welcome back.', type: 'success' });
    } catch (error: any) {
      showToast({
        message: getUserFacingError(error, [
          'login failed',
          'invalid email or password',
          'maximum active devices reached',
        ]),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupEmail.trim() || !signupUsername.trim() || !signupPassword) {
      showToast({ message: 'Fill all fields to continue.', type: 'info' });
      return;
    }
    setLoading(true);
    try {
      await signUp(signupEmail.trim(), signupUsername.trim(), signupPassword);
      showToast({ message: 'Account created.', type: 'success' });
    } catch (error: any) {
      showToast({
        message: getUserFacingError(error, [
          'signup failed',
          'email or username already exists',
          'maximum active devices reached',
        ]),
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (initialTab === 'signup') {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: width, animated: false });
      }, 0);
    }
  }, []);

  React.useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const tab = value < width / 2 ? 'login' : 'signup';
      setActiveTab((prev) => (prev === tab ? prev : tab));
    });
    return () => {
      scrollX.removeListener(id);
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setAppleAvailable(available);
      })
      .catch(() => {
        if (mounted) setAppleAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.centerWrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.background}>
          <View style={[styles.orb, styles.orbTop]} />
          <View style={[styles.orb, styles.orbBottom]} />
        </View>
        <View style={styles.header}>
          <Image source={require('../../assets/no-limit-flix-logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Account Access</Text>
          <Text style={styles.subtitle}>Join the vault or return to your cinema.</Text>
          <View style={styles.tabToggle}>
            <Animated.View
              style={[
                styles.tabSlider,
                {
                  width: sliderWidth,
                  transform: [
                    {
                      translateX: scrollX.interpolate({
                        inputRange: [0, width],
                        outputRange: [0, sliderWidth],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('login')}>
              <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>Sign in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabButton} onPress={() => handleTabChange('signup')}>
              <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.ScrollView
          style={styles.pager}
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          directionalLockEnabled
          onMomentumScrollEnd={handleScroll}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
        <View style={styles.page}>
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={[styles.form, { paddingBottom: Math.max(30, insets.bottom + 18) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentInsetAdjustmentBehavior="always"
          >
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={COLORS.silver}
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.formLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.silver}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry={secureLogin}
              />
              <TouchableOpacity onPress={() => setSecureLogin(!secureLogin)} style={styles.eyeButton}>
                <Ionicons name={secureLogin ? 'eye-off' : 'eye'} size={18} color={COLORS.silver} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>Sign in</Text>}
            </TouchableOpacity>
            <GoogleAuthButton
              enabled={googleEnabled}
              loading={loading}
              onSuccess={handleGoogleSuccess}
              onUnavailable={handleGoogleUnavailable}
            />
            {Platform.OS === 'ios' && (
              <AppleAuthButton enabled={appleAvailable} loading={loading} onPress={handleAppleLogin} />
            )}
          </ScrollView>
        </View>

        <View style={styles.page}>
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={[styles.form, { paddingBottom: Math.max(30, insets.bottom + 18) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentInsetAdjustmentBehavior="always"
          >
            <Text style={styles.formLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="yourname"
              placeholderTextColor={COLORS.silver}
              value={signupUsername}
              onChangeText={setSignupUsername}
              autoCapitalize="none"
            />
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@email.com"
              placeholderTextColor={COLORS.silver}
              value={signupEmail}
              onChangeText={setSignupEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.formLabel}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.silver}
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry={secureSignup}
              />
              <TouchableOpacity onPress={() => setSecureSignup(!secureSignup)} style={styles.eyeButton}>
                <Ionicons name={secureSignup ? 'eye-off' : 'eye'} size={18} color={COLORS.silver} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSignup} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>Create account</Text>}
            </TouchableOpacity>
            <GoogleAuthButton
              enabled={googleEnabled}
              loading={loading}
              onSuccess={handleGoogleSuccess}
              onUnavailable={handleGoogleUnavailable}
            />
            {Platform.OS === 'ios' && (
              <AppleAuthButton enabled={appleAvailable} loading={loading} onPress={handleAppleLogin} />
            )}
          </ScrollView>
        </View>
        </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const GoogleAuthButton = ({
  enabled,
  loading,
  onSuccess,
  onUnavailable,
}: {
  enabled: boolean;
  loading: boolean;
  onSuccess: (idToken: string) => void;
  onUnavailable: () => void;
}) => {
  if (!enabled) {
    return (
      <TouchableOpacity style={[styles.googleButton, { opacity: 0.5 }]} onPress={onUnavailable}>
        <Image source={googleLogo} style={styles.googleIcon} resizeMode="contain" />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
    );
  }

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const platformClientId = Platform.OS === 'ios' ? iosClientId : androidClientId;
  const reverseClientId = platformClientId
    ? `com.googleusercontent.apps.${platformClientId.replace('.apps.googleusercontent.com', '')}`
    : undefined;
  const googleRedirectUri = reverseClientId
    ? `${reverseClientId}:/oauth2redirect`
    : makeRedirectUri({ scheme: 'nolimitflix' });

  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    redirectUri: googleRedirectUri,
    scopes: ['profile', 'email'],
  });
  const handledGoogleTokenRef = useRef<string | null>(null);

  React.useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = extractGoogleIdToken(googleResponse);
    if (!idToken) {
      onUnavailable();
      return;
    }
    if (handledGoogleTokenRef.current === idToken) return;
    handledGoogleTokenRef.current = idToken;
    onSuccess(idToken);
  }, [googleResponse, onSuccess, onUnavailable]);

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={() => promptGoogle?.()}
      disabled={!googleRequest || loading}
    >
      <Image source={googleLogo} style={styles.googleIcon} resizeMode="contain" />
      <Text style={styles.googleButtonText}>Continue with Google</Text>
    </TouchableOpacity>
  );
};

const AppleAuthButton = ({
  enabled,
  loading,
  onPress,
}: {
  enabled: boolean;
  loading: boolean;
  onPress: () => void;
}) => {
  if (!enabled) return null;

  return (
    <View style={[styles.appleButtonWrap, loading && styles.appleButtonWrapDisabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={12}
        style={styles.appleButton}
        onPress={() => {
          if (!loading) onPress();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(212, 175, 55, 0.18)',
    opacity: 0.35,
  },
  orbTop: {
    top: -40,
    right: -60,
  },
  orbBottom: {
    bottom: -60,
    left: -40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 12,
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.silver,
    marginBottom: 14,
    textAlign: 'center',
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    padding: 4,
    position: 'relative',
  },
  tabSlider: {
    position: 'absolute',
    top: 4,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.gold.mid,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    color: COLORS.silver,
    fontWeight: '700',
  },
  tabTextActive: {
    color: COLORS.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  pageScroll: {
    flex: 1,
  },
  form: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  formLabel: {
    color: COLORS.silver,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(167, 171, 180, 0.08)',
    borderColor: 'rgba(167, 171, 180, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 18,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  primaryButton: {
    backgroundColor: COLORS.gold.mid,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '700',
  },
  googleButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  googleDebug: {
    color: COLORS.silver,
    fontSize: 11,
    marginTop: 8,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  appleButton: {
    width: '100%',
    height: 44,
  },
  appleButtonWrap: {
    marginTop: 12,
  },
  appleButtonWrapDisabled: {
    opacity: 0.6,
  },
});
