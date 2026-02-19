import React from 'react';

type BadgeType = 'Permanent Core' | 'Long-Term' | 'Licensed';

interface PermanenceBadgeProps {
    type?: BadgeType;
}

const BADGE_CONFIG: Record<BadgeType, { color: string; bg: string; border: string }> = {
    'Permanent Core': {
        color: '#D4AF37',
        bg: 'rgba(212, 175, 55, 0.1)',
        border: '1px solid rgba(212, 175, 55, 0.4)'
    },
    'Long-Term': {
        color: '#A7ABB4',
        bg: 'rgba(167, 171, 180, 0.1)',
        border: '1px solid rgba(167, 171, 180, 0.3)'
    },
    'Licensed': {
        color: '#8B5CF6',
        bg: 'rgba(139, 92, 246, 0.1)',
        border: '1px solid rgba(139, 92, 246, 0.3)'
    }
};

export default function PermanenceBadge({ type = 'Permanent Core' }: PermanenceBadgeProps) {
    const config = BADGE_CONFIG[type];

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '100px',
            background: config.bg,
            border: config.border,
            color: config.color,
            fontSize: '10px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: config.color,
                boxShadow: `0 0 8px ${config.color}`
            }} />
            {type}
        </div>
    );
}
