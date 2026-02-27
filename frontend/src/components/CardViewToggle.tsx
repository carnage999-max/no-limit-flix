'use client';

import { Grid2X2, LayoutGrid, RectangleHorizontal } from 'lucide-react';
import { useCardView, CardViewSize } from '@/context/CardViewContext';

const options: Array<{ value: CardViewSize; label: string; icon: typeof Grid2X2 }> = [
    { value: 'compact', label: 'Compact', icon: Grid2X2 },
    { value: 'standard', label: 'Standard', icon: LayoutGrid },
    { value: 'large', label: 'Large', icon: RectangleHorizontal },
];

export default function CardViewToggle() {
    const { viewSize, setViewSize } = useCardView();

    return (
        <div
            role="group"
            aria-label="Card size"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem',
                borderRadius: '999px',
                background: 'rgba(167, 171, 180, 0.08)',
                border: '1px solid rgba(167, 171, 180, 0.18)',
            }}
        >
            {options.map((option) => {
                const Icon = option.icon;
                const isActive = viewSize === option.value;

                return (
                    <button
                        key={option.value}
                        onClick={() => setViewSize(option.value)}
                        aria-pressed={isActive}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '999px',
                            border: 'none',
                            cursor: 'pointer',
                            background: isActive
                                ? 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)'
                                : 'transparent',
                            color: isActive ? '#0B0B0D' : '#A7ABB4',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Icon size={14} aria-hidden="true" />
                        <span>{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
