'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Trash2, Heart } from 'lucide-react';
import { CardViewToggle } from '@/components';
import { useCardView } from '@/context/CardViewContext';

interface Favorite {
    id: string;
    videoId?: string | null;
    tmdbId?: string | null;
    videoTitle?: string;
    videoPoster?: string;
    video?: {
        id: string;
        title: string;
        thumbnailUrl?: string;
        genre?: string;
        description?: string;
        duration?: number;
        releaseYear?: number;
        tmdbId?: string;
        sourceProvider?: string;
        sourcePageUrl?: string;
        sourceRights?: string;
        sourceLicenseUrl?: string;
    } | null;
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
    const { viewSize } = useCardView();

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns:
            viewSize === 'compact'
                ? 'repeat(auto-fill, minmax(140px, 1fr))'
                : viewSize === 'standard'
                    ? 'repeat(auto-fill, minmax(180px, 1fr))'
                    : 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: viewSize === 'compact' ? '1rem' : viewSize === 'standard' ? '1.5rem' : '2rem',
        marginTop: '2rem',
    };

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

    const buildFavoriteLink = (favorite: Favorite) => {
        const video = favorite.video;
        const hasInternalAsset = Boolean(video?.id || favorite.videoId);
        const tmdbId = favorite.tmdbId || video?.tmdbId;

        if (hasInternalAsset) {
            const encodedData = btoa(JSON.stringify({
                id: video?.id || favorite.videoId,
                title: video?.title || favorite.videoTitle || 'Untitled',
                poster: video?.thumbnailUrl || favorite.videoPoster,
                year: video?.releaseYear || new Date().getFullYear(),
                runtime: video?.duration ? Math.floor(video.duration / 60) : 0,
                genres: video?.genre ? [video.genre] : [],
                explanation: video?.description || '',
                playable: true,
                assetId: video?.id || favorite.videoId,
                tmdbId: video?.tmdbId || favorite.tmdbId,
                tmdb_id: video?.tmdbId || favorite.tmdbId,
                sourceProvider: video?.sourceProvider,
                sourcePageUrl: video?.sourcePageUrl,
                sourceRights: video?.sourceRights,
                sourceLicenseUrl: video?.sourceLicenseUrl,
            }));
            return `/title/${video?.id || favorite.videoId}?data=${encodedData}`;
        }

        if (tmdbId) {
            return `/title/${tmdbId}`;
        }

        return '/';
    };

    const removeFavorite = async (videoId?: string | null, tmdbId?: string | null) => {
        try {
            const res = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    videoId,
                    tmdbId,
                    action: 'remove'
                })
            });

            if (res.ok) {
                setFavorites(favorites.filter(f => f.videoId !== videoId && f.tmdbId !== tmdbId));
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Heart className="w-6 h-6" />
                                Your Favorites
                            </span>
                        </h1>
                        <p style={{
                            color: '#A7ABB4',
                            fontSize: '1rem'
                        }}>
                            {favorites.length} {favorites.length === 1 ? 'title' : 'titles'} saved
                        </p>
                    </div>
                    <CardViewToggle />
                </div>
            </div>

            <div style={{
                maxWidth: '1400px',
                margin: '0 auto',
                padding: '0 2rem'
            }}>
                {loading ? (
                    <div style={gridStyle}>
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
                        <div style={gridStyle}>
                            {favorites.map((favorite) => {
                                const displayTitle = favorite.video?.title || favorite.videoTitle || 'Untitled';
                                const displayPoster = favorite.video?.thumbnailUrl || favorite.videoPoster || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';
                                const displayGenre = favorite.video?.genre;
                                const href = buildFavoriteLink(favorite);
                                return (
                                <Link
                                    key={favorite.id}
                                    href={href}
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div
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
                                        src={displayPoster}
                                        alt={displayTitle}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            display: 'block',
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
                                            {displayTitle}
                                        </h3>
                                        {displayGenre && (
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: '#A7ABB4',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {displayGenre}
                                            </p>
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeFavorite(favorite.videoId, favorite.tmdbId);
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
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    </div>
                                </Link>
                            );
                            })}
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
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <ArrowLeft className="w-4 h-4" />
                                        Previous
                                    </span>
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
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                        Next
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                Explore Movies
                                <ArrowRight className="w-4 h-4" />
                            </span>
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
