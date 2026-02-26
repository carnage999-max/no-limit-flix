'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface TrailerModalProps {
    videoUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function TrailerModal({ videoUrl, isOpen, onClose }: TrailerModalProps) {
    // Extract video ID from YouTube URL
    const videoId = videoUrl.split('v=')[1]?.split('&')[0];

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !videoId) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(10px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '1200px',
                    aspectRatio: '16/9',
                    position: 'relative',
                    background: '#000',
                    borderRadius: '1rem',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '-3rem',
                        right: '0',
                        background: 'transparent',
                        border: 'none',
                        color: '#FFF',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '1rem',
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <X className="w-4 h-4" />
                        Close
                    </span>
                </button>
                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
}
