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
    Animated
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { transformToCloudFront } from '../lib/utils';

export const WatchScreen = () => {
    const { width, height } = useWindowDimensions();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const params = route.params || {};
    const title = params.title;
    const rawUrl = params.videoUrl;
    const videoUrl = transformToCloudFront(rawUrl);

    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Logs for debugging
    useEffect(() => {
        console.log(`[WatchScreen] Attempting to play: ${videoUrl}`);
    }, [videoUrl, retryCount]);

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
        if (!videoUrl) return null;
        return {
            uri: videoUrl,
            metadata: {
                title: title || 'Playing Video'
            }
        };
    }, [videoUrl, retryCount]);

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
                console.error('[WatchScreen] Player error event:', (event as any).error);
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

    return (
        <View style={watchStyles.container}>
            <StatusBar barStyle="light-content" hidden={isPlaying} />

            <View style={watchStyles.videoContainer}>
                {videoSource ? (
                    <VideoView
                        style={watchStyles.video}
                        player={player}
                        allowsPictureInPicture={true}
                        nativeControls={true}
                        contentFit="contain"
                    />
                ) : (
                    <View style={watchStyles.loaderContainer}>
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                        <Text style={{ color: '#fff', marginTop: 10 }}>Initializing Player...</Text>
                    </View>
                )}

                {/* Back button overlay - always visible or only when controls would be */}
                {!isPlaying && (
                    <View style={[watchStyles.headerOverlay, { paddingTop: insets.top + (Platform.OS === 'ios' ? 10 : 20) }]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={watchStyles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={watchStyles.videoTitle} numberOfLines={1}>{title || 'Playing Video'}</Text>
                        <View style={{ width: 44 }} />
                    </View>
                )}

                {error && (
                    <View style={watchStyles.errorContainer}>
                        <Ionicons name="alert-circle" size={64} color={COLORS.accent.red || '#EF4444'} />
                        <Text style={watchStyles.errorTitle}>Playback Error</Text>
                        <Text style={watchStyles.errorSubtitle}>
                            {error.includes('Format') || error.includes('Decoder') || (videoUrl && videoUrl.toLowerCase().endsWith('.mkv'))
                                ? `This title uses a format (MKV or HEVC) that might not be supported natively on ${Platform.OS === 'ios' ? 'iOS' : 'this device'}. Try a different title or use an MP4 source.`
                                : `Playback Issue: ${error}`}
                        </Text>

                        <Text style={{ color: COLORS.silver, opacity: 0.5, fontSize: 11, marginBottom: 20, textAlign: 'center' }}>
                            {videoUrl}
                        </Text>

                        <View style={watchStyles.errorActionRow}>
                            <TouchableOpacity
                                style={watchStyles.secondaryButton}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={watchStyles.secondaryButtonText}>Go Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={watchStyles.errorButton}
                                onPress={handleRetry}
                            >
                                <Text style={watchStyles.errorButtonText}>Retry Now</Text>
                            </TouchableOpacity>
                        </View>

                        {Platform.OS === 'ios' && (
                            <Text style={watchStyles.iosHint}>
                                Tip: Ensure your VPN or AdBlocker isn't interfering with the connection.
                            </Text>
                        )}
                    </View>
                )}

                {isBuffering && !error && (
                    <View style={watchStyles.loaderContainer} pointerEvents="none">
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                        <Text style={{ color: '#fff', marginTop: 15, fontWeight: '600' }}>Loading Video...</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const watchStyles = StyleSheet.create({
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
        ...StyleSheet.absoluteFillObject,
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
        ...StyleSheet.absoluteFillObject,
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
    },
    errorButton: {
        backgroundColor: COLORS.gold.mid,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    errorButtonText: {
        color: COLORS.background,
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
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
