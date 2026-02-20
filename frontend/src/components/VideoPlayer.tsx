'use client';

import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import { AlertTriangle, Smartphone, Monitor } from 'lucide-react';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    onReady?: (player: any) => void;
}

export default function VideoPlayer({ src, poster, onReady }: VideoPlayerProps) {
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Make sure Video.js player is only initialized once
        if (!playerRef.current && videoRef.current) {
            const videoElement = document.createElement("video-js");

            videoElement.classList.add('vjs-big-play-centered');
            videoElement.classList.add('vjs-no-limit-theme');
            videoRef.current.appendChild(videoElement);

            const player = playerRef.current = videojs(videoElement, {
                autoplay: true,
                controls: true,
                responsive: true,
                fluid: true,
                sources: [{
                    src: src,
                    type: src.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
                }],
                poster: poster,
                playbackRates: [0.5, 1, 1.25, 1.5, 2]
            }, () => {
                onReady && onReady(player);
            });

            player.on('error', () => {
                const err = player.error();
                console.error('VideoJS Error:', err);
                setError(`This video format may not be supported by your browser.`);
            });
        }
    }, [src, videoRef]);

    // Dispose the player on unmount
    useEffect(() => {
        const player = playerRef.current;
        return () => {
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
