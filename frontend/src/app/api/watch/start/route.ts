import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  generateCloudFrontSignedCookie,
  generateCloudFrontSignedURL,
} from '@/lib/cloudfront-signed';

interface WatchStartRequest {
  assetId: string;
}

interface WatchStartResponse {
  success: boolean;
  playbackUrl: string;
  playbackType: 'mp4' | 'hls';
  expiresAt: string;
  cookieHeader?: string; // For browser-based playback
}

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
    const { assetId } = body;

    if (!assetId) {
      return NextResponse.json(
        { error: 'assetId is required' },
        { status: 400 }
      );
    }

    // Fetch video from database
    const video = await prisma.video.findUnique({
      where: { id: assetId },
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

    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (!cloudfrontDomain) {
      console.error('Missing CLOUDFRONT_DOMAIN env var');
      return NextResponse.json(
        { error: 'Playback configuration error' },
        { status: 500 }
      );
    }

    let playbackUrl: string;
    let cookieHeader: string | undefined;
    let expiresAt: Date;

    // Handle HLS playback
    if (video.playbackType === 'hls') {
      // For HLS, we use signed cookies to authorize the manifest + all segments
      const resourcePath = `/${video.cloudfrontPath}`;
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
      const resourcePath = `/${video.cloudfrontPath}`;
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

  if (!assetId) {
    return NextResponse.json(
      { error: 'assetId query parameter is required' },
      { status: 400 }
    );
  }

  return POST(new NextRequest(request, { body: JSON.stringify({ assetId }) }));
}
