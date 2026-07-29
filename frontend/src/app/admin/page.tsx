'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    BarChart3,
    Clapperboard,
    FilePenLine,
    Gauge,
    Import,
    Settings,
    Upload,
    Users,
} from 'lucide-react';
import { useSession } from '@/context/SessionContext';

interface AdminDashboardData {
    stats: {
        totalMovies: number;
        totalUsers: number;
        totalViews: number;
        completedViews: number;
        completionRate: number;
        totalMinutesWatched: number;
    };
    moviePerformance: Array<{
        videoId: string;
        title: string;
        genre?: string | null;
        releaseYear?: number | null;
        watchCount: number;
        completedCount: number;
        avgCompletion: number;
        minutesWatched: number;
    }>;
}

const actionLinks = [
    { href: '/admin/upload', label: 'Upload movies', icon: Upload },
    { href: '/admin/import', label: 'Import movies', icon: Import },
    { href: '/account/dashboard', label: 'Full analytics', icon: BarChart3 },
    { href: '/admin/settings', label: 'Admin settings', icon: Settings },
    { href: '/admin/edit', label: 'Edit metadata', icon: FilePenLine },
];

export default function AdminDashboardPage() {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSession();
    const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth?redirect=/admin');
            return;
        }
        if (user.role !== 'admin') {
            router.push('/');
            return;
        }

        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await fetch('/api/admin/dashboard?limit=20', { cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Dashboard data could not be loaded.');
                }
                const data = await response.json();
                setDashboard(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Dashboard data could not be loaded.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, [router, sessionLoading, user]);

    if (sessionLoading || !user || user.role !== 'admin') return null;

    const stats = dashboard?.stats;
    const statCards = [
        { label: 'Completed movies', value: stats?.totalMovies ?? 0, note: 'Ready to stream', icon: Clapperboard },
        { label: 'Users', value: stats?.totalUsers ?? 0, note: 'Registered accounts', icon: Users },
        { label: 'Views', value: stats?.totalViews ?? 0, note: `${stats?.completedViews ?? 0} completed`, icon: BarChart3 },
        { label: 'Completion', value: `${stats?.completionRate ?? 0}%`, note: `${stats?.totalMinutesWatched ?? 0} minutes watched`, icon: Gauge },
    ];

    return (
        <main style={{ minHeight: '100vh', background: '#0B0B0D', padding: '96px clamp(1rem, 4vw, 2rem) 5rem' }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <p style={{ color: '#D4AF37', fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                        Admin
                    </p>
                    <h1 style={{ color: '#F3F4F6', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 780, lineHeight: 1.05, marginTop: '0.45rem' }}>
                        Operations Dashboard
                    </h1>
                    <p style={{ color: '#A7ABB4', marginTop: '0.6rem' }}>
                        Library health, management shortcuts, and movie performance.
                    </p>
                </header>

                {error ? (
                    <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.08)', color: '#FCA5A5', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                ) : null}

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.4rem' }}>
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} style={{ border: '1px solid rgba(167, 171, 180, 0.13)', borderRadius: '0.75rem', background: 'rgba(18, 18, 24, 0.72)', padding: '1.15rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                    <span style={{ color: '#A7ABB4', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{card.label}</span>
                                    <Icon className="w-4 h-4" style={{ color: '#D4AF37' }} />
                                </div>
                                <div style={{ color: '#F3F4F6', fontSize: '2rem', fontWeight: 800, marginTop: '0.7rem' }}>
                                    {loading ? '...' : card.value}
                                </div>
                                <p style={{ color: '#A7ABB4', fontSize: '0.85rem', marginTop: '0.2rem' }}>{card.note}</p>
                            </div>
                        );
                    })}
                </section>

                <nav aria-label="Admin management" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 0 1.5rem', borderTop: '1px solid rgba(167, 171, 180, 0.12)', borderBottom: '1px solid rgba(167, 171, 180, 0.12)', marginBottom: '1.5rem' }}>
                    {actionLinks.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link key={action.href} href={action.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', minHeight: '42px', padding: '0.68rem 0.9rem', borderRadius: '999px', border: '1px solid rgba(212, 175, 55, 0.28)', background: 'rgba(212, 175, 55, 0.1)', color: '#F6D365', textDecoration: 'none', fontWeight: 800, fontSize: '0.9rem' }}>
                                <Icon className="w-4 h-4" />
                                {action.label}
                            </Link>
                        );
                    })}
                </nav>

                <section>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                        <h2 style={{ color: '#F3F4F6', fontSize: '1.2rem', fontWeight: 800 }}>Movie Performance</h2>
                        <span style={{ color: '#A7ABB4', fontSize: '0.85rem' }}>Top 20 by views</span>
                    </div>

                    <div style={{ overflowX: 'auto', border: '1px solid rgba(167, 171, 180, 0.13)', borderRadius: '0.75rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px', background: 'rgba(18, 18, 24, 0.58)' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(167, 171, 180, 0.14)' }}>
                                    {['Movie', 'Category', 'Year', 'Views', 'Completed', 'Avg completion', 'Minutes'].map((header) => (
                                        <th key={header} style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#A7ABB4', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(dashboard?.moviePerformance || []).map((movie) => (
                                    <tr key={movie.videoId} style={{ borderBottom: '1px solid rgba(167, 171, 180, 0.08)' }}>
                                        <td style={{ padding: '0.85rem 1rem', color: '#F3F4F6', fontWeight: 700 }}>{movie.title}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#A7ABB4' }}>{movie.genre || 'Uncategorized'}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#A7ABB4' }}>{movie.releaseYear || '-'}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#F3F4F6' }}>{movie.watchCount}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#F3F4F6' }}>{movie.completedCount}</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#F3F4F6' }}>{movie.avgCompletion}%</td>
                                        <td style={{ padding: '0.85rem 1rem', color: '#F3F4F6' }}>{movie.minutesWatched}</td>
                                    </tr>
                                ))}
                                {!loading && (!dashboard?.moviePerformance || dashboard.moviePerformance.length === 0) ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#A7ABB4' }}>
                                            No movie performance data yet.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </main>
    );
}
