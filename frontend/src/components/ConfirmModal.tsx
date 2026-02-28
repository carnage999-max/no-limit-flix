'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    tone?: 'default' | 'danger';
}

export default function ConfirmModal({
    open,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    tone = 'default',
}: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement | null>(null);
    const previousActiveRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        previousActiveRef.current = document.activeElement as HTMLElement | null;
        confirmRef.current?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            previousActiveRef.current?.focus();
        };
    }, [open, onCancel]);

    if (!open) return null;

    const confirmStyles = tone === 'danger'
        ? {
            background: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
            color: '#0B0B0D',
        }
        : {
            background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
            color: '#0B0B0D',
        };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby={description ? 'confirm-modal-description' : undefined}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onCancel();
                }
            }}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(11, 11, 13, 0.7)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                zIndex: 999,
            }}
        >
            <div
                onMouseDown={(event) => event.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'rgba(11, 11, 13, 0.98)',
                    borderRadius: '18px',
                    border: '1px solid rgba(167, 171, 180, 0.15)',
                    padding: '1.5rem',
                    boxShadow: '0 28px 80px rgba(0,0,0,0.6)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <span style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: tone === 'danger' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(212, 175, 55, 0.15)',
                        color: tone === 'danger' ? '#FCA5A5' : '#D4AF37',
                        border: tone === 'danger'
                            ? '1px solid rgba(244, 63, 94, 0.35)'
                            : '1px solid rgba(212, 175, 55, 0.35)',
                    }}>
                        <AlertTriangle size={18} />
                    </span>
                    <h2
                        id="confirm-modal-title"
                        style={{
                            margin: 0,
                            color: '#F3F4F6',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                        }}
                    >
                        {title}
                    </h2>
                </div>
                {description && (
                    <p
                        id="confirm-modal-description"
                        style={{
                            margin: '0 0 1.5rem',
                            color: '#A7ABB4',
                            fontSize: '0.95rem',
                            lineHeight: 1.5,
                        }}
                    >
                        {description}
                    </p>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '0.7rem 1.1rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(167, 171, 180, 0.2)',
                            background: 'rgba(167, 171, 180, 0.08)',
                            color: '#F3F4F6',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        onClick={onConfirm}
                        style={{
                            padding: '0.7rem 1.1rem',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 700,
                            ...confirmStyles,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
