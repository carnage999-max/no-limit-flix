import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING } from '../theme/tokens';

const AUTOPLAY_KEY = '@nolimitflix_autoplay';
const BASE_WEB_URL = 'https://nolimitflix.com'; // Adjust to your actual domain

export const AccountScreen = () => {
  const [autoPlayTrailers, setAutoPlayTrailers] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');

  useEffect(() => {
    loadSettings();
    getAppInfo();
  }, []);

  const loadSettings = async () => {
    try {
      const value = await AsyncStorage.getItem(AUTOPLAY_KEY);
      if (value !== null) {
        setAutoPlayTrailers(JSON.parse(value));
      }
    } catch (e) {
      console.error('Failed to load autoplay setting', e);
    }
  };

  const toggleAutoPlay = async (value: boolean) => {
    try {
      setAutoPlayTrailers(value);
      await AsyncStorage.setItem(AUTOPLAY_KEY, JSON.stringify(value));
    } catch (e) {
      console.error('Failed to save autoplay setting', e);
    }
  };

  const getAppInfo = async () => {
    setAppVersion(Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0');
    setBuildNumber(Application.nativeBuildVersion || (Constants.expoConfig as any)?.ios?.buildNumber || '1');
  };

  const openWebLink = async (path: string) => {
    await WebBrowser.openBrowserAsync(`${BASE_WEB_URL}${path}`);
  };

  const sendSupportEmail = () => {
    Linking.openURL('mailto:info@nolimitflix.com');
  };

  const menuItems = [
    {
      title: 'About No Limit Flix',
      subtitle: 'Learn more about our platform',
      icon: 'information-circle-outline',
      onPress: () => openWebLink('/about'),
    },
    {
      title: 'Privacy Policy',
      subtitle: 'How we handle your data',
      icon: 'shield-checkmark-outline',
      onPress: () => openWebLink('/privacy'),
    },
    {
      title: 'Terms of Service',
      subtitle: 'Usage terms and conditions',
      icon: 'document-text-outline',
      onPress: () => openWebLink('/terms'),
    },
    {
      title: 'Help & Support',
      subtitle: 'Get help with the app',
      icon: 'help-circle-outline',
      onPress: sendSupportEmail,
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={COLORS.gold.mid} />
          </View>
          <Text style={styles.userName}>Movie Enthusiast</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Ionicons name="play-circle-outline" size={24} color={COLORS.gold.mid} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Auto-play Trailers</Text>
              <Text style={styles.settingSubtitle}>Automatically play trailers on detail pages</Text>
            </View>
            <Switch
              value={autoPlayTrailers}
              onValueChange={toggleAutoPlay}
              trackColor={{ false: '#3e3e3e', true: COLORS.gold.mid }}
              thumbColor={autoPlayTrailers ? COLORS.gold.light : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={24} color={COLORS.silver} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.silver} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Info</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>{buildNumber}</Text>
          </View>
        </View>
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
    paddingTop: 80,
    paddingHorizontal: SPACING.xl,
    paddingBottom: 140,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.gold.mid,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold.mid,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 171, 180, 0.1)',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.silver,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 171, 180, 0.1)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.silver,
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(167, 171, 180, 0.05)',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.silver,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
});
