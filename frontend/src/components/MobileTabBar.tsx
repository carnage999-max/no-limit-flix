'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Clapperboard, Layers, Search, Bookmark, Settings } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

const tabs = [
    {
        key: 'home',
        label: 'Home',
        href: '/',
        icon: Clapperboard,
    },
    {
        key: 'collections',
        label: 'Collections',
        href: '/collections',
        icon: Layers,
    },
    {
        key: 'search',
        label: 'Search',
        href: '/search',
        icon: Search,
    },
    {
        key: 'library',
        label: 'Library',
        href: '/account/favorites',
        icon: Bookmark,
    },
    {
        key: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
    },
];

const hiddenPrefixes = [
    '/auth',
    '/admin',
    '/watch',
    '/title',
    '/series',
    '/collection',
];

const getIsHiddenRoute = (pathname: string) => {
    return hiddenPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export default function MobileTabBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user, loading: isLoading } = useSession();

    const isHiddenRoute = getIsHiddenRoute(pathname || '');
    const isSearchTab = pathname === '/search' || (pathname === '/' && searchParams?.get('tab') === 'discovery');
    const shouldRender = !isLoading && Boolean(user) && !isHiddenRoute;

    useEffect(() => {
        if (!shouldRender) {
            document.body.classList.remove('has-mobile-tabbar');
            return;
        }

        document.body.classList.add('has-mobile-tabbar');
        return () => {
            document.body.classList.remove('has-mobile-tabbar');
        };
    }, [shouldRender]);

    if (!shouldRender) return null;

    return (
        <div className="mobile-tabbar">
            <nav aria-label="Primary" className="app-bottom-dock">
                <div className="app-bottom-dock__nav">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = (() => {
                            if (tab.key === 'home') return pathname === '/' && !isSearchTab;
                            if (tab.key === 'search') return isSearchTab;
                            if (tab.key === 'collections') return pathname.startsWith('/collections');
                            if (tab.key === 'library') return pathname.startsWith('/account/favorites');
                            if (tab.key === 'settings') {
                                return pathname.startsWith('/settings') || pathname.startsWith('/about') || pathname.startsWith('/privacy') || pathname.startsWith('/terms') || pathname.startsWith('/support') || pathname.startsWith('/account/billing');
                            }
                            return false;
                        })();

                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={tab.label}
                                className={isActive ? 'dock-item dock-item--active' : 'dock-item'}
                            >
                                <Icon size={20} aria-hidden="true" />
                                <span>{tab.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
