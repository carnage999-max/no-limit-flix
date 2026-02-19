import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import Constants from 'expo-constants';

export const SettingsScreen = () => {
    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    const menuItems = [
        {
            title: 'About No Limit Flix',
            icon: 'information-circle-outline',
            onPress: () => { },
            subtitle: 'Version ' + (Constants.expoConfig?.version || '1.0.0'),
        },
        {
            title: 'Privacy Policy',
            icon: 'shield-checkmark-outline',
            onPress: () => openLink('https://nolimitflix.com/privacy-policy'),
        },
        {
            title: 'Terms of Service',
            icon: 'document-text-outline',
            onPress: () => openLink('https://nolimitflix.com/terms'),
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Settings</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name={item.icon as any} size={22} color={COLORS.gold.mid} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2025 No Limit Flix. All cinematic rights reserved.</Text>
                    <Text style={styles.footerSub}>Hosted Library & Personalized Discovery</Text>
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
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.silver,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        opacity: 0.6,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },
    menuSubtitle: {
        fontSize: 12,
        color: COLORS.silver,
        marginTop: 2,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        color: COLORS.silver,
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.5,
    },
    footerSub: {
        color: COLORS.gold.mid,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 8,
        opacity: 0.4,
    },
});
