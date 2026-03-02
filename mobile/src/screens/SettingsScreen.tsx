import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useNavigation } from '@react-navigation/native';
import { ConfirmDialog } from '../components/ConfirmDialog';

const BASE_WEB_URL = 'https://nolimitflix.com';

export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { user, signOut } = useSession();
    const { showToast } = useToast();
    const [logoutOpen, setLogoutOpen] = React.useState(false);

    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    const menuItems = [
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
        {
            title: 'Request Account Deletion',
            icon: 'trash-outline',
            onPress: () => openLink(`${BASE_WEB_URL}/delete-account`),
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Settings</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    {user ? (
                        <>
                            <TouchableOpacity
                                style={styles.profileCard}
                                onPress={() => navigation.navigate('Profile')}
                                activeOpacity={0.8}
                            >
                                <View style={styles.avatarWrap}>
                                    {user?.avatar ? (
                                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                                    ) : (
                                        <Ionicons name="person" size={20} color={COLORS.gold.mid} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.profileName}>{user?.username || 'Guest'}</Text>
                                    <Text style={styles.profileEmail}>{user?.email || 'Sign in to sync your account'}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => navigation.navigate('Profile')}
                            >
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name="person-outline" size={22} color={COLORS.gold.mid} />
                                </View>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuTitle}>Profile</Text>
                                    <Text style={styles.menuSubtitle}>Update name, email, avatar</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => navigation.navigate('Devices')}
                            >
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name="phone-portrait-outline" size={22} color={COLORS.gold.mid} />
                                </View>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuTitle}>Devices</Text>
                                    <Text style={styles.menuSubtitle}>Manage active sessions</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => navigation.navigate('WatchHistory')}
                            >
                                <View style={styles.menuIconContainer}>
                                    <Ionicons name="time-outline" size={22} color={COLORS.gold.mid} />
                                </View>
                                <View style={styles.menuTextContainer}>
                                    <Text style={styles.menuTitle}>Watch History</Text>
                                    <Text style={styles.menuSubtitle}>Continue where you left off</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                            </TouchableOpacity>

                        </>
                    ) : (
                        <View style={styles.signInCard}>
                            <Text style={styles.profileName}>Sign in to unlock your account</Text>
                            <Text style={styles.profileEmail}>Sync favorites, sessions, and history.</Text>
                            <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Auth', { tab: 'login' })}>
                                <Text style={styles.signInText}>Sign in</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

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

                {user && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Session</Text>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => setLogoutOpen(true)}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name="log-out-outline" size={22} color={COLORS.gold.mid} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuTitle}>Log out</Text>
                                <Text style={styles.menuSubtitle}>Sign out of this device</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={COLORS.silver} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2025 No Limit Flix. All cinematic rights reserved.</Text>
                    <Text style={styles.footerSub}>Hosted Library & Personalized Discovery</Text>
                </View>
            </ScrollView>
            <ConfirmDialog
                visible={logoutOpen}
                title="Log out"
                message="Are you sure you want to log out of this device?"
                confirmText="Log out"
                tone="danger"
                onCancel={() => setLogoutOpen(false)}
                onConfirm={async () => {
                    setLogoutOpen(false);
                    try {
                        await signOut();
                        showToast({ message: 'Logged out.', type: 'success' });
                    } catch (error: any) {
                        showToast({ message: error?.message || 'Logout failed.', type: 'error' });
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
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        marginBottom: 16,
    },
    avatarWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    profileName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '700',
    },
    profileEmail: {
        color: COLORS.silver,
        fontSize: 12,
        marginTop: 4,
    },
    signInCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        gap: 12,
    },
    signInButton: {
        backgroundColor: COLORS.gold.mid,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    signInText: {
        color: COLORS.background,
        fontWeight: '700',
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
