'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonSecondaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    fullWidth?: boolean;
}

export default function ButtonSecondary({
    children,
    fullWidth = false,
    className = '',
    ...props
}: ButtonSecondaryProps) {
    return (
        <button
            className={`rounded-full font-semibold transition-all duration-300 ${fullWidth ? 'w-full' : ''} ${className}`}
            style={{
                background: 'transparent',
                color: '#A7ABB4',
                padding: '1rem 2.5rem',
                fontSize: '1.125rem',
                border: '2px solid #A7ABB4',
                cursor: 'pointer',
                transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = '#F3F4F6';
                e.currentTarget.style.color = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#A7ABB4';
                e.currentTarget.style.color = '#A7ABB4';
            }}
            {...props}
        >
            {children}
        </button>
    );
}
