export interface ArchivePreset {
    id: string;
    label: string;
    query: string;
    description?: string;
    bundleIdentifier?: string;
}

export const ARCHIVE_PRESETS: ArchivePreset[] = [
    {
        id: 'public-domain-feature-films',
        label: 'Public Domain Feature Films',
        query: 'identifier:(publicmovies212)',
        bundleIdentifier: 'publicmovies212',
        description: 'Feature-length public domain films from IA collections.'
    },
    {
        id: 'public-domain-cartoons',
        label: 'Public Domain Cartoons',
        query: '(collection:(classic_cartoons) OR subject:(cartoons)) AND mediatype:(movies) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR clip)',
        description: 'Classic cartoons available in public domain collections.'
    },
    {
        id: 'film-noir',
        label: 'Film Noir',
        query: '(collection:(film_noir) OR subject:("film noir")) AND mediatype:(movies) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR clip OR newsreel)',
        description: 'Noir-era films from IA collections.'
    }
];

export const DEFAULT_ARCHIVE_PRESET_ID = 'public-domain-feature-films';

export interface ArchiveFile {
    name: string;
    format?: string;
    size?: string;
    length?: string;
    width?: string;
    height?: string;
    bitrate?: string;
    source?: string;
    title?: string;
    original?: string;
    md5?: string;
    mime?: string;
}

export interface ArchiveMetadataResponse {
    metadata: Record<string, unknown>;
    files: ArchiveFile[];
}

const IA_BASE = 'https://archive.org';
const ARCHIVE_FETCH_RETRIES = 2;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtmlEntities = (value: string) =>
    value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

const parseDetailsFallback = (identifier: string, html: string): ArchiveMetadataResponse => {
    const files = new Map<string, ArchiveFile>();
    const linkPattern = /href=["']([^"']+)["']/gi;
    let match: RegExpExecArray | null;

    while ((match = linkPattern.exec(html))) {
        const href = decodeHtmlEntities(match[1] || '');
        const marker = `/download/${identifier}/`;
        const markerIndex = href.indexOf(marker);
        if (markerIndex === -1) continue;

        const rawName = href
            .slice(markerIndex + marker.length)
            .split(/[?#]/)[0];
        if (!rawName) continue;

        let name = rawName;
        try {
            name = decodeURIComponent(rawName);
        } catch {
            name = rawName;
        }

        if (!/\.(mp4|mkv)$/i.test(name)) continue;
        files.set(name, {
            name,
            format: name.toLowerCase().endsWith('.mkv') ? 'Matroska' : 'H.264',
            mime: name.toLowerCase().endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4',
        });
    }

    const titleMatch = html.match(/<h1[^>]*>\s*([^<]+?)\s*<\/h1>/i)
        || html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
    const yearMatch = html.match(/Publication date[\s\S]{0,200}?((?:19|20)\d{2})/i)
        || html.match(/Year[\s\S]{0,200}?((?:19|20)\d{2})/i);
    const descriptionMatch = html.match(/Plot:\s*<\/?[^>]*>\s*([^<]+?)(?:<|$)/i);

    return {
        metadata: {
            identifier,
            title: titleMatch ? decodeHtmlEntities(titleMatch[1]).replace(/\s*:\s*Internet Archive.*$/i, '').trim() : identifier,
            year: yearMatch?.[1] || null,
            description: descriptionMatch ? decodeHtmlEntities(descriptionMatch[1]).trim() : null,
            mediatype: 'movies',
        },
        files: Array.from(files.values()),
    };
};

const fetchDetailsFallback = async (identifier: string) => {
    const response = await fetch(`${IA_BASE}/details/${identifier}`, {
        headers: { 'Accept': 'text/html' },
    });

    if (!response.ok) {
        throw new Error(`Internet Archive details fallback failed (${response.status})`);
    }

    return parseDetailsFallback(identifier, await response.text());
};

const normalizeNumber = (value?: string) => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toLower = (value?: string) => (value || '').toLowerCase();

const isPlayableName = (name: string) => {
    const lower = name.toLowerCase();
    if (
        lower.includes('sample') ||
        lower.includes('preview') ||
        lower.includes('thumb') ||
        lower.includes('thumbnail') ||
        lower.includes('subtitles') ||
        lower.endsWith('.srt') ||
        lower.endsWith('.vtt') ||
        lower.endsWith('.ass')
    ) {
        return false;
    }
    return true;
};

const inferMimeType = (file: ArchiveFile) => {
    if (file.mime) return file.mime;
    const name = toLower(file.name);
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.mkv')) return 'video/x-matroska';
    return null;
};

const isVideoFormat = (file: ArchiveFile) => {
    const format = toLower(file.format);
    if (!format) return false;
    return (
        format.includes('video') ||
        format.includes('mpeg4') ||
        format.includes('h.264') ||
        format.includes('h264') ||
        format.includes('avc') ||
        format.includes('matroska') ||
        format.includes('mpeg')
    );
};

const isMp4 = (file: ArchiveFile) => {
    const name = toLower(file.name);
    const mime = toLower(file.mime);
    return name.endsWith('.mp4') || mime === 'video/mp4';
};

const isMkv = (file: ArchiveFile) => {
    const name = toLower(file.name);
    const format = toLower(file.format);
    const mime = toLower(file.mime);
    return name.endsWith('.mkv') || format.includes('matroska') || mime === 'video/x-matroska';
};

const isVideoCandidate = (file: ArchiveFile) => {
    if (!file?.name) return false;
    if (!isPlayableName(file.name)) return false;
    const mime = inferMimeType(file);
    if (mime && mime.startsWith('video/')) return true;
    if (isVideoFormat(file)) return true;
    return false;
};

export const buildArchiveDownloadUrl = (identifier: string, fileName: string) => {
    let safeName = fileName;
    try {
        safeName = decodeURIComponent(fileName);
    } catch {
        safeName = fileName;
    }
    const encodedName = encodeURIComponent(safeName);
    return `${IA_BASE}/download/${identifier}/${encodedName}`;
};

export async function searchArchiveIdentifiers(query: string, limit: number, page = 1, sort?: string | null) {
    const rows = Math.min(Math.max(limit, 1), 100);
    const url = new URL(`${IA_BASE}/advancedsearch.php`);
    url.searchParams.set('q', query);
    url.searchParams.set('fl[]', 'identifier');
    url.searchParams.set('rows', rows.toString());
    url.searchParams.set('page', Math.max(1, page).toString());
    url.searchParams.set('output', 'json');
    if (sort) {
        url.searchParams.append('sort[]', sort === 'title' ? 'titleSorter asc' : sort);
    }

    const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
        throw new Error(`Internet Archive search failed (${response.status})`);
    }

    const data = await response.json();
    const docs = data?.response?.docs || [];
    return docs.map((doc: { identifier?: string }) => doc.identifier).filter(Boolean);
}

export async function fetchArchiveMetadata(identifier: string): Promise<ArchiveMetadataResponse> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= ARCHIVE_FETCH_RETRIES; attempt += 1) {
        try {
            const response = await fetch(`${IA_BASE}/metadata/${identifier}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Internet Archive metadata failed (${response.status})`);
            }

            const data = await response.json();
            return {
                metadata: data?.metadata || {},
                files: data?.files || []
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Internet Archive metadata failed');
            if (attempt < ARCHIVE_FETCH_RETRIES) {
                await sleep(500 * (attempt + 1));
            }
        }
    }

    try {
        const fallback = await fetchDetailsFallback(identifier);
        if (fallback.files.length > 0) return fallback;
    } catch {
        // Preserve the original metadata error; the fallback is best-effort.
    }

    throw lastError || new Error('Internet Archive metadata failed');
}

export function rankPlayableFiles(files: ArchiveFile[], allowMkv: boolean) {
    const filtered = files.filter((file) => {
        if (!isVideoCandidate(file)) return false;
        if (isMp4(file)) return true;
        if (allowMkv && isMkv(file)) return true;
        return false;
    });

    if (filtered.length === 0) return [];

    const candidates = filtered.map((file) => {
        const width = normalizeNumber(file.width) || 0;
        const height = normalizeNumber(file.height) || 0;
        const bitrate = normalizeNumber(file.bitrate) || 0;
        const size = normalizeNumber(file.size) || 0;
        const containerRank = isMp4(file) ? 1 : 0;
        const format = toLower(file.format);
        const mime = inferMimeType(file) || '';
        const duration = normalizeNumber(file.length) || 0;

        const codecBoost = format.includes('h.264') || format.includes('h264') || format.includes('avc') ? 500_000 : 0;
        const mimeBoost = mime === 'video/mp4' ? 200_000 : 0;

        let bitratePenalty = 0;
        if (duration > 0 && size > 0) {
            const computedBitrate = (size * 8) / duration;
            if (computedBitrate < 150_000) bitratePenalty = 200_000; // extremely low
            if (computedBitrate > 50_000_000) bitratePenalty = 400_000; // extremely high
        }

        const score = codecBoost + mimeBoost
            + (height * 1_000)
            + (width * 10)
            + (bitrate * 2)
            + (size / 1024)
            - bitratePenalty;

        return { file, score, containerRank };
    });

    candidates.sort((a, b) => {
        if (a.containerRank !== b.containerRank) return b.containerRank - a.containerRank;
        return b.score - a.score;
    });
    return candidates.map((candidate) => candidate.file);
}

export function pickBestPlayableFile(files: ArchiveFile[], allowMkv: boolean) {
    const ranked = rankPlayableFiles(files, allowMkv);
    return ranked[0] ?? null;
}
