/**
 * Compares films by title so the same movie uploaded under a different Internet Archive
 * identifier (or imported earlier through a bundle) is recognised as already in the library.
 */

const NOISE = /\b(full\s+(movie|film|feature)|hd|restored|remastered|public\s+domain|\d{3,4}p)\b/g;
const TRAILING_YEAR = /\s(18|19|20)\d{2}$/;
const PAREN_YEAR = /\((18|19|20)\d{2}\)/;

export const titleKey = (title?: string | null) => {
    if (!title) return '';
    let key = title
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/\.(mp4|mkv|avi|mov|ogv|m4v)$/, '')
        .replace(/\(.*?\)|\[.*?\]/g, ' ')
        .replace(NOISE, ' ')
        .replace(/['’`]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const withoutYear = key.replace(TRAILING_YEAR, '');
    if (withoutYear) key = withoutYear;
    return key.replace(/^(the|a|an)\s+/, '').trim();
};

/** Release year from the archive's `year` field, falling back to "(1950)" in the title. */
export const releaseYearOf = (year?: unknown, title?: string | null) => {
    const fromField = Number(String(year ?? '').match(/\d{4}/)?.[0]);
    if (Number.isFinite(fromField) && fromField > 1800) return fromField;
    const fromTitle = title?.match(PAREN_YEAR)?.[0].match(/\d{4}/)?.[0];
    return fromTitle ? Number(fromTitle) : null;
};

export type TitleIndex = Map<string, Array<number | null>>;

export const buildTitleIndex = (rows: Array<{ title: string; releaseYear: number | null }>): TitleIndex => {
    const index: TitleIndex = new Map();
    for (const row of rows) {
        const key = titleKey(row.title);
        if (!key) continue;
        const years = index.get(key);
        if (years) years.push(row.releaseYear);
        else index.set(key, [row.releaseYear]);
    }
    return index;
};

/**
 * True when the library already holds a film with this title. Years are compared when both are
 * known (one year of slack for archive metadata noise), so remakes with the same title still pass.
 */
export const isKnownFilm = (index: TitleIndex, title?: string | null, year?: number | null) => {
    const key = titleKey(title);
    if (!key) return false;
    const years = index.get(key);
    if (!years) return false;
    if (year == null) return true;
    return years.some((existing) => existing == null || Math.abs(existing - year) <= 1);
};
