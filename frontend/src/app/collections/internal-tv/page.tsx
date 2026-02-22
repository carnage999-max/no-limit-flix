'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TitleTile, Skeleton } from '@/components';
import type { MoviePick } from '@/types';
import { ButtonSecondary } from '@/components';

export default function InternalTVPage() {
    const [series, setSeries] = useState<MoviePick[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSeries = async () => {
            try {
                const response = await fetch('/api/library/tv');
                if (response.ok) {
                    const data = await response.json();
                    const seriesData = (data.series || []).map((tv: any) => ({
                        id: tv.seriesTitle || tv.id,
                        title: tv.seriesTitle,
                        year: tv.releaseYear || new Date().getFullYear(),
                        runtime: 45,
                        poster: tv.thumbnailUrl || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400',
                        genres: tv.genre ? [tv.genre] : [],
                        explanation: `${tv.episodeCount || 0} episodes`,
                        watchProviders: [],
                        playable: true,
                        assetId: tv.id,
                        cloudfrontUrl: tv.thumbnailUrl,
                    }));
                    setSeries(seriesData);
                }
            } catch (error) {
                console.error('Failed to fetch series:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSeries();
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
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">All Series & Documentaries</h1>
                    <p className="text-silver/60">Watch all available series from our library</p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} height="400px" borderRadius="0.75rem" />
                        ))}
                    </div>
                ) : series.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {series.map((show) => (
                            <TitleTile key={show.id} movie={show} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-silver/60">No series available</p>
                    </div>
                )}
            </div>
        </main>
    );
}
