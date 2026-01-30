'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonPrimaryProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    fullWidth?: boolean;
}

export default function ButtonPrimary({
    children,
    fullWidth = false,
    className = '',
    ...props
}: ButtonPrimaryProps) {
    return (
        <button
            className={`rounded-full font-semibold transition-all duration-300 ${fullWidth ? 'w-full' : ''} ${className}`}
            style={{
                background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                color: '#0B0B0D',
                padding: '1rem 2.5rem',
                fontSize: '1.125rem',
                border: 'none',
                cursor: 'pointer',
                transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(246, 211, 101, 0.3)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
            {...props}
        >
            {children}
        </button>
    );
}
