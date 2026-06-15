import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { getSessionUser } from '@/lib/auth-server';
import { isReviewSafeVideo } from '@/lib/review-safety';

interface WatchStartRequest {
  assetId?: string;
  reelId?: string;
}

interface WatchStartResponse {
  success: boolean;
  playbackUrl: string;
  playbackType: 'mp4' | 'hls';
  expiresAt: string;
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
 *   "playbackUrl": "https://nolimitflix.com/media/videos/...",
 *   "playbackType": "hls" | "mp4",
 *   "expiresAt": "2026-02-21T12:15:00Z"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WatchStartRequest;
    const assetId = body?.assetId || null;
    const reelId = body?.reelId || null;
    const sessionUser = await getSessionUser(request);

    if (!assetId && !reelId) {
      return NextResponse.json(
        { error: 'assetId or reelId is required' },
        { status: 400 }
      );
    }

    if (assetId && !sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (reelId && !sessionUser) {
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
          s3KeyPlayback: true,
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

      const playbackUrl = resolveMediaUrl(reel.s3Url || reel.cloudfrontPath || reel.s3KeyPlayback);
      if (!playbackUrl) {
        return NextResponse.json(
          { error: 'Playback URL missing for reel asset' },
          { status: 500 }
        );
      }
      const playbackType = (reel.playbackType || 'mp4') as 'mp4' | 'hls';

      const response: WatchStartResponse = {
        success: true,
        playbackUrl,
        playbackType,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
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

    if (!isReviewSafeVideo(video)) {
      return NextResponse.json(
        { error: 'Video not available for playback' },
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
      const playbackUrl = resolveMediaUrl(video.s3Url || video.cloudfrontPath);
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

    const playbackUrl = resolveMediaUrl(video.s3Url || video.cloudfrontPath || video.s3KeyPlayback);
    if (!playbackUrl) {
      return NextResponse.json(
        { error: 'Playback configuration error' },
        { status: 500 }
      );
    }

    const response: WatchStartResponse = {
      success: true,
      playbackUrl,
      playbackType: video.playbackType as 'mp4' | 'hls',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
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
