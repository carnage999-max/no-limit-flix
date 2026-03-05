import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { useSession } from '../context/SessionContext';
import { useToast } from '../context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getUserFacingError } from '../lib/errors';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '../lib/api';
import { captureMonitoringMessage } from '../lib/monitoring';

const FileSystem: any = require('expo-file-system/legacy');

const BASE_WEB_URL = 'https://www.nolimitflix.com';

export const SettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { user, signOut } = useSession();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const [logoutOpen, setLogoutOpen] = React.useState(false);
    const [reportOpen, setReportOpen] = React.useState(false);
    const [issueText, setIssueText] = React.useState('');
    const [issueName, setIssueName] = React.useState('');
    const [issueEmail, setIssueEmail] = React.useState('');
    const [issueSubmitting, setIssueSubmitting] = React.useState(false);
    const [attachments, setAttachments] = React.useState<Array<{ name: string; type: string; size: number; dataUrl: string; previewUri: string }>>([]);
    const [issueError, setIssueError] = React.useState('');
    const MAX_FILES = 3;
    const MAX_FILE_BYTES = 3 * 1024 * 1024;
    const TAB_BAR_HEIGHT = 72;

    const openLink = (url: string, title?: string) => {
        navigation.navigate('WebView', { url, title });
    };

    const sendDiagnosticsEvent = () => {
        captureMonitoringMessage(
            'DIAGNOSTICS_EVENT',
            'Manual diagnostics event from settings',
            {
                platform: 'mobile',
                screen: 'settings',
                auth: Boolean(user),
                dev: __DEV__,
            },
            {
                timestamp: new Date().toISOString(),
            }
        );
        showToast({ message: 'Diagnostics event sent.', type: 'success' });
    };

    const menuItems: Array<{ title: string; subtitle?: string; icon: string; onPress: () => void }> = [
        {
            title: 'Privacy Policy',
            icon: 'shield-checkmark-outline',
            onPress: () => openLink(`${BASE_WEB_URL}/privacy`, 'Privacy Policy'),
        },
        {
            title: 'Terms of Service',
            icon: 'document-text-outline',
            onPress: () => openLink(`${BASE_WEB_URL}/terms`, 'Terms of Service'),
        },
        {
            title: 'Request Account Deletion',
            icon: 'trash-outline',
            onPress: () => openLink(`${BASE_WEB_URL}/delete-account`, 'Delete Account'),
        },
        {
            title: 'Report an Issue',
            icon: 'flag-outline',
            onPress: () => setReportOpen(true),
        },
        ...(__DEV__ ? [{
            title: 'Send Diagnostics Event',
            subtitle: 'Send a test monitoring event',
            icon: 'bug-outline',
            onPress: sendDiagnosticsEvent,
        }] : []),
    ];

    const normalizePickedAssets = async (result: DocumentPicker.DocumentPickerResult) => {
        if ('assets' in result && result.assets && result.assets.length > 0) return result.assets;
        if ((result as any)?.uri) {
            const fallback = result as unknown as DocumentPicker.DocumentPickerAsset;
            return [fallback];
        }
        return [];
    };

    const inferMimeType = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        if (lower.endsWith('.webp')) return 'image/webp';
        if (lower.endsWith('.gif')) return 'image/gif';
        return '';
    };

    const ensureReadableUri = async (uri: string, fileName?: string) => {
        if (!uri) return uri;
        if (uri.startsWith('file://')) return uri;

        const safeName = `${Date.now()}-${(fileName || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const destination = `${FileSystem.cacheDirectory}${safeName}`;
        await FileSystem.copyAsync({ from: uri, to: destination });
        return destination;
    };

    const buildAttachmentPayload = async (file: DocumentPicker.DocumentPickerAsset) => {
        const readableUri = await ensureReadableUri(file.uri, file.name);
        const info = await FileSystem.getInfoAsync(readableUri);
        const size = ('size' in info && typeof info.size === 'number') ? info.size : (file.size || 0);
        const fallbackType = file.name ? inferMimeType(file.name) : '';
        const type = file.mimeType || fallbackType || 'application/octet-stream';
        const base64 = await FileSystem.readAsStringAsync(readableUri, { encoding: 'base64' as any });
        const dataUrl = `data:${type};base64,${base64}`;
        const isImage = type.startsWith('image/');
        return {
            name: file.name || 'attachment',
            type,
            size,
            dataUrl,
            previewUri: isImage ? readableUri : file.uri,
        };
    };

    const handlePickAttachments = async () => {
        if (attachments.length >= MAX_FILES) return;
        setIssueError('');
        const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
        if (result.canceled) return;
        const assets = await normalizePickedAssets(result);
        if (!assets.length) {
            setIssueError('No attachment was selected. Please try again.');
            showToast({ message: 'No attachment was selected. Please try again.', type: 'error' });
            return;
        }
        const picks = assets.slice(0, MAX_FILES - attachments.length);
        const sizedPicks = await Promise.all(
            picks.map(async (file) => {
                const info = await FileSystem.getInfoAsync(file.uri);
                const size = ('size' in info && typeof info.size === 'number') ? info.size : (file.size || 0);
                return { file, size };
            })
        );
        const oversize = sizedPicks.find((entry) => entry.size > MAX_FILE_BYTES);
        if (oversize) {
            setIssueError(`${oversize.file.name} is too large. Max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file.`);
            showToast({ message: `${oversize.file.name} is too large. Max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file.`, type: 'error' });
            return;
        }
        try {
            const mapped = await Promise.all(picks.map(buildAttachmentPayload));
            setAttachments((prev) => [...prev, ...mapped].slice(0, 3));
            showToast({ message: `${mapped.length} attachment${mapped.length > 1 ? 's' : ''} added.`, type: 'success' });
        } catch (error: any) {
            const message = 'Could not process the selected file. Please try another file.';
            setIssueError(message);
            showToast({ message, type: 'error' });
        }
    };

    const handleSubmitIssue = async () => {
        if (!issueText.trim()) {
            setIssueError('Please describe the issue before submitting.');
            return;
        }
        try {
            setIssueSubmitting(true);
            setIssueError('');
            await apiClient.reportIssue({
                issue: issueText.trim(),
                name: issueName.trim() || undefined,
                email: issueEmail.trim() || undefined,
                attachments: attachments.map((file) => ({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: file.dataUrl,
                })),
            });
            setReportOpen(false);
            setIssueText('');
            setIssueName('');
            setIssueEmail('');
            setAttachments([]);
            setIssueError('');
            showToast({ message: 'Issue submitted. We will follow up soon.', type: 'success' });
        } catch (error: any) {
            const message = getUserFacingError(error, ['failed to submit issue']);
            setIssueError(message);
            showToast({ message, type: 'error' });
        } finally {
            setIssueSubmitting(false);
        }
    };

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
                        showToast({ message: getUserFacingError(error, ['logout failed']), type: 'error' });
                    }
                }}
            />

            {reportOpen && (
                <View style={styles.sheetOverlay}>
                    <Pressable style={styles.sheetBackdrop} onPress={() => setReportOpen(false)} />
                    <View style={[styles.sheetContainer, { paddingBottom: 28 + Math.max(insets.bottom, 0) + TAB_BAR_HEIGHT }]}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>Report an Issue</Text>
                        <Text style={styles.sheetSubtitle}>Tell us what went wrong. We will follow up by email if provided.</Text>

                    <Text style={styles.inputLabel}>Issue details</Text>
                    <TextInput
                        style={styles.textArea}
                        value={issueText}
                        onChangeText={setIssueText}
                        placeholder="Describe the issue in detail..."
                        placeholderTextColor={COLORS.silver}
                        multiline
                    />

                    <Text style={styles.inputLabel}>Attachments (up to 3)</Text>
                    <Text style={styles.helperText}>Max {Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB per file · {attachments.length}/{MAX_FILES} attached</Text>
                    <View style={styles.attachmentRow}>
                        {attachments.map((file, index) => (
                            <View key={`${file.name}-${index}`} style={styles.attachmentPreview}>
                                {file.type.startsWith('image/') ? (
                                    <Image source={{ uri: file.previewUri }} style={styles.attachmentImage} />
                                ) : (
                                    <Text style={styles.attachmentName} numberOfLines={2}>{file.name}</Text>
                                )}
                            </View>
                        ))}
                        {attachments.length < 3 && (
                            <TouchableOpacity style={styles.attachmentAdd} onPress={handlePickAttachments}>
                                <Ionicons name="add" size={22} color={COLORS.gold.mid} />
                                <Text style={styles.attachmentAddText}>Add</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.inputLabel}>Name (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={issueName}
                        onChangeText={setIssueName}
                        placeholder="Your name"
                        placeholderTextColor={COLORS.silver}
                    />

                    <Text style={styles.inputLabel}>Email (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={issueEmail}
                        onChangeText={setIssueEmail}
                        placeholder="name@email.com"
                        placeholderTextColor={COLORS.silver}
                        keyboardType="email-address"
                    />

                    <TouchableOpacity
                        style={[styles.sheetButton, (!issueText.trim() || issueSubmitting) && { opacity: 0.6 }]}
                        onPress={handleSubmitIssue}
                        disabled={!issueText.trim() || issueSubmitting}
                    >
                        <Text style={styles.sheetButtonText}>{issueSubmitting ? 'Submitting...' : 'Submit issue'}</Text>
                    </TouchableOpacity>
                        {null}
                    </View>
                </View>
            )}
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
    sheetBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
        elevation: 12,
    },
    sheetContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#101115',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 28,
        borderWidth: 1,
        borderColor: 'rgba(167,171,180,0.15)',
    },
    sheetHandle: {
        width: 48,
        height: 5,
        backgroundColor: 'rgba(167,171,180,0.4)',
        borderRadius: 999,
        alignSelf: 'center',
        marginBottom: 12,
    },
    sheetTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    sheetSubtitle: {
        color: COLORS.silver,
        fontSize: 12,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
    },
    inputLabel: {
        color: COLORS.silver,
        fontSize: 12,
        marginTop: 8,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    helperText: {
        color: COLORS.silver,
        fontSize: 11,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.35)',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        color: COLORS.text,
        backgroundColor: 'rgba(17,17,20,0.92)',
    },
    textArea: {
        borderWidth: 1,
        borderColor: 'rgba(167,171,180,0.2)',
        borderRadius: 12,
        padding: 12,
        color: COLORS.text,
        minHeight: 120,
        backgroundColor: 'rgba(17,17,20,0.8)',
    },
    attachmentRow: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    attachmentPreview: {
        width: 72,
        height: 72,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(167,171,180,0.2)',
        backgroundColor: 'rgba(17,17,20,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    attachmentImage: {
        width: '100%',
        height: '100%',
    },
    attachmentName: {
        color: COLORS.silver,
        fontSize: 10,
        textAlign: 'center',
        paddingHorizontal: 6,
    },
    attachmentAdd: {
        width: 72,
        height: 72,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(212,175,55,0.08)',
    },
    attachmentAddText: {
        color: COLORS.gold.mid,
        fontSize: 10,
        marginTop: 4,
        fontWeight: '600',
    },
    sheetButton: {
        marginTop: 12,
        backgroundColor: COLORS.gold.mid,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    sheetButtonText: {
        color: COLORS.background,
        fontWeight: '700',
    },
    errorText: {
        marginTop: 10,
        color: '#FCA5A5',
        fontSize: 12,
    },
});
