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
import { apiClient } from '../lib/api';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile } = useSession();
  const { showToast } = useToast();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showWelcome, setShowWelcome] = useState(user?.showWelcomeScreen ?? true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, email, showWelcomeScreen: showWelcome });
      showToast({ message: 'Profile updated.', type: 'success' });
    } catch (error: any) {
      showToast({ message: error?.message || 'Update failed.', type: 'error' });
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
      showToast({ message: error?.message || 'Avatar update failed.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateProfile({ avatar: null });
      showToast({ message: 'Avatar removed.', type: 'success' });
    } catch (error: any) {
      showToast({ message: error?.message || 'Failed to remove avatar.', type: 'error' });
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
      </ScrollView>
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
});
