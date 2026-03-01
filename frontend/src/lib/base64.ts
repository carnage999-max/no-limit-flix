export const safeBtoa = (value: string) => {
    if (typeof window === 'undefined') {
        return Buffer.from(value, 'utf-8').toString('base64');
    }
    // Encode as UTF-8 before base64 to avoid InvalidCharacterError
    return btoa(unescape(encodeURIComponent(value)));
};

export const safeAtob = (value: string) => {
    if (typeof window === 'undefined') {
        return Buffer.from(value, 'base64').toString('utf-8');
    }
    return decodeURIComponent(escape(atob(value)));
};
