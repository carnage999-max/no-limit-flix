import prisma from './db';

type SeriesMetadataInput = {
    title: string | null | undefined;
    description?: string | null;
    thumbnailUrl?: string | null;
    thumbnailSource?: string | null;
    thumbnailUpdatedByUserId?: string | null;
    releaseYear?: number | null;
    genre?: string | null;
    rating?: string | null;
    averageRating?: number | null;
    ratingCount?: number | null;
    tmdbId?: string | null;
    sourceProvider?: string | null;
    sourcePageUrl?: string | null;
    sourceRights?: string | null;
    sourceLicenseUrl?: string | null;
};

const textOrNull = (value: string | null | undefined) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed || null;
};

const definedEntries = <T extends Record<string, unknown>>(value: T) =>
    Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

export const ensureSeriesMetadata = async (input: SeriesMetadataInput) => {
    const title = textOrNull(input.title);
    if (!title) return null;

    const existing = await prisma.series.findUnique({
        where: { title },
        select: {
            id: true,
            thumbnailLocked: true,
        },
    });
    const thumbnailUrl = textOrNull(input.thumbnailUrl);
    const shouldUpdateThumbnail = Boolean(thumbnailUrl && !existing?.thumbnailLocked);
    const thumbnailData = shouldUpdateThumbnail
        ? {
            thumbnailUrl,
            thumbnailSource: textOrNull(input.thumbnailSource),
            thumbnailUpdatedByUserId: textOrNull(input.thumbnailUpdatedByUserId),
            thumbnailUpdatedAt: new Date(),
        }
        : {};

    const data = definedEntries({
        description: textOrNull(input.description) ?? undefined,
        releaseYear: input.releaseYear ?? undefined,
        genre: textOrNull(input.genre) ?? undefined,
        rating: textOrNull(input.rating) ?? undefined,
        averageRating: input.averageRating ?? undefined,
        ratingCount: input.ratingCount ?? undefined,
        tmdbId: textOrNull(input.tmdbId) ?? undefined,
        sourceProvider: textOrNull(input.sourceProvider) ?? undefined,
        sourcePageUrl: textOrNull(input.sourcePageUrl) ?? undefined,
        sourceRights: textOrNull(input.sourceRights) ?? undefined,
        sourceLicenseUrl: textOrNull(input.sourceLicenseUrl) ?? undefined,
        ...thumbnailData,
    });

    if (existing) {
        return prisma.series.update({
            where: { id: existing.id },
            data,
        });
    }

    return prisma.series.create({
        data: {
            title,
            description: textOrNull(input.description),
            thumbnailUrl,
            thumbnailSource: thumbnailUrl ? textOrNull(input.thumbnailSource) : null,
            thumbnailLocked: false,
            thumbnailUpdatedByUserId: thumbnailUrl ? textOrNull(input.thumbnailUpdatedByUserId) : null,
            thumbnailUpdatedAt: thumbnailUrl ? new Date() : null,
            releaseYear: input.releaseYear ?? null,
            genre: textOrNull(input.genre),
            rating: textOrNull(input.rating),
            averageRating: input.averageRating ?? null,
            ratingCount: input.ratingCount ?? null,
            tmdbId: textOrNull(input.tmdbId),
            sourceProvider: textOrNull(input.sourceProvider),
            sourcePageUrl: textOrNull(input.sourcePageUrl),
            sourceRights: textOrNull(input.sourceRights),
            sourceLicenseUrl: textOrNull(input.sourceLicenseUrl),
        },
    });
};
