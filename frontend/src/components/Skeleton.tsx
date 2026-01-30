'use client';

import { useState, useEffect } from 'react';

export default function Skeleton({
    width = '100%',
    height = '1rem',
    borderRadius = '0.5rem',
    className = ''
}: {
    width?: string;
    height?: string;
    borderRadius?: string;
    className?: string;
}) {
    return (
        <div
            className={`loading-shimmer ${className}`}
            style={{
                width,
                height,
                borderRadius,
                backgroundColor: 'rgba(167, 171, 180, 0.1)',
                display: 'block'
            }}
        />
    );
}

function PulsingLogo({ size = 80 }: { size?: number }) {
    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            zIndex: 10,
            animation: 'pulse-logo 2s infinite ease-in-out',
            pointerEvents: 'none',
        }}>
            <img
                src="/logo.png"
                alt="Logo"
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: `${size / 4}px`,
                    boxShadow: `0 0 ${size / 2}px rgba(212, 175, 55, 0.3)`,
                    objectFit: 'contain'
                }}
            />
        </div>
    );
}

export function HeroSkeleton() {
    return (
        <div
            style={{
                borderRadius: '1.5rem',
                background: '#0B0B0D',
                border: '1px solid rgba(167, 171, 180, 0.1)',
                minHeight: '400px',
                padding: 'clamp(1.5rem, 5vw, 3rem)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <PulsingLogo size={80} />
            <div style={{
                position: 'relative',
                zIndex: 1,
                paddingTop: '8rem',
                filter: 'blur(8px)',
                opacity: 0.4
            }}>
                <Skeleton width="120px" height="1.5rem" borderRadius="9999px" className="mb-4" />
                <Skeleton width="60%" height="3.5rem" className="mb-4" />
                <Skeleton width="200px" height="1.5rem" className="mb-6" />

                <div style={{
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    background: 'rgba(11, 11, 13, 0.6)',
                    border: '1px solid rgba(167, 171, 180, 0.2)',
                    marginBottom: '2rem'
                }}>
                    <Skeleton width="150px" height="0.875rem" className="mb-3" />
                    <Skeleton width="100%" height="1rem" className="mb-2" />
                    <Skeleton width="90%" height="1rem" className="mb-2" />
                    <Skeleton width="95%" height="1rem" />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Skeleton width="150px" height="3rem" borderRadius="9999px" />
                    <Skeleton width="150px" height="3rem" borderRadius="9999px" />
                </div>
            </div>
        </div>
    );
}

export function TileSkeleton() {
    return (
        <div style={{
            width: '100%',
            aspectRatio: '2/3',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            background: 'rgba(11, 11, 13, 0.5)',
            position: 'relative'
        }}>
            <PulsingLogo size={40} />
            <div style={{ width: '100%', height: '100%', filter: 'blur(4px)', opacity: 0.3 }}>
                <Skeleton width="100%" height="100%" borderRadius="0" />
            </div>
        </div>
    );
}
