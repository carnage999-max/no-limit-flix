'use client';

import { Star } from 'lucide-react';
import type { RatingSummary } from '@/types';

type RatingBadgeProps = {
    score?: number | null;
    summary?: RatingSummary | null;
    compact?: boolean;
};

const getDisplayScore = (score?: number | null, summary?: RatingSummary | null) => {
    const value = summary?.finalScore ?? score;
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) return null;
    return Math.min(10, Math.max(0, Number(value)));
};

export default function RatingBadge({ score, summary, compact = false }: RatingBadgeProps) {
    const displayScore = getDisplayScore(score, summary);
    if (displayScore === null) return null;

    const starScore = displayScore / 2;
    const roundedStars = Math.round(starScore);

    return (
        <div
            aria-label={`Rating ${displayScore.toFixed(1)} out of 10`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: compact ? '0.25rem' : '0.35rem',
                minHeight: compact ? '1.45rem' : '1.75rem',
                padding: compact ? '0.15rem 0.35rem' : '0.24rem 0.48rem',
                borderRadius: '0.45rem',
                background: 'rgba(11, 11, 13, 0.78)',
                border: '1px solid rgba(212, 175, 55, 0.36)',
                boxShadow: '0 8px 22px rgba(0, 0, 0, 0.35)',
                color: '#F6D365',
                backdropFilter: 'blur(8px)',
                lineHeight: 1,
            }}
        >
            {!compact && (
                <span style={{ display: 'inline-flex', gap: '1px' }} aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((index) => (
                        <Star
                            key={index}
                            size={10}
                            fill={index <= roundedStars ? '#F6D365' : 'none'}
                            color="#F6D365"
                            strokeWidth={2.4}
                        />
                    ))}
                </span>
            )}
            <span
                style={{
                    color: '#F3F4F6',
                    fontWeight: 800,
                    fontSize: compact ? '0.72rem' : '0.78rem',
                    letterSpacing: 0,
                    whiteSpace: 'nowrap',
                }}
            >
                {displayScore.toFixed(1)}
            </span>
        </div>
    );
}
