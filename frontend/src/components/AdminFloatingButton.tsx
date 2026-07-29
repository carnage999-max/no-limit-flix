'use client';

import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';

export default function AdminFloatingButton() {
    return (
        <Link
            href="/admin"
            aria-label="Open admin dashboard"
            title="Admin dashboard"
            style={{
                position: 'fixed',
                right: '1.5rem',
                bottom: '5.5rem',
                zIndex: 4500,
                width: '3.2rem',
                height: '3.2rem',
                borderRadius: '999px',
                border: '1px solid rgba(212, 175, 55, 0.42)',
                background: 'rgba(11, 11, 13, 0.92)',
                color: '#D4AF37',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 16px 34px rgba(0, 0, 0, 0.48)',
                textDecoration: 'none',
                backdropFilter: 'blur(14px)',
            }}
        >
            <LockKeyhole className="w-5 h-5" />
        </Link>
    );
}
