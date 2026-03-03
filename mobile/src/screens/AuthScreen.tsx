import React, { useRef, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserFacingError } from '../lib/errors';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');
const googleLogo = require('../../assets/Google_logo.png');

export const AuthScreen = ({ route }: any) => {
  const initialTab = route?.params?.tab === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(initialTab);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const sliderWidth = (width - SPACING.xl * 2 - 8) / 2;
  const navigation = useNavigation<any>();
  const { signIn, signUp, signInWithGoogle } = useSession();
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
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const reverseClientId = androidClientId
    ? `com.googleusercontent.apps.${androidClientId.replace('.apps.googleusercontent.com', '')}`
    : undefined;
  const googleRedirectUri = makeRedirectUri({
    scheme: 'nolimitflix',
    native: reverseClientId ? `${reverseClientId}:/oauthredirect` : undefined,
  });
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    androidClientId,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: googleRedirectUri,
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params?.id_token;
    if (!idToken) return;
    (async () => {
      setLoading(true);
      try {
        await signInWithGoogle(idToken);
        showToast({ message: 'Signed in with Google.', type: 'success' });
        navigation.goBack();
      } catch (error: any) {
        showToast({
          message: getUserFacingError(error, ['google login failed', 'maximum active devices reached']),
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [googleResponse]);

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
      navigation.goBack();
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
      navigation.goBack();
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
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
        <View style={styles.page}>
          <View style={styles.form}>
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
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptGoogle()}
              disabled={!googleRequest || loading}
            >
              <Image source={googleLogo} style={styles.googleIcon} resizeMode="contain" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.page}>
          <View style={styles.form}>
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
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptGoogle()}
              disabled={!googleRequest || loading}
            >
              <Image source={googleLogo} style={styles.googleIcon} resizeMode="contain" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
        </Animated.ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
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
    paddingTop: 20,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    color: COLORS.silver,
    marginBottom: 24,
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
  page: {
    width,
    paddingHorizontal: SPACING.xl,
  },
  form: {
    marginTop: 24,
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
  googleIcon: {
    width: 18,
    height: 18,
  },
});
