'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    const [userId, setUserId] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        // Get userId from localStorage or auth check
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) {
            router.push('/account');
            return;
        }
        setUserId(storedUserId);
        fetchAnalytics(storedUserId);
    }, [router]);

    const fetchAnalytics = async (uid: string) => {
        try {
            setLoading(true);
            const [statsRes, moviesRes] = await Promise.all([
                fetch(`/api/analytics?userId=${uid}&type=watch_stats`),
                fetch(`/api/analytics?userId=${uid}&type=top_movies&page=${page}&limit=10`)
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setStats(statsData);
            }

            if (moviesRes.ok) {
                const moviesData = await moviesRes.json();
                setTopMovies(moviesData.topMovies);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!userId) return null;

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
                            Your Analytics
                        </h1>
                        <p style={{
                            color: '#A7ABB4',
                            fontSize: '1rem'
                        }}>
                            Track your viewing habits and discover insights
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
                        ❤️ Favorites
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
                        }}>
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
                                    Videos Watched
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
                                    Total titles watched
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
                                    Completed Watches
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
                                🎬 Most Watched Titles
                            </h2>

                            {topMovies.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                    gap: '1.5rem'
                                }}>
                                    {topMovies.map((movie, idx) => (
                                        <div
                                            key={movie.videoId}
                                            style={{
                                                position: 'relative',
                                                borderRadius: '1rem',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                transition: 'transform 0.3s',
                                                aspectRatio: '2/3'
                                            }}
                                            onMouseEnter={(e) => {
                                                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                            }}
                                            onMouseLeave={(e) => {
                                                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                            }}
                                        >
                                            {/* Rank Badge */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '0.75rem',
                                                right: '0.75rem',
                                                width: '3rem',
                                                height: '3rem',
                                                borderRadius: '9999px',
                                                background: idx < 3
                                                    ? ['#D4AF37', '#C0C0C0', '#CD7F32'][idx]
                                                    : 'rgba(212, 175, 55, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.25rem',
                                                fontWeight: '700',
                                                color: idx < 3 ? '#0B0B0D' : '#D4AF37',
                                                zIndex: 2,
                                                border: '2px solid rgba(255,255,255,0.3)'
                                            }}>
                                                #{idx + 1}
                                            </div>

                                            {/* Image */}
                                            <img
                                                src={movie.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400'}
                                                alt={movie.title}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />

                                            {/* Overlay */}
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'linear-gradient(to top, #0B0B0D 0%, transparent 60%)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end',
                                                padding: '1rem',
                                                zIndex: 1
                                            }}>
                                                <h3 style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#F3F4F6',
                                                    marginBottom: '0.25rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {movie.title}
                                                </h3>
                                                <p style={{
                                                    fontSize: '0.75rem',
                                                    color: '#D4AF37',
                                                    fontWeight: '600'
                                                }}>
                                                    Watched {movie.watchCount}x
                                                </p>
                                            </div>
                                        </div>
                                    ))}
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
                                        Start watching to see your top titles here
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
                                    📊 Genre Breakdown
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
        </main>
    );
}
