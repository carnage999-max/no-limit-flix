import { verifyMediaRequest } from '../../../lib/media-signing.ts';

// Called by nginx (auth_request) for every /media/s/... request. It only checks the signature and
// expiry in the URL: no session or database, so players that send no cookies (mobile) are fine.
export const dynamic = 'force-dynamic';

const check = (request: Request) => {
    const secret = process.env.MEDIA_SIGNING_SECRET;
    const originalUri = request.headers.get('x-original-uri') || '';
    const verdict = secret ? verifyMediaRequest(originalUri, secret) : { ok: false as const };

    // auth_request only understands 2xx (allow) and 401/403 (deny); expiry is reported as 403 too.
    return new Response(null, {
        status: verdict.ok ? 204 : 403,
        headers: { 'Cache-Control': 'no-store' },
    });
};

export const GET = check;
export const HEAD = check;
