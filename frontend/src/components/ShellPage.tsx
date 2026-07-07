'use client';

import type { ReactNode } from 'react';

interface ShellPageProps {
    children: ReactNode;
    width?: 'default' | 'wide' | 'narrow';
    className?: string;
}

const widthClassMap = {
    default: 'app-shell-width-default',
    wide: 'app-shell-width-wide',
    narrow: 'app-shell-width-narrow',
} as const;

export default function ShellPage({
    children,
    width = 'default',
    className = '',
}: ShellPageProps) {
    const classes = ['app-shell-page', className].filter(Boolean).join(' ');

    return (
        <main className={classes}>
            <div className={`app-shell-page__inner ${widthClassMap[width]}`}>
                {children}
            </div>
        </main>
    );
}
