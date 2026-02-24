import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const type = searchParams.get('type') || 'watch_stats'; // watch_stats, top_movies, user_activity

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        if (type === 'watch_stats') {
            // Get user's watch statistics
            const watchHistory = await prisma.watchHistory.findMany({
                where: { userId },
                orderBy: { watchedAt: 'desc' }
            });

            const totalWatched = watchHistory.length;
            const completedWatches = watchHistory.filter(w => w.isCompleted).length;
            const totalMinutesWatched = watchHistory.reduce((sum, w) => {
                return sum + ((w.duration || 0) / 60);
            }, 0);

            const topGenres: Record<string, number> = {};
            for (const watch of watchHistory) {
                const video = await prisma.video.findUnique({
                    where: { id: watch.videoId },
                    select: { genre: true }
                });
                if (video?.genre) {
                    topGenres[video.genre] = (topGenres[video.genre] || 0) + 1;
                }
            }

            return NextResponse.json({
                totalWatched,
                completedWatches,
                totalMinutesWatched: Math.round(totalMinutesWatched),
                completionRate: totalWatched > 0 ? Math.round((completedWatches / totalWatched) * 100) : 0,
                topGenres: Object.entries(topGenres)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([genre, count]) => ({ genre, count }))
            });
        } else if (type === 'top_movies') {
            // Get top watched movies
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '10');
            const skip = (page - 1) * limit;

            const topMovies = await prisma.watchHistory.findMany({
                where: { userId },
                orderBy: { watchedAt: 'desc' },
                skip,
                take: limit,
                distinct: ['videoId']
            });

            const moviesWithDetails = await Promise.all(
                topMovies.map(async (movie) => {
                    // Count how many times this video was watched
                    const watchCount = await prisma.watchHistory.count({
                        where: {
                            userId,
                            videoId: movie.videoId
                        }
                    });

                    const video = await prisma.video.findUnique({
                        where: { id: movie.videoId }
                    });

                    return {
                        videoId: movie.videoId,
                        title: video?.title || movie.videoTitle,
                        thumbnailUrl: video?.thumbnailUrl || movie.videoPoster,
                        watchCount,
                        genre: video?.genre
                    };
                })
            );

            return NextResponse.json({
                topMovies: moviesWithDetails
            });
        } else if (type === 'user_activity') {
            // Get user activity for analytics dashboard
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            const events = await prisma.analyticsEvent.findMany({
                where: {
                    userId,
                    createdAt: { gte: last30Days }
                },
                orderBy: { createdAt: 'asc' }
            });

            // Group by date
            const activityByDate: Record<string, number> = {};
            for (const event of events) {
                const dateStr = event.createdAt.toLocaleDateString();
                activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1;
            }

            const activityData = Object.entries(activityByDate).map(([date, watches]) => ({
                date,
                watches
            }));

            return NextResponse.json({ activityData });
        }

        return NextResponse.json(
            { error: 'Invalid type' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch analytics' },
            { status: 500 }
        );
    }
}
