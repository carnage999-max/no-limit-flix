type DateInput = Date | string | number;

const DEFAULT_LOCALE = 'en-US';

const toDate = (value: DateInput): Date => (value instanceof Date ? value : new Date(value));

const resolveLocale = (locale?: string | string[]): string | string[] => {
    if (locale) return locale;
    if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
    return DEFAULT_LOCALE;
};

export const formatDate = (
    value: DateInput,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
    locale?: string | string[]
): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(resolveLocale(locale), options).format(date);
};

export const formatDateTime = (
    value: DateInput,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
    locale?: string | string[]
): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(resolveLocale(locale), options).format(date);
};

const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
];

export const formatRelativeTime = (value: DateInput, locale?: string | string[]): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = date.getTime() - Date.now();
    const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: 'auto' });

    for (const { unit, ms } of RELATIVE_UNITS) {
        if (Math.abs(diffMs) >= ms) {
            return rtf.format(Math.round(diffMs / ms), unit);
        }
    }
    return rtf.format(Math.round(diffMs / 1000), 'second');
};
