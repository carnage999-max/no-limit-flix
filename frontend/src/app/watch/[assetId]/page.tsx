import { notFound } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { getMovieDetails } from '@/lib/tmdb';
import { ButtonSecondary, VideoPlayer } from '@/components';
import { PLAY_STORE_URL } from '@/lib/constants';
import { Tv, ExternalLink } from 'lucide-react';
import { transformToCloudFront } from '@/lib/utils';

export default async function WatchPage({ params }: { params: Promise<{ assetId: string }> }) {
    const { assetId } = await params;

    // 1. Fetch Video from DB
    const video = await prisma.video.findUnique({
        where: { id: assetId }
    });

    if (!video || video.status !== 'completed') {
        notFound();
    }

    // 2. Fetch TMDb details if linked
    let movieDetails = null;
    if (video.tmdbId) {
        try {
            movieDetails = await getMovieDetails(video.tmdbId);
        } catch (e) {
            console.warn('Metadata fetch failed for watch page:', e);
        }
    }

    // 3. Prepare Stream URL - use CloudFront URL directly
    // s3Url is already a CloudFront URL from the presigned-url endpoint
    const streamUrl = video.s3Url || '';

    return (
        <main className="min-h-screen bg-[#0B0B0D] text-white flex flex-col overflow-x-hidden">
            {/* Backdrop Blur Background - fills entire viewport */}
            <div className="fixed inset-0 z-0 -z-10">
                <div className="absolute inset-0 bg-[#0B0B0D]" />
                {(movieDetails?.backdrop || video.thumbnailUrl) && (
                    <img 
                        src={movieDetails?.backdrop || video.thumbnailUrl} 
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-110" 
                        alt="" 
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#0B0B0D]/70 to-[#0B0B0D]" />
            </div>

            {/* Header */}
            <header className="p-6 flex items-center justify-between z-10 relative">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                </Link>
                <Link href="/">
                    <ButtonSecondary>← Back</ButtonSecondary>
                </Link>
            </header>

            {/* Player - Immediately Visible at Top */}
            <div className="flex-1 flex flex-col items-center justify-start pt-4 px-4 md:pt-8 md:px-12 relative z-10">
                <div className="w-full max-w-4xl">
                    {/* Player Container */}
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group mb-6 md:mb-8">
                        <VideoPlayer
                            assetId={assetId}
                            src={streamUrl}
                            poster={video.thumbnailUrl || movieDetails?.backdrop}
                        />
                    </div>

                    {/* Meta Info Below Player */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold text-[#0B0B0D] uppercase tracking-wider">Internal Library</span>
                                <span className="text-silver/60 text-sm font-medium">{video.resolution || 'HD'}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                {video.title}
                            </h1>
                            <p className="text-silver/80 max-w-2xl italic">
                                {video.description || movieDetails?.explanation}
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* External Players */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-silver/40 uppercase tracking-widest">Play on:</span>
                                <a
                                    href={`vlc://${streamUrl}`}
                                    title="Play in VLC"
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 rounded-lg transition-all"
                                >
                                    <Tv className="w-3 h-3 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter">VLC</span>
                                </a>
                                <a
                                    href={`iina://weblink?url=${streamUrl}`}
                                    title="Play in IINA (Mac)"
                                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-lg transition-all"
                                >
                                    <Tv className="w-3 h-3 text-blue-500" />
                                    <span className="text-xs font-bold text-blue-500 uppercase tracking-tighter">IINA</span>
                                </a>
                            </div>

                            {/* Mobile App Promo */}
                            <div className="ml-auto flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-2 rounded-lg hover:bg-white/10 transition-all">
                                <div>
                                    <p className="text-[9px] font-bold text-gold uppercase tracking-widest">Better on Mobile</p>
                                    <p className="text-[11px] text-silver/70">H.265/4K support</p>
                                </div>
                                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                                    <img src="/google-play.svg" alt="Google Play" className="h-8 w-auto" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer spacing */}
            <div className="h-12 relative z-10" />
        </main>
    );
}
