const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const getApiKey = () => {
    return process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
};

const stripYear = (value) => {
    if (!value) return '';
    return value.replace(/\((19|20)\d{2}\)/g, '').replace(/\b(19|20)\d{2}\b/g, '');
};

const normalizeTitle = (value) => {
    if (!value) return '';
    const cleaned = stripYear(String(value))
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    return cleaned.replace(/^(the|a|an)\s+/i, '');
};

const sanitizeSearchTitle = (value) => {
    if (!value) return '';
    let cleaned = String(value);
    cleaned = cleaned.replace(/\.[a-z0-9]+$/i, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
    cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
    cleaned = cleaned.replace(/\b(480|720|1080|2160)p\b/gi, ' ');
    cleaned = cleaned.replace(/\b(x264|x265|h264|h265|hevc|hdrip|webrip|web|dvdrip|bluray|brrip|hd|sd|uhd)\b/gi, ' ');
    cleaned = cleaned.replace(/[_-]+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
};

const parseYear = (value) => {
    if (!value) return null;
    const match = String(value).match(/(19|20)\d{2}/);
    return match ? Number(match[0]) : null;
};

const yearsMatch = (a, b, tolerance = 1) => {
    if (!a || !b) return true;
    return Math.abs(a - b) <= tolerance;
};

const resolveYearHint = (title, ...sources) => {
    for (const source of sources) {
        const year = parseYear(source);
        if (year) return year;
    }
    return parseYear(title);
};

const getCandidateYear = (item) => parseYear(
    item?.release_date || item?.first_air_date || item?.Year
);

const scoreCandidate = (candidate, target, candidateYear, targetYear) => {
    if (!candidate || !target) return 0;
    let score = 0;
    if (candidate === target) score += 5;
    if (candidate.startsWith(target) || target.startsWith(candidate)) score += 3;
    if (candidate.includes(target) || target.includes(candidate)) score += 2;

    if (targetYear && candidateYear) {
        const delta = Math.abs(candidateYear - targetYear);
        if (delta === 0) score += 4;
        else if (delta === 1) score += 2;
        else if (delta <= 3) score += 1;
        else score -= 8;
    }

    return score;
};

const compareCandidates = (a, b, targetYear, preferOlder = false) => {
    if (b.score !== a.score) return b.score - a.score;

    const aYear = getCandidateYear(a.item);
    const bYear = getCandidateYear(b.item);

    if (targetYear) {
        const aDist = aYear ? Math.abs(aYear - targetYear) : Number.POSITIVE_INFINITY;
        const bDist = bYear ? Math.abs(bYear - targetYear) : Number.POSITIVE_INFINITY;
        if (aDist !== bDist) return aDist - bDist;
        if (aYear && bYear && aYear !== bYear) return aYear - bYear;
    } else if (preferOlder && aYear && bYear && aYear !== bYear) {
        return aYear - bYear;
    }

    return 0;
};

const pickBestScoredCandidate = (scored, { year, minScore, requirePosterPath = true }) => {
    for (const entry of scored) {
        if (entry.score < minScore) continue;
        if (requirePosterPath && !entry.item?.poster_path) continue;
        const candidateYear = getCandidateYear(entry.item);
        if (year && candidateYear && !yearsMatch(candidateYear, year)) continue;
        return entry;
    }
    return null;
};

const pickBestOmdbSearchCandidate = (scored, { year, minScore }) => {
    for (const entry of scored) {
        if (entry.score < minScore) continue;
        if (!entry.item?.imdbID) continue;
        const candidateYear = getCandidateYear(entry.item);
        if (year && candidateYear && !yearsMatch(candidateYear, year)) continue;
        return entry;
    }
    return null;
};

const fetchJson = async (url) => {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return response.json();
};

async function findCatalogPoster({ title, year, type, minScore = 3, ignoreYear = false }) {
    const apiKey = getApiKey();
    if (!apiKey || !title) return null;

    const safeTitle = sanitizeSearchTitle(title) || title;
    const endpoint = type === 'series' ? 'tv' : 'movie';
    const params = new URLSearchParams({
        api_key: apiKey,
        query: safeTitle,
    });

    if (year && !ignoreYear) {
        params.set(type === 'series' ? 'first_air_date_year' : 'year', String(year));
    }

    const data = await fetchJson(`${TMDB_BASE_URL}/search/${endpoint}?${params.toString()}`);
    const results = data?.results || [];
    if (!results.length) return null;

    const normalizedTarget = normalizeTitle(title);
    const preferOlder = type === 'movie' && !year;

    const scored = results.map((item) => {
        const candidateTitle = item?.title || item?.name || '';
        const normalizedCandidate = normalizeTitle(candidateTitle);
        const candidateYear = getCandidateYear(item);
        const score = scoreCandidate(normalizedCandidate, normalizedTarget, candidateYear, year);
        return { item, score };
    });

    scored.sort((a, b) => compareCandidates(a, b, year, preferOlder));
    const best = pickBestScoredCandidate(scored, { year, minScore });

    if (!best) return null;

    return {
        posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
        tmdbId: String(best.item.id),
        releaseYear: getCandidateYear(best.item),
    };
}

const fetchOmdbJson = async (params) => {
    return fetchJson(`https://www.omdbapi.com/?${params.toString()}`);
};

const resolveOmdbDetails = async ({ title, type, year = null }) => {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const safeTitle = sanitizeSearchTitle(title) || title;

    const params = new URLSearchParams({
        apikey: apiKey,
        t: safeTitle,
    });
    if (type === 'series') params.set('type', 'series');
    if (type === 'movie') params.set('type', 'movie');
    if (year) params.set('y', String(year));

    let data = await fetchOmdbJson(params);
    if (data && data.Response !== 'False' && year) {
        const matchedYear = parseYear(data.Year);
        if (matchedYear && !yearsMatch(matchedYear, year)) {
            data = null;
        }
    }

    if (!data || data.Response === 'False') {
        const searchParams = new URLSearchParams({
            apikey: apiKey,
            s: safeTitle,
        });
        if (type === 'series') searchParams.set('type', 'series');
        if (type === 'movie') searchParams.set('type', 'movie');
        if (year) searchParams.set('y', String(year));

        const searchData = await fetchOmdbJson(searchParams);
        const results = searchData?.Search || [];
        if (!results.length) return null;

        const target = normalizeTitle(safeTitle);
        const scored = results.map((item) => {
            const candidateTitle = item?.Title || '';
            const candidateYear = parseYear(item?.Year);
            const score = scoreCandidate(normalizeTitle(candidateTitle), target, candidateYear, year);
            return { item, score };
        });
        scored.sort((a, b) => compareCandidates(a, b, year, type === 'movie' && !year));
        const best = pickBestOmdbSearchCandidate(scored, { year, minScore: 2 });
        if (!best?.item?.imdbID) return null;

        const detailParams = new URLSearchParams({
            apikey: apiKey,
            i: best.item.imdbID,
            plot: 'short',
        });
        data = await fetchOmdbJson(detailParams);
        if (!data || data.Response === 'False') return null;
    }

    return {
        title: data.Title || null,
        year: data.Year || null,
        genre: data.Genre || null,
        rated: data.Rated || null,
        plot: data.Plot || null,
        imdbRating: data.imdbRating || null,
        imdbVotes: data.imdbVotes || null,
        imdbId: data.imdbID || null,
        poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : null,
    };
};

async function findOmdbPoster({ title, year, type }) {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const details = await resolveOmdbDetails({ title, type, year });
    if (!details) return null;

    if (year) {
        const matchedYear = parseYear(details.year);
        if (matchedYear && !yearsMatch(matchedYear, year)) return null;
    }

    const imdbId = details.imdbId;
    if (imdbId) {
        return {
            posterUrl: `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&h=600&apikey=${encodeURIComponent(apiKey)}`,
            tmdbId: null,
            releaseYear: parseYear(details.year),
            source: 'omdb',
        };
    }

    if (!details.poster) return null;
    return {
        posterUrl: details.poster,
        tmdbId: null,
        releaseYear: parseYear(details.year),
        source: 'omdb',
    };
}

async function findWikipediaPoster({ title, year, type }) {
    if (!title) return null;
    const intent = type === 'series' ? 'tv series' : 'film';
    const search = `${sanitizeSearchTitle(title) || title} ${year || ''} ${intent}`.trim();

    const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: search,
        srlimit: '5',
        format: 'json',
        origin: '*'
    });

    const searchData = await fetchJson(`https://en.wikipedia.org/w/api.php?${searchParams.toString()}`);
    const hits = searchData?.query?.search || [];
    if (!hits.length) return null;

    const pageIds = hits.map((hit) => hit.pageid).filter(Boolean);
    if (!pageIds.length) return null;

    const imageParams = new URLSearchParams({
        action: 'query',
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: '500',
        format: 'json',
        pageids: pageIds.join(','),
        origin: '*'
    });

    const imageData = await fetchJson(`https://en.wikipedia.org/w/api.php?${imageParams.toString()}`);
    const pages = imageData?.query?.pages || {};

    for (const pageId of pageIds) {
        const page = pages[pageId];
        if (page?.thumbnail?.source) {
            return { posterUrl: page.thumbnail.source, tmdbId: null, source: 'wikipedia' };
        }
    }

    return null;
}

async function findBestPoster({ title, year, type }) {
    const yearHint = year ?? parseYear(title);

    let poster = await findOmdbPoster({ title, year: yearHint, type });
    if (!poster) {
        poster = await findCatalogPoster({
            title,
            year: yearHint,
            type,
            minScore: yearHint ? 3 : 2,
            ignoreYear: !yearHint,
        });
    }
    if (!poster && yearHint) {
        poster = await findCatalogPoster({
            title,
            year: yearHint,
            type,
            minScore: 2,
            ignoreYear: true,
        });
    }
    if (!poster) {
        poster = await findWikipediaPoster({ title, year: yearHint, type });
    }
    return poster;
}

module.exports = {
    findCatalogPoster,
    findBestPoster,
    findOmdbPoster,
    findWikipediaPoster,
    resolveOmdbDetails,
    resolveYearHint,
    parseYear,
};
