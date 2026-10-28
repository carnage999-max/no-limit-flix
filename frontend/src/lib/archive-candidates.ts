import prisma from '@/lib/db';
import { searchArchiveDocs, searchArchiveIdentifiers } from '@/lib/internet-archive';
import {
    collectFreshDocs as collectDocs,
    collectFreshIdentifiers as collectFresh,
    type ArchiveDoc,
    type FreshCandidates,
    type FreshDocs,
} from '@/lib/archive-paging';
import { buildTitleIndex, isKnownFilm, type TitleIndex } from '@/lib/title-key';

export type { ArchiveDoc, FreshCandidates, FreshDocs };

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

const TITLE_INDEX_TTL_MS = 30_000;
let titleIndexCache: { index: TitleIndex; loadedAt: number } | null = null;

/** Every movie title in the library, kept briefly so a scan of many pages queries the DB once. */
export async function loadLibraryTitleIndex(): Promise<TitleIndex> {
    if (titleIndexCache && Date.now() - titleIndexCache.loadedAt < TITLE_INDEX_TTL_MS) {
        return titleIndexCache.index;
    }
    const rows = await prisma.video.findMany({
        where: { type: 'movie' },
        select: { title: true, releaseYear: true },
    });
    const index = buildTitleIndex(rows);
    titleIndexCache = { index, loadedAt: Date.now() };
    return index;
}

/**
 * Which of these archive items the library already holds. Matches by stored archive key, by the
 * item's archive.org page, and by title, because the same film is often uploaded to the archive
 * more than once and older imports were keyed by bundle file name instead of identifier.
 */
export async function findKnownDocs(docs: ArchiveDoc[]): Promise<Set<string>> {
    const known = await findKnownArchiveIdentifiers(docs.map((doc) => doc.identifier));

    const pageUrls = new Map(docs.map((doc) => [`https://archive.org/details/${doc.identifier}`, doc.identifier]));
    const urls = [...pageUrls.keys()];
    for (let i = 0; i < urls.length; i += LOOKUP_CHUNK_SIZE) {
        const rows = await prisma.video.findMany({
            where: { sourcePageUrl: { in: urls.slice(i, i + LOOKUP_CHUNK_SIZE) } },
            select: { sourcePageUrl: true },
        });
        for (const row of rows) {
            const identifier = row.sourcePageUrl ? pageUrls.get(row.sourcePageUrl) : null;
            if (identifier) known.add(identifier);
        }
    }

    const titles = await loadLibraryTitleIndex();
    for (const doc of docs) {
        if (!known.has(doc.identifier) && isKnownFilm(titles, doc.title, doc.year)) known.add(doc.identifier);
    }
    return known;
}

export const collectFreshDocs = (options: {
    query: string;
    sort?: string | null;
    limit: number;
    startPage: number;
    startOffset?: number;
}): Promise<FreshDocs> =>
    collectDocs({ ...options, search: searchArchiveDocs, findKnown: findKnownDocs });
