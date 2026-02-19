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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { transformToCloudFront } from '../lib/utils';
import { BASE_URL } from '../lib/api';

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
    const [useCompatMode, setUseCompatMode] = useState(false);

    const streamUrl = useMemo(() => {
        if (!assetId) return null;
        return `${BASE_URL}/api/stream/${assetId}`;
    }, [assetId]);

    const finalVideoUrl = useCompatMode && streamUrl ? streamUrl : videoUrl;

    // Deep debug logging
    useEffect(() => {
        if (!finalVideoUrl) return;

        console.log(`[WatchScreen] Mode: ${useCompatMode ? 'COMPAT (Transcoding)' : 'DIRECT'}`);
        console.log(`[WatchScreen] URL: ${finalVideoUrl}`);

        // Investigative fetch to check headers
        fetch(finalVideoUrl, { method: 'HEAD' })
            .then(res => {
                const mime = res.headers.get('Content-Type');
                console.log(`[WatchScreen] Server Content-Type: ${mime}`);
                setServerMime(mime);
            })
            .catch(e => console.log('[WatchScreen] Header Check Failed', e));
    }, [finalVideoUrl, retryCount, useCompatMode]);

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

    const videoSource = useMemo(() => {
        if (!finalVideoUrl) return null;
        return {
            uri: finalVideoUrl,
            metadata: {
                title: title || 'Playing Video'
            },
            headers: {
                'User-Agent': 'NoLimitFlixMobile/1.0',
            }
        };
    }, [finalVideoUrl, retryCount]);

    const player = useVideoPlayer(videoSource, (p) => {
        p.loop = false;
        p.play();
    });

    useEffect(() => {
        if (!player) return;

        const statusSub = player.addListener('statusChange', (event) => {
            console.log(`[WatchScreen] Player status changed: ${event.status}`);
            if (event.status === 'readyToPlay') {
                setIsBuffering(false);
                setError(null);
                player.play();
                setIsPlaying(true);
            } else if (event.status === 'loading') {
                setIsBuffering(true);
            } else if (event.status === 'error') {
                setIsBuffering(false);
                const errorMsg = (event as any).error?.message || 'Unknown playback error';
                console.error('[WatchScreen] Player error detail:', (event as any).error);
                setError(errorMsg);
            }
        });

        const playingSub = player.addListener('playingChange', (event) => {
            setIsPlaying(event.isPlaying);
        });

        return () => {
            statusSub.remove();
            playingSub.remove();
        };
    }, [player]);

    const handleRetry = () => {
        setError(null);
        setIsBuffering(true);
        setRetryCount(prev => prev + 1);
        if (player && videoSource) {
            player.replace(videoSource);
            player.play();
        }
    };

    const handleEnableCompat = () => {
        setError(null);
        setIsBuffering(true);
        setUseCompatMode(true);
        setRetryCount(prev => prev + 1);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={isPlaying} />

            <View style={styles.videoContainer}>
                {videoSource ? (
                    <VideoView
                        style={styles.video}
                        player={player}
                        allowsPictureInPicture={true}
                        nativeControls={true}
                        contentFit="contain"
                    />
                ) : (
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

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={64} color={COLORS.accent.red || '#EF4444'} />
                        <Text style={styles.errorTitle}>Playback Error</Text>
                        <Text style={styles.errorSubtitle}>
                            {error.includes('Format') || error.includes('Decoder') || (finalVideoUrl && finalVideoUrl.toLowerCase().endsWith('.mkv')) || (serverMime && serverMime.includes('matroska'))
                                ? `Unsupported format (MKV/HEVC) for this device.`
                                : `Playback Issue: ${error}`}
                        </Text>

                        <View style={{ marginVertical: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                            <Text style={{ color: COLORS.silver, opacity: 0.7, fontSize: 10, textAlign: 'center' }}>
                                MIME: {serverMime || 'checking...'}{"\n"}
                                Mode: {useCompatMode ? 'Compat (Transcoding)' : 'Direct'}
                            </Text>
                        </View>

                        <View style={styles.errorActionRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.secondaryButtonText}>Exit</Text>
                            </TouchableOpacity>

                            {!useCompatMode && assetId ? (
                                <TouchableOpacity style={styles.errorButton} onPress={handleEnableCompat}>
                                    <Ionicons name="flash" size={18} color={COLORS.background} />
                                    <Text style={styles.errorButtonText}>Force Smart Fix</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.errorButton} onPress={handleRetry}>
                                    <Ionicons name="refresh" size={18} color={COLORS.background} />
                                    <Text style={styles.errorButtonText}>Retry</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {Platform.OS === 'ios' && !useCompatMode && (
                            <Text style={styles.iosHint}>
                                Tip: Tap "Force Smart Fix" to transcode for iOS playback.
                            </Text>
                        )}
                    </View>
                )}

                {isBuffering && !error && (
                    <View style={styles.loaderContainer} pointerEvents="none">
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                        <Text style={{ color: '#fff', marginTop: 15, fontWeight: '600' }}>
                            {useCompatMode ? 'Transcoding for Compatibility...' : 'Buffering...'}
                        </Text>
                        {useCompatMode && (
                            <Text style={{ color: COLORS.silver, fontSize: 12, marginTop: 5 }}>
                                This might take a few seconds
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};
