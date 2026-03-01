const detectBrowser = (ua: string) => {
    const lower = ua.toLowerCase();
    if (lower.includes('edg/')) return 'Edge';
    if (lower.includes('chrome/') && !lower.includes('edg/')) return 'Chrome';
    if (lower.includes('safari/') && !lower.includes('chrome/')) return 'Safari';
    if (lower.includes('firefox/')) return 'Firefox';
    return 'Browser';
};

const detectOS = (ua: string) => {
    const lower = ua.toLowerCase();
    if (lower.includes('android')) return 'Android';
    if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios')) return 'iOS';
    if (lower.includes('windows')) return 'Windows';
    if (lower.includes('mac os')) return 'macOS';
    if (lower.includes('linux')) return 'Linux';
    return 'Unknown OS';
};

const detectDeviceType = (ua: string) => {
    const lower = ua.toLowerCase();
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) return 'Mobile';
    if (lower.includes('ipad') || lower.includes('tablet')) return 'Tablet';
    return 'Desktop';
};

export const parseUserAgent = (ua?: string | null) => {
    if (!ua) {
        return {
            browser: 'Browser',
            os: 'Unknown OS',
            deviceType: 'Desktop',
            deviceLabel: 'Unknown device',
        };
    }
    const browser = detectBrowser(ua);
    const os = detectOS(ua);
    const deviceType = detectDeviceType(ua);
    return {
        browser,
        os,
        deviceType,
        deviceLabel: `${os} · ${browser}`,
    };
};

const isPrivateIp = (ip: string) => {
    if (ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('192.168.')) return true;
    if (ip.startsWith('172.')) {
        const second = Number(ip.split('.')[1]);
        return second >= 16 && second <= 31;
    }
    return false;
};

export const lookupLocation = async (ip?: string | null) => {
    if (!ip || isPrivateIp(ip)) return null;
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(2500),
        });
        if (!response.ok) return null;
        const data = await response.json();
        if (data?.error) return null;
        return {
            city: data?.city || null,
            region: data?.region || null,
            country: data?.country_name || data?.country || null,
        };
    } catch {
        return null;
    }
};
