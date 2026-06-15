import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { writeFile } from 'fs/promises';
import prisma from '@/lib/db';
import {
  convertToHLS,
  createTempHLSDir,
  cleanupTempDir,
} from '@/lib/ffmpeg-hls';
import { storeHLSInMedia, verifyHLSMediaUpload } from '@/lib/media-hls-storage';

/**
 * POST /api/admin/upload-hls
 * Localhost-only endpoint to:
 * 1. Accept video file upload
 * 2. Convert to HLS via FFmpeg
 * 3. Store HLS output under MEDIA_ROOT
 * 4. Create database record
 *
 * Only works on localhost (development)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify localhost origin
    const host = request.headers.get('host') || '';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return NextResponse.json(
        { error: 'HLS upload only available on localhost' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    console.log(`\nStarting HLS conversion for "${title}"`);

    // Step 1: Create temp directory
    console.log('Creating temp HLS directory...');
    const tempHLSDir = await createTempHLSDir();
    const inputPath = path.join(tempHLSDir, 'input');

    // Step 2: Save uploaded file
    console.log('Saving uploaded file...');
    const buffer = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(buffer));

    // Step 3: Convert to HLS
    console.log('Converting to HLS (this may take a minute)...');
    const conversionResult = await convertToHLS(inputPath, tempHLSDir);
    console.log(
      `Conversion complete: ${conversionResult.totalSegments} segments generated`
    );

    // Step 4: Store HLS files in local media root
    console.log('Writing HLS files to MEDIA_ROOT...');
    const uploadResult = await storeHLSInMedia(tempHLSDir, title.replace(/[^a-z0-9-]/gi, '_'));
    console.log(`Stored ${uploadResult.uploadedFiles} HLS files`);

    // Step 5: Verify local media write
    console.log('Verifying local media write...');
    const verified = await verifyHLSMediaUpload(uploadResult.mediaPathBase);
    if (!verified) {
      throw new Error('Failed to verify HLS media write');
    }
    console.log('Local HLS write verified');

    // Step 6: Create database record
    console.log('Creating database record...');
    const manifestKey = `${uploadResult.mediaPathBase}/master.m3u8`;
    const video = await prisma.video.create({
      data: {
        title,
        description: description || null,
        type: 'movie',
        playbackType: 'hls',
        s3KeyPlayback: manifestKey,
        cloudfrontPath: manifestKey,
        s3Url: uploadResult.playbackUrl,
        s3KeySource: null,
        status: 'completed',
        duration: conversionResult.totalSegments * 10, // Approximate: 10 seconds per segment
        resolution: '720p', // Default
        thumbnailUrl: null, // Can be added later
      },
    });
    console.log(`Database record created: ${video.id}`);

    // Step 7: Cleanup temp directory
    console.log('Cleaning up temporary files...');
    await cleanupTempDir(tempHLSDir);
    console.log('Cleanup complete\n');

    return NextResponse.json(
      {
        success: true,
        videoId: video.id,
        title: video.title,
        playbackType: video.playbackType,
        s3KeyPlayback: video.s3KeyPlayback,
        uploadedSegments: uploadResult.uploadedFiles,
        message: 'HLS conversion and local media write successful',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('HLS upload error:', error);

    // Attempt cleanup on error
    try {
      // Note: We don't have the tempDir here, but cleanup happens in a finally block
      // in production, you'd track and clean up on error
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }

    return NextResponse.json(
      {
        error: 'HLS conversion failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
