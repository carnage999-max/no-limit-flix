'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import HlsJs from 'hls.js';
import { AlertTriangle, Smartphone, Monitor, Play, Pause } from 'lucide-react';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
    src: string;
    assetId?: string;  // Asset ID for fetching signed auth
    poster?: string;
    onReady?: (player: any) => void;
    title?: string;
    enableWatchTracking?: boolean;
}

export default function VideoPlayer({ src, assetId, poster, onReady, title, enableWatchTracking = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const lastReportRef = useRef<{ time: number; sentAt: number }>({ time: 0, sentAt: 0 });
    const trackingCleanupRef = useRef<null | (() => void)>(null);
    const controlsCleanupRef = useRef<null | (() => void)>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [playbackType, setPlaybackType] = useState<'mp4' | 'hls'>('mp4');
    const [isLoading, setIsLoading] = useState(true);

    // Fetch signed playback credentials if assetId provided
    useEffect(() => {
        if (assetId) {
            const fetchSignedAuth = async () => {
                try {
                    console.log(`[VideoPlayer] Fetching signed auth for assetId: ${assetId}`);
                    const response = await fetch(`/api/watch/start`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ assetId }),
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        console.warn('[VideoPlayer] /api/watch/start failed, using direct URL:', err.error);
                        // Fallback to direct URL
                        setPlaybackUrl(src);
                        setIsLoading(false);
                        return;
                    }

                    const data = await response.json();
                    console.log(`[VideoPlayer] Playback type: ${data.playbackType}, expires: ${data.expiresAt}`);

                    setPlaybackType(data.playbackType);
                    setPlaybackUrl(data.playbackUrl);
                    setIsLoading(false);
                } catch (err) {
                    console.error('[VideoPlayer] Failed to fetch signed auth:', err);
                    console.log('[VideoPlayer] Falling back to direct URL');
                    // Fallback to direct URL on error
                    setPlaybackUrl(src);
                    setIsLoading(false);
                }
            };

            fetchSignedAuth();
        } else {
            // Fallback to direct URL if no assetId (legacy support)
            setPlaybackUrl(src);
            setIsLoading(false);
        }
    }, [assetId, src]);

    useEffect(() => {
        // Make sure Video.js player is only initialized once
        if (!playerRef.current && videoRef.current && playbackUrl && !isLoading) {
            const videoElement = document.createElement("video-js");

            videoElement.classList.add('vjs-big-play-centered');
            videoElement.classList.add('vjs-no-limit-theme');
            videoElement.classList.add('vjs-default-skin');
            videoElement.setAttribute('playsinline', 'playsinline');
            videoElement.setAttribute('webkit-playsinline', 'webkit-playsinline');
            videoRef.current.appendChild(videoElement);

            const sourceType = playbackUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';

            const player = playerRef.current = videojs(videoElement, {
                autoplay: true,
                controls: true,
                responsive: true,
                fluid: true,
                inactivityTimeout: 0,
                userActions: {
                    doubleClick: false,
                },
                sources: [{
                    src: playbackUrl,
                    type: sourceType
                }],
                poster: poster,
                playbackRates: [0.5, 1, 1.25, 1.5, 2],
                playsinline: true,
                html5: {
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false,
                    nativeControlsForTouch: true
                }
            }, () => {
                onReady && onReady(player);
            });

            // Ensure controls are visible on hover/click
            const keepControlsVisible = () => {
                if (!player) return;
                player.userActive(true);
                player.controls(true);
                player.controlBar?.show();
            };

            player.ready(() => {
                keepControlsVisible();
                setDuration(player.duration?.() || 0);
                setCurrentTime(player.currentTime?.() || 0);
                setIsPlaying(!player.paused());
                const rootEl = player.el();
                if (rootEl) {
                    rootEl.addEventListener('mousemove', keepControlsVisible);
                    rootEl.addEventListener('mouseenter', keepControlsVisible);
                    rootEl.addEventListener('click', keepControlsVisible);
                    rootEl.addEventListener('touchstart', keepControlsVisible);
                    controlsCleanupRef.current = () => {
                        rootEl.removeEventListener('mousemove', keepControlsVisible);
                        rootEl.removeEventListener('mouseenter', keepControlsVisible);
                        rootEl.removeEventListener('click', keepControlsVisible);
                        rootEl.removeEventListener('touchstart', keepControlsVisible);
                    };
                }
            });

            const sendWatchProgress = async (force = false, completed = false) => {
                if (!enableWatchTracking || !assetId) return;
                const duration = player.duration?.() || 0;
                const current = player.currentTime?.() || 0;
                if (!duration || !Number.isFinite(duration)) return;

                const now = Date.now();
                const last = lastReportRef.current;
                const delta = Math.abs(current - last.time);
                const timeSince = now - last.sentAt;

                if (!force && delta < 15 && timeSince < 15000) {
                    return;
                }

                lastReportRef.current = { time: current, sentAt: now };

                try {
                    await fetch('/api/watch-history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            videoId: assetId,
                            watchedDuration: Math.floor(current),
                            totalDuration: Math.floor(duration),
                            title,
                            poster
                        }),
                    });
                } catch {
                    // ignore tracking failures
                }
            };

            const handleTimeUpdate = () => sendWatchProgress(false, false);
            const handlePlay = () => sendWatchProgress(true, false);
            const handlePause = () => sendWatchProgress(true, false);
            const handleEnded = () => sendWatchProgress(true, true);
            const handleVisibility = () => {
                if (document.hidden) {
                    sendWatchProgress(true, false);
                }
            };

            if (enableWatchTracking && assetId) {
                player.on('timeupdate', handleTimeUpdate);
                player.on('play', handlePlay);
                player.on('pause', handlePause);
                player.on('ended', handleEnded);
                document.addEventListener('visibilitychange', handleVisibility);

                trackingCleanupRef.current = () => {
                    player.off('timeupdate', handleTimeUpdate);
                    player.off('play', handlePlay);
                    player.off('pause', handlePause);
                    player.off('ended', handleEnded);
                    document.removeEventListener('visibilitychange', handleVisibility);
                };
            }

            // Setup HLS.js for better codec support - wait for player to be ready
            player.ready(() => {
                const videoElement_ = player.tech_.el() as HTMLVideoElement;
                if (HlsJs.isSupported() && playbackUrl.endsWith('.m3u8')) {
                    console.log('[VideoPlayer] HLS.js initializing for HLS stream');
                    const hls = new HlsJs({
                        // Enable debug logging for HLS issues
                        debug: false,
                    });
                    hls.attachMedia(videoElement_);
                    hls.on(HlsJs.Events.MANIFEST_PARSED, () => {
                        console.log('[VideoPlayer] HLS manifest parsed successfully');
                        videoElement_.play();
                    });
                    hls.on(HlsJs.Events.ERROR, (event, data) => {
                        console.error('[VideoPlayer] HLS.js error:', data);
                        if (data.fatal) {
                            setError(`HLS streaming error: ${data.details || 'Unknown error'}`);
                        }
                    });
                    hls.loadSource(playbackUrl);
                } else if (playbackUrl.endsWith('.m3u8')) {
                    // Fallback for browsers that support native HLS
                    console.log('[VideoPlayer] Using native HLS support');
                    videoElement_.src = playbackUrl;
                }
            });

            player.on('error', () => {
                const err = player.error();
                console.error('[VideoPlayer] VideoJS Error:', err);
                setError(`This video format may not be supported by your browser. Try opening with VLC or the mobile app.`);
            });
            player.on('play', keepControlsVisible);
            player.on('pause', keepControlsVisible);
            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            player.on('timeupdate', () => {
                setCurrentTime(player.currentTime?.() || 0);
                setDuration(player.duration?.() || 0);
            });
            player.on('loadedmetadata', () => {
                setDuration(player.duration?.() || 0);
            });

        }
    }, [playbackUrl, isLoading, videoRef]);

    // Dispose the player on unmount
    useEffect(() => {
        const player = playerRef.current;
        return () => {
            if (trackingCleanupRef.current) {
                trackingCleanupRef.current();
                trackingCleanupRef.current = null;
            }
            if (controlsCleanupRef.current) {
                controlsCleanupRef.current();
                controlsCleanupRef.current = null;
            }
            if (player && !player.isDisposed()) {
                player.dispose();
                playerRef.current = null;
            }
        };
    }, [playerRef]);

    return (
        <div data-vjs-player className="relative">
            {error ? (
                <div className="aspect-video bg-[#0B0B0D] border border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Codec Compatibility Issue</h3>
                    <p className="text-silver mb-8 max-w-md">
                        {error} Browsers often struggle with high-bitrate MKV or HEVC files.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                            <Monitor className="w-6 h-6 text-orange-500" />
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-orange-500 uppercase">Step 1</p>
                                <p className="text-xs text-white">Use the <b>VLC</b> button below</p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center gap-4">
                            <Smartphone className="w-6 h-6 text-gold" />
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-gold uppercase">Step 2</p>
                                <p className="text-xs text-white">Watch on <b>No Limit App</b></p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative">
                    <div ref={videoRef} />
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            pointerEvents: 'none',
                        }}
                    >
                        {!isPlaying && (
                            <button
                                type="button"
                                onClick={() => {
                                    const player = playerRef.current;
                                    if (!player) return;
                                    player.play();
                                }}
                                style={{
                                    pointerEvents: 'auto',
                                    position: 'absolute',
                                    inset: 0,
                                    margin: 'auto',
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    border: '1px solid rgba(212, 175, 55, 0.6)',
                                    background: 'rgba(11, 11, 13, 0.65)',
                                    color: '#D4AF37',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                                }}
                                aria-label="Play"
                            >
                                <Play className="w-6 h-6" />
                            </button>
                        )}
                        <div
                            style={{
                                pointerEvents: 'auto',
                                width: '100%',
                                padding: '0.75rem',
                                background: 'linear-gradient(180deg, rgba(11,11,13,0) 0%, rgba(11,11,13,0.75) 70%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                flexWrap: 'nowrap',
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    const player = playerRef.current;
                                    if (!player) return;
                                    if (player.paused()) {
                                        player.play();
                                    } else {
                                        player.pause();
                                    }
                                }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '999px',
                                    border: '1px solid rgba(212, 175, 55, 0.4)',
                                    background: 'rgba(11, 11, 13, 0.7)',
                                    color: '#D4AF37',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                                aria-label={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const player = playerRef.current;
                                    if (!player) return;
                                    const next = Math.max(0, (player.currentTime?.() || 0) - 10);
                                    player.currentTime(next);
                                    setCurrentTime(next);
                                }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '999px',
                                    border: '1px solid rgba(212, 175, 55, 0.4)',
                                    background: 'rgba(11, 11, 13, 0.7)',
                                    color: '#D4AF37',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                                aria-label="Back 10 seconds"
                            >
                                -10
                            </button>
                            <input
                                type="range"
                                min={0}
                                max={duration || 0}
                                value={Math.min(currentTime, duration || 0)}
                                onChange={(e) => {
                                    const player = playerRef.current;
                                    if (!player) return;
                                    const next = Number(e.target.value);
                                    player.currentTime(next);
                                    setCurrentTime(next);
                                }}
                                style={{
                                    flex: 1,
                                    minWidth: '80px',
                                    height: '4px',
                                    accentColor: '#D4AF37',
                                }}
                                className="nlf-range"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const player = playerRef.current;
                                    if (!player) return;
                                    const next = Math.min(duration || 0, (player.currentTime?.() || 0) + 10);
                                    player.currentTime(next);
                                    setCurrentTime(next);
                                }}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '999px',
                                    border: '1px solid rgba(212, 175, 55, 0.4)',
                                    background: 'rgba(11, 11, 13, 0.7)',
                                    color: '#D4AF37',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                }}
                                aria-label="Forward 10 seconds"
                            >
                                +10
                            </button>
                            <span style={{ color: '#F3F4F6', fontSize: '0.75rem', minWidth: '60px', textAlign: 'right' }}>
                                {duration ? `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}` : '0:00'}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            <style jsx global>{`
                .vjs-no-limit-theme {
                    --vjs-theme-color: #EAB308; /* COLORS.gold.mid */
                }
                .video-js {
                    border-radius: 12px;
                    overflow: hidden;
                    font-family: inherit;
                }
                .video-js .vjs-control-bar {
                    display: none !important;
                }
                .nlf-range {
                    -webkit-appearance: none;
                    appearance: none;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 999px;
                }
                .nlf-range::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #D4AF37;
                    border: 2px solid rgba(11, 11, 13, 0.6);
                }
                .nlf-range::-moz-range-thumb {
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #D4AF37;
                    border: 2px solid rgba(11, 11, 13, 0.6);
                }
                .video-js .vjs-big-play-button {
                    display: none !important;
                }
                .video-js .vjs-big-play-button {
                    display: none !important;
                }
                .video-js .vjs-control-bar {
                    display: none !important;
                }
                .video-js .vjs-slider {
                    background-color: rgba(255, 255, 255, 0.1) !important;
                }
                .video-js .vjs-play-progress {
                    background-color: #EAB308 !important;
                }
                .video-js .vjs-load-progress div {
                    background-color: rgba(255, 255, 255, 0.2) !important;
                }
                .video-js .vjs-volume-level {
                    background-color: #EAB308 !important;
                }
            `}</style>
        </div>
    );
}
