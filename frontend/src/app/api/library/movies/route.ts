import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { attachRatingSummaries } from '@/lib/ratings';

const MOVIE_SELECT = {
    id: true,
    title: true,
    description: true,
    thumbnailUrl: true,
    s3Url: true,
    duration: true,
    releaseYear: true,
    genre: true,
    rating: true,
    averageRating: true,
    ratingCount: true,
    resolution: true,
    tmdbId: true,
    sourceType: true,
    sourceProvider: true,
    sourcePageUrl: true,
    sourceRights: true,
    sourceLicenseUrl: true,
    archiveIdentifier: true,
    format: true,
    fileSize: true,
    createdAt: true,
} satisfies Prisma.VideoSelect;

type MovieRecord = Prisma.VideoGetPayload<{ select: typeof MOVIE_SELECT }>;

const REVIEW_SAFE_WHERE: Prisma.VideoWhereInput = {
    OR: [
        { sourceType: 'internal' },
        {
            AND: [
                { sourceProvider: 'internet_archive' },
                { sourceLicenseUrl: { not: null } },
                { sourceLicenseUrl: { not: '' } },
            ],
        },
        {
            AND: [
                { sourceType: 'external_legal' },
                { sourceLicenseUrl: { not: null } },
                { sourceLicenseUrl: { not: '' } },
            ],
        },
    ],
};

const transformMovie = (video: MovieRecord) => ({
    ...video,
    s3Url: resolveMediaUrl(video.s3Url),
    thumbnailUrl: resolveMediaUrl(video.thumbnailUrl),
    fileSize: video.fileSize ? video.fileSize.toString() : null,
});

const parsePositiveInt = (value: string | null, fallback: number, max?: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    const rounded = Math.floor(parsed);
    return max ? Math.min(rounded, max) : rounded;
};

const splitGenres = (genre?: string | null) => {
    if (!genre) return [];
    return genre
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const buildCategoryWhere = (category: string): Prisma.VideoWhereInput => {
    return {
        OR: [
            { genre: { equals: category, mode: 'insensitive' } },
            { genre: { startsWith: `${category},`, mode: 'insensitive' } },
            { genre: { endsWith: `, ${category}`, mode: 'insensitive' } },
            { genre: { endsWith: `,${category}`, mode: 'insensitive' } },
            { genre: { contains: `, ${category},`, mode: 'insensitive' } },
            { genre: { contains: `,${category},`, mode: 'insensitive' } },
        ],
    };
};

/**
 * GET /api/library/movies
 * Returns all completed movie assets hosted on our infrastructure (CloudFront/S3).
 * Only titles with status='completed' and type='movie' are returned.
 * This is the internal library — only content we own and control.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const usesPagedMode = searchParams.has('page')
            || searchParams.has('limit')
            || searchParams.has('category')
            || searchParams.get('sort') === 'title'
            || searchParams.get('includeCategories') === '1';

        const baseWhere: Prisma.VideoWhereInput = {
            type: 'movie',
            status: 'completed',
            ...REVIEW_SAFE_WHERE,
        };

        if (!usesPagedMode) {
            const videos = await prisma.video.findMany({
                where: baseWhere,
                orderBy: { createdAt: 'desc' },
                select: MOVIE_SELECT,
            });

            const movies = await attachRatingSummaries(videos.map(transformMovie));
            return NextResponse.json({ movies });
        }

        const page = parsePositiveInt(searchParams.get('page'), 1);
        const limit = parsePositiveInt(searchParams.get('limit'), 60, 100);
        const category = (searchParams.get('category') || 'all').trim();
        const includeCategories = searchParams.get('includeCategories') === '1';
        const where: Prisma.VideoWhereInput = category && category !== 'all'
            ? { AND: [baseWhere, buildCategoryWhere(category)] }
            : baseWhere;

        const sort = searchParams.get('sort');
        const orderBy: Prisma.VideoOrderByWithRelationInput[] = sort === 'recent'
            ? [{ createdAt: 'desc' }]
            : sort === 'title-desc'
                ? [{ title: 'desc' }, { createdAt: 'desc' }]
                : [{ title: 'asc' }, { createdAt: 'desc' }];

        const [videos, total, categoryRows] = await Promise.all([
            prisma.video.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                select: MOVIE_SELECT,
            }),
            prisma.video.count({ where }),
            includeCategories
                ? prisma.video.findMany({
                    where: baseWhere,
                    select: { genre: true },
                })
                : Promise.resolve([]),
        ]);

        const categories = includeCategories
            ? Array.from(new Set(categoryRows.flatMap((row) => splitGenres(row.genre))))
                .sort((a, b) => a.localeCompare(b))
            : undefined;

        const totalPages = Math.max(1, Math.ceil(total / limit));

        const movies = await attachRatingSummaries(videos.map(transformMovie));

        return NextResponse.json({
            movies,
            categories,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
        });
    } catch (error: unknown) {
        console.error('GET /api/library/movies error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch library' },
            { status: 500 }
        );
    }
}
