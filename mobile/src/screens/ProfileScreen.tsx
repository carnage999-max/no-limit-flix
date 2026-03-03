import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING } from '../theme/tokens';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { getUserFacingError } from '../lib/errors';
import { apiClient } from '../lib/api';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { ConfirmDialog } from '../components/ConfirmDialog';

WebBrowser.maybeCompleteAuthSession();

export const ProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile, refreshSession } = useSession();
  const { showToast } = useToast();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showWelcome, setShowWelcome] = useState(user?.showWelcomeScreen ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

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
      setLinkingGoogle(true);
      try {
        await apiClient.linkGoogleAccount(idToken);
        await refreshSession();
        showToast({ message: 'Google account linked.', type: 'success' });
      } catch (error: any) {
        showToast({ message: getUserFacingError(error, ['failed to link google account', 'google account already linked']), type: 'error' });
      } finally {
        setLinkingGoogle(false);
      }
    })();
  }, [googleResponse]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, email, showWelcomeScreen: showWelcome });
      showToast({ message: 'Profile updated.', type: 'success' });
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['profile update failed', 'email or username already in use', 'update failed']), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast({ message: 'Media permission required.', type: 'info' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const fileName = asset.fileName || `avatar-${Date.now()}.jpg`;
      const fileType = asset.mimeType || 'image/jpeg';

      setUploading(true);
      const { presignedUrl, publicUrl } = await apiClient.getAvatarUploadUrl(fileName, fileType);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      await updateProfile({ avatar: publicUrl });
      showToast({ message: 'Avatar updated.', type: 'success' });
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['avatar update failed', 'upload failed', 'failed to create avatar upload']), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatar: null });
      showToast({ message: 'Avatar removed.', type: 'success' });
    } catch (error: any) {
      showToast({ message: getUserFacingError(error, ['failed to remove avatar']), type: 'error' });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={32} color={COLORS.gold.mid} />
              </View>
            )}
          </View>
          <View style={styles.avatarActions}>
            <TouchableOpacity style={styles.avatarButton} onPress={handlePickAvatar} disabled={uploading}>
              {uploading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.avatarButtonText}>Upload photo</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleRemoveAvatar}>
              <Text style={styles.secondaryButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Welcome screen</Text>
            <Text style={styles.toggleSubtitle}>Show the welcome screen after login</Text>
          </View>
          <Switch
            value={showWelcome}
            onValueChange={setShowWelcome}
            trackColor={{ false: '#3e3e3e', true: COLORS.gold.mid }}
            thumbColor={showWelcome ? COLORS.gold.light : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryText}>Save changes</Text>}
        </TouchableOpacity>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={18} color={COLORS.text} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Linked accounts</Text>
              <Text style={styles.sectionSubtitle}>
                {user?.googleId ? 'Google account connected.' : 'No Google account linked yet.'}
              </Text>
            </View>
          </View>
          {!user?.googleId ? (
            <TouchableOpacity
              style={styles.googleButton}
              onPress={() => promptGoogle?.()}
              disabled={!googleRequest || linkingGoogle}
            >
              {linkingGoogle ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.googleButtonText}>Link Google account</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.unlinkButton} onPress={() => setUnlinkConfirmOpen(true)}>
              <Text style={styles.unlinkText}>Unlink Google</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={unlinkConfirmOpen}
        title="Unlink Google account"
        message="You will no longer be able to sign in with Google for this account."
        confirmText="Unlink"
        tone="danger"
        onCancel={() => setUnlinkConfirmOpen(false)}
        onConfirm={async () => {
          setUnlinkConfirmOpen(false);
          try {
            await apiClient.unlinkGoogleAccount();
            await refreshSession();
            showToast({ message: 'Google account unlinked.', type: 'success' });
          } catch (error: any) {
            showToast({ message: getUserFacingError(error, ['failed to unlink google account']), type: 'error' });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 50,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: COLORS.gold.mid,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 12,
  },
  avatarButton: {
    backgroundColor: COLORS.gold.mid,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  avatarButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: COLORS.silver,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
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
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(167, 171, 180, 0.1)',
    marginBottom: 24,
  },
  toggleTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  toggleSubtitle: {
    color: COLORS.silver,
    fontSize: 12,
    marginTop: 4,
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
  sectionCard: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.silver,
    fontSize: 12,
    marginTop: 4,
  },
  googleButton: {
    backgroundColor: COLORS.gold.mid,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
  unlinkButton: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  unlinkText: {
    color: COLORS.accent.red,
    fontWeight: '700',
  },
});
