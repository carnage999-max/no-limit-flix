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

    if (video.sourceType === 'external_legal' || video.sourceProvider === 'internet_archive') {
      const playbackUrl = video.s3Url || video.cloudfrontPath;
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
      } catch (e) {
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

  if (!assetId) {
    return NextResponse.json(
      { error: 'assetId query parameter is required' },
      { status: 400 }
    );
  }

  return POST(new NextRequest(request, { body: JSON.stringify({ assetId }) }));
}
