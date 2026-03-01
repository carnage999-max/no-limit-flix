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

const scoreCandidate = (candidate, target, candidateYear, targetYear) => {
    if (!candidate || !target) return 0;
    let score = 0;
    if (candidate === target) score += 5;
    if (candidate.startsWith(target) || target.startsWith(candidate)) score += 3;
    if (candidate.includes(target) || target.includes(candidate)) score += 2;

    if (targetYear && candidateYear) {
        if (candidateYear === targetYear) score += 2;
        if (Math.abs(candidateYear - targetYear) === 1) score += 1;
    }

    return score;
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

    const scored = results.map((item) => {
        const candidateTitle = item?.title || item?.name || '';
        const normalizedCandidate = normalizeTitle(candidateTitle);
        const candidateYear = parseYear(item?.release_date || item?.first_air_date);
        const score = scoreCandidate(normalizedCandidate, normalizedTarget, candidateYear, year);
        return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score < minScore || !best.item?.poster_path) return null;

    return {
        posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
        tmdbId: String(best.item.id),
    };
}

const fetchOmdbJson = async (params) => {
    return fetchJson(`https://www.omdbapi.com/?${params.toString()}`);
};

const resolveOmdbDetails = async ({ title, type }) => {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const safeTitle = sanitizeSearchTitle(title) || title;

    const params = new URLSearchParams({
        apikey: apiKey,
        t: safeTitle,
    });
    if (type === 'series') params.set('type', 'series');
    if (type === 'movie') params.set('type', 'movie');

    let data = await fetchOmdbJson(params);
    if (!data || data.Response === 'False') {
        const searchParams = new URLSearchParams({
            apikey: apiKey,
            s: safeTitle,
        });
        if (type === 'series') searchParams.set('type', 'series');
        if (type === 'movie') searchParams.set('type', 'movie');

        const searchData = await fetchOmdbJson(searchParams);
        const results = searchData?.Search || [];
        if (!results.length) return null;

        const target = normalizeTitle(safeTitle);
        const scored = results.map((item) => {
            const candidateTitle = item?.Title || '';
            const score = scoreCandidate(normalizeTitle(candidateTitle), target, null, null);
            return { item, score };
        });
        scored.sort((a, b) => b.score - a.score);
        const best = scored[0]?.item;
        if (!best?.imdbID) return null;

        const detailParams = new URLSearchParams({
            apikey: apiKey,
            i: best.imdbID,
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

    const details = await resolveOmdbDetails({ title, type });
    if (!details) return null;

    const imdbId = details.imdbId;
    if (imdbId) {
        return {
            posterUrl: `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&h=600&apikey=${encodeURIComponent(apiKey)}`,
            tmdbId: null,
            source: 'omdb',
        };
    }

    if (!details.poster) return null;
    return { posterUrl: details.poster, tmdbId: null, source: 'omdb' };
}

async function findWikipediaPoster({ title, year, type }) {
    if (!title) return null;
    const intent = type === 'series' ? 'tv series' : 'film';
    const search = `${title} ${year || ''} ${intent}`.trim();

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
    let poster = await findOmdbPoster({ title, year: null, type });
    if (!poster) {
        poster = await findCatalogPoster({ title, year: null, type, minScore: 2, ignoreYear: true });
    }
    if (!poster) {
        poster = await findWikipediaPoster({ title, year: null, type });
    }
    return poster;
}

module.exports = {
    findCatalogPoster,
    findBestPoster,
    findOmdbPoster,
    findWikipediaPoster,
    resolveOmdbDetails,
};
