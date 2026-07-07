'use client';

import type { ReactNode } from 'react';

interface ShellPageHeaderProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export default function ShellPageHeader({
    eyebrow,
    title,
    subtitle,
    actions,
}: ShellPageHeaderProps) {
    return (
        <header className="shell-page-header">
            <div className="shell-page-header__copy">
                {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
                <h1 className="shell-page-title">{title}</h1>
                {subtitle ? <p className="shell-page-subtitle">{subtitle}</p> : null}
            </div>
            {actions ? <div className="shell-page-actions">{actions}</div> : null}
        </header>
    );
}
