'use client';

import { useState } from 'react';

interface MoodChipProps {
    label: string;
    emoji?: string;
    selected?: boolean;
    onToggle?: (selected: boolean) => void;
}

export default function MoodChip({ label, emoji, selected = false, onToggle }: MoodChipProps) {
    const [isSelected, setIsSelected] = useState(selected);

    const handleClick = () => {
        const newState = !isSelected;
        setIsSelected(newState);
        onToggle?.(newState);
    };

    return (
        <button
            onClick={handleClick}
            className="transition-all duration-200"
            style={{
                padding: 'clamp(0.35rem, 1.5vw, 0.625rem) clamp(0.6rem, 2vw, 1.5rem)',
                borderRadius: '9999px',
                fontSize: 'clamp(0.7rem, 2vw, 0.9375rem)',
                fontWeight: '500',
                border: isSelected ? '2px solid #D4AF37' : '2px solid #A7ABB4',
                background: isSelected
                    ? 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)'
                    : 'transparent',
                color: isSelected ? '#0B0B0D' : '#A7ABB4',
                cursor: 'pointer',
                transform: 'scale(1)',
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = '#F3F4F6';
                    e.currentTarget.style.color = '#F3F4F6';
                }
                e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = '#A7ABB4';
                    e.currentTarget.style.color = '#A7ABB4';
                }
                e.currentTarget.style.transform = 'scale(1)';
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {emoji && <span>{emoji}</span>}
                {label}
            </span>
        </button>
    );
}
