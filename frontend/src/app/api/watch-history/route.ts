import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';

// Track watch history
export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { videoId, watchedDuration, totalDuration, title, poster } = await request.json();
        const userId = sessionUser.id;

        if (!videoId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Calculate watched percentage
        const safeWatched = Number.isFinite(Number(watchedDuration)) ? Number(watchedDuration) : null;
        const safeTotal = Number.isFinite(Number(totalDuration)) ? Number(totalDuration) : null;
        const completionPercent = safeTotal && safeWatched ? (safeWatched / safeTotal) * 100 : 0;
        const isCompleted = completionPercent >= 90;

        // Upsert watch history (update if exists, create if not)
        const watchHistory = await prisma.watchHistory.upsert({
            where: {
                userVideoUnique: {
                    userId,
                    videoId
                }
            },
            create: {
                userId,
                videoId,
                videoTitle: title || 'Unknown',
                videoPoster: poster,
                duration: safeWatched,
                totalDuration: safeTotal,
                completionPercent,
                isCompleted
            },
            update: {
                duration: safeWatched,
                totalDuration: safeTotal,
                completionPercent,
                isCompleted,
                watchedAt: new Date()
            }
        });

        // Also log analytics event
        try {
            await prisma.analyticsEvent.create({
                data: {
                    userId,
                    eventType: isCompleted ? 'watch_completed' : 'watch_started',
                    videoId,
                    videoTitle: title,
                    metadata: JSON.stringify({
                        completionPercent,
                        totalDuration: safeTotal,
                        watchedDuration: safeWatched
                    })
                }
            });
        } catch (error) {
            console.warn('Analytics event failed:', error);
        }

        return NextResponse.json({ success: true, watchHistory });
    } catch (error) {
        console.error('Watch history error:', error);
        return NextResponse.json(
            { error: 'Failed to track watch history' },
            { status: 500 }
        );
    }
}

// Get watch history for user
export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        const userId = sessionUser?.id || null;
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const skip = (page - 1) * limit;

        const [watchHistory, total] = await Promise.all([
            prisma.watchHistory.findMany({
                where: {
                    userId,
                    videoTitle: search ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined
                },
                orderBy: { watchedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    video: true
                }
            }),
            prisma.watchHistory.count({
                where: {
                    userId,
                    videoTitle: search ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined
                }
            })
        ]);

        const sanitizedHistory = watchHistory.map((entry: any) => {
            if (!entry.video) return entry;
            return {
                ...entry,
                video: {
                    ...entry.video,
                    fileSize: entry.video.fileSize ? entry.video.fileSize.toString() : null
                }
            };
        });

        return NextResponse.json({
            watchHistory: sanitizedHistory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Watch history fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch watch history' },
            { status: 500 }
        );
    }
}
