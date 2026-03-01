'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Film, BarChart3, Heart, TrendingUp } from 'lucide-react';
import { useSession } from '@/context/SessionContext';

interface WatchStat {
    title: string;
    value: number;
    label: string;
    color: string;
}

interface TopMovie {
    videoId: string;
    title: string;
    thumbnailUrl?: string;
    watchCount: number;
    genre?: string;
}

interface GenreStats {
    genre: string;
    count: number;
}

export default function AnalyticsDashboard() {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSession();
    const [stats, setStats] = useState<any>(null);
    const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
    const [activityData, setActivityData] = useState<Array<{ date: string; watches: number }>>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

    useEffect(() => {
        if (sessionLoading) return;
        if (!user) {
            router.push('/auth?redirect=/account/dashboard');
            return;
        }
        if (user.role !== 'admin') {
            router.push('/account/favorites');
            return;
        }
        fetchAnalytics();
    }, [router, user, sessionLoading, page]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const [statsRes, moviesRes, activityRes] = await Promise.all([
                fetch(`/api/analytics?type=watch_stats`),
                fetch(`/api/analytics?type=top_movies&page=${page}&limit=10`),
                fetch(`/api/analytics?type=user_activity`)
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            if (moviesRes.ok) {
                const moviesData = await moviesRes.json();
                setTopMovies(moviesData.topMovies);
            }
            if (activityRes.ok) {
                const activity = await activityRes.json();
                setActivityData(activity.activityData || []);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (sessionLoading) return null;
    if (!user) return null;

    return (
        <main style={{
            minHeight: '100vh',
            background: '#0B0B0D',
            paddingTop: '80px',
            paddingBottom: '4rem'
        }}>
            {/* Header */}
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '3rem 2rem',
                borderBottom: '1px solid rgba(167, 171, 180, 0.1)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '2rem',
                    flexWrap: 'wrap'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                            fontWeight: '700',
                            color: '#F3F4F6',
                            marginBottom: '0.5rem',
                            background: 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Platform Analytics
                        </h1>
                        <p style={{
                            color: '#A7ABB4',
                            fontSize: '1rem'
                        }}>
                            Global viewership trends across the entire audience
                        </p>
                    </div>
                    <Link
                        href="/account/favorites"
                        style={{
                            padding: '0.875rem 1.75rem',
                            background: 'rgba(212, 175, 55, 0.1)',
                            border: '1px solid rgba(212, 175, 55, 0.3)',
                            borderRadius: '0.75rem',
                            color: '#D4AF37',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(212, 175, 55, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(212, 175, 55, 0.1)';
                        }}
                    >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Heart className="w-4 h-4" />
                            Favorites
                        </span>
                    </Link>
                </div>
            </div>

            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 2rem'
            }}>
                {loading ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1.5rem',
                        marginTop: '2rem'
                    }}>
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    height: '150px',
                                    background: 'rgba(167, 171, 180, 0.1)',
                                    borderRadius: '1rem',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}
                            />
                        ))}
                    </div>
                ) : stats ? (
                    <>
                        {/* Stats Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '1.5rem',
                            marginTop: '2rem',
                            marginBottom: '3rem'
                        }} className="analytics-grid">
                            {/* Total Watched */}
                            <div style={{
                                padding: '2rem',
                                borderRadius: '1.25rem',
                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
                                border: '1px solid rgba(212, 175, 55, 0.2)'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#A7ABB4',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem'
                                }}>
                                    Total Views
                                </p>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: '700',
                                    color: '#D4AF37',
                                    marginBottom: '0.5rem'
                                }}>
                                    {stats.totalWatched}
                                </div>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#A7ABB4'
                                }}>
                                    Overall watch sessions
                                </p>
                            </div>

                            {/* Completed */}
                            <div style={{
                                padding: '2rem',
                                borderRadius: '1.25rem',
                                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(74, 222, 128, 0.05) 100%)',
                                border: '1px solid rgba(74, 222, 128, 0.2)'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#A7ABB4',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem'
                                }}>
                                    Completed Views
                                </p>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: '700',
                                    color: '#4ADE80',
                                    marginBottom: '0.5rem'
                                }}>
                                    {stats.completedWatches}
                                </div>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#A7ABB4'
                                }}>
                                    Completion rate: {stats.completionRate}%
                                </p>
                            </div>

                            {/* Minutes Watched */}
                            <div style={{
                                padding: '2rem',
                                borderRadius: '1.25rem',
                                background: 'linear-gradient(135deg, rgba(100, 200, 255, 0.1) 0%, rgba(100, 200, 255, 0.05) 100%)',
                                border: '1px solid rgba(100, 200, 255, 0.2)'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#A7ABB4',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem'
                                }}>
                                    Total Minutes
                                </p>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: '700',
                                    color: '#64C8FF',
                                    marginBottom: '0.5rem'
                                }}>
                                    {stats.totalMinutesWatched}
                                </div>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#A7ABB4'
                                }}>
                                    Hours: {Math.round(stats.totalMinutesWatched / 60)}h
                                </p>
                            </div>

                            {/* Top Genre */}
                            <div style={{
                                padding: '2rem',
                                borderRadius: '1.25rem',
                                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)',
                                border: '1px solid rgba(244, 63, 94, 0.2)'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    color: '#A7ABB4',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginBottom: '0.75rem'
                                }}>
                                    Top Genre
                                </p>
                                <div style={{
                                    fontSize: '2rem',
                                    fontWeight: '700',
                                    color: '#F43F5E',
                                    marginBottom: '0.5rem',
                                    textTransform: 'capitalize'
                                }}>
                                    {stats.topGenres[0]?.genre || 'N/A'}
                                </div>
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#A7ABB4'
                                }}>
                                    {stats.topGenres[0]?.count || 0} watches
                                </p>
                            </div>
                        </div>

                        {activityData.length > 0 && (
                            <div style={{ marginBottom: '3rem' }}>
                                <h2 style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '700',
                                    color: '#F3F4F6',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <TrendingUp className="w-5 h-5" />
                                        Watch Activity (Last 14 Days)
                                    </span>
                                </h2>
                                <div style={{
                                    padding: '1.5rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(167, 171, 180, 0.04)',
                                    border: '1px solid rgba(167, 171, 180, 0.1)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${activityData.length}, minmax(0, 1fr))`,
                                        gap: '0.5rem',
                                        alignItems: 'flex-end',
                                        height: '160px'
                                    }}>
                                        {activityData.map((point) => {
                                            const max = Math.max(...activityData.map((d) => d.watches), 1);
                                            const height = Math.max(8, Math.round((point.watches / max) * 140));
                                            return (
                                                <div key={point.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div
                                                        style={{
                                                            width: '100%',
                                                            borderRadius: '12px',
                                                            background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.9) 0%, rgba(212, 175, 55, 0.3) 100%)',
                                                            height: `${height}px`,
                                                            transition: 'height 0.3s ease'
                                                        }}
                                                        title={`${point.watches} watches`}
                                                    />
                                                    <span style={{ fontSize: '0.65rem', color: '#A7ABB4' }}>
                                                        {point.date.slice(5)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Top Movies Section */}
                        <div style={{
                            marginBottom: '3rem'
                        }}>
                            <h2 style={{
                                fontSize: '1.75rem',
                                fontWeight: '700',
                                color: '#F3F4F6',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Film className="w-5 h-5" />
                                    Most Watched Titles
                                </span>
                            </h2>

                            {topMovies.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gap: '0.9rem'
                                }}>
                                    {topMovies.slice(0, 5).map((movie, idx) => {
                                        const max = Math.max(...topMovies.map((m) => m.watchCount), 1);
                                        const width = Math.max(12, Math.round((movie.watchCount / max) * 100));
                                        return (
                                            <div
                                                key={movie.videoId}
                                                style={{
                                                    position: 'relative',
                                                    borderRadius: '14px',
                                                    border: '1px solid rgba(167, 171, 180, 0.12)',
                                                    background: 'rgba(11, 11, 13, 0.9)',
                                                    padding: '0.75rem 1rem',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: `linear-gradient(90deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.02) ${width}%, transparent ${width}%)`,
                                                    pointerEvents: 'none',
                                                }} />
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '10px',
                                                        background: idx < 3
                                                            ? ['#D4AF37', '#C0C0C0', '#CD7F32'][idx]
                                                            : 'rgba(212, 175, 55, 0.15)',
                                                        color: idx < 3 ? '#0B0B0D' : '#D4AF37',
                                                        fontWeight: 800,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.95rem'
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <img
                                                        src={movie.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400'}
                                                        alt={movie.title}
                                                        style={{
                                                            width: 48,
                                                            height: 64,
                                                            borderRadius: 10,
                                                            objectFit: 'cover',
                                                            border: '1px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontSize: '0.95rem',
                                                            fontWeight: 700,
                                                            color: '#F3F4F6',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {movie.title}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: '#A7ABB4', marginTop: '0.35rem' }}>
                                                            Watched {movie.watchCount} {movie.watchCount === 1 ? 'time' : 'times'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{
                                    padding: '3rem 2rem',
                                    textAlign: 'center',
                                    background: 'rgba(167, 171, 180, 0.05)',
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(167, 171, 180, 0.1)'
                                }}>
                                    <p style={{
                                        color: '#A7ABB4',
                                        fontSize: '1rem'
                                    }}>
                                        Data will appear once users start watching
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Genre Breakdown */}
                        {stats.topGenres.length > 0 && (
                            <div>
                                <h2 style={{
                                    fontSize: '1.75rem',
                                    fontWeight: '700',
                                    color: '#F3F4F6',
                                    marginBottom: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <BarChart3 className="w-5 h-5" />
                                        Genre Breakdown
                                    </span>
                                </h2>

                                <div style={{
                                    display: 'grid',
                                    gap: '1rem'
                                }}>
                                    {stats.topGenres.map((genre: GenreStats) => (
                                        <div key={genre.genre}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <span style={{
                                                    color: '#F3F4F6',
                                                    fontWeight: '600',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {genre.genre}
                                                </span>
                                                <span style={{
                                                    color: '#A7ABB4',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {genre.count} {genre.count === 1 ? 'watch' : 'watches'}
                                                </span>
                                            </div>
                                            <div style={{
                                                width: '100%',
                                                height: '8px',
                                                background: 'rgba(167, 171, 180, 0.1)',
                                                borderRadius: '9999px',
                                                overflow: 'hidden'
                                            }}>
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        background: 'linear-gradient(90deg, #D4AF37 0%, #F6D365 100%)',
                                                        width: `${(genre.count / stats.topGenres[0].count) * 100}%`,
                                                        transition: 'width 0.3s ease'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        background: 'rgba(167, 171, 180, 0.05)',
                        borderRadius: '1rem',
                        border: '1px solid rgba(167, 171, 180, 0.1)',
                        marginTop: '2rem'
                    }}>
                        <p style={{
                            color: '#A7ABB4',
                            fontSize: '1rem'
                        }}>
                            No analytics data available yet
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @media (max-width: 900px) {
                    .analytics-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 420px) {
                    .analytics-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
            `}</style>
        </main>
    );
}
