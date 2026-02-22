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
        <main className="min-h-screen bg-[#0B0B0D] text-white flex flex-col">
            {/* Minimal Header */}
            <header className="p-6 flex items-center justify-between z-10">
                <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tighter text-white">NO LIMIT<span className="text-gold">FLIX</span></span>
                </Link>
                <Link href={movieDetails ? `/title/${video.tmdbId}` : '/'}>
                    <ButtonSecondary>Close Player</ButtonSecondary>
                </Link>
            </header>

            {/* Cinematic Player Container */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 relative">
                {/* Backdrop Blur */}
                {movieDetails?.backdrop && (
                    <div className="absolute inset-0 z-0 opacity-20 blur-3xl overflow-hidden">
                        <img src={movieDetails.backdrop} className="w-full h-full object-cover scale-110" alt="" />
                    </div>
                )}

                <div className="w-full max-w-6xl z-10 animate-fade-in">
                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black group">
                        <VideoPlayer
                            assetId={assetId}
                            src={streamUrl}
                            poster={video.thumbnailUrl || movieDetails?.backdrop}
                        />
                    </div>

                    {/* Meta Info */}
                    <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gold text-[#0B0B0D] uppercase tracking-wider">Internal Library</span>
                                <span className="text-silver/60 text-sm font-medium">{video.resolution || 'HD'}</span>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                                {video.title}
                            </h1>
                            <p className="text-silver max-w-2xl line-clamp-2 italic">
                                {video.description || movieDetails?.explanation}
                            </p>
                        </div>

                        {/* External Player & App Interstitial */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            {/* VLC Desktop Fix */}
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-silver/40 uppercase tracking-widest text-center sm:text-left">External Desktop Fix</span>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`vlc://${streamUrl}`}
                                        title="Play in VLC"
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 rounded-xl transition-all group"
                                    >
                                        <Tv className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs font-bold text-orange-500 uppercase tracking-tighter">VLC</span>
                                        <ExternalLink className="w-3 h-3 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                    <a
                                        href={`iina://weblink?url=${streamUrl}`}
                                        title="Play in IINA (Mac)"
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl transition-all group"
                                    >
                                        <Tv className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-bold text-blue-500 uppercase tracking-tighter">IINA</span>
                                        <ExternalLink className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>
                            </div>

                            <div className="w-px h-12 bg-white/10 hidden sm:block mx-2" />

                            <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4 transition-all hover:bg-white/10">
                                <div className="hidden sm:block">
                                    <p className="text-[10px] font-bold text-gold uppercase tracking-widest mb-1">Better on Mobile</p>
                                    <p className="text-xs text-silver leading-tight max-w-[150px]">Get features like H.265/4K support and offline viewing.</p>
                                </div>
                                <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                                    <img src="/google-play.svg" alt="Google Play" className="h-10 w-auto" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer shadow */}
            <div className="h-24 bg-gradient-to-t from-black to-transparent pointer-events-none" />
        </main>
    );
}
