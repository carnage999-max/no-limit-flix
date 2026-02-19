import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
    useWindowDimensions,
    Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { transformToCloudFront } from '../lib/utils';
import { BASE_URL } from '../lib/api';
import * as Linking from 'expo-linking';
// @ts-ignore - Native module without types
import { VLCPlayer } from 'react-native-vlc-media-player';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    vlcPlayer: {
        width: '100%',
        height: '100%',
    },
    loaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 5,
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 15,
    },
    errorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        zIndex: 20,
    },
    errorTitle: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: '700',
        marginTop: 15,
        marginBottom: 8,
    },
    errorSubtitle: {
        color: COLORS.silver,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 10,
        paddingHorizontal: 20,
    },
    errorActionRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorButton: {
        backgroundColor: COLORS.gold.mid,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryButtonText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: '600',
    },
    iosHint: {
        color: COLORS.silver,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 25,
        opacity: 0.6,
        textAlign: 'center',
    },
    vlcControlsHint: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    }
});

export const WatchScreen = () => {
    const { width, height } = useWindowDimensions();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const params = route.params || {};
    const title = params.title;
    const assetId = params.assetId;
    const rawUrl = params.videoUrl;
    const videoUrl = transformToCloudFront(rawUrl);

    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [serverMime, setServerMime] = useState<string | null>(null);
    const [activeEngine, setActiveEngine] = useState<'native' | 'vlc'>('native');

    // Deep debug logging
    useEffect(() => {
        if (!videoUrl) return;

        console.log(`[WatchScreen] Engine: ${activeEngine}`);
        console.log(`[WatchScreen] URL: ${videoUrl}`);

        fetch(videoUrl, { method: 'HEAD' })
            .then(res => {
                const mime = res.headers.get('Content-Type');
                console.log(`[WatchScreen] Server Content-Type: ${mime}`);
                setServerMime(mime);
            })
            .catch(e => console.log('[WatchScreen] Header Check Failed', e));
    }, [videoUrl, retryCount, activeEngine]);

    useEffect(() => {
        async function lockOrientation() {
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            } catch (e) {
                console.warn('Failed to lock orientation', e);
            }
        }
        lockOrientation();

        return () => {
            ScreenOrientation.unlockAsync().catch(() => { });
        };
    }, []);

    // Native Player Setup
    const videoSource = useMemo(() => {
        if (!videoUrl || activeEngine !== 'native') return null;
        return {
            uri: videoUrl,
            metadata: { title: title || 'Playing Video' },
            headers: { 'User-Agent': 'NoLimitFlixMobile/1.0' }
        };
    }, [videoUrl, retryCount, activeEngine]);

    const nativePlayer = useVideoPlayer(videoSource, (p) => {
        p.loop = false;
        p.play();
    });

    useEffect(() => {
        if (!nativePlayer || activeEngine !== 'native') return;

        const statusSub = nativePlayer.addListener('statusChange', (event) => {
            if (event.status === 'readyToPlay') {
                setIsBuffering(false);
                setError(null);
                nativePlayer.play();
                setIsPlaying(true);
            } else if (event.status === 'loading') {
                setIsBuffering(true);
            } else if (event.status === 'error') {
                setIsBuffering(false);
                const errorMsg = (event as any).error?.message || 'Unknown playback error';
                console.error('[WatchScreen] Native Player error:', errorMsg);
                setError(errorMsg);
            }
        });

        const playingSub = nativePlayer.addListener('playingChange', (event) => {
            setIsPlaying(event.isPlaying);
        });

        return () => {
            statusSub.remove();
            playingSub.remove();
        };
    }, [nativePlayer, activeEngine]);

    const handleRetry = () => {
        setError(null);
        setIsBuffering(true);
        setRetryCount(prev => prev + 1);
        if (activeEngine === 'native' && nativePlayer && videoSource) {
            nativePlayer.replace(videoSource);
            nativePlayer.play();
        }
    };

    const handleSwitchToVlcInternal = () => {
        setError(null);
        setIsBuffering(true);
        setActiveEngine('vlc');
        setRetryCount(prev => prev + 1);
    };

    const handleOpenExternalVlc = async () => {
        if (!videoUrl) return;
        try {
            if (Platform.OS === 'ios') {
                const vlcUrl = `vlc://${videoUrl.replace(/^https?:\/\//, '')}`;
                const canOpenVlc = await Linking.canOpenURL('vlc://').catch(() => false);
                if (canOpenVlc) {
                    await Linking.openURL(vlcUrl);
                } else {
                    await Linking.openURL(videoUrl);
                }
            } else {
                await Linking.openURL(videoUrl);
            }
        } catch (e) {
            Alert.alert('External Player', 'Please install VLC from the Store.');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={isPlaying} />

            <View style={styles.videoContainer}>
                {activeEngine === 'native' && videoSource && (
                    <VideoView
                        style={styles.video}
                        player={nativePlayer}
                        allowsPictureInPicture={true}
                        nativeControls={true}
                        contentFit="contain"
                    />
                )}

                {activeEngine === 'vlc' && videoUrl && (
                    <VLCPlayer
                        style={styles.vlcPlayer}
                        videoAspectRatio="16:9"
                        source={{
                            uri: videoUrl,
                            initOptions: ['--codec=avcodec,all', '--avcodec-hw=none'] // Force internal software decoding like the main VLC app
                        }}
                        onVLCProgress={() => setIsBuffering(false)}
                        onVLCPlaying={() => {
                            setIsBuffering(false);
                            setIsPlaying(true);
                        }}
                        onVLCBuffering={() => setIsBuffering(true)}
                        onVLCError={(e: any) => {
                            console.error('[WatchScreen] VLC Internal Error:', e);
                            setError('VLC engine failed to decode stream.');
                        }}
                    />
                )}

                {!videoUrl && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                    </View>
                )}

                {/* Back button overlay */}
                {!isPlaying && (
                    <View style={[styles.headerOverlay, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20) }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.videoTitle} numberOfLines={1}>{title || 'Playing Video'}</Text>
                        <View style={{ width: 44 }} />
                    </View>
                )}

                {activeEngine === 'vlc' && isPlaying && (
                    <TouchableOpacity
                        onPress={() => setIsPlaying(false)}
                        style={{ position: 'absolute', top: 40, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 }}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={64} color={COLORS.accent.red || '#EF4444'} />
                        <Text style={styles.errorTitle}>Format Conflict</Text>
                        <Text style={styles.errorSubtitle}>
                            {error.toLowerCase().includes('format') ||
                                error.toLowerCase().includes('decoder') ||
                                error.toLowerCase().includes('matroska') ||
                                error.toLowerCase().includes('hevc') ||
                                error.toLowerCase().includes('hvc1') ||
                                error.toLowerCase().includes('renderer')
                                ? `The native player hit a hardware decoding limit for this file.`
                                : `Playback Issue: ${error}`}
                        </Text>

                        <View style={styles.errorActionRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.secondaryButtonText}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.errorButton} onPress={handleSwitchToVlcInternal}>
                                <Ionicons name="shield-checkmark" size={18} color={COLORS.background} />
                                <Text style={styles.errorButtonText}>Use Internal VLC Fix</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.secondaryButton, { borderStyle: 'dashed' }]} onPress={handleOpenExternalVlc}>
                                <Ionicons name="open-outline" size={18} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.iosHint}>
                            "VLC Fix" uses software decoding (VLC engine) to bypass hardware limits.
                        </Text>
                    </View>
                )}

                {isBuffering && !error && (
                    <View style={styles.loaderContainer} pointerEvents="none">
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                        <Text style={{ color: '#fff', marginTop: 15, fontWeight: '600' }}>
                            {activeEngine === 'vlc' ? 'Loading VLC Engine...' : 'Buffering...'}
                        </Text>
                    </View>
                )}

                {activeEngine === 'vlc' && !isPlaying && (
                    <View style={styles.vlcControlsHint}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>VLC Mode: Use system gestures for volume/brightness</Text>
                    </View>
                )}
            </View>
        </View>
    );
};
