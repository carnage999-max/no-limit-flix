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
    const videoUrl = transformToCloudFront(params.videoUrl);

    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
        console.log('--- WatchScreen Debug ---');
        console.log('Title:', title);
        console.log('Original Video URL:', videoUrl);
        if (videoUrl && !videoUrl.startsWith('http')) {
            console.warn('CRITICAL: Video URL is missing protocol!');
        }
    }, [videoUrl, title]);

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

    const videoSource = useMemo(() => ({
        uri: videoUrl,
        metadata: {
            title: title || 'Playing Video'
        }
    }), [videoUrl, title]);

    const player = useVideoPlayer(videoSource, (player) => {
        player.loop = false;
        player.play();
    });

    useEffect(() => {
        const statusSub = player.addListener('statusChange', (event) => {
            if (event.status === 'readyToPlay') {
                setIsBuffering(false);
                setError(null);
                player.play();
            } else if (event.status === 'loading') {
                setIsBuffering(true);
            } else if (event.status === 'error') {
                setIsBuffering(false);
                const errorDetails = (event as any).error?.message || 'Unknown playback error';
                setError(errorDetails);
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={isPlaying} />

            <View style={styles.videoContainer}>
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsPictureInPicture={true}
                    nativeControls={true}
                    contentFit="contain"
                />

                {/* Back button overlay - always visible or only when controls would be */}
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
                            {error.includes('Format') || error.includes('Decoder') || videoUrl.toLowerCase().endsWith('.mkv')
                                ? `This title uses a format (MKV or HEVC) that might not be supported natively on ${Platform.OS === 'ios' ? 'iOS' : 'this device'}. Try a different title or use an MP4 source.`
                                : `Playback Issue: ${error}`}
                        </Text>
                        <Text style={{ color: COLORS.silver, opacity: 0.5, fontSize: 12, marginBottom: 20 }}>
                            URL: {videoUrl}
                        </Text>
                        <TouchableOpacity
                            style={styles.errorButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.errorButtonText}>Go Back</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isBuffering && !error && (
                    <View style={styles.loaderContainer} pointerEvents="none">
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        backgroundColor: 'rgba(0,0,0,0.3)',
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoTitle: {
        color: '#fff',
        fontSize: 18,
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
        fontSize: 24,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 10,
    },
    errorSubtitle: {
        color: COLORS.silver,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    errorButton: {
        backgroundColor: COLORS.gold.mid,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
    },
    errorButtonText: {
        color: COLORS.background,
        fontSize: 16,
        fontWeight: '700',
    },
});
