const IA_BASE = 'https://archive.org';
const ARCHIVE_FETCH_RETRIES = 2;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const decodeHtmlEntities = (value) =>
    String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

const parseDetailsFallback = (identifier, html) => {
    const files = new Map();
    const linkPattern = /href=["']([^"']+)["']/gi;
    let match;

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
            title: titleMatch
                ? decodeHtmlEntities(titleMatch[1]).replace(/\s*:\s*Internet Archive.*$/i, '').trim()
                : identifier,
            year: yearMatch?.[1] || null,
            description: descriptionMatch ? decodeHtmlEntities(descriptionMatch[1]).trim() : null,
            mediatype: 'movies',
        },
        files: Array.from(files.values()),
    };
};

const fetchDetailsFallback = async (identifier) => {
    const response = await fetch(`${IA_BASE}/details/${identifier}`, {
        headers: { 'Accept': 'text/html' },
    });

    if (!response.ok) {
        throw new Error(`Internet Archive details fallback failed (${response.status})`);
    }

    return parseDetailsFallback(identifier, await response.text());
};

const normalizeNumber = (value) => {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toLower = (value) => (value || '').toLowerCase();

const isPlayableName = (name) => {
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

const inferMimeType = (file) => {
    if (file.mime) return file.mime;
    const name = toLower(file.name);
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.mkv')) return 'video/x-matroska';
    return null;
};

const isVideoFormat = (file) => {
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

const isMp4 = (file) => {
    const name = toLower(file.name);
    const mime = toLower(file.mime);
    return name.endsWith('.mp4') || mime === 'video/mp4';
};

const isMkv = (file) => {
    const name = toLower(file.name);
    const format = toLower(file.format);
    const mime = toLower(file.mime);
    return name.endsWith('.mkv') || format.includes('matroska') || mime === 'video/x-matroska';
};

const isVideoCandidate = (file) => {
    if (!file?.name) return false;
    if (!isPlayableName(file.name)) return false;
    const mime = inferMimeType(file);
    if (mime && mime.startsWith('video/')) return true;
    if (isVideoFormat(file)) return true;
    return false;
};

const buildArchiveDownloadUrl = (identifier, fileName) => {
    let safeName = fileName;
    try {
        safeName = decodeURIComponent(fileName);
    } catch {
        safeName = fileName;
    }
    const encodedName = encodeURIComponent(safeName);
    return `${IA_BASE}/download/${identifier}/${encodedName}`;
};

async function searchArchiveIdentifiers(query, limit, page = 1) {
    const target = Math.min(Math.max(limit, 1), 1000);
    const rows = Math.min(100, target);
    const identifiers = [];
    const seen = new Set();
    let currentPage = Math.max(1, Number(page) || 1);

    while (identifiers.length < target) {
        const url = new URL(`${IA_BASE}/advancedsearch.php`);
        url.searchParams.set('q', query);
        url.searchParams.set('fl[]', 'identifier');
        url.searchParams.set('rows', rows.toString());
        url.searchParams.set('page', String(currentPage));
        url.searchParams.set('output', 'json');

        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Internet Archive search failed (${response.status})`);
        }

        const data = await response.json();
        const docs = data?.response?.docs || [];
        if (docs.length === 0) break;

        for (const doc of docs) {
            const identifier = doc?.identifier;
            if (!identifier || seen.has(identifier)) continue;
            seen.add(identifier);
            identifiers.push(identifier);
            if (identifiers.length >= target) break;
        }

        if (docs.length < rows) break;
        currentPage += 1;
    }

    return identifiers;
}

async function fetchArchiveMetadata(identifier) {
    let lastError = null;

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

function rankPlayableFiles(files, allowMkv) {
    const filtered = files.filter((file) => {
        if (!isVideoCandidate(file)) return false;
        if (isMp4(file)) return true;
        if (allowMkv && isMkv(file)) return true;
        return false;
    });

    if (filtered.length === 0) return null;

    const candidates = filtered.map((file) => {
        const width = normalizeNumber(file.width) || 0;
        const height = normalizeNumber(file.height) || 0;
        const bitrate = normalizeNumber(file.bitrate) || 0;
        const size = normalizeNumber(file.size) || 0;
        const preferred = isMp4(file) ? 1 : 0;
        const format = toLower(file.format);
        const mime = inferMimeType(file) || '';
        const duration = normalizeNumber(file.length) || 0;

        const codecBoost = format.includes('h.264') || format.includes('h264') || format.includes('avc') ? 500000 : 0;
        const mp4Boost = preferred ? 1000000 : 0;
        const mimeBoost = mime === 'video/mp4' ? 200000 : 0;

        let bitratePenalty = 0;
        if (duration > 0 && size > 0) {
            const computedBitrate = (size * 8) / duration;
            if (computedBitrate < 150000) bitratePenalty = 200000;
            if (computedBitrate > 50000000) bitratePenalty = 400000;
        }

        const score = mp4Boost + codecBoost + mimeBoost
            + (height * 1000)
            + (width * 10)
            + (bitrate * 2)
            + (size / 1024)
            - bitratePenalty;

        return { file, score };
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates.map((candidate) => candidate.file);
}

function pickBestPlayableFile(files, allowMkv) {
    const ranked = rankPlayableFiles(files, allowMkv);
    return ranked[0] || null;
}

module.exports = {
    buildArchiveDownloadUrl,
    fetchArchiveMetadata,
    pickBestPlayableFile,
    rankPlayableFiles,
    searchArchiveIdentifiers,
    inferMimeType
};
