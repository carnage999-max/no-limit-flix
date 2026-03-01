'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import HlsJs from 'hls.js';
import { AlertTriangle, Smartphone, Monitor } from 'lucide-react';
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
            videoRef.current.appendChild(videoElement);

            const sourceType = playbackUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';

            const player = playerRef.current = videojs(videoElement, {
                autoplay: true,
                controls: true,
                responsive: true,
                fluid: true,
                sources: [{
                    src: playbackUrl,
                    type: sourceType
                }],
                poster: poster,
                playbackRates: [0.5, 1, 1.25, 1.5, 2],
                html5: {
                    nativeVideoTracks: false,
                    nativeAudioTracks: false,
                    nativeTextTracks: false
                }
            }, () => {
                onReady && onReady(player);
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
                <div ref={videoRef} />
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
                .video-js .vjs-big-play-button {
                    background-color: rgba(234, 179, 8, 0.1) !important;
                    border: 2px solid #EAB308 !important;
                    border-radius: 50% !important;
                    width: 80px !important;
                    height: 80px !important;
                    line-height: 80px !important;
                    margin-top: -40px !important;
                    margin-left: -40px !important;
                }
                .video-js .vjs-big-play-button .vjs-icon-placeholder:before {
                    font-size: 40px !important;
                    color: #EAB308 !important;
                }
                .video-js .vjs-control-bar {
                    background-color: rgba(11, 11, 13, 0.8) !important;
                    backdrop-filter: blur(10px);
                    height: 60px !important;
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
