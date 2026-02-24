'use client';

import { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) return null;

    const bgColor = {
        success: 'rgba(74, 222, 128, 0.1)',
        error: 'rgba(248, 113, 113, 0.1)',
        info: 'rgba(212, 175, 55, 0.1)'
    }[type];

    const borderColor = {
        success: 'rgba(74, 222, 128, 0.3)',
        error: 'rgba(248, 113, 113, 0.3)',
        info: 'rgba(212, 175, 55, 0.3)'
    }[type];

    const textColor = {
        success: '#4ADE80',
        error: '#F87171',
        info: '#D4AF37'
    }[type];

    const Icon = {
        success: Check,
        error: AlertCircle,
        info: Check
    }[type];

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                background: bgColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '0.5rem',
                padding: '1rem 1.5rem',
                color: textColor,
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(10px)',
                animation: 'slideIn 0.3s ease-out',
            }}
        >
            <Icon size={20} />
            <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{message}</span>
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}

// Toast manager hook
import { useCallback } from 'react';
import { showGlobalToast } from './ToastContainer';

export function useToast() {
    const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
        showGlobalToast(message, type);
    }, []);

    return { showToast };
}
