import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';
import {
  generateCloudFrontSignedCookie,
  generateCloudFrontSignedURL,
} from '@/lib/cloudfront-signed';
import { transformToCloudFront } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth-server';

interface WatchStartRequest {
  assetId?: string;
  reelId?: string;
}

interface WatchStartResponse {
  success: boolean;
  playbackUrl: string;
  playbackType: 'mp4' | 'hls';
  expiresAt: string;
  cookieHeader?: string; // For browser-based playback
}

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const hasValidReelsClientHeaders = (request: NextRequest) => {
  const expectedId = process.env.REELS_CLIENT_ID || '';
  const expectedSecret = process.env.REELS_CLIENT_SECRET || '';
  if (!expectedId || !expectedSecret) return false;

  const providedId = request.headers.get('x-reels-client-id')
    || request.headers.get('x-client-id')
    || '';
  const providedSecret = request.headers.get('x-reels-client-secret')
    || request.headers.get('x-client-secret')
    || '';

  if (!providedId || !providedSecret) return false;
  return safeEqual(providedId, expectedId) && safeEqual(providedSecret, expectedSecret);
};

const normalizeResourcePath = (rawPath: string) => {
  let resourcePath = rawPath;
  if (resourcePath.startsWith('http')) {
    try {
      resourcePath = new URL(resourcePath).pathname;
    } catch {
      // keep as-is below
    }
  }
  if (!resourcePath.startsWith('/')) {
    resourcePath = `/${resourcePath}`;
  }
  return resourcePath;
};

const getCloudFrontDomain = () => {
  const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || process.env.CLOUDFRONT_URL;
  if (!cloudfrontUrl) return null;
  return cloudfrontUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
};

/**
 * POST /api/watch/start
 * 
 * Generates signed playback URL/cookies for video access
 * 
 * Request body:
 * {
 *   "assetId": "video-uuid"
 * }
 * 
 * Response:
 * {
 *   "playbackUrl": "https://cdn.example.com/videos/...",
 *   "playbackType": "hls" | "mp4",
 *   "expiresAt": "2026-02-21T12:15:00Z",
 *   "cookieHeader": "CloudFront-Policy=...; ..." // For HLS in browser
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WatchStartRequest;
    const assetId = body?.assetId || null;
    const reelId = body?.reelId || null;
    const reelsClientAuth = hasValidReelsClientHeaders(request);
    let sessionUser = null;

    // Only resolve session when needed; reel-client auth can bypass this for reel playback.
    if (assetId || !reelsClientAuth) {
      sessionUser = await getSessionUser(request);
    }

    if (!assetId && !reelId) {
      return NextResponse.json(
        { error: 'assetId or reelId is required' },
        { status: 400 }
      );
    }

    if (assetId && !sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (reelId && !sessionUser && !reelsClientAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (reelId) {
      const reel = await prisma.reel.findUnique({
        where: { id: reelId },
        select: {
          id: true,
          status: true,
          playbackType: true,
          cloudfrontPath: true,
          s3Url: true,
        }
      });

      if (!reel) {
        return NextResponse.json(
          { error: 'Reel not found' },
          { status: 404 }
        );
      }

      if (reel.status !== 'completed') {
        return NextResponse.json(
          { error: 'Reel is not ready for playback' },
          { status: 403 }
        );
      }

      const cloudfrontDomain = getCloudFrontDomain();
      if (!cloudfrontDomain) {
        return NextResponse.json(
          { error: 'Playback configuration error' },
          { status: 500 }
        );
      }

      let resourcePath = reel.cloudfrontPath || '';
      if (!resourcePath && reel.s3Url) {
        const transformed = transformToCloudFront(reel.s3Url);
        if (transformed) {
          try {
            resourcePath = new URL(transformed).pathname;
          } catch {
            resourcePath = transformed;
          }
        }
      }

      if (!resourcePath) {
        return NextResponse.json(
          { error: 'Playback URL missing for reel asset' },
          { status: 500 }
        );
      }

      resourcePath = normalizeResourcePath(resourcePath);
      const playbackType = (reel.playbackType || 'mp4') as 'mp4' | 'hls';

      let playbackUrl = '';
      let cookieHeader: string | undefined;
      let expiresAt: Date;

      if (playbackType === 'hls') {
        const cookie = generateCloudFrontSignedCookie(
          `https://${cloudfrontDomain}${resourcePath}*`,
          10
        );
        playbackUrl = `https://${cloudfrontDomain}${resourcePath}`;
        cookieHeader = cookie.cookieValue;
        expiresAt = cookie.expiresAt;
      } else {
        const signed = generateCloudFrontSignedURL(
          cloudfrontDomain,
          resourcePath,
          10
        );
        playbackUrl = signed.url;
        expiresAt = signed.expiresAt;
      }

      const response: WatchStartResponse = {
        success: true,
        playbackUrl,
        playbackType,
        expiresAt: expiresAt.toISOString(),
        ...(cookieHeader && { cookieHeader }),
      };

      return NextResponse.json(response, { status: 200 });
    }

    // Fetch video from database
    const video = await prisma.video.findUnique({
      where: { id: assetId! },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    if (video.status !== 'completed') {
      return NextResponse.json(
        { error: 'Video is not ready for playback' },
        { status: 403 }
      );
    }

    if (video.sourceType === 'external_legal' || video.sourceProvider === 'internet_archive') {
      let playbackUrl = video.s3Url ? transformToCloudFront(video.s3Url) : '';
      if (!playbackUrl && video.cloudfrontPath) {
        const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL || '';
        let resourcePath = video.cloudfrontPath;
        if (resourcePath.startsWith('http')) {
          playbackUrl = resourcePath;
        } else if (cloudfrontUrl) {
          if (!resourcePath.startsWith('/')) {
            resourcePath = '/' + resourcePath;
          }
          const cfBase = cloudfrontUrl.replace(/\/$/, '');
          playbackUrl = `${cfBase}${resourcePath}`;
        }
      }
      if (!playbackUrl) {
        return NextResponse.json(
          { error: 'Playback URL missing for external asset' },
          { status: 500 }
        );
      }

      const response: WatchStartResponse = {
        success: true,
        playbackUrl,
        playbackType: 'mp4',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      return NextResponse.json(response, { status: 200 });
    }

    const cloudfrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    if (!cloudfrontUrl) {
      console.error('Missing NEXT_PUBLIC_CLOUDFRONT_URL env var');
      return NextResponse.json(
        { error: 'Playback configuration error' },
        { status: 500 }
      );
    }
    // Remove https:// if present to get just the domain
    const cloudfrontDomain = cloudfrontUrl.replace(/^https?:\/\//, '');

    let playbackUrl: string;
    let cookieHeader: string | undefined;
    let expiresAt: Date;

    // Extract the path from cloudfrontPath (handle both full URLs and paths)
    let resourcePath = video.cloudfrontPath;
    if (resourcePath.startsWith('http')) {
      // If it's a full URL, extract just the path
      try {
        const url = new URL(resourcePath);
        resourcePath = url.pathname;
      } catch {
        console.warn('Invalid URL in cloudfrontPath, using as-is:', resourcePath);
      }
    }
    // Ensure path starts with /
    if (!resourcePath.startsWith('/')) {
      resourcePath = '/' + resourcePath;
    }

    // Handle HLS playback
    if (video.playbackType === 'hls') {
      // For HLS, we use signed cookies to authorize the manifest + all segments
      const cookie = generateCloudFrontSignedCookie(
        `https://${cloudfrontDomain}${resourcePath}*`, // Wildcard for all segments
        10 // 10-minute expiry
      );

      playbackUrl = `https://${cloudfrontDomain}${resourcePath}`;
      cookieHeader = cookie.cookieValue;
      expiresAt = cookie.expiresAt;
    }
    // Handle MP4 fallback
    else {
      // For MP4, use signed URL (simpler, doesn't need cookies)
      const signed = generateCloudFrontSignedURL(
        cloudfrontDomain,
        resourcePath,
        10 // 10-minute expiry
      );

      playbackUrl = signed.url;
      expiresAt = signed.expiresAt;
    }

    const response: WatchStartResponse = {
      success: true,
      playbackUrl,
      playbackType: video.playbackType as 'mp4' | 'hls',
      expiresAt: expiresAt.toISOString(),
      ...(cookieHeader && { cookieHeader }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Watch start error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate playback URL',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/watch/start?assetId=...
 * Alternative GET endpoint for convenience
 */
export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get('assetId');
  const reelId = request.nextUrl.searchParams.get('reelId');

  if (!assetId && !reelId) {
    return NextResponse.json(
      { error: 'assetId or reelId query parameter is required' },
      { status: 400 }
    );
  }

  return POST(new NextRequest(request, { body: JSON.stringify({ assetId: assetId || undefined, reelId: reelId || undefined }) }));
}
