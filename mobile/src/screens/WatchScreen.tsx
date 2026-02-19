import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    TouchableWithoutFeedback,
    Animated,
    Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export const WatchScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { videoUrl, title } = route.params || {};

    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(true);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const controlsOpacity = useRef(new Animated.Value(1)).current;
    const hideTimer = useRef<any>(null);

    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = false;
        player.play();
    });

    useEffect(() => {
        console.log('Attempting to play:', videoUrl);

        const subscription = player.addListener('statusChange', (event) => {
            console.log('Player status changed:', event.status);
            if (event.status === 'readyToPlay') {
                setIsBuffering(false);
                if (player.duration > 0) {
                    setDuration(player.duration);
                }
            } else if (event.status === 'loading') {
                setIsBuffering(true);
            } else if (event.status === 'error') {
                setIsBuffering(false);
                // The error details are often in the event object or player
                console.error('Player failed to load video');
            }
        });

        const timeUpdateSub = player.addListener('timeUpdate', (event) => {
            setCurrentTime(event.currentTime);
            if (player.duration > 0 && duration === 0) {
                setDuration(player.duration);
            }
        });

        return () => {
            subscription.remove();
            timeUpdateSub.remove();
        };
    }, [player, duration, videoUrl]);

    const toggleControls = () => {
        if (showControls) {
            hideControls();
        } else {
            showControlsUI();
        }
    };

    const showControlsUI = () => {
        setShowControls(true);
        Animated.timing(controlsOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hideControls, 4000);
    };

    const hideControls = () => {
        Animated.timing(controlsOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowControls(false);
        });
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '00:00';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 && hrs > 0 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSeek = (direction: 'forward' | 'backward') => {
        const seekAmount = 10;
        player.seekBy(direction === 'forward' ? seekAmount : -seekAmount);
        showControlsUI();
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={!showControls} />

            <TouchableWithoutFeedback onPress={toggleControls}>
                <View style={styles.videoContainer}>
                    <VideoView
                        style={styles.video}
                        player={player}
                        allowsFullscreen={false}
                        allowsPictureInPicture={true}
                    />

                    {isBuffering && (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={COLORS.gold.mid} />
                        </View>
                    )}

                    {showControls && (
                        <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]}>
                            <LinearGradient
                                colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.8)']}
                                style={StyleSheet.absoluteFill}
                            />

                            {/* Header */}
                            <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'ios' ? 0 : 20) }]}>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                                </TouchableOpacity>
                                <Text style={styles.videoTitle} numberOfLines={1}>{title || 'Playing Video'}</Text>
                                <View style={{ width: 44 }} />
                            </View>

                            {/* Center Controls */}
                            <View style={styles.centerControls}>
                                <TouchableOpacity onPress={() => handleSeek('backward')} style={styles.controlIconCircle}>
                                    <View>
                                        <Ionicons name="refresh" size={24} color={COLORS.text} />
                                    </View>
                                    <Text style={styles.seekText}>-10</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => player.playing ? player.pause() : player.play()}
                                    style={styles.playPauseButton}
                                >
                                    <Ionicons
                                        name={player.playing ? "pause" : "play"}
                                        size={48}
                                        color={COLORS.gold.mid}
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => handleSeek('forward')} style={styles.controlIconCircle}>
                                    <View style={{ transform: [{ scaleX: -1 }] }}>
                                        <Ionicons name="refresh" size={24} color={COLORS.text} />
                                    </View>
                                    <Text style={styles.seekText}>+10</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Bottom Controls */}
                            <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressFill, { width: `${(currentTime / duration) * 100}%` }]} />
                                    </View>
                                </View>

                                <View style={styles.timeLabelContainer}>
                                    <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
                                    <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </TouchableWithoutFeedback>
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
        width: width,
        height: Platform.OS === 'web' ? '100%' : height,
    },
    loaderContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
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
    centerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 40,
    },
    playPauseButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    controlIconCircle: {
        alignItems: 'center',
        gap: 4,
    },
    seekText: {
        color: COLORS.silver,
        fontSize: 10,
        fontWeight: '700',
    },
    bottomControls: {
        paddingHorizontal: 20,
    },
    progressBarContainer: {
        height: 20,
        justifyContent: 'center',
        marginBottom: 8,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.gold.mid,
    },
    timeLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeLabel: {
        color: COLORS.silver,
        fontSize: 12,
        fontWeight: '600',
    },
});
