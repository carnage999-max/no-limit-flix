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

async function findCatalogPoster({ title, year, type }) {
    const apiKey = getApiKey();
    if (!apiKey || !title) return null;

    const endpoint = type === 'series' ? 'tv' : 'movie';
    const params = new URLSearchParams({
        api_key: apiKey,
        query: title,
    });

    if (year) {
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

    if (!best || best.score < 3 || !best.item?.poster_path) return null;

    return {
        posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
        tmdbId: String(best.item.id),
    };
}

module.exports = {
    findCatalogPoster,
};
