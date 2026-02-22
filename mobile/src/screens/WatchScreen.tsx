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
    Modal,
    Pressable,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { transformToCloudFront } from '../lib/utils';
// @ts-ignore - Native module without types
import { VLCPlayer } from 'react-native-vlc-media-player';

import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, useDerivedValue } from 'react-native-reanimated';

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
    vlcPlayerContainer: {
        width: '100%',
        height: '100%',
    },
    vlcPlayer: {
        width: '100%',
        height: '100%',
    },
    pauseOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 150,
    },
    pauseCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,193,7,0.2)',
        borderWidth: 2,
        borderColor: COLORS.gold.mid,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    pauseLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 4,
        opacity: 0.8,
    },
    mainPlayButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sideControlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brightnessOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 1,
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
    // VLC Controls Styles
    vlcControlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'space-between',
        paddingVertical: 25,
        paddingHorizontal: 40,
        zIndex: 100,
    },
    vlcCenterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 50,
    },
    vlcBottomControls: {
        width: '100%',
        gap: 8,
    },
    vlcProgressBarContainer: {
        width: '100%',
        height: 20,
        justifyContent: 'center',
    },
    vlcProgressBarWrapper: {
        flex: 1,
        height: 6,
        marginHorizontal: 15,
        justifyContent: 'center',
    },
    vlcProgressBarTrack: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    vlcProgressBarFill: {
        height: '100%',
        backgroundColor: COLORS.gold.mid,
        borderRadius: 2,
    },
    vlcProgressBarKnob: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: COLORS.gold.mid,
        marginLeft: -7,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 3,
    },
    vlcTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    vlcTimeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    settingsModal: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsContent: {
        width: 300,
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    settingsHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    settingLabel: {
        color: '#fff',
        fontSize: 16,
    },
    settingValue: {
        color: COLORS.gold.mid,
        fontWeight: '700',
    },
    gestureIndicator: {
        position: 'absolute',
        top: '30%',
        padding: 15,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
    },
    indicatorLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    indicatorBar: {
        width: 6,
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    indicatorFill: {
        width: '100%',
        backgroundColor: COLORS.gold.mid,
        position: 'absolute',
        bottom: 0,
    }
});

// Separate component to isolate Native Player lifecycle
const NativePlayerUI = ({ url, onSwitchToVlc }: { url: string, onSwitchToVlc: () => void }) => {
    const player = useVideoPlayer(url, (p) => {
        p.play();
        p.loop = false;
    });

    useEffect(() => {
        const sub = player.addListener('statusChange', (event) => {
            if (event.status === 'error') {
                onSwitchToVlc();
            }
        });
        return () => {
            sub.remove();
        };
    }, [player]);

    return (
        <VideoView
            style={styles.video}
            player={player}
            nativeControls={true}
            contentFit="contain"
        />
    );
};

export const WatchScreen = () => {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const params = route.params || {};
    const title = params.title;
    const assetId = params.assetId; // Changed from videoUrl - now using assetId

    const [isBuffering, setIsBuffering] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [activeEngine, setActiveEngine] = useState<'native' | 'vlc'>('vlc');
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [hlsCookieHeader, setHlsCookieHeader] = useState<string>('');
    const [playbackType, setPlaybackType] = useState<'mp4' | 'hls'>('mp4');

    // VLC States
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [volume, setVolume] = useState(100);
    const [brightness, setBrightness] = useState(1.0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [indicatorType, setIndicatorType] = useState<'volume' | 'brightness' | null>(null);
    const [audioTrack, setAudioTrack] = useState(1);
    const [subtitleTrack, setSubtitleTrack] = useState(-1); // -1 is usually off
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubTime, setScrubTime] = useState(0);

    const vlcPlayerRef = useRef<any>(null);
    const controlsTimer = useRef<any>(null);
    const lastTimeRef = useRef<number>(0);
    const stuckTimerRef = useRef<any>(null);

    // Fetch signed playback URL on mount
    useEffect(() => {
        if (!assetId) {
            setError('No asset ID provided');
            return;
        }

        const fetchPlaybackUrl = async () => {
            try {
                setIsBuffering(true);
                console.log(`📺 [Watch] Fetching signed playback URL for assetId: ${assetId}`);

                // Call /api/watch/start to get signed URL/cookies
                const response = await fetch(`/api/watch/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ assetId }),
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || 'Failed to fetch playback URL');
                }

                const data = await response.json();
                console.log(
                  `✅ [Watch] Playback type: ${data.playbackType}, expires: ${data.expiresAt}`
                );

                setPlaybackType(data.playbackType);
                setVideoUrl(data.playbackUrl);

                // If HLS, store the signed cookie header for VLC
                if (data.playbackType === 'hls' && data.cookieHeader) {
                    console.log(`🍪 [Watch] HLS detected, storing signed cookie`);
                    setHlsCookieHeader(data.cookieHeader);
                }

                setIsBuffering(false);
            } catch (err) {
                console.error('❌ [Watch] Failed to fetch playback URL:', err);
                setError((err as Error).message);
                setIsBuffering(false);
            }
        };

        fetchPlaybackUrl();
    }, [assetId]);

    // Track Names and Lists
    const [audioTracks, setAudioTracks] = useState<{ id: number, name: string }[]>([]);
    const [subtitleTracks, setSubtitleTracks] = useState<{ id: number, name: string }[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [vlcProgress, setVlcProgress] = useState(0); // 0-1 ratio

    // Determine which player engine to use based on playback type
    useEffect(() => {
        if (playbackType === 'hls') {
            // Use VLC for HLS (better codec support)
            console.log('🎬 [Watch] Using VLC engine for HLS');
            setActiveEngine('vlc');
        } else {
            // Use native player for MP4
            console.log('🎬 [Watch] Using native engine for MP4');
            setActiveEngine('native');
        }
    }, [playbackType]);

    useEffect(() => {
        const lock = async () => {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        };
        lock();
        return () => { ScreenOrientation.unlockAsync(); };
    }, []);

    // Controls Auto-hide
    const resetControlsTimer = () => {
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => {
            if (!isScrubbing) setShowControls(false);
        }, 4500);
    };

    useEffect(() => {
        if (showControls && isPlaying && !isScrubbing) {
            resetControlsTimer();
        }
    }, [showControls, isPlaying, isScrubbing]);

    const delayedHideIndicator = () => {
        setTimeout(() => setIndicatorType(null), 1000);
    };

    // VLC Control Helpers
    const handleSeek = (pos: number) => {
        if (!vlcPlayerRef.current || duration <= 0) return;

        const ratio = Math.max(0, Math.min(1, pos / duration));
        vlcPlayerRef.current.seek(ratio);

        setCurrentTime(pos);
        setVlcProgress(ratio);
        if (stuckTimerRef.current) clearTimeout(stuckTimerRef.current);
    };

    const handleSkip = (offset: number) => {
        const newTime = Math.max(0, Math.min(duration, currentTime + offset));
        handleSeek(newTime);
    };

    // Shared Values for Gestures
    const volumeValue = useSharedValue(100);
    const brightnessValue = useSharedValue(1.0);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            'worklet';
            // Only allow pan on top 75% to avoid seek bar collision at bottom
            if (e.y > screenHeight * 0.75) return;

            const delta = -e.translationY / 2;
            if (e.x < screenWidth * 0.4) {
                const newVal = Math.max(0, Math.min(1, brightnessValue.value + delta / 200));
                brightnessValue.value = newVal;
                runOnJS(setBrightness)(newVal);
                runOnJS(setIndicatorType)('brightness');
            } else if (e.x > screenWidth * 0.6) {
                const newVal = Math.max(0, Math.min(100, volumeValue.value + delta));
                volumeValue.value = newVal;
                runOnJS(setVolume)(newVal);
                runOnJS(setIndicatorType)('volume');
            }
        })
        .onEnd(() => {
            runOnJS(delayedHideIndicator)();
        });

    const tapGesture = Gesture.Tap().onEnd(() => {
        runOnJS(setShowControls)(!showControls);
    });

    const doubleTapGesture = Gesture.Tap().numberOfTaps(2).onEnd((e) => {
        if (e.x > screenWidth * 0.7) {
            runOnJS(handleSkip)(10);
        } else if (e.x < screenWidth * 0.3) {
            runOnJS(handleSkip)(-10);
        }
    });

    // Dedicated Scrubber Gesture
    const scrubGesture = Gesture.Pan()
        .onBegin((e) => {
            runOnJS(setIsScrubbing)(true);
            const progress = Math.max(0, Math.min(1, e.x / (screenWidth - 60)));
            runOnJS(setScrubTime)(progress * duration);
        })
        .onUpdate((e) => {
            const progress = Math.max(0, Math.min(1, e.x / (screenWidth - 60)));
            runOnJS(setScrubTime)(progress * duration);
        })
        .onEnd((e) => {
            const progress = Math.max(0, Math.min(1, e.x / (screenWidth - 60)));
            runOnJS(handleSeek)(progress * duration);
            runOnJS(setIsScrubbing)(false);
            runOnJS(resetControlsTimer)();
        });

    const tapSeekGesture = Gesture.Tap().onEnd((e) => {
        const progress = Math.max(0, Math.min(1, e.x / (screenWidth - 60)));
        runOnJS(handleSeek)(progress * duration);
    });

    const composedGesture = Gesture.Exclusive(doubleTapGesture, panGesture, tapGesture);

    const formatTime = (sec: number) => {
        if (!sec || isNaN(sec)) return "0:00";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return h > 0 ? `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}` : `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const displayTime = isScrubbing ? scrubTime : currentTime;
    const progressPercent = isScrubbing ? (scrubTime / duration) * 100 : (vlcProgress * 100) || 0;

    return (
        <View style={styles.container}>
            <StatusBar hidden={isPlaying && !showControls} />

            <View style={styles.videoContainer}>
                {activeEngine === 'native' && videoUrl && (
                    <NativePlayerUI
                        url={videoUrl}
                        onSwitchToVlc={() => setActiveEngine('vlc')}
                    />
                )}

                {activeEngine === 'vlc' && videoUrl && (
                    <GestureHandlerRootView style={styles.vlcPlayerContainer}>
                        <GestureDetector gesture={composedGesture}>
                            <View style={{ flex: 1 }}>
                                {/* @ts-ignore - props not in definition */}
                                <VLCPlayer
                                    key={videoUrl}
                                    ref={vlcPlayerRef}
                                    style={styles.vlcPlayer}
                                    source={{ uri: videoUrl }}
                                    paused={!isPlaying}
                                    rate={playbackRate}
                                    audioTrack={audioTrack}
                                    textTrack={subtitleTrack}
                                    volume={volume}
                                    // Apply signed CloudFront cookie header for all HLS requests (manifest, playlists, segments)
                                    initOptions={hlsCookieHeader ? [
                                        `--http-header=Cookie: ${hlsCookieHeader}`,
                                        '--network-caching=1500',  // Buffer 1.5s for HLS stability
                                        '--http-reconnect'         // Auto-reconnect on network failures
                                    ] : ['--network-caching=1500']}
                                    onProgress={(e: any) => {
                                        if (e.currentTime > 0) {
                                            const time = e.currentTime / 1000;
                                            if (!isScrubbing) {
                                                setCurrentTime(time);
                                            }
                                            setVlcProgress(e.position || (e.currentTime / e.duration));
                                            setDuration(e.duration / 1000 || 1);
                                            if (isBuffering) setIsBuffering(false);
                                        }

                                        // Metadata sweep - updated to detect name changes, not just count changes
                                        const foundAudio = e.audioTracks || e.audioTrackNames || e.audioTracksList;
                                        const foundSubs = e.textTracks || e.textTrackNames || e.subtitleTracks || e.subtitles || e.subtitleTracksList;

                                        if (foundAudio && foundAudio.length > 0) {
                                            const mapped = foundAudio.map((t: any, i: number) => {
                                                if (typeof t === 'string') return { id: i, name: t };
                                                const id = t.id ?? t.ID ?? i;
                                                return { id, name: t.name || t.title || `Audio ${id}` };
                                            });
                                            const currentNames = audioTracks.map((track: any) => track.name).join(',');
                                            const newNames = mapped.map((track: any) => track.name).join(',');
                                            if (currentNames !== newNames) setAudioTracks(mapped);
                                        }

                                        if (foundSubs && foundSubs.length > 0) {
                                            const mapped = foundSubs.map((t: any, i: number) => {
                                                if (typeof t === 'string') return { id: i, name: t };
                                                const id = t.id ?? t.ID ?? i;
                                                return { id, name: t.name || t.title || `Subtitle ${id}` };
                                            }).filter((t: any) => t.name.toLowerCase() !== 'disable');

                                            const currentNames = subtitleTracks.map((track: any) => track.name).join(',');
                                            const newNames = mapped.map((track: any) => track.name).join(',');
                                            if (currentNames !== newNames) setSubtitleTracks(mapped);
                                        }
                                    }}
                                    onLoad={(e: any) => {
                                        const foundAudio = e.audioTracks || e.audioTrackNames;
                                        const foundSubs = e.textTracks || e.textTrackNames || e.subtitleTracks || e.subtitles;
                                        if (foundAudio) {
                                            setAudioTracks(foundAudio.map((t: any, i: number) =>
                                                typeof t === 'string' ? { id: i, name: t } :
                                                    ({ id: t.id ?? t.ID ?? i, name: t.name || t.title || `Audio ${i}` })
                                            ));
                                        }
                                        if (foundSubs) {
                                            setSubtitleTracks(foundSubs.map((t: any, i: number) =>
                                                typeof t === 'string' ? { id: i, name: t } :
                                                    ({ id: t.id ?? t.ID ?? i, name: t.name || t.title || `Subtitle ${i}` })
                                            ).filter((t: any) => t.name.toLowerCase() !== 'disable'));
                                        }
                                    }}
                                    onPlaying={() => {
                                        setIsPlaying(true);
                                        setIsBuffering(false);
                                        setHasLoaded(true);
                                    }}
                                    onBuffering={(e: any) => {
                                        const isStillBuffering = e?.bufferRate != null ? e.bufferRate < 100 : !!e?.isBuffering;
                                        setIsBuffering(isStillBuffering);
                                    }}
                                    onError={() => {
                                        setError('VLC engine failure.');
                                        setIsBuffering(false);
                                    }}
                                />

                                <View style={[styles.brightnessOverlay, { opacity: 1 - brightness }]} pointerEvents="none" />

                                {indicatorType === 'volume' && (
                                    <View style={[styles.gestureIndicator, { right: 60 }]}>
                                        <Text style={styles.indicatorLabel}>Volume</Text>
                                        <Ionicons name={volume > 50 ? "volume-high" : volume > 0 ? "volume-low" : "volume-mute"} size={24} color="#fff" />
                                        <View style={styles.indicatorBar}>
                                            <View style={[styles.indicatorFill, { height: `${volume}%` }]} />
                                        </View>
                                    </View>
                                )}

                                {indicatorType === 'brightness' && (
                                    <View style={[styles.gestureIndicator, { left: 60 }]}>
                                        <Text style={styles.indicatorLabel}>Brightness</Text>
                                        <Ionicons name="sunny" size={24} color="#fff" />
                                        <View style={styles.indicatorBar}>
                                            <View style={[styles.indicatorFill, { height: `${brightness * 100}%` }]} />
                                        </View>
                                    </View>
                                )}

                                {showControls && (
                                    <View style={styles.vlcControlsOverlay}>
                                        {/* Header */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                                <Ionicons name="close" size={24} color="#fff" />
                                            </TouchableOpacity>

                                            <Text style={[styles.videoTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
                                                {title}
                                            </Text>

                                            <TouchableOpacity onPress={() => setIsSettingsOpen(true)} style={styles.backButton}>
                                                <Ionicons name="settings-sharp" size={22} color="#fff" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Center */}
                                        <View style={styles.vlcCenterControls}>
                                            <TouchableOpacity onPress={() => handleSkip(-15)} style={styles.sideControlButton}>
                                                <Ionicons name="play-back" size={32} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setIsPlaying(!isPlaying)}
                                                style={styles.mainPlayButton}
                                            >
                                                <Ionicons name={isPlaying ? "pause" : "play"} size={54} color="#fff" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleSkip(15)} style={styles.sideControlButton}>
                                                <Ionicons name="play-forward" size={32} color="#fff" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Bottom */}
                                        <View style={styles.vlcBottomControls}>
                                            <View style={styles.vlcProgressBarWrapper}>
                                                <GestureDetector gesture={Gesture.Exclusive(scrubGesture, tapSeekGesture)}>
                                                    <View style={styles.vlcProgressBarContainer}>
                                                        <View style={styles.vlcProgressBarTrack}>
                                                            <View style={[styles.vlcProgressBarFill, { width: `${progressPercent}%` }]} />
                                                        </View>
                                                        <View style={[styles.vlcProgressBarKnob, { left: `${progressPercent}%` }]} />
                                                    </View>
                                                </GestureDetector>
                                            </View>
                                            <View style={styles.vlcTimeRow}>
                                                <Text style={styles.vlcTimeText}>{formatTime(displayTime)}</Text>
                                                <Text style={styles.vlcTimeText}>{formatTime(duration)}</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>
                        </GestureDetector>
                    </GestureHandlerRootView>
                )}

                {(!isPlaying && !isBuffering && activeEngine === 'vlc') && (
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => {
                            if (!showControls) setShowControls(true);
                            setIsPlaying(true);
                        }}
                        style={styles.pauseOverlay}
                    >
                        <View style={styles.pauseCircle}>
                            <Ionicons name="play" size={50} color="#fff" style={{ marginLeft: 5 }} />
                        </View>
                        <Text style={styles.pauseLabel}>PAUSED</Text>
                    </TouchableOpacity>
                )}

                {/* Only show spinner during initial load, NOT during seeks */}
                {isBuffering && !hasLoaded && !error && (
                    <View style={styles.loaderContainer} pointerEvents="none">
                        <ActivityIndicator size="large" color={COLORS.gold.mid} />
                    </View>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={48} color="red" />
                        <Text style={styles.errorTitle}>Playback Error</Text>
                        <Text style={styles.errorSubtitle}>{error}</Text>
                        <TouchableOpacity style={styles.errorButton} onPress={() => { setError(null); setActiveEngine('native'); }}>
                            <Text style={styles.errorButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Settings Modal */}
                <Modal visible={isSettingsOpen} transparent animationType="fade">
                    <View style={styles.settingsModal}>
                        <View style={styles.settingsContent}>
                            <Text style={styles.settingsHeader}>Playback Settings</Text>

                            <TouchableOpacity style={styles.settingItem} onPress={() => {
                                const rates = [1.0, 1.25, 1.5, 2.0, 0.5];
                                const currentIdx = rates.indexOf(playbackRate);
                                setPlaybackRate(rates[(currentIdx + 1) % rates.length]);
                            }}>
                                <Text style={styles.settingLabel}>Playback Speed</Text>
                                <Text style={styles.settingValue}>{playbackRate}x</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingItem} onPress={() => {
                                if (audioTracks.length > 0) {
                                    const currentIdx = audioTracks.findIndex(t => t.id === audioTrack);
                                    const nextIdx = (currentIdx + 1) % audioTracks.length;
                                    setAudioTrack(audioTracks[nextIdx].id);
                                } else {
                                    setAudioTrack(prev => (prev >= 5 ? 1 : prev + 1));
                                }
                            }}>
                                <Text style={styles.settingLabel}>Audio Track</Text>
                                <Text style={styles.settingValue}>
                                    {audioTracks.find(t => t.id === audioTrack)?.name || (audioTracks.length > 0 ? "Default" : "Loading Tracks...")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.settingItem} onPress={() => {
                                if (subtitleTracks.length > 0) {
                                    const tracksWithOff = [{ id: -1, name: 'Off' }, ...subtitleTracks];
                                    const currentIdx = tracksWithOff.findIndex(t => t.id === subtitleTrack);
                                    const nextIdx = (currentIdx + 1) % tracksWithOff.length;
                                    setSubtitleTrack(tracksWithOff[nextIdx].id);
                                } else {
                                    setSubtitleTrack(prev => (prev >= 10 ? -1 : prev + 1));
                                }
                            }}>
                                <Text style={styles.settingLabel}>Subtitles</Text>
                                <Text style={styles.settingValue}>
                                    {subtitleTrack === -1 ? 'Off' : (subtitleTracks.find(t => t.id === subtitleTrack)?.name || "Loading Tracks...")}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.secondaryButton, { marginTop: 20 }]} onPress={() => setIsSettingsOpen(false)}>
                                <Text style={[styles.secondaryButtonText, { textAlign: 'center' }]}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
};
