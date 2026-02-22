'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TitleTile, Skeleton } from '@/components';
import type { MoviePick } from '@/types';
import { ButtonSecondary } from '@/components';

export default function InternalMoviesPage() {
    const [movies, setMovies] = useState<MoviePick[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMovies = async () => {
            try {
                const response = await fetch('/api/library/movies');
                if (response.ok) {
                    const data = await response.json();
                    const moviesData = (data.movies || []).map((video: any) => ({
                        id: video.id,
                        title: video.title,
                        year: video.releaseYear || new Date().getFullYear(),
                        runtime: Math.floor((video.duration || 0) / 60),
                        poster: video.thumbnailUrl || 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400',
                        genres: video.genre ? [video.genre] : [],
                        explanation: video.description || '',
                        watchProviders: [],
                        playable: true,
                        assetId: video.id,
                        cloudfrontUrl: video.s3Url,
                    }));
                    setMovies(moviesData);
                }
            } catch (error) {
                console.error('Failed to fetch movies:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMovies();
    }, []);

    return (
        <main className="min-h-screen bg-[#0B0B0D] text-white">
            {/* Header */}
            <header className="p-6 flex items-center justify-between z-10 border-b border-white/10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                </Link>
                <Link href="/">
                    <ButtonSecondary>Back to Home</ButtonSecondary>
                </Link>
            </header>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">All Movies</h1>
                    <p className="text-silver/60">Watch all available movies from our library</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} height="400px" borderRadius="0.75rem" />
                        ))}
                    </div>
                ) : movies.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {movies.map((movie) => (
                            <TitleTile key={movie.id} movie={movie} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-silver/60">No movies available</p>
                    </div>
                )}
            </div>
        </main>
    );
}
