type PermanenceType = 'Permanent Core' | 'Long-Term' | 'Licensed';

interface PermanenceBadgeProps {
    type: PermanenceType;
}

const badgeStyles: Record<PermanenceType, { bg: string; color: string; border: string }> = {
    'Permanent Core': {
        bg: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
        color: '#0B0B0D',
        border: 'none',
    },
    'Long-Term': {
        bg: 'transparent',
        color: '#3B82F6',
        border: '1px solid #3B82F6',
    },
    'Licensed': {
        bg: 'transparent',
        color: '#A7ABB4',
        border: '1px solid #A7ABB4',
    },
};

export default function PermanenceBadge({ type }: PermanenceBadgeProps) {
    const style = badgeStyles[type];

    return (
        <span
            className="inline-block"
            style={{
                padding: '0.375rem 0.875rem',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: style.bg,
                color: style.color,
                border: style.border,
            }}
        >
            {type}
        </span>
    );
}
