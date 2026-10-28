const MAX_PAGES_PER_REQUEST = 20;
// Fixed so a `page` cursor keeps meaning the same films regardless of the import `limit`.
const SEARCH_PAGE_SIZE = 100;

export interface FreshCandidates {
    identifiers: string[];
    /** Films seen on the Internet Archive that were already in the library. */
    skippedExisting: number;
    /** Pass as `page` on the next call to continue where this one stopped. */
    nextPage: number;
    /** True when the search ran out of results, i.e. the whole query has been walked. */
    exhausted: boolean;
}

/**
 * Walks Internet Archive search results page by page, dropping films the library already holds,
 * until `limit` new ones are found. Searching the same first page every time is what made
 * repeated scrapes keep returning the same ~600 films.
 */
export async function collectFreshIdentifiers(options: {
    query: string;
    sort?: string | null;
    limit: number;
    startPage: number;
    search: (query: string, rows: number, page: number, sort?: string | null) => Promise<string[]>;
    findKnown: (identifiers: string[]) => Promise<Set<string>>;
}): Promise<FreshCandidates> {
    const { query, sort, limit, startPage, search, findKnown } = options;
    const rows = SEARCH_PAGE_SIZE;
    const identifiers: string[] = [];
    let skippedExisting = 0;
    let page = startPage;
    let nextPage = startPage;
    let exhausted = false;

    for (let scanned = 0; scanned < MAX_PAGES_PER_REQUEST && identifiers.length < limit; scanned += 1) {
        const batch: string[] = await search(query, rows, page, sort);
        if (batch.length === 0) {
            exhausted = true;
            break;
        }

        let truncated = false;
        const known = await findKnown(batch);
        for (const identifier of batch) {
            if (known.has(identifier)) {
                skippedExisting += 1;
            } else if (identifiers.length < limit) {
                identifiers.push(identifier);
            } else {
                truncated = true;
            }
        }

        // Re-read this page next time if we left unclaimed new films on it.
        nextPage = truncated ? page : page + 1;
        if (batch.length < rows) {
            exhausted = true;
            break;
        }
        if (truncated) break;
        page += 1;
    }

    return { identifiers, skippedExisting, nextPage, exhausted };
}

export interface ArchiveDoc {
    identifier: string;
    title: string | null;
    year: number | null;
}

export interface FreshDocs {
    docs: ArchiveDoc[];
    /** Films seen on the Internet Archive that the library already holds. */
    skippedExisting: number;
    /** Cursor to pass back to continue exactly after the last film returned. */
    nextPage: number;
    nextOffset: number;
    exhausted: boolean;
}

/**
 * Like collectFreshIdentifiers, but works on search docs (title and year included) and keeps an
 * exact position inside a results page, so the next call never repeats or skips a film.
 */
export async function collectFreshDocs(options: {
    query: string;
    sort?: string | null;
    limit: number;
    startPage: number;
    startOffset?: number;
    search: (query: string, rows: number, page: number, sort?: string | null) => Promise<ArchiveDoc[]>;
    findKnown: (docs: ArchiveDoc[]) => Promise<Set<string>>;
}): Promise<FreshDocs> {
    const { query, sort, limit, startPage, search, findKnown } = options;
    const rows = SEARCH_PAGE_SIZE;
    const docs: ArchiveDoc[] = [];
    let skippedExisting = 0;
    let page = startPage;
    let offset = Math.max(options.startOffset ?? 0, 0);
    let exhausted = false;

    for (let scanned = 0; scanned < MAX_PAGES_PER_REQUEST && docs.length < limit; scanned += 1) {
        const batch = await search(query, rows, page, sort);
        if (batch.length === 0) {
            exhausted = true;
            break;
        }

        const known = await findKnown(batch.slice(offset));
        let index = offset;
        for (; index < batch.length && docs.length < limit; index += 1) {
            if (known.has(batch[index].identifier)) skippedExisting += 1;
            else docs.push(batch[index]);
        }

        const pageDone = index >= batch.length;
        if (pageDone) {
            page += 1;
            offset = 0;
            if (batch.length < rows) {
                exhausted = true;
                break;
            }
        } else {
            offset = index;
        }
    }

    return { docs, skippedExisting, nextPage: page, nextOffset: offset, exhausted };
}
