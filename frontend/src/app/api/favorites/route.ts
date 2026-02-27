import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
    try {
        const { userId, videoId, action, title, poster, tmdbId } = await request.json();
        const videoIdValue = videoId ? String(videoId) : undefined;
        const tmdbIdValue = tmdbId ? String(tmdbId) : undefined;

        if (!userId || (!videoIdValue && !tmdbIdValue)) {
            return NextResponse.json(
                { error: 'Missing required fields: userId and videoId or tmdbId' },
                { status: 400 }
            );
        }

        console.log('Processing favorite action:', { userId, videoId: videoIdValue, action, title, tmdbId: tmdbIdValue });

        if (action === 'add') {
            try {
                let favorite;
                if (videoIdValue) {
                    favorite = await prisma.favorite.upsert({
                        where: {
                            userFavoriteUnique: {
                                userId,
                                videoId: videoIdValue
                            }
                        },
                        create: {
                            userId,
                            videoId: videoIdValue,
                            tmdbId: tmdbIdValue || null,
                            videoTitle: title || 'Unknown',
                            videoPoster: poster
                        },
                        update: {
                            tmdbId: tmdbIdValue || null,
                            videoTitle: title || 'Unknown',
                            videoPoster: poster
                        }
                    });
                } else {
                    favorite = await prisma.favorite.upsert({
                        where: {
                            userFavoriteTmdbUnique: {
                                userId,
                                tmdbId: tmdbIdValue
                            }
                        },
                        create: {
                            userId,
                            tmdbId: tmdbIdValue,
                            videoTitle: title || 'Unknown',
                            videoPoster: poster
                        },
                        update: {
                            videoTitle: title || 'Unknown',
                            videoPoster: poster
                        }
                    });
                }

                console.log('Favorite created/updated:', favorite);
                return NextResponse.json({ success: true, favorite });
            } catch (prismaError: any) {
                console.error('Prisma error in favorite add:', prismaError.message);

                throw prismaError;
            }
        } else if (action === 'remove') {
            const result = await prisma.favorite.deleteMany({
                where: {
                    userId,
                    ...(videoIdValue ? { videoId: videoIdValue } : {}),
                    ...(tmdbIdValue ? { tmdbId: tmdbIdValue } : {})
                }
            });

            console.log('Favorite deleted:', result);
            return NextResponse.json({ success: true, deleted: result.count });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error: any) {
        console.error('Favorite error:', error);
        return NextResponse.json(
            { error: 'Failed to manage favorites', details: error.message },
            { status: 500 }
        );
    }
}

// Get user's favorites
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const userId = searchParams.get('userId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            prisma.favorite.findMany({
                where: { userId },
                orderBy: { addedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    video: true
                }
            }),
            prisma.favorite.count({ where: { userId } })
        ]);

        console.log('Fetched favorites:', { count: favorites.length, total });

        const safeFavorites = favorites.map((favorite) => ({
            ...favorite,
            video: favorite.video
                ? {
                    ...favorite.video,
                    fileSize: favorite.video.fileSize ? favorite.video.fileSize.toString() : null
                }
                : null
        }));

        return NextResponse.json({
            favorites: safeFavorites,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        console.error('Favorites fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch favorites', details: error.message },
            { status: 500 }
        );
    }
}
