'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { AlertTriangle, Smartphone, Monitor } from 'lucide-react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface VideoPlayerProps {
    src: string;
    assetId?: string;  // Asset ID for fetching signed auth
    poster?: string;
    onReady?: (player: any) => void;
    title?: string;
    enableWatchTracking?: boolean;
}

export default function VideoPlayer({ src, assetId, poster, onReady, title, enableWatchTracking = true }: VideoPlayerProps) {
    const playerRef = useRef<any>(null);
    const lastReportRef = useRef<{ time: number; sentAt: number }>({ time: 0, sentAt: 0 });
    const [error, setError] = useState<string | null>(null);
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [playbackType, setPlaybackType] = useState<'mp4' | 'hls'>('mp4');
    const [isLoading, setIsLoading] = useState(true);
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const touch = window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
        setIsTouch(Boolean(touch));
    }, []);

    // Fetch signed playback credentials if assetId provided
    useEffect(() => {
        if (assetId) {
            const fetchSignedAuth = async () => {
                try {
                    const response = await fetch(`/api/watch/start`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ assetId }),
                    });

                    if (!response.ok) {
                        setPlaybackUrl(src);
                        setIsLoading(false);
                        return;
                    }

                    const data = await response.json();
                    setPlaybackType(data.playbackType);
                    setPlaybackUrl(data.playbackUrl);
                    setIsLoading(false);
                } catch {
                    setPlaybackUrl(src);
                    setIsLoading(false);
                }
            };

            fetchSignedAuth();
        } else {
            setPlaybackUrl(src);
            setIsLoading(false);
        }
    }, [assetId, src]);

    const handleWatchProgress = async (force: boolean) => {
        if (!enableWatchTracking || !assetId) return;
        const player = playerRef.current;
        if (!player) return;
        const duration = player.duration || 0;
        const current = player.currentTime || 0;
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

    const handleError = useMemo(() => {
        return () => {
            setError('This video format may not be supported by your browser. Try opening with VLC or the mobile app.');
        };
    }, []);

    if (error) {
        return (
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
        );
    }

    if (isLoading || !playbackUrl) {
        return <div className="aspect-video bg-[#0B0B0D] rounded-2xl" />;
    }

    return (
        <div data-vds-player className="relative">
            <MediaPlayer
                ref={playerRef}
                src={playbackUrl}
                poster={poster}
                autoplay={!isTouch}
                playsInline={!isTouch}
                controls={isTouch}
                onCanPlay={() => onReady && onReady(playerRef.current)}
                onTimeUpdate={() => handleWatchProgress(false)}
                onPlay={() => handleWatchProgress(true)}
                onPause={() => handleWatchProgress(true)}
                onEnded={() => handleWatchProgress(true)}
                onError={handleError}
                style={{ width: '100%', height: '100%' }}
            >
                <MediaProvider />
                <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
            <style jsx global>{`
                .vds-media-player {
                    border-radius: 12px;
                    overflow: hidden;
                    background: #000;
                }
                .vds-video-layout {
                    border-radius: 12px;
                    overflow: hidden;
                }
                .vds-video-layout .vds-controls {
                    background: linear-gradient(180deg, rgba(11, 11, 13, 0) 0%, rgba(11, 11, 13, 0.75) 70%);
                }
            `}</style>
        </div>
    );
}
