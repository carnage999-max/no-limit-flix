import prisma from '@/lib/db';
import { searchArchiveIdentifiers } from '@/lib/internet-archive';
import { collectFreshIdentifiers as collectFresh, type FreshCandidates } from '@/lib/archive-paging';

export type { FreshCandidates };

const LOOKUP_CHUNK_SIZE = 1000;

/**
 * The key a film is stored under in Video.archiveIdentifier. Single-film archive items use the
 * bare identifier; bundle items and series episodes are keyed per file.
 */
export const buildArchiveIdentifier = (
    identifier: string,
    fileName: string | null,
    bundleIdentifier?: string,
    contentType?: 'movie' | 'series'
) => {
    if (fileName && (contentType === 'series' || (bundleIdentifier && identifier === bundleIdentifier))) {
        return `${identifier}:${fileName}`;
    }
    return identifier;
};

/** Returns the subset of `keys` that already exist in the library. */
export async function findKnownArchiveIdentifiers(keys: string[]): Promise<Set<string>> {
    const known = new Set<string>();
    for (let i = 0; i < keys.length; i += LOOKUP_CHUNK_SIZE) {
        const chunk = keys.slice(i, i + LOOKUP_CHUNK_SIZE);
        const rows = await prisma.video.findMany({
            where: { archiveIdentifier: { in: chunk } },
            select: { archiveIdentifier: true },
        });
        for (const row of rows) {
            if (row.archiveIdentifier) known.add(row.archiveIdentifier);
        }
    }
    return known;
}

export const collectFreshIdentifiers = (options: {
    query: string;
    sort?: string | null;
    limit: number;
    startPage: number;
}): Promise<FreshCandidates> =>
    collectFresh({ ...options, search: searchArchiveIdentifiers, findKnown: findKnownArchiveIdentifiers });
