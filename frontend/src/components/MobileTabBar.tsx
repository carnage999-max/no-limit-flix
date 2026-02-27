'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Clapperboard, Layers, Search, Bookmark, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
        href: '/?tab=discovery&mode=title',
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
    const { user, isLoading } = useAuth();

    const isHiddenRoute = getIsHiddenRoute(pathname || '');
    const [isSearchTab, setIsSearchTab] = useState(false);
    const shouldRender = !isLoading && Boolean(user) && !isHiddenRoute;

    useEffect(() => {
        const updateSearchTab = () => {
            if (typeof window === 'undefined') return;
            const params = new URLSearchParams(window.location.search);
            setIsSearchTab(pathname === '/' && params.get('tab') === 'discovery');
        };

        if (typeof window === 'undefined') return;

        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const dispatchLocationChange = () => window.dispatchEvent(new Event('locationchange'));

        history.pushState = function (...args) {
            const result = originalPushState.apply(this, args as any);
            dispatchLocationChange();
            return result;
        };

        history.replaceState = function (...args) {
            const result = originalReplaceState.apply(this, args as any);
            dispatchLocationChange();
            return result;
        };

        updateSearchTab();

        window.addEventListener('popstate', updateSearchTab);
        window.addEventListener('locationchange', updateSearchTab);

        return () => {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', updateSearchTab);
            window.removeEventListener('locationchange', updateSearchTab);
        };
    }, [pathname]);

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
        <div
            className="mobile-tabbar"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                zIndex: 5000,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'auto',
                bottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
        >
            <nav aria-label="Primary" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div
                    style={{
                        width: 'min(560px, calc(100% - 20px))',
                        height: '72px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px',
                        borderRadius: '36px',
                        background: 'rgba(11, 11, 13, 0.98)',
                        border: '1px solid rgba(167, 171, 180, 0.15)',
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 14px 30px rgba(212, 175, 55, 0.18)',
                    }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = (() => {
                            if (tab.key === 'home') return pathname === '/' && !isSearchTab;
                            if (tab.key === 'search') return isSearchTab;
                            if (tab.key === 'collections') return pathname.startsWith('/collections');
                            if (tab.key === 'library') return pathname.startsWith('/account/favorites');
                            if (tab.key === 'settings') {
                                return pathname.startsWith('/settings') || pathname.startsWith('/about') || pathname.startsWith('/privacy') || pathname.startsWith('/terms');
                            }
                            return false;
                        })();

                        return (
                            <Link
                                key={tab.key}
                                href={tab.href}
                                aria-current={isActive ? 'page' : undefined}
                                aria-label={tab.label}
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none',
                                    position: 'relative',
                                    color: isActive ? '#0B0B0D' : '#A7ABB4',
                                }}
                            >
                                <span
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                    }}
                                >
                                    <span
                                        style={{
                                            position: 'absolute',
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '22px',
                                            background: 'linear-gradient(135deg, #F6D365 0%, #D4AF37 50%, #B8860B 100%)',
                                            opacity: isActive ? 1 : 0,
                                            transform: `translateY(-12px) scale(${isActive ? 1 : 0.6})`,
                                            transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: '0 10px 20px rgba(212, 175, 55, 0.35)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            position: 'relative',
                                            transform: `translateY(${isActive ? '-8px' : '0px'}) scale(${isActive ? 1.08 : 1})`,
                                            transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                                            opacity: isActive ? 1 : 0.6,
                                        }}
                                    >
                                        <Icon size={22} color={isActive ? '#0B0B0D' : '#A7ABB4'} aria-hidden="true" />
                                    </span>
                                    <span
                                        style={{
                                            position: 'absolute',
                                            bottom: '6px',
                                            fontSize: '8.5px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            color: '#D4AF37',
                                            opacity: isActive ? 1 : 0,
                                            transform: `translateY(${isActive ? '-2px' : '4px'})`,
                                            transition: 'all 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                                            textAlign: 'center',
                                            width: '90%',
                                        }}
                                    >
                                        {tab.label}
                                    </span>
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
