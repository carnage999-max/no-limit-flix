'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Favorite {
    id: string;
    videoId: string;
    video: {
        id: string;
        title: string;
        thumbnailUrl?: string;
        genre?: string;
    };
    addedAt: string;
}

export default function FavoritesPage() {
    const router = useRouter();
    const [userId, setUserId] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        if (!storedUserId) {
            router.push('/auth');
            return;
        }
        setUserId(storedUserId);
    }, [router]);

    useEffect(() => {
        if (userId) {
            fetchFavorites();
        }
    }, [userId, page]);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/favorites?userId=${userId}&page=${page}&limit=20`);
            if (res.ok) {
                const data = await res.json();
                setFavorites(data.favorites);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error('Failed to fetch favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const removeFavorite = async (videoId: string) => {
        try {
            const res = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId,
                    action: 'remove'
                })
            });

            if (res.ok) {
                setFavorites(favorites.filter(f => f.videoId !== videoId));
            }
        } catch (error) {
            console.error('Failed to remove favorite:', error);
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
                            ❤️ Your Favorites
                        </h1>
                        <p style={{
                            color: '#A7ABB4',
                            fontSize: '1rem'
                        }}>
                            {favorites.length} {favorites.length === 1 ? 'title' : 'titles'} saved
                        </p>
                    </div>
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
                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                        gap: '1.5rem',
                        marginTop: '2rem'
                    }}>
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    height: '240px',
                                    background: 'rgba(167, 171, 180, 0.1)',
                                    borderRadius: '1rem',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}
                            />
                        ))}
                    </div>
                ) : favorites.length > 0 ? (
                    <>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                            gap: '1.5rem',
                            marginTop: '2rem'
                        }}>
                            {favorites.map((favorite) => (
                                <div
                                    key={favorite.id}
                                    style={{
                                        position: 'relative',
                                        borderRadius: '1rem',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        transition: 'transform 0.3s',
                                        aspectRatio: '2/3',
                                        group: 'relative'
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                    }}
                                >
                                    {/* Image */}
                                    <img
                                        src={favorite.video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400'}
                                        alt={favorite.video.title}
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
                                            marginBottom: '0.5rem',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {favorite.video.title}
                                        </h3>
                                        {favorite.video.genre && (
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#A7ABB4',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {favorite.video.genre}
                                            </p>
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFavorite(favorite.videoId);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '0.75rem',
                                            right: '0.75rem',
                                            width: '2.5rem',
                                            height: '2.5rem',
                                            background: 'rgba(244, 63, 94, 0.2)',
                                            border: '1px solid rgba(244, 63, 94, 0.4)',
                                            borderRadius: '0.5rem',
                                            color: '#F43F5E',
                                            fontSize: '1.25rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(244, 63, 94, 0.3)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)';
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                marginTop: '3rem',
                                flexWrap: 'wrap'
                            }}>
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: '0.75rem 1.25rem',
                                        background: page === 1 ? 'rgba(167, 171, 180, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        borderRadius: '0.5rem',
                                        color: page === 1 ? '#A7ABB4' : '#D4AF37',
                                        fontWeight: '600',
                                        cursor: page === 1 ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    ← Previous
                                </button>

                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setPage(i + 1)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            background: page === i + 1
                                                ? 'linear-gradient(135deg, #D4AF37 0%, #F6D365 100%)'
                                                : 'rgba(212, 175, 55, 0.1)',
                                            border: '1px solid rgba(212, 175, 55, 0.3)',
                                            borderRadius: '0.5rem',
                                            color: page === i + 1 ? '#0B0B0D' : '#D4AF37',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            minWidth: '2.75rem'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    style={{
                                        padding: '0.75rem 1.25rem',
                                        background: page === totalPages ? 'rgba(167, 171, 180, 0.1)' : 'rgba(212, 175, 55, 0.1)',
                                        border: '1px solid rgba(212, 175, 55, 0.3)',
                                        borderRadius: '0.5rem',
                                        color: page === totalPages ? '#A7ABB4' : '#D4AF37',
                                        fontWeight: '600',
                                        cursor: page === totalPages ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Next →
                                </button>
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
                            fontSize: '1rem',
                            marginBottom: '1rem'
                        }}>
                            No favorites yet. Start adding your favorite movies!
                        </p>
                        <Link
                            href="/"
                            style={{
                                color: '#D4AF37',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.875rem'
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.color = '#F6D365';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.color = '#D4AF37';
                            }}
                        >
                            Explore Movies →
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
